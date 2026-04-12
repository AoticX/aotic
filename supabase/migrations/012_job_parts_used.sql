-- Migration 012: job_parts_used table
-- Allows workshop technicians to log free-text parts/items used during a job.
-- These entries appear on the leads page and in the activity log.

create table if not exists public.job_parts_used (
  id          uuid          primary key default gen_random_uuid(),
  job_card_id uuid          not null references public.job_cards(id) on delete cascade,
  item_name   text          not null,
  quantity    numeric(10,2) not null default 1 check (quantity > 0),
  unit        text          not null default 'pcs',
  notes       text,
  logged_by   uuid          references public.profiles(id) on delete set null,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_job_parts_used_job_card_id on public.job_parts_used(job_card_id);
create index if not exists idx_job_parts_used_created_at  on public.job_parts_used(created_at desc);

-- RLS
alter table public.job_parts_used enable row level security;

-- Authenticated users (all roles) can read — service client bypasses this anyway
create policy "parts_used_select" on public.job_parts_used
  for select using (auth.role() = 'authenticated');

-- Any authenticated user can insert (technicians log their own job parts)
create policy "parts_used_insert" on public.job_parts_used
  for insert with check (auth.role() = 'authenticated');

-- Audit trigger — reuses the shared function already defined in migration 008
drop trigger if exists trg_audit_job_parts_used on public.job_parts_used;
create trigger trg_audit_job_parts_used
  after insert or update or delete on public.job_parts_used
  for each row execute function public.audit_activity_trigger();
