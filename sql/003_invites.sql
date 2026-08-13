-- Vision Board — migration 003: invite links.
--
-- An invite is a shareable link that approves whoever signs up through it, so
-- friends do not have to wait in a queue and nobody has to type a code. Kept in
-- the database rather than an environment variable so a link that has travelled
-- further than intended can be revoked from /admin without a redeploy.
--
-- Safe to run more than once.

create table if not exists invites (
  id         uuid primary key default gen_random_uuid(),
  -- The random part of the URL. Unguessable, and the only thing the recipient
  -- ever sees.
  token      text unique not null,
  -- What this link was for: "climbing friends", "Emil", and so on.
  label      text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  uses       int not null default 0,
  revoked    boolean not null default false
);

create index if not exists invites_token_idx on invites (token);

alter table invites enable row level security;
-- No policies, as everywhere here: only the secret key, server-side, can read
-- or write.

-- Records which invite an account arrived through, so it is possible to see
-- later who came in on a link that turned out to be too widely shared.
alter table profiles add column if not exists invited_by uuid
  references invites(id) on delete set null;
