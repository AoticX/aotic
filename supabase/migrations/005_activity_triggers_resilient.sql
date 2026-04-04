-- Session 13 (2026-04-03)
-- Resilient global activity trigger setup.
-- This migration safely attaches audit triggers only to tables that exist,
-- preventing full migration failure when optional module tables are absent.

create or replace function public.try_parse_uuid(v text)
returns uuid
language plpgsql
immutable
as $$
begin
  if v is null or length(trim(v)) = 0 then
    return null;
  end if;
  return v::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.audit_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  action_type audit_action;
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
    notes
  )
  values (
    action_type,
    tg_table_name,
    rec_id,
    old_json,
    new_json,
    actor,
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
    'quotations',
    'quotation_items',
    'bookings',
    'job_cards',
    'job_tasks',
    'qc_records',
    'qc_checklist_results',
    'invoices',
    'invoice_items',
    'payments',
    'inventory_items',
    'inventory_transactions',
    'job_issues',
    'communications',
    'lead_activities',
    'salary_payments',
    'attendance'
  ];
begin
  foreach t in array tables_to_track loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', 'trg_audit_' || t, t);
      execute format('drop trigger if exists %I on public.%I', 'trg_audit_activity', t);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_activity_trigger()'
        , 'trg_audit_activity'
        , t
      );
    end if;
  end loop;
end $$;
