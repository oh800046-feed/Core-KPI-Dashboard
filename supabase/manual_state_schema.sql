create table if not exists public.dashboard_manual_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  updated_ip inet
);

alter table public.dashboard_manual_state enable row level security;
revoke all on table public.dashboard_manual_state from anon, authenticated;
