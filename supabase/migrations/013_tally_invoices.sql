-- Migration 013: tally_invoices table
-- Stores Tally-generated invoices (PDFs) uploaded against a lead,
-- with a send-via-WhatsApp tracking record.

create table if not exists public.tally_invoices (
  id                   uuid        primary key default gen_random_uuid(),
  lead_id              uuid        not null references public.leads(id) on delete cascade,
  file_name            text        not null,
  cloudinary_public_id text        not null,
  cloudinary_url       text        not null,
  file_size_kb         integer,
  uploaded_by          uuid        references public.profiles(id) on delete set null,
  last_sent_at         timestamptz,
  last_sent_by         uuid        references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists idx_tally_invoices_lead_id    on public.tally_invoices(lead_id);
create index if not exists idx_tally_invoices_created_at on public.tally_invoices(created_at desc);

-- RLS
alter table public.tally_invoices enable row level security;

create policy "tally_invoices_select" on public.tally_invoices
  for select using (auth.role() = 'authenticated');

create policy "tally_invoices_insert" on public.tally_invoices
  for insert with check (auth.role() = 'authenticated');

create policy "tally_invoices_update" on public.tally_invoices
  for update using (auth.role() = 'authenticated');

-- Audit trigger
drop trigger if exists trg_audit_tally_invoices on public.tally_invoices;
create trigger trg_audit_tally_invoices
  after insert or update or delete on public.tally_invoices
  for each row execute function public.audit_activity_trigger();
