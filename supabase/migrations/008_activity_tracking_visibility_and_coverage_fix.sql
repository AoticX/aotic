-- Session 13 (2026-04-03)
-- Activity tracking: visibility hardening + broader trigger coverage.

-- Backfill actor for legacy rows where possible.
update public.audit_logs
set performed_by = coalesce(performed_by, user_id)
where performed_by is null and user_id is not null;

-- Ensure actor foreign key exists for profile name resolution.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'audit_logs'
      and c.conname = 'audit_logs_performed_by_fkey'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_performed_by_fkey
      foreign key (performed_by) references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_audit_logs_performed_by on public.audit_logs(performed_by);
create index if not exists idx_audit_logs_performed_at on public.audit_logs(performed_at desc);

create or replace function public.audit_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  action_type text;
  rec_id uuid;
  old_json jsonb;
  new_json jsonb;
  status_old text;
  status_new text;
begin
  actor := auth.uid();

  if tg_op = 'INSERT' then
    action_type := 'create';
    old_json := null;
    new_json := to_jsonb(new);
    rec_id := public.try_parse_uuid(new_json->>'id');
  elsif tg_op = 'UPDATE' then
    old_json := to_jsonb(old);
    new_json := to_jsonb(new);
    rec_id := public.try_parse_uuid(coalesce(new_json->>'id', old_json->>'id'));

    status_old := old_json->>'status';
    status_new := new_json->>'status';
    if status_old is distinct from status_new and (status_old is not null or status_new is not null) then
      action_type := 'status_change';
    else
      action_type := 'update';
    end if;
  else
    action_type := 'delete';
    old_json := to_jsonb(old);
    new_json := null;
    rec_id := public.try_parse_uuid(old_json->>'id');
  end if;

  insert into public.audit_logs (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    performed_at,
    notes
  )
  values (
    action_type,
    tg_table_name,
    rec_id,
    old_json,
    new_json,
    actor,
    now(),
    case
      when action_type = 'status_change' then concat('Status changed on ', tg_table_name)
      else null
    end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

do $$
declare
  t text;
  tables_to_track text[] := array[
    'leads',
    'lead_verticals',
    'customers',
    'quotations',
    'quotation_items',
    'bookings',
    'job_cards',
    'job_tasks',
    'job_photos',
    'technician_time_logs',
    'qc_records',
    'qc_checklist_results',
    'qc_sessions',
    'qc_responses',
    'invoices',
    'invoice_items',
    'payments',
    'inventory_items',
    'inventory_transactions',
    'job_parts_used',
    'job_issues',
    'communications',
    'lead_activities',
    'attendance',
    'employees',
    'salary_payments',
    'delivery_certificates',
    'delivery_events',
    'whatsapp_conversations',
    'whatsapp_messages'
  ];
begin
  foreach t in array tables_to_track loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', 'trg_audit_activity', t);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_activity_trigger()'
        , 'trg_audit_activity'
        , t
      );
    end if;
  end loop;
end $$;
