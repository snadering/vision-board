# Vision Board
<img width="1421" height="1009" alt="Screenshot 2026-08-13 at 19 12 42" src="https://github.com/user-attachments/assets/c197a16f-e602-43d2-a250-d90e49bb0d03" />

A private, invite-only place where a handful of people keep the things they are
holding out for.

Everyone has a board. A vision is a picture with a title and a few affirmation
keywords, and a board is not a grid of them: every page load draws a fresh
random seed and composes the board anew — scattered, tilted, gently overlapping,
each card drifting on its own slow cycle. The front page is the same scatter
with people in it instead of visions.

Nothing is readable without signing in. Not a board, not the directory, not who
else is here.

> **A note on history.** This began as a two-person site behind one shared
> password. It now has accounts, Google sign-in, invite links and an admin
> panel. The `sql/` migrations are numbered in the order that happened, and
> `001_initial.sql` is the schema it started with.

## Stack

| Piece      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, TypeScript, `src/`)             |
| Styling    | Tailwind CSS v4                                          |
| Motion     | `motion` (Framer Motion), plus CSS keyframes for drift   |
| Data       | Supabase Postgres + Storage, **server-side only**        |
| Sign-in    | Google OAuth 2.0, implemented directly                   |
| Hosting    | Vercel Hobby                                             |

### The one hard rule

The Supabase URL and secret key never reach the browser. There are no
`NEXT_PUBLIC_SUPABASE_*` variables. Every database and storage operation happens
in a Route Handler or Server Component; `src/lib/supabase.ts` imports
`server-only`, so an accidental client import is a build error. The browser talks
only to this app's own `/api` routes — the single exception being the public
image URLs it renders.

Google sign-in is a plain OAuth authorization-code flow in our own routes rather
than an auth library, so the signed cookie this app already had stays the only
session mechanism.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Run the SQL in `sql/` in order (`001`, `002`, `003`) in the Supabase SQL editor.
Each file is re-runnable.

Sign-in needs port 3000 locally, because that is what is registered with Google:

```bash
npm run dev -- -p 3000
```

### Environment variables

| Variable               | Where it comes from                                                |
| ---------------------- | ------------------------------------------------------------------ |
| `SUPABASE_URL`         | Supabase → Project Settings → API → Project URL                     |
| `SUPABASE_SECRET_KEY`  | Supabase → Project Settings → API → **secret** key (`sb_secret_…`)  |
| `SESSION_SECRET`       | `openssl rand -base64 32` — signs every cookie this app issues       |
| `CRON_SECRET`          | `openssl rand -base64 32` — bearer token for the keep-alive cron     |
| `GOOGLE_CLIENT_ID`     | Google Cloud → APIs & Services → Credentials → OAuth client          |
| `GOOGLE_CLIENT_SECRET` | The same credential                                                  |

`.env.local` is gitignored. `.env.example` is committed with empty values.

On key naming: Supabase renamed its API keys. The old `service_role` key is now
the *secret* key (`sb_secret_…`) and the old `anon` key is the *publishable* key.
This project uses the secret key only, server-side. Both the new format and a
legacy `service_role` JWT work — the value is passed straight to `createClient`.

Changing `SESSION_SECRET` signs everybody out, since it invalidates every issued
cookie at once.

## Database

Three tables, all with row level security enabled and **no policies at all**:
the secret key bypasses RLS, and nothing else can reach them.

- **`profiles`** — one per account. `username` drives `/u/<name>`, `google_sub`
  is Google's stable id for that person, `status` is `pending` / `approved` /
  `blocked`, and `board_public` decides whether other members can open it.
- **`visions`** — a picture with a title and tags, belonging to a profile.
  `width` and `height` are the image's natural pixel dimensions, captured in the
  browser at upload. They are what let every card render at its true aspect ratio
  with no cropping.
- **`invites`** — shareable links. `token` is the random part of the URL,
  `revoked` closes one, `uses` counts who came through.

Storage is a **public** bucket named `visions`. Vision images live at
`{user_id}/{uuid}.{ext}` and avatars at `avatars/{user_id}/{uuid}.{ext}`, both
written with a one-year `cacheControl`.

## How it works

### Getting in

Signing in with Google either finds your account, or sends you to `/welcome` to
choose a username — the one thing Google cannot tell us. Your Google identity
waits in a short-lived signed cookie until you do.

New accounts arrive `pending` and wait in the admin queue, unless they came
through an invite link, in which case they are approved on the spot. Your Google
profile picture is copied into our own bucket at 512px rather than hotlinked, so
it survives Google rotating those URLs.

### Invite links

`/join/<token>` shows a friendly page with one button. Anyone who signs up
through a live link skips the queue. Links are made, labelled, copied and closed
from `/admin`, and each one counts its uses.

