# Vision Board — Build Brief

Build a private, password-protected vision board web app for two people (Sander & Jessica), deployed to `vision.skr.dk`.

Work through this brief end to end. Start in plan mode, show me the plan, then build. Create the git repo, install dependencies, write all files, run the build locally, and fix any errors before telling me it is done. Ask me only for the values I must paste (Supabase keys, secrets) — do not ask me to make design decisions that are already specified here, and do not ask permission to write files.

---

## 0. Human prerequisites (I do these, not you)

Items 1, 3 and 4 are already done. Verify the rest before you start writing code. If `.env.local` is missing values, stop and ask me for them.

1. ✅ Supabase project created (free tier), EU region.
2. From Supabase → Project Settings → API, I supply: the project URL and the **secret key**.

   Note on key naming: Supabase has renamed its API keys. What used to be called `anon` is now the *publishable* key (`sb_publishable_...`) and what used to be called `service_role` is now the *secret* key (`sb_secret_...`). This project uses the secret key only, server-side. Do not write code that expects a legacy `service_role` JWT — read whatever value is in the env var and pass it to the Supabase client as the key. Both formats work identically through `createClient`.
3. ✅ Supabase Storage bucket named `visions`, set to **public**.
4. ✅ The SQL in section 3 has been run in the Supabase SQL editor.
5. A GitHub repo under my **personal account** (Vercel Hobby refuses repos owned by a GitHub organisation).
6. Vercel project linked to that repo, env vars set in the Vercel dashboard, domain `vision.skr.dk` added with the CNAME record Vercel shows me, created at the registrar for `skr.dk`.

You may generate `SESSION_SECRET` and `CRON_SECRET` yourself with `openssl rand -base64 32` and write them into `.env.local`.

---

## 1. Stack

- Next.js (latest stable, App Router, TypeScript, `src/` directory)
- Tailwind CSS v4
- `motion` (Framer Motion) for animation
- Supabase JS client — **server-side only**, using the secret key
- Deployed on Vercel Hobby, free tier throughout

Hard rule: the Supabase URL and keys never reach the browser. No `NEXT_PUBLIC_SUPABASE_*` variables. Every database and storage operation happens in a Route Handler or Server Component. The browser talks only to our own `/api` routes. The one exception is rendering image URLs from the public storage bucket.

### Environment variables

```
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SITE_PASSWORD=sanderersej
SESSION_SECRET=
CRON_SECRET=
```

Commit a `.env.example` with these keys and empty values. `.env.local` stays gitignored.

---

## 2. Auth

A single shared password gates the whole site. This is convenience protection, not real security, and that is acceptable — but implement it server-side, not client-side.

- `/login` — a full-screen page with a single password field. On submit, POST to `/api/login`.
- `/api/login` — compares against `process.env.SITE_PASSWORD` using a timing-safe comparison. On success, sets an httpOnly, secure, sameSite=lax cookie named `vb_session` containing a signed token (HMAC-SHA256 over a payload with an expiry, signed with `SESSION_SECRET`), 90-day expiry. On failure, return 401 and show an inline error with a small shake animation on the input.
- `middleware.ts` — verifies the cookie signature and expiry on every request except `/login`, `/api/login`, `/api/keep-alive`, and static assets. Unauthenticated requests redirect to `/login`.
- `/api/logout` — clears the cookie. Expose it as a small, understated "lock" icon in the corner of the app.
- Add a light in-memory rate limit on `/api/login` (5 attempts per IP per 10 minutes) to keep brute force off the door.

The login screen should be beautiful, not a form on a white page. Same aesthetic language as the board (section 6): dark, atmospheric, a single centred input with a soft glow on focus, and a quiet line of text like "Two people, one dream board."

---

## 3. Data model

Run this in Supabase:

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

This SQL has already been run. Do not ask me to run it again — it is here so you know the exact shape of the data.

`width` and `height` are the image's natural pixel dimensions, captured at upload. They are what let the board render every image at its true aspect ratio with zero cropping. This is not optional.

---

## 4. Image pipeline

Vercel serverless functions cap request bodies at ~4.5 MB, and the Supabase free tier gives 1 GB of storage. Both are solved the same way: resize and compress in the browser before uploading.

