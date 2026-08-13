-- Vision Board — migration 001: the original two-person schema.
--
-- Kept for the record. This is the shape the project started with, before
-- accounts existed: two people named in a check constraint, sharing one
-- password. Migration 002 replaces `owner` with a real account reference.
--
-- If you are setting this project up from scratch, run 001, 002 and 003 in
-- order.

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
-- Intentionally no policies. Only the secret key, server-side, can read or write.

create table if not exists heartbeat (
  id         int primary key default 1,
  pinged_at  timestamptz not null default now()
);
insert into heartbeat (id) values (1) on conflict (id) do nothing;

alter table heartbeat enable row level security;