The token is re-checked at the moment the account is created, not merely when
the link is clicked — so closing a link takes effect immediately, even for
somebody midway through Google.

**A link is a bearer credential.** Whoever holds it gets in, which is the trade
for not asking non-technical friends to type anything.

### Boards, private and public

Boards are private by default. A private board is a 404 for everyone but its
owner, and nothing is fetched for a viewer who may not see it. A public board is
visible to **other signed-in members** — the site as a whole is closed, so
"public" has never meant the world.

⚠️ **Privacy stops at the page.** The storage bucket is public, so an image URL
that has been copied out keeps working whether or not the board is private.
Private hides the board, not the image files. The settings copy says so plainly.
Making that watertight means a private bucket and signed URLs — a contained
change, but not one that has been made.

### Pictures

A photo straight off a phone is decoded, downscaled to 2400px on its longest
edge and re-encoded to WebP **in the browser** before upload, which keeps
requests under Vercel's ~4.5 MB body cap. Anything over 25 MB is rejected before
decoding; only JPEG, PNG, WebP, HEIC and HEIF are accepted, checked by both MIME
type and extension.

A picture is optional. Without one, a soft pastel gradient is painted and
uploaded as an ordinary image (about 6 KB), so a vision can go up now and get a
photograph later — or never.

### Blocking and deleting

**Block** suspends an account: access stops immediately even with a valid
session, their board 404s, they vanish from the directory, and they are told
their access was removed. Nothing is destroyed, and letting them back in
restores everything.

**Delete** removes the account, its visions and every image behind them. It
cannot be undone, so it is behind a typed confirmation, and the server requires
the username to be sent back with the request — a stale page cannot delete the
wrong person. Admins cannot be blocked or deleted.

## Layout of the code

| Path                       | What it does                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `src/proxy.ts`             | The gate. Everything requires a validly signed session except the way in. In Next 16 this file convention replaced `middleware.ts`. |
| `src/lib/session.ts`       | Signs and verifies every cookie — session, signup ticket, OAuth state, invite — with HMAC-SHA256 over Web Crypto. |
| `src/lib/auth.ts`          | Who is asking. `currentUser` treats a blocked account as nobody; `sessionProfile` can tell the difference. |
| `src/lib/google.ts`        | The OAuth exchange.                                                          |
| `src/lib/profiles.ts`      | Accounts, avatars, the directory, deletion.                                  |
| `src/lib/invites.ts`       | Invite links.                                                                |
| `src/lib/visions.ts`       | Visions, with storage kept in step with the rows.                            |
| `src/lib/prepare-image.ts` | The browser-side image pipeline.                                             |
| `src/lib/gradient.ts`      | The painted stand-in for a vision with no photograph.                        |
| `src/lib/layout.ts`        | Seeded scatter placement, overlap relaxation, drift parameters. Lays out both visions and people. |

### Routes

| Route              | Who                                             |
| ------------------ | ----------------------------------------------- |
| `/`                | Members see the directory; visitors, a front door |
| `/u/<username>`    | A board                                          |
| `/login`           | Sign in with Google                              |
| `/join/<token>`    | An invite                                        |
| `/welcome`         | Choose a username                                |
| `/pending`         | Waiting for approval                             |
| `/blocked`         | Access removed                                   |
| `/settings`        | Username, picture, board visibility              |
| `/admin`           | Invite links, the queue, the membership          |

## Deploying

1. Push to a GitHub repo under a **personal** account — Vercel Hobby refuses
   repos owned by an organisation.
2. Import the repo in Vercel. The defaults are correct.
3. Add all six environment variables from the table above.
4. Add the domain under **Project Settings → Domains**:

   | Type  | Name             | Value                  |
   | ----- | ---------------- | ---------------------- |
   | CNAME | your subdomain   | `cname.vercel-dns.com` |

   Use whatever target Vercel shows when you add the domain, if it differs.
5. Register both redirect URIs on the Google credential, exactly:

   ```
   https://<your-domain>/api/auth/callback
   http://localhost:3000/api/auth/callback
   ```

   Only basic `email` and `profile` scopes are used, so the consent screen can be
   published without Google's review process.
6. `vercel.json` registers `GET /api/keep-alive` as a daily cron at 06:00 UTC.
   Vercel Hobby allows one run per day, which comfortably beats Supabase's 7-day
   inactivity pause. Vercel sends the `CRON_SECRET` as a bearer token itself.

The site is `noindex` and `robots.txt` disallows everything, which is right for
something this private. Note that `noindex` prevents listing, not discovery: TLS
certificates for the domain appear in public certificate transparency logs.

## Scripts

```bash
npm run dev     # development server; use -- -p 3000 for Google sign-in
npm run build   # production build (type-checks)
npm run lint    # eslint
npm start       # serve the production build
```