I must never have to think about file size. Any photo straight off a phone or camera is valid input; the app is responsible for making it web-ready.

Client, on file selection:
0. Accept only `image/jpeg`, `image/png`, `image/webp`, `image/heic` and `image/heif`, validated by both MIME type and file extension, on the file picker and on drop. Reject anything else with a readable inline message naming the accepted formats. Reject originals over 25 MB before attempting to decode, since decoding something enormous can stall the tab. Show an "Optimising…" state while steps 1–4 run, as a large photo takes a second or two.
1. Read the file, decode it to an `Image`/`createImageBitmap`.
2. Record natural width and height.
3. Downscale so the longest edge is at most 2400px (skip if already smaller). Never upscale.
4. Draw to a canvas and encode to WebP at quality 0.85. Fall back to JPEG 0.85 if WebP encoding is unavailable.
5. Show an instant local preview from the object URL.

Server, in `POST /api/visions`:
1. Verify session cookie.
2. Validate: title 1–80 chars, owner in the enum, tags array of ≤ 12 strings each ≤ 24 chars, file present and ≤ 4 MB, MIME type in an allowlist of image types.
3. Upload to the `visions` bucket at `{owner}/{uuid}.{ext}` with `cacheControl: '31536000'`.
4. Get the public URL, insert the row, return the created record.
5. If the insert fails after the upload succeeded, delete the uploaded object so nothing is orphaned.

Rendering: use `next/image` with the stored `width`/`height`, `sizes` set appropriately, `object-contain` semantics — the card's aspect ratio is derived from the image, never the other way round. Configure `remotePatterns` in `next.config.ts` for the Supabase storage hostname. Blur-up placeholder while loading, and a graceful fade-in when the image decodes. Portrait, landscape and square images must all look deliberate.

The board must feel instant even with thirty visions loaded. So:

- Cards render a width-constrained variant, not the full-size original. Request it via Supabase Storage's image transformation query parameters (`?width=...&quality=...`), and fall back cleanly to the untransformed public URL if transformations are unavailable on this project.
- The full-resolution image loads only when the lightbox opens.
- Set `sizes` so the browser never downloads more pixels than it paints, and lazy-load every card below the fold.
- Cache headers on storage objects are already long-lived; do not bust them.

---

## 5. The board — the heart of this thing

Two tabs in a navbar: **Sander** and **Jessica**. Each tab shows only that person's visions.

Visions must not feel like a grid of records. They are dreams, not rows. Requirements:

**Non-deterministic layout.** On every page load, generate a fresh random seed and use it to lay the board out. Refreshing gives a genuinely different composition. Do the seeded placement in a `useEffect` after mount so server and client markup do not mismatch — render an invisible or gently-fading-in board until placement is computed.

**Placement algorithm.** Shuffle the visions. Divide the board area into a loose grid of cells sized to roughly fit the count, then place each card at a jittered position within its cell (±20% of cell size). Allow neighbouring cards to overlap by a small amount — up to about 8% of a card's area — never enough to hide a title. Vary card scale between about 0.85 and 1.15, give each a rotation between -5° and +5°, and assign a random z-index so overlaps layer differently each time. Guard against cards leaving the viewport bounds.

**Drift.** Each card animates continuously and independently: translate ±12px on x and y, rotate ±1.5°, over a randomised 18–30 second cycle with a random negative delay so nothing is in phase, easing in and out, looping forever. The movement should be barely perceptible — like the board is breathing. Nothing should ever slide across the screen or visibly change position over the course of a minute.

**Cards.** Each shows the image, the title, and the tags. Title in the display serif, sitting on a soft gradient scrim at the bottom of the image so it stays legible over any photo. Tags as small translucent pills below or beside the title. On hover: the card lifts, scales very slightly, its drift pauses, the shadow deepens, and the tags become fully opaque. On click: a lightbox opens with the full image, title, tags, and a delete control.

**Mobile.** The scatter layout does not work on a 390px viewport. Below the `md` breakpoint, switch to a single-column vertical flow with alternating slight horizontal offsets and rotations, keeping the drift animation but reducing the amplitude. Still shuffled, still non-deterministic.

**Accessibility.** Respect `prefers-reduced-motion: reduce` — kill the drift entirely, keep the scattered layout static. Cards are keyboard-focusable and open the lightbox on Enter.

