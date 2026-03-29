-- =============================================================================
-- AOTIC CRM — Initial Schema
-- Migration: 001_initial_schema.sql
-- Date: 2026-03-29
-- Description: Complete schema for Phase 1 including all tables, enums, RLS
--              policies, hard-lock triggers, and seed data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

-- 7 system roles
create type app_role as enum (
  'owner',
  'branch_manager',
  'sales_executive',
  'workshop_technician',
  'qc_inspector',
  'accounts_finance',
  'front_desk'
);

-- Lead pipeline status ladder (docs: core-workflows.md §1)
create type lead_status as enum (
  'hot',
  'warm',
  'cold',
  'lost'
);

-- Lead source channels
create type lead_source as enum (
  'walk_in',
  'phone',
  'whatsapp',
  'instagram',
  'facebook',
  'referral',
  'website',
  'other'
);

-- Quotation status ladder (docs: core-workflows.md §2)
create type quotation_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'accepted',
  'rejected'
);

-- Booking status ladder (docs: core-workflows.md §3)
create type booking_status as enum (
  'quote_accepted',
  'advance_pending',
  'confirmed',
  'scheduled',
  'cancelled'
);

-- Job card status ladder (docs: core-workflows.md §4 & §5)
create type job_status as enum (
  'created',
  'in_progress',
  'pending_qc',
  'qc_passed',
  'rework_scheduled',
  'ready_for_billing',
  'ready_for_delivery',
  'delivered',
  'cancelled'
);

-- QC checklist item result
create type qc_result as enum (
  'pass',
  'fail',
  'na'
);

-- Payment methods (docs: roles-and-permissions.md §6)
create type payment_method as enum (
  'cash',
  'upi',
  'card',
  'emi',
  'bank_transfer',
  'cheque'
);

-- Invoice status
create type invoice_status as enum (
  'draft',
  'finalized',
  'partially_paid',
  'paid',
  'void'
);

-- 4 pricing tiers (docs: data-dictionary.md)
create type pricing_tier as enum (
  'essential',
  'enhanced',
  'elite',
  'luxe'
);

-- Car segments (docs: data-dictionary.md)
create type car_segment as enum (
  'hatchback',
  'sedan',
  'suv',
  'luxury'
);

-- Inventory stock states (docs: data-dictionary.md §3)
create type stock_state as enum (
  'available',
  'reserved',
  'consumed'
);

-- Discount approval status
create type approval_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- Audit action types
create type audit_action as enum (
  'create',
  'update',
  'delete',
  'status_change',
  'override',
  'approval',
  'payment',
  'login',
  'logout'
);

-- ---------------------------------------------------------------------------
-- CORE TABLES
-- ---------------------------------------------------------------------------

