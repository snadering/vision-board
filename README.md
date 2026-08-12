# Vision Board

A private, password-protected vision board for two people, deployed at
[vision.skr.dk](https://vision.skr.dk).

Visions are photos with a title and a few affirmation keywords. They are not laid
out in a grid: every page load draws a fresh random seed and composes the board
anew — scattered, tilted, gently overlapping, each card drifting on its own slow
cycle.

Hovering a card reveals a pencil in its corner; that opens the same form used to
add a vision, pre-filled. Anything can change — the title, the keywords, the
photo, and which of the two boards it lives on.

## Stack

| Piece    | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Framework| Next.js 16 (App Router, TypeScript, `src/`)             |
| Styling  | Tailwind CSS v4                                          |
| Motion   | `motion` (Framer Motion) + CSS keyframes for card drift  |
| Data     | Supabase Postgres + Storage, **server-side only**        |
| Hosting  | Vercel Hobby                                             |

### The one hard rule

The Supabase URL and secret key never reach the browser. There are no
`NEXT_PUBLIC_SUPABASE_*` variables. Every database and storage operation happens
in a Route Handler or Server Component; `src/lib/supabase.ts` imports
`server-only`, so an accidental client import is a build error. The browser talks
only to this app's own `/api` routes — the single exception being the public
image URLs it renders.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev
```

### Environment variables

| Variable              | Where it comes from                                              |
| --------------------- | ---------------------------------------------------------------- |
| `SUPABASE_URL`        | Supabase → Project Settings → API → Project URL                  |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API → **secret** key (`sb_secret_…`) |
| `SITE_PASSWORD`       | The shared password for the site                                  |
| `SESSION_SECRET`      | `openssl rand -base64 32` — signs the session cookie              |
| `CRON_SECRET`         | `openssl rand -base64 32` — bearer token for the keep-alive cron  |

On key naming: Supabase renamed its API keys. The old `service_role` key is now
the *secret* key (`sb_secret_…`) and the old `anon` key is the *publishable* key.
This project uses the secret key only, server-side. Both the new format and a
legacy `service_role` JWT work — the value is passed straight to `createClient`.

`.env.local` is gitignored. `.env.example` is committed with empty values.

### Database

Already applied to the project. Kept here so the shape of the data is on the
record:

```sql
create extension if not exists pgcrypto;

create table if not exists visions (
  id          uuid primary key default gen_random_uuid(),
  owner       text not null check (owner in ('sander', 'jessica')),
  title       text not null,
  image_path  text not null,
  image_url   text not null,
  width       int  not null,
  height      int  not null,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists visions_owner_idx on visions (owner, created_at desc);

alter table visions enable row level security;
-- Intentionally no policies. Only the service_role key (server-side) can read or write.

create table if not exists heartbeat (
  id         int primary key default 1,
  pinged_at  timestamptz not null default now()
);
insert into heartbeat (id) values (1) on conflict (id) do nothing;

alter table heartbeat enable row level security;
-- Again no policies. The secret key bypasses RLS; nothing else can reach either table.
```

`width` and `height` are the image's natural pixel dimensions, captured in the
browser at upload. They are what let every card render at its true aspect ratio
with no cropping.

### Storage

A **public** bucket named `visions`. Objects are written to
`{owner}/{uuid}.{ext}` with a one-year `cacheControl`. Cards request a
width-constrained variant through Supabase's image transformation endpoint
(`/render/image/public/…?width=…&quality=…`) and fall back to the untransformed
URL if a project has transformations disabled.

## How it works

| Path                          | What it does                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `src/proxy.ts`                | Request gate. Verifies the signed cookie on everything except the login page, `/api/login`, `/api/keep-alive` and public metadata. In Next 16 this file convention replaced `middleware.ts`. |
| `src/lib/session.ts`          | HMAC-SHA256 session token over an expiry, via Web Crypto. 90-day cookie.      |
| `src/lib/prepare-image.ts`    | Browser-side pipeline: validate → decode → record natural size → downscale to 2400px → WebP q0.85 (JPEG fallback). |
| `src/lib/layout.ts`           | Seeded scatter placement, overlap relaxation, drift parameters.               |
| `src/app/api/visions/`        | List, create, edit and delete. Create rolls the uploaded object back out if the insert fails; edit uploads a replacement photo before touching the row and removes the old object only once the update has landed. |
| `src/lib/vision-form.ts`      | Shared validation for create and edit. On edit the image is optional — omitting it keeps the stored photo. |
| `src/app/api/keep-alive/`     | Cron target that touches `heartbeat`, guarded by `CRON_SECRET`.               |

### Auth

One shared password for the whole site — convenience protection, not real
security, but enforced server-side. `/api/login` compares in constant time,
rate-limits to 5 attempts per IP per 10 minutes, and sets an httpOnly, secure,
`sameSite=lax` cookie holding an HMAC-signed expiry. The lock icon in the navbar
clears it.

### Images

A photo straight off a phone is resized and re-encoded in the browser before it
is ever uploaded, which keeps requests under Vercel's ~4.5 MB body cap and the
free tier's 1 GB of storage well within reach. Anything over 25 MB is rejected
before decoding; only JPEG, PNG, WebP, HEIC and HEIF are accepted, checked by
both MIME type and extension.

## Deploying

1. Push to a GitHub repo under a **personal** account — Vercel Hobby refuses
   repos owned by an organisation.
2. Import the repo in Vercel. The defaults are correct; no build settings to
   change.
3. Add all five environment variables from the table above in **Project Settings
   → Environment Variables**, for Production (and Preview, if you want previews
   to work).
4. Add the domain under **Project Settings → Domains**:

   | Type  | Name     | Value                  |
   | ----- | -------- | ---------------------- |
   | CNAME | `vision` | `cname.vercel-dns.com` |

   Created at the registrar for `skr.dk`. Vercel shows the exact target when you
   add the domain — use the value it shows if it differs.
5. `vercel.json` registers `GET /api/keep-alive` as a daily cron at 06:00 UTC.
   Vercel Hobby allows one cron run per day, which comfortably beats Supabase's
   7-day inactivity pause. Vercel sends the cron request with the `CRON_SECRET`
   as a bearer token automatically.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build (type-checks)
npm run lint    # eslint
npm start       # serve the production build
```