---

## 6. Aesthetic direction

Do not ship the default Tailwind look. Specifics:

- **Background.** Near-black, around `#0B0A0C`, with two or three large, heavily-blurred radial gradient blobs drifting very slowly behind everything — deep plum `#2A1B3D`, dusty rose `#8C5A6B`, warm amber `#7A5230`, all at low opacity. Add a subtle film-grain overlay via an SVG `feTurbulence` filter or a tiled noise data URI. The result should feel like a dim room, not a dashboard.
- **Type.** Display serif for titles and the wordmark — Instrument Serif or Fraunces via `next/font/google`. Inter for UI. Generous letter-spacing on small caps labels.
- **Surfaces.** Glass: translucent white at 4–8% opacity, 1px border at 10% white, backdrop blur, large soft shadows. Radius around 16–20px.
- **Motion.** Everything eases. Tab switches crossfade and stagger the incoming cards in. The tab indicator is a shared `layoutId` element that slides between tabs. The modal scales up from 0.96 with a backdrop blur fade. Buttons have a subtle press state.
- **Accent.** A warm rose/gold accent for interactive elements. No pure white, no pure black, no default blue.

---

## 7. Add Vision modal

Triggered by an "Add Vision" button in the navbar, styled as a soft-glowing pill.

Fields, in order:

1. **Title** — text input, required.
2. **Image** — a drag-and-drop zone that also accepts click-to-browse. Shows a thumbnail preview once selected, with a control to swap the image. Required.
3. **Affirmation Keywords** — a text input where pressing Enter (or comma) locks the current text in as a tag. Locked tags render as pills directly below the input, each with an × to remove it. Backspace on an empty input removes the last tag. Trim whitespace, reject duplicates and empties, cap at 12. Tags animate in and out.
4. **Whose vision is this?** — a two-button segmented control, Sander | Jessica. Required, no default selected. The selected side gets a sliding highlight (`layoutId`), not just a colour change.

Behaviour: submit is disabled until title, image and owner are all present. During upload show a progress or shimmer state and disable the form. On success, close the modal, switch to the tab matching the chosen owner, and insert the new card into the board with a distinct arrival animation — it should feel like the dream landed. On failure, keep the modal open, keep the user's input, and show a readable error. Escape and backdrop click close the modal; focus is trapped while open.

---

## 8. Filling the gaps — build these too

- **Delete.** From the lightbox, with a confirm step. `DELETE /api/visions/[id]` removes the storage object and the row.
- **Empty states.** Each tab, when empty, shows a quiet illustration or line of type inviting the first vision. Not a grey "No data" box.
- **Loading.** Skeleton cards in the scatter layout while the initial fetch resolves.
- **Keep-alive.** `GET /api/keep-alive` updates `heartbeat.pinged_at`, guarded by a bearer check against `CRON_SECRET`. Register it in `vercel.json` as a daily cron (`0 6 * * *`). Vercel Hobby allows one run per day, which comfortably beats Supabase's 7-day inactivity pause.
- **Metadata.** Page title, description, favicon, and an OG image. `robots.txt` disallowing everything, plus `noindex` — the site is public by URL but should not be indexed.
- **Errors.** A styled `error.tsx` and `not-found.tsx` consistent with the rest of the design.
- **README.** Setup steps, env var table, the SQL from section 3, deploy instructions, and the DNS record for `vision.skr.dk`.

---

## 9. Definition of done

- `npm run build` passes with no type errors and no lint errors.
- Logging in with `sanderersej` works; a wrong password is rejected; visiting any route while logged out redirects to `/login`.
- I can add a vision with a tall portrait photo, a wide landscape photo, and a square photo, and all three render uncropped and look intentional.
- Refreshing the page produces a visibly different arrangement each time.
- The layout holds up at 390px, 768px and 1440px.
- A 10 MB+ photo uploads without complaint and arrives in storage at a fraction of that size. A `.pdf` or `.gif` is rejected with a clear message.
- No Supabase key appears anywhere in the client bundle. Verify this by grepping the build output for the project URL and for `sb_secret`.
- Git repo initialised, `.env.local` ignored, one clean initial commit.

Finish by printing the exact next steps for me: the env vars to add in Vercel, and the DNS record to create for the subdomain.