-- Branches (multi-branch support)
create table branches (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  city        text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- User profiles (extends auth.users)
-- One row per authenticated user. Role assigned here governs all RLS.
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  phone         text,
  role          app_role not null,
  branch_id     uuid references branches(id),
  is_active     boolean not null default true,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- STATIC / SEED TABLES
-- ---------------------------------------------------------------------------

-- 6 business verticals (docs: data-dictionary.md §1)
create table verticals (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,   -- e.g. 'audio_acoustics'
  name        text not null,          -- e.g. 'Audio & Acoustics'
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Pricing tier metadata
create table pricing_tier_config (
  id          uuid primary key default uuid_generate_v4(),
  tier        pricing_tier not null unique,
  label       text not null,
  description text,
  sort_order  integer not null default 0
);

-- Car segment metadata
create table car_segment_config (
  id          uuid primary key default uuid_generate_v4(),
  segment     car_segment not null unique,
  label       text not null,
  sort_order  integer not null default 0
);

-- Service packages: pricing matrix (vertical × tier × segment)
create table service_packages (
  id              uuid primary key default uuid_generate_v4(),
  vertical_id     uuid not null references verticals(id),
  tier            pricing_tier not null,
  segment         car_segment not null,
  name            text not null,
  description     text,
  base_price      numeric(12,2) not null check (base_price >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references profiles(id),
  unique (vertical_id, tier, segment)
);

-- Lost deal reason codes (docs: core-workflows.md §1, business-rules.md §7)
create table lost_reasons (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  label       text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0
);

-- Discount reason codes (docs: business-rules.md §4)
create table discount_reasons (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  label       text not null,
  is_active   boolean not null default true
);

-- ---------------------------------------------------------------------------
-- CUSTOMER & LEAD TABLES
-- ---------------------------------------------------------------------------

create table customers (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  phone         text not null,
  email         text,
  address       text,
  car_model     text,
  car_reg_no    text,
  branch_id     uuid references branches(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references profiles(id)
);

create table leads (
  id                uuid primary key default uuid_generate_v4(),
  customer_id       uuid references customers(id),
  -- Denormalized contact fields for quick capture (customer may not exist yet)
  contact_name      text not null,
  contact_phone     text not null,
  contact_email     text,
  car_model         text,
  car_reg_no        text,
  service_interest  text,          -- free text or vertical reference
  vertical_id       uuid references verticals(id),
  estimated_budget  numeric(12,2),
  source            lead_source not null default 'walk_in',
  status            lead_status not null default 'hot',
  assigned_to       uuid references profiles(id),  -- sales_executive
  branch_id         uuid references branches(id),
  notes             text,
  -- HARD LOCK: populated when status moves to 'lost'
  lost_reason_id    uuid references lost_reasons(id),
  lost_notes        text,
  lost_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references profiles(id)
);

-- Communication timeline (WhatsApp/call logs — docs: roles-and-permissions.md §7)
create table lead_communications (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references leads(id) on delete cascade,
  channel     text not null,   -- 'whatsapp', 'call', 'email', 'in_person'
  direction   text not null check (direction in ('inbound','outbound')),
  summary     text not null,
  logged_by   uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- QUOTATION TABLES
-- ---------------------------------------------------------------------------

create table quotations (
  id                  uuid primary key default uuid_generate_v4(),
  lead_id             uuid not null references leads(id),
  customer_id         uuid references customers(id),
  version             integer not null default 1,
  status              quotation_status not null default 'draft',
  subtotal            numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_amount     numeric(12,2) not null default 0 check (discount_amount >= 0),
  discount_pct        numeric(5,2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  -- HARD LOCK: discount >5% requires approval (docs: business-rules.md §2)
  discount_reason_id  uuid references discount_reasons(id),
  discount_notes      text,
  tax_amount          numeric(12,2) not null default 0,
  total_amount        numeric(12,2) not null default 0,
  valid_until         date,
  pdf_url             text,           -- R2 storage URL
  notes               text,
  approved_by         uuid references profiles(id),
  approved_at         timestamptz,
  sent_at             timestamptz,
  accepted_at         timestamptz,
  branch_id           uuid references branches(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid not null references profiles(id)
);

create table quotation_items (
  id                  uuid primary key default uuid_generate_v4(),
  quotation_id        uuid not null references quotations(id) on delete cascade,
  service_package_id  uuid references service_packages(id),
  vertical_id         uuid references verticals(id),
  description         text not null,
  tier                pricing_tier,
  segment             car_segment,
  quantity            integer not null default 1 check (quantity > 0),
  unit_price          numeric(12,2) not null check (unit_price >= 0),
  discount_pct        numeric(5,2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  line_total          numeric(12,2) not null check (line_total >= 0),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Discount approval requests (docs: business-rules.md §2)
create table discount_approvals (
  id              uuid primary key default uuid_generate_v4(),
  quotation_id    uuid not null references quotations(id),
  requested_pct   numeric(5,2) not null,
  reason_id       uuid not null references discount_reasons(id),
  reason_notes    text,
  status          approval_status not null default 'pending',
  requested_by    uuid not null references profiles(id),
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  review_notes    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BOOKING TABLES
-- ---------------------------------------------------------------------------

create table bookings (
  id                    uuid primary key default uuid_generate_v4(),
  lead_id               uuid not null references leads(id),
  quotation_id          uuid not null references quotations(id),
  customer_id           uuid not null references customers(id),
  status                booking_status not null default 'quote_accepted',
  promised_delivery_at  date not null,
  total_value           numeric(12,2) not null check (total_value > 0),
  advance_amount        numeric(12,2) not null default 0 check (advance_amount >= 0),
  advance_pct           numeric(5,2) generated always as (
                          case when total_value > 0
                            then (advance_amount / total_value) * 100
                          else 0 end
                        ) stored,
  advance_paid_at       timestamptz,
  advance_payment_method payment_method,
  -- HARD LOCK: 70% advance required before job card (docs: business-rules.md §1)
  -- Override only by branch_manager, requires documented reason
  advance_override_by   uuid references profiles(id),
  advance_override_note text,
  branch_id             uuid references branches(id),
  assigned_bay          text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid not null references profiles(id)
);

-- ---------------------------------------------------------------------------
-- JOB CARD TABLES
-- ---------------------------------------------------------------------------

create table job_cards (
  id                      uuid primary key default uuid_generate_v4(),
  booking_id              uuid not null references bookings(id),
  quotation_id            uuid not null references quotations(id),
  customer_id             uuid not null references customers(id),
  status                  job_status not null default 'created',
  -- Vehicle intake data (docs: core-workflows.md §4)
  reg_number              text not null,
  odometer_reading        integer,
  fuel_level_pct          integer check (fuel_level_pct >= 0 and fuel_level_pct <= 100),
  -- Body condition map stored as JSON (scratches, dents, warning lights)
  body_condition_map      jsonb not null default '{}',
  belongings_inventory    text[],
  spare_parts_check       boolean not null default false,
  customer_concerns       text,
  -- Customer digital signature (docs: core-workflows.md §4)
  intake_signature_url    text,
  intake_signed_at        timestamptz,
  -- Assignment
  assigned_to             uuid references profiles(id),  -- workshop_technician
  supervised_by           uuid references profiles(id),  -- branch_manager
  branch_id               uuid references branches(id),
  bay_number              text,
  estimated_completion    timestamptz,
  actual_completion       timestamptz,
  -- QC gate (docs: business-rules.md §3)
  qc_signed_off_by        uuid references profiles(id),
  qc_signed_off_at        timestamptz,
  -- Delivery gate (docs: core-workflows.md §5)
  delivery_signature_url  text,
  delivery_signed_at      timestamptz,
  delivered_by            uuid references profiles(id),
  delivered_at            timestamptz,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid not null references profiles(id)
);

create table job_card_items (
  id                  uuid primary key default uuid_generate_v4(),
  job_card_id         uuid not null references job_cards(id) on delete cascade,
  quotation_item_id   uuid references quotation_items(id),
  vertical_id         uuid references verticals(id),
  description         text not null,
  status              text not null default 'pending'
                        check (status in ('pending','in_progress','done','skipped')),
  assigned_to         uuid references profiles(id),
  started_at          timestamptz,
  completed_at        timestamptz,
  technician_notes    text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Technician time logs per job item (docs: roles-and-permissions.md §4)
create table technician_time_logs (
  id              uuid primary key default uuid_generate_v4(),
  job_card_id     uuid not null references job_cards(id),
  job_item_id     uuid references job_card_items(id),
  technician_id   uuid not null references profiles(id),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_mins   integer generated always as (
                    extract(epoch from (ended_at - started_at)) / 60
                  ) stored,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Mandatory job photos (docs: business-rules.md §6 — min 4-6 photos)
create table job_photos (
  id              uuid primary key default uuid_generate_v4(),
  job_card_id     uuid not null references job_cards(id) on delete cascade,
  job_item_id     uuid references job_card_items(id),
  stage           text not null check (stage in ('before','during','after','qc','delivery')),
  r2_key          text not null,       -- Cloudflare R2 object key
  r2_url          text not null,       -- Public or signed URL
  file_name       text,
  file_size_kb    integer,
  mime_type       text,
  uploaded_by     uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INVENTORY TABLES
-- ---------------------------------------------------------------------------

-- Product master (docs: data-dictionary.md §3 — ~200+ SKUs)
create table inventory_items (
  id                  uuid primary key default uuid_generate_v4(),
  sku_id              text not null unique,
  brand               text,
  name                text not null,
  description         text,
  vertical_id         uuid references verticals(id),
  unit_of_measure     text not null default 'pcs',
  -- Serial number tracking (docs: data-dictionary.md)
  serial_tracked      boolean not null default false,
  -- Available stock quantity
  qty_available       integer not null default 0 check (qty_available >= 0),
  qty_reserved        integer not null default 0 check (qty_reserved >= 0),
  -- Selling price range
  selling_price_min   numeric(12,2),
  selling_price_max   numeric(12,2),
  reorder_level       integer not null default 0,
  branch_id           uuid references branches(id),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references profiles(id)
);

-- Inventory transactions (docs: data-dictionary.md §3)
create table inventory_transactions (
  id              uuid primary key default uuid_generate_v4(),
  item_id         uuid not null references inventory_items(id),
  job_card_id     uuid references job_cards(id),
  transaction_type text not null
                    check (transaction_type in ('reserve','consume','return','restock','adjustment')),
  qty             integer not null,
  -- Customer-supplied flag: bypasses deduction (docs: data-dictionary.md §3)
  customer_supplied boolean not null default false,
  serial_number   text,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid not null references profiles(id)
);

-- ---------------------------------------------------------------------------
-- QC TABLES
-- ---------------------------------------------------------------------------

-- Vertical-specific QC checklist templates
create table qc_checklist_templates (
  id          uuid primary key default uuid_generate_v4(),
  vertical_id uuid not null references verticals(id),
  item_order  integer not null default 0,
  check_point text not null,
  is_mandatory boolean not null default true,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Actual QC records per job
create table qc_records (
  id                  uuid primary key default uuid_generate_v4(),
  job_card_id         uuid not null references job_cards(id),
  vertical_id         uuid references verticals(id),
  inspector_id        uuid not null references profiles(id),
  overall_result      qc_result,
  rework_required     boolean not null default false,
  rework_notes        text,
  signed_off_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table qc_checklist_results (
  id              uuid primary key default uuid_generate_v4(),
  qc_record_id    uuid not null references qc_records(id) on delete cascade,
  template_id     uuid references qc_checklist_templates(id),
  check_point     text not null,
  result          qc_result not null default 'na',
  notes           text,
  photo_url       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INVOICE & PAYMENT TABLES
-- ---------------------------------------------------------------------------

create table invoices (
  id                  uuid primary key default uuid_generate_v4(),
  job_card_id         uuid not null references job_cards(id),
  booking_id          uuid not null references bookings(id),
  customer_id         uuid not null references customers(id),
  invoice_number      text not null unique,
  status              invoice_status not null default 'draft',
  subtotal            numeric(12,2) not null check (subtotal >= 0),
  discount_amount     numeric(12,2) not null default 0,
  tax_amount          numeric(12,2) not null default 0,
  total_amount        numeric(12,2) not null check (total_amount >= 0),
  amount_paid         numeric(12,2) not null default 0,
  amount_due          numeric(12,2) generated always as (total_amount - amount_paid) stored,
  -- HARD LOCK: invoice is locked after first payment (docs: business-rules.md §5)
  is_locked           boolean not null default false,
  locked_at           timestamptz,
  locked_by           uuid references profiles(id),
  finalized_at        timestamptz,
  finalized_by        uuid references profiles(id),
  notes               text,
  branch_id           uuid references branches(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid not null references profiles(id)
);

create table invoice_items (
  id              uuid primary key default uuid_generate_v4(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  description     text not null,
  vertical_id     uuid references verticals(id),
  quantity        integer not null default 1,
  unit_price      numeric(12,2) not null,
  discount_pct    numeric(5,2) not null default 0,
  line_total      numeric(12,2) not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- Payment records (docs: roles-and-permissions.md §6)
create table payments (
  id              uuid primary key default uuid_generate_v4(),
  invoice_id      uuid not null references invoices(id),
  booking_id      uuid references bookings(id),
  customer_id     uuid not null references customers(id),
  amount          numeric(12,2) not null check (amount > 0),
  payment_method  payment_method not null,
  payment_date    date not null default current_date,
  reference_no    text,
  is_advance      boolean not null default false,
  notes           text,
  recorded_by     uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AUDIT LOG (IMMUTABLE — INSERT ONLY)
-- docs: business-rules.md §6 "unalterable audit log"
-- ---------------------------------------------------------------------------

create table audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  action        audit_action not null,
  table_name    text not null,
  record_id     uuid,
  old_data      jsonb,
  new_data      jsonb,
  changed_fields text[],
  performed_by  uuid references profiles(id),
  performed_at  timestamptz not null default now(),
  ip_address    text,
  user_agent    text,
  notes         text
);

-- Override / exception log (for hard lock bypasses)
create table override_logs (
  id            uuid primary key default uuid_generate_v4(),
  override_type text not null,   -- e.g. 'advance_waiver', 'invoice_edit', 'delivery_unlock'
  table_name    text not null,
  record_id     uuid not null,
  reason        text not null,
  overridden_by uuid not null references profiles(id),
  approved_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

create index idx_profiles_role on profiles(role);
create index idx_profiles_branch on profiles(branch_id);
create index idx_leads_status on leads(status);
create index idx_leads_assigned_to on leads(assigned_to);
create index idx_leads_branch on leads(branch_id);
create index idx_quotations_lead on quotations(lead_id);
create index idx_quotations_status on quotations(status);
create index idx_bookings_quotation on bookings(quotation_id);
create index idx_bookings_status on bookings(status);
create index idx_job_cards_booking on job_cards(booking_id);
create index idx_job_cards_status on job_cards(status);
create index idx_job_cards_assigned_to on job_cards(assigned_to);
create index idx_job_photos_job_card on job_photos(job_card_id);
create index idx_invoices_job_card on invoices(job_card_id);
create index idx_payments_invoice on payments(invoice_id);
create index idx_audit_logs_table_record on audit_logs(table_name, record_id);
create index idx_audit_logs_performed_by on audit_logs(performed_by);
create index idx_audit_logs_performed_at on audit_logs(performed_at desc);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_branches_updated_at
  before update on branches
  for each row execute function set_updated_at();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_verticals_updated_at
  before update on verticals
  for each row execute function set_updated_at();

create trigger trg_service_packages_updated_at
  before update on service_packages
  for each row execute function set_updated_at();

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create trigger trg_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

create trigger trg_quotations_updated_at
  before update on quotations
  for each row execute function set_updated_at();

create trigger trg_quotation_items_updated_at
  before update on quotation_items
  for each row execute function set_updated_at();

create trigger trg_discount_approvals_updated_at
  before update on discount_approvals
  for each row execute function set_updated_at();

create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger trg_job_cards_updated_at
  before update on job_cards
  for each row execute function set_updated_at();

create trigger trg_job_card_items_updated_at
  before update on job_card_items
  for each row execute function set_updated_at();

create trigger trg_inventory_items_updated_at
  before update on inventory_items
  for each row execute function set_updated_at();

create trigger trg_qc_records_updated_at
  before update on qc_records
  for each row execute function set_updated_at();

create trigger trg_invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- HARD LOCK TRIGGERS
-- ---------------------------------------------------------------------------

-- LOCK 1: Lead must have a lost_reason when status = 'lost'
-- (docs: business-rules.md §7, core-workflows.md §1)
create or replace function enforce_lost_reason()
returns trigger language plpgsql as $$
begin
  if new.status = 'lost' and new.lost_reason_id is null then
    raise exception 'HARD_LOCK: A reason code is mandatory when marking a lead as lost.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_lead_lost_reason
  before insert or update on leads
  for each row execute function enforce_lost_reason();

-- LOCK 2: Quotation must be 'accepted' before a booking can be created
-- (docs: business-rules.md §8, core-workflows.md §3)
create or replace function enforce_quotation_accepted_for_booking()
returns trigger language plpgsql as $$
declare
  q_status quotation_status;
begin
  select status into q_status from quotations where id = new.quotation_id;
  if q_status is null or q_status != 'accepted' then
    raise exception 'HARD_LOCK: Booking requires an accepted quotation.'
      using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create trigger trg_booking_requires_accepted_quote
  before insert on bookings
  for each row execute function enforce_quotation_accepted_for_booking();

-- LOCK 3: Job card requires 70% advance (or manager override)
-- (docs: business-rules.md §1, core-workflows.md §3)
create or replace function enforce_advance_before_job_card()
returns trigger language plpgsql as $$
declare
  adv_pct numeric;
  override_exists boolean;
begin
  select b.advance_pct,
         (b.advance_override_by is not null and b.advance_override_note is not null)
  into adv_pct, override_exists
  from bookings b
  where b.id = new.booking_id;

  if adv_pct < 70 and not override_exists then
    raise exception 'HARD_LOCK: Job card requires minimum 70%% advance payment (current: %%%). Obtain a manager override with documented reason.',
      adv_pct
      using errcode = 'P0003';
  end if;
  return new;
end;
$$;

create trigger trg_job_card_advance_lock
  before insert on job_cards
  for each row execute function enforce_advance_before_job_card();

-- LOCK 4: Job card delivery requires QC sign-off
-- (docs: business-rules.md §3, core-workflows.md §5)
create or replace function enforce_qc_before_delivery()
returns trigger language plpgsql as $$
begin
  if new.status in ('ready_for_delivery', 'delivered')
    and old.status not in ('ready_for_delivery', 'delivered')
  then
    if new.qc_signed_off_by is null or new.qc_signed_off_at is null then
      raise exception 'HARD_LOCK: Car cannot be marked for delivery without QC sign-off.'
        using errcode = 'P0004';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_delivery_requires_qc
  before update on job_cards
  for each row execute function enforce_qc_before_delivery();

-- LOCK 5: Invoice cannot be edited after payment is recorded
-- (docs: business-rules.md §5)
create or replace function enforce_invoice_lock()
returns trigger language plpgsql as $$
begin
  if old.is_locked = true then
    -- Only allow override by owner (handled at app layer via override_logs)
    -- At DB level, reject all edits to locked invoices
    raise exception 'HARD_LOCK: Invoice is locked after payment recording. Owner override required.'
      using errcode = 'P0005';
  end if;
  return new;
end;
$$;

create trigger trg_invoice_edit_lock
  before update on invoices
  for each row
  when (old.is_locked = true)
  execute function enforce_invoice_lock();

-- LOCK 6: Auto-lock invoice when first payment is recorded
create or replace function auto_lock_invoice_on_payment()
returns trigger language plpgsql as $$
begin
  update invoices
  set is_locked  = true,
      locked_at  = now(),
      locked_by  = new.recorded_by,
      amount_paid = amount_paid + new.amount,
      status = case
        when (amount_paid + new.amount) >= total_amount then 'paid'
        when (amount_paid + new.amount) > 0 then 'partially_paid'
        else status
      end
  where id = new.invoice_id;
  return new;
end;
$$;

create trigger trg_auto_lock_invoice
  after insert on payments
  for each row execute function auto_lock_invoice_on_payment();

-- LOCK 7: Discount >5% must have an approved discount_approval record
-- (docs: business-rules.md §2)
create or replace function enforce_discount_approval()
returns trigger language plpgsql as $$
declare
  approval_count integer;
begin
  if new.discount_pct > 5 then
    -- Quotation must stay in draft/pending_approval until Owner approves
    if new.status not in ('draft', 'pending_approval') then
      select count(*) into approval_count
      from discount_approvals
      where quotation_id = new.id
        and status = 'approved';

      if approval_count = 0 then
        raise exception 'HARD_LOCK: Discount above 5%% requires Owner approval before quotation can be approved or sent.'
          using errcode = 'P0006';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_discount_approval_required
  before insert or update on quotations
  for each row execute function enforce_discount_approval();

-- LOCK 8: Prevent audit_log modifications (immutability)
create or replace function prevent_audit_log_modification()
returns trigger language plpgsql as $$
begin
  raise exception 'HARD_LOCK: Audit logs are immutable and cannot be modified or deleted.'
    using errcode = 'P0007';
end;
$$;

create trigger trg_audit_log_immutable_update
  before update on audit_logs
  for each row execute function prevent_audit_log_modification();

create trigger trg_audit_log_immutable_delete
  before delete on audit_logs
  for each row execute function prevent_audit_log_modification();

-- ---------------------------------------------------------------------------
-- PROFILE SYNC TRIGGER (auth.users → profiles)
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'front_desk')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
alter table branches enable row level security;
alter table profiles enable row level security;
alter table verticals enable row level security;
alter table pricing_tier_config enable row level security;
alter table car_segment_config enable row level security;
alter table service_packages enable row level security;
alter table lost_reasons enable row level security;
alter table discount_reasons enable row level security;
alter table customers enable row level security;
alter table leads enable row level security;
alter table lead_communications enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;
alter table discount_approvals enable row level security;
alter table bookings enable row level security;
alter table job_cards enable row level security;
alter table job_card_items enable row level security;
alter table technician_time_logs enable row level security;
alter table job_photos enable row level security;
alter table inventory_items enable row level security;
alter table inventory_transactions enable row level security;
alter table qc_checklist_templates enable row level security;
alter table qc_records enable row level security;
alter table qc_checklist_results enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
alter table override_logs enable row level security;

-- Helper: get current user's role
create or replace function get_my_role()
returns app_role language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

-- Helper: get current user's branch_id
create or replace function get_my_branch()
returns uuid language sql stable security definer as $$
  select branch_id from profiles where id = auth.uid();
$$;

-- Helper: check if current user has a role
create or replace function has_role(required_role app_role)
returns boolean language sql stable security definer as $$
  select exists(select 1 from profiles where id = auth.uid() and role = required_role);
$$;

-- Helper: is owner or manager
create or replace function is_owner_or_manager()
returns boolean language sql stable security definer as $$
  select get_my_role() in ('owner', 'branch_manager');
$$;

-- -------- BRANCHES --------
create policy "All authenticated users can view branches"
  on branches for select to authenticated using (true);

create policy "Only owner can manage branches"
  on branches for all to authenticated
  using (has_role('owner'))
  with check (has_role('owner'));

-- -------- PROFILES --------
create policy "Users can view own profile"
  on profiles for select to authenticated
  using (id = auth.uid() or is_owner_or_manager());

create policy "Users can update own profile"
  on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Owner can manage all profiles"
  on profiles for all to authenticated
  using (has_role('owner'))
  with check (has_role('owner'));

-- -------- STATIC TABLES (read-only for most roles) --------
create policy "Authenticated users can read verticals"
  on verticals for select to authenticated using (true);

create policy "Authenticated users can read pricing tiers"
  on pricing_tier_config for select to authenticated using (true);

create policy "Authenticated users can read car segments"
  on car_segment_config for select to authenticated using (true);

create policy "Authenticated users can read service packages"
  on service_packages for select to authenticated using (true);

create policy "Owner/manager can manage service packages"
  on service_packages for all to authenticated
  using (is_owner_or_manager())
  with check (is_owner_or_manager());

create policy "Authenticated users can read lost reasons"
  on lost_reasons for select to authenticated using (true);

create policy "Authenticated users can read discount reasons"
  on discount_reasons for select to authenticated using (true);

-- -------- CUSTOMERS --------
create policy "Staff can view customers in same branch"
  on customers for select to authenticated
  using (
    has_role('owner')
    or branch_id = get_my_branch()
    or branch_id is null
  );

create policy "Sales, front desk, manager, owner can create customers"
  on customers for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'sales_executive', 'front_desk')
  );

create policy "Sales, manager, owner can update customers"
  on customers for update to authenticated
  using (get_my_role() in ('owner', 'branch_manager', 'sales_executive'));

-- -------- LEADS --------
create policy "Sales and above can view leads in their branch"
  on leads for select to authenticated
  using (
    has_role('owner')
    or (
      get_my_role() in ('branch_manager', 'sales_executive', 'front_desk', 'accounts_finance')
      and (branch_id = get_my_branch() or branch_id is null)
    )
  );

create policy "Sales, front desk can create leads"
  on leads for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'sales_executive', 'front_desk')
  );

create policy "Assigned salesperson or manager can update leads"
  on leads for update to authenticated
  using (
    has_role('owner')
    or has_role('branch_manager')
    or (has_role('sales_executive') and assigned_to = auth.uid())
    or (has_role('front_desk') and created_by = auth.uid())
  );

-- -------- LEAD COMMUNICATIONS --------
create policy "View lead communications if can view lead"
  on lead_communications for select to authenticated
  using (
    has_role('owner') or has_role('branch_manager')
    or get_my_role() in ('sales_executive', 'front_desk')
  );

create policy "Sales and front desk can log communications"
  on lead_communications for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'sales_executive', 'front_desk')
  );

-- -------- QUOTATIONS --------
create policy "Sales+ can view quotations in their branch"
  on quotations for select to authenticated
  using (
    has_role('owner')
    or (
      get_my_role() in ('branch_manager', 'sales_executive', 'accounts_finance')
      and (branch_id = get_my_branch() or branch_id is null)
    )
  );

create policy "Sales can create quotations"
  on quotations for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'sales_executive')
  );

create policy "Creator or manager can edit draft quotations"
  on quotations for update to authenticated
  using (
    has_role('owner')
    or has_role('branch_manager')
    or (has_role('sales_executive') and created_by = auth.uid() and status = 'draft')
  );

create policy "View quotation items with quotation access"
  on quotation_items for select to authenticated using (true);

create policy "Sales can manage quotation items"
  on quotation_items for all to authenticated
  using (
    get_my_role() in ('owner', 'branch_manager', 'sales_executive')
  )
  with check (
    get_my_role() in ('owner', 'branch_manager', 'sales_executive')
  );

-- -------- DISCOUNT APPROVALS --------
create policy "Owner and requester can view discount approvals"
  on discount_approvals for select to authenticated
  using (
    has_role('owner')
    or has_role('branch_manager')
    or requested_by = auth.uid()
  );

create policy "Sales can request discount approvals"
  on discount_approvals for insert to authenticated
  with check (has_role('sales_executive') or has_role('branch_manager') or has_role('owner'));

create policy "Owner can approve/reject discounts"
  on discount_approvals for update to authenticated
  using (has_role('owner'))
  with check (has_role('owner'));

-- -------- BOOKINGS --------
create policy "Sales+ can view bookings in branch"
  on bookings for select to authenticated
  using (
    has_role('owner')
    or (
      get_my_role() in ('branch_manager', 'sales_executive', 'accounts_finance')
      and (branch_id = get_my_branch() or branch_id is null)
    )
  );

create policy "Sales can create bookings"
  on bookings for insert to authenticated
  with check (get_my_role() in ('owner', 'branch_manager', 'sales_executive'));

create policy "Manager and owner can update bookings"
  on bookings for update to authenticated
  using (has_role('owner') or has_role('branch_manager'));

-- -------- JOB CARDS --------
create policy "Technician sees only assigned jobs"
  on job_cards for select to authenticated
  using (
    has_role('owner')
    or has_role('branch_manager')
    or has_role('qc_inspector')
    or has_role('accounts_finance')
    or has_role('sales_executive')
    or (has_role('workshop_technician') and assigned_to = auth.uid())
  );

create policy "Manager can create job cards"
  on job_cards for insert to authenticated
  with check (get_my_role() in ('owner', 'branch_manager'));

create policy "Manager and technician can update job cards"
  on job_cards for update to authenticated
  using (
    has_role('owner')
    or has_role('branch_manager')
    or has_role('qc_inspector')
    or (has_role('workshop_technician') and assigned_to = auth.uid())
  );

-- -------- JOB CARD ITEMS --------
create policy "Job card item access mirrors job card access"
  on job_card_items for select to authenticated
  using (
    has_role('owner') or has_role('branch_manager') or has_role('qc_inspector')
    or has_role('sales_executive') or has_role('accounts_finance')
    or (has_role('workshop_technician') and assigned_to = auth.uid())
  );

create policy "Technician and manager can update job items"
  on job_card_items for update to authenticated
  using (
    has_role('owner') or has_role('branch_manager')
    or (has_role('workshop_technician') and assigned_to = auth.uid())
  );

-- -------- TIME LOGS --------
create policy "Technician can manage own time logs"
  on technician_time_logs for all to authenticated
  using (
    has_role('owner') or has_role('branch_manager')
    or technician_id = auth.uid()
  )
  with check (
    has_role('owner') or has_role('branch_manager')
    or technician_id = auth.uid()
  );

-- -------- JOB PHOTOS --------
create policy "Relevant roles can view job photos"
  on job_photos for select to authenticated
  using (
    has_role('owner') or has_role('branch_manager') or has_role('qc_inspector')
    or has_role('sales_executive') or has_role('accounts_finance')
    or (has_role('workshop_technician') and uploaded_by = auth.uid())
  );

create policy "Technician and QC can upload photos"
  on job_photos for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'workshop_technician', 'qc_inspector')
  );

-- -------- INVENTORY --------
create policy "All staff can view inventory"
  on inventory_items for select to authenticated using (true);

create policy "Manager and owner can manage inventory"
  on inventory_items for all to authenticated
  using (is_owner_or_manager())
  with check (is_owner_or_manager());

create policy "Technician can log consumption"
  on inventory_transactions for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'workshop_technician')
  );

create policy "Staff can view inventory transactions"
  on inventory_transactions for select to authenticated using (true);

-- -------- QC --------
create policy "QC and above can view QC templates"
  on qc_checklist_templates for select to authenticated using (true);

create policy "QC inspector and manager can view QC records"
  on qc_records for select to authenticated
  using (
    has_role('owner') or has_role('branch_manager') or has_role('qc_inspector')
    or has_role('sales_executive') or has_role('accounts_finance')
  );

create policy "QC inspector can create and update QC records"
  on qc_records for all to authenticated
  using (
    has_role('owner') or has_role('branch_manager')
    or (has_role('qc_inspector') and inspector_id = auth.uid())
  )
  with check (
    has_role('owner') or has_role('branch_manager')
    or (has_role('qc_inspector') and inspector_id = auth.uid())
  );

create policy "QC checklist results access mirrors QC records"
  on qc_checklist_results for all to authenticated
  using (has_role('owner') or has_role('branch_manager') or has_role('qc_inspector'))
  with check (has_role('owner') or has_role('branch_manager') or has_role('qc_inspector'));

-- -------- INVOICES --------
create policy "Accounts and above can view invoices"
  on invoices for select to authenticated
  using (
    has_role('owner') or has_role('branch_manager')
    or has_role('accounts_finance') or has_role('sales_executive')
  );

create policy "Accounts and sales can create invoices"
  on invoices for insert to authenticated
  with check (
    get_my_role() in ('owner', 'branch_manager', 'accounts_finance', 'sales_executive')
  );

-- CRITICAL: invoice edits blocked by trigger if locked; RLS also restricts
create policy "Accounts can edit unlocked invoices"
  on invoices for update to authenticated
  using (
    (has_role('owner') or has_role('accounts_finance') or has_role('sales_executive'))
    and is_locked = false
  );

create policy "Invoice items access mirrors invoice"
  on invoice_items for all to authenticated
  using (has_role('owner') or has_role('branch_manager') or has_role('accounts_finance') or has_role('sales_executive'))
  with check (has_role('owner') or has_role('branch_manager') or has_role('accounts_finance') or has_role('sales_executive'));

-- -------- PAYMENTS --------
create policy "Accounts and above can view payments"
  on payments for select to authenticated
  using (
    has_role('owner') or has_role('branch_manager') or has_role('accounts_finance')
  );

create policy "Accounts can record payments"
  on payments for insert to authenticated
  with check (
    get_my_role() in ('owner', 'accounts_finance')
  );

-- -------- AUDIT LOGS --------
create policy "Owner and manager can view audit logs"
  on audit_logs for select to authenticated
  using (has_role('owner') or has_role('branch_manager'));

create policy "System can insert audit logs"
  on audit_logs for insert to authenticated using (true) with check (true);

-- No UPDATE or DELETE policies — blocked by trigger

-- -------- OVERRIDE LOGS --------
create policy "Owner can view all override logs"
  on override_logs for select to authenticated
  using (has_role('owner') or has_role('branch_manager'));

create policy "Only owner can create override logs"
  on override_logs for insert to authenticated
  with check (has_role('owner') or has_role('branch_manager'));

-- ---------------------------------------------------------------------------
-- SEED DATA
-- ---------------------------------------------------------------------------

-- Default branch
insert into branches (id, name, city) values
  ('00000000-0000-0000-0000-000000000001', 'AOTIC HQ', 'Headquarters');

-- 6 Business Verticals (docs: data-dictionary.md §1)
insert into verticals (id, code, name, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'audio_acoustics',       'Audio & Acoustics', 1),
  ('10000000-0000-0000-0000-000000000002', 'interior_themes',       'Interior Themes & Custom Seat Designs', 2),
  ('10000000-0000-0000-0000-000000000003', 'sun_protection_ppf',    'Sun Protection Film, PPF & Detailing', 3),
  ('10000000-0000-0000-0000-000000000004', 'oem_upgrades',          'Base-to-Top OEM Upgrades', 4),
  ('10000000-0000-0000-0000-000000000005', 'custom_cores',          'Custom Cores (Headlights, Conversions, Body Kits)', 5),
  ('10000000-0000-0000-0000-000000000006', 'lighting_visibility',   'Lighting & Visibility Solutions', 6);

-- 4 Pricing Tiers (docs: data-dictionary.md §2)
insert into pricing_tier_config (tier, label, description, sort_order) values
  ('essential', 'Essential', 'Entry-level package with core features', 1),
  ('enhanced',  'Enhanced',  'Mid-range package with additional benefits', 2),
  ('elite',     'Elite',     'Premium package with advanced features', 3),
  ('luxe',      'Luxe',      'Top-tier package with full luxury offerings', 4);

-- 4 Car Segments (docs: data-dictionary.md §2)
insert into car_segment_config (segment, label, sort_order) values
  ('hatchback', 'Hatchback', 1),
  ('sedan',     'Sedan',     2),
  ('suv',       'SUV',       3),
  ('luxury',    'Luxury',    4);

-- Lost deal reason codes (docs: core-workflows.md §1)
insert into lost_reasons (code, label, sort_order) values
  ('price_too_high',       'Price Too High', 1),
  ('chose_competitor',     'Chose Competitor', 2),
  ('budget_constraints',   'Budget Constraints', 3),
  ('not_interested',       'No Longer Interested', 4),
  ('wrong_timing',         'Wrong Timing', 5),
  ('no_response',          'No Response / Unreachable', 6),
  ('service_not_available','Service Not Available', 7),
  ('other',                'Other (specify in notes)', 8);

-- Discount reason codes (docs: business-rules.md §4)
insert into discount_reasons (code, label) values
  ('loyalty_discount',     'Customer Loyalty Discount'),
  ('bulk_services',        'Multiple Services Bundle'),
  ('repeat_customer',      'Repeat Customer Benefit'),
  ('referral_bonus',       'Referral Discount'),
  ('promotional_offer',    'Promotional / Campaign Offer'),
  ('competitive_match',    'Competitive Price Match'),
  ('management_approved',  'Management Special Approval'),
  ('other',                'Other (specify in notes)');

-- QC Checklist Templates per vertical (representative items)
-- Audio & Acoustics
insert into qc_checklist_templates (vertical_id, item_order, check_point) values
  ('10000000-0000-0000-0000-000000000001', 1,  'All speakers operational and producing clear sound'),
  ('10000000-0000-0000-0000-000000000001', 2,  'No rattles or vibrations from panels/doors at high volume'),
  ('10000000-0000-0000-0000-000000000001', 3,  'Head unit / screen functions correctly'),
  ('10000000-0000-0000-0000-000000000001', 4,  'All wiring concealed and secured properly'),
  ('10000000-0000-0000-0000-000000000001', 5,  'Amplifier / subwoofer properly mounted and functioning'),
  ('10000000-0000-0000-0000-000000000001', 6,  'Soundproofing material applied correctly without bubbles');

-- Interior Themes & Custom Seat Designs
insert into qc_checklist_templates (vertical_id, item_order, check_point) values
  ('10000000-0000-0000-0000-000000000002', 1,  'Seat upholstery aligned and stitching uniform'),
  ('10000000-0000-0000-0000-000000000002', 2,  'Dashboard wrap/trim applied without bubbles or peeling'),
  ('10000000-0000-0000-0000-000000000002', 3,  'Floor mats fit correctly and secured'),
  ('10000000-0000-0000-0000-000000000002', 4,  'Interior lighting functioning and evenly distributed'),
  ('10000000-0000-0000-0000-000000000002', 5,  'No loose panels or trim pieces'),
  ('10000000-0000-0000-0000-000000000002', 6,  'Overall color/theme consistency matches quotation spec');

-- Sun Protection Film, PPF & Detailing
insert into qc_checklist_templates (vertical_id, item_order, check_point) values
  ('10000000-0000-0000-0000-000000000003', 1,  'No dust particles or bubbles under film'),
  ('10000000-0000-0000-0000-000000000003', 2,  'Edges sealed without peeling or lifting'),
  ('10000000-0000-0000-0000-000000000003', 3,  'Film coverage matches job card specification (panels covered)'),
  ('10000000-0000-0000-0000-000000000003', 4,  'Paint correction work verified (swirl-free finish)'),
  ('10000000-0000-0000-0000-000000000003', 5,  'Ceramic coating applied uniformly (if applicable)'),
  ('10000000-0000-0000-0000-000000000003', 6,  'Vehicle exterior cleaned and inspected post-application');

-- Base-to-Top OEM Upgrades
insert into qc_checklist_templates (vertical_id, item_order, check_point) values
  ('10000000-0000-0000-0000-000000000004', 1,  'All OEM parts installed correctly per manufacturer spec'),
  ('10000000-0000-0000-0000-000000000004', 2,  'No warning lights on dashboard post-installation'),
  ('10000000-0000-0000-0000-000000000004', 3,  'All electrical connections secure and functioning'),
  ('10000000-0000-0000-0000-000000000004', 4,  'Test drive completed (if applicable)'),
  ('10000000-0000-0000-0000-000000000004', 5,  'Original parts returned to customer (if requested)'),
  ('10000000-0000-0000-0000-000000000004', 6,  'Warranty documentation prepared and attached');

-- Custom Cores (Headlights/Conversions/Body Kits)
insert into qc_checklist_templates (vertical_id, item_order, check_point) values
  ('10000000-0000-0000-0000-000000000005', 1,  'Headlights/DRLs aligned and beam pattern correct'),
  ('10000000-0000-0000-0000-000000000005', 2,  'Body kit panels flush-fitted with no gaps or misalignment'),
  ('10000000-0000-0000-0000-000000000005', 3,  'Paint match on new panels consistent with vehicle'),
  ('10000000-0000-0000-0000-000000000005', 4,  'No water ingress risk points identified'),
  ('10000000-0000-0000-0000-000000000005', 5,  'All mounting bolts/clips torqued to spec'),
  ('10000000-0000-0000-0000-000000000005', 6,  'Conversion unit functioning as per spec (projectors, LEDs)');

-- Lighting & Visibility Solutions
insert into qc_checklist_templates (vertical_id, item_order, check_point) values
  ('10000000-0000-0000-0000-000000000006', 1,  'All installed lights functioning at correct intensity'),
  ('10000000-0000-0000-0000-000000000006', 2,  'Wiring harness routed and secured away from heat sources'),
  ('10000000-0000-0000-0000-000000000006', 3,  'No flickering or intermittent behavior'),
  ('10000000-0000-0000-0000-000000000006', 4,  'Amber/white compliance check for indicator/running lights'),
  ('10000000-0000-0000-0000-000000000006', 5,  'Rear visibility (reversing camera, parking sensors) operational'),
  ('10000000-0000-0000-0000-000000000006', 6,  'Dash cam / ADAS systems calibrated (if applicable)');
