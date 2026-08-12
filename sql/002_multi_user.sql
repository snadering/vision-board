-- Vision Board — migration 002: from two hard-coded people to accounts.
--
-- Deliberately additive. Nothing is dropped and `visions.owner` is left in
-- place, so the currently deployed single-password site keeps working against
-- this schema while the multi-user branch is being built. Migration 003 drops
-- the old column once the new code is live.
--
-- Safe to run more than once.

create extension if not exists citext;

create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  -- Google's stable subject id. Null until the person first signs in, which is
  -- what lets an account exist before its owner has ever logged in.
  google_sub   text unique,
  email        citext unique,
  username     citext unique not null,
  avatar_path  text,
  avatar_url   text,
  board_public boolean not null default false,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'blocked')),
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Usernames live in URLs, so keep them to a predictable shape.
alter table profiles drop constraint if exists profiles_username_shape;
alter table profiles add constraint profiles_username_shape
  check (username ~ '^[a-z0-9][a-z0-9_-]{1,23}$');

create index if not exists profiles_status_idx on profiles (status, created_at desc);

alter table profiles enable row level security;
-- Intentionally no policies, as with every table here: only the secret key,
-- server-side, can read or write.

alter table visions add column if not exists user_id uuid
  references profiles(id) on delete cascade;

create index if not exists visions_user_idx on visions (user_id, created_at desc);

-- The old column has to become optional before rows can exist without it.
alter table visions alter column owner drop not null;

-- The two people who were hard-coded into the old schema become the first two
-- accounts. Sander's email is known, so his profile is claimed on first sign-in
-- automatically; Jessica's is left unclaimed and gets linked from /admin when
-- she signs in.
insert into profiles (username, email, status, is_admin)
values ('sander', 'sanderroust@gmail.com', 'approved', true)
on conflict (username) do nothing;

insert into profiles (username, status)
values ('jessica', 'approved')
on conflict (username) do nothing;

-- Attach every existing vision to its person. Re-runnable: only fills the gaps,
-- so it can be run again at cutover to catch anything added in the meantime.
update visions v
set user_id = p.id
from profiles p
where v.owner = p.username
  and v.user_id is null;
