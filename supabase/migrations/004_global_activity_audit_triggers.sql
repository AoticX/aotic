-- Session 12 (2026-04-03)
-- Global activity logging across departments for owner/manager visibility.

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
begin
  actor := auth.uid();

  if tg_op = 'INSERT' then
    action_type := 'create';
    rec_id := (to_jsonb(new)->>'id')::uuid;
    old_json := null;
    new_json := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    if coalesce(to_jsonb(old)->>'status', '') is distinct from coalesce(to_jsonb(new)->>'status', '') then
      action_type := 'status_change';
    else
      action_type := 'update';
    end if;
    rec_id := (to_jsonb(new)->>'id')::uuid;
    old_json := to_jsonb(old);
    new_json := to_jsonb(new);
  else
    action_type := 'delete';
    rec_id := (to_jsonb(old)->>'id')::uuid;
    old_json := to_jsonb(old);
    new_json := null;
  end if;

  insert into public.audit_logs (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    notes
  ) values (
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

-- Drop old triggers if re-running migration script manually.
drop trigger if exists trg_audit_leads on public.leads;
drop trigger if exists trg_audit_quotations on public.quotations;
drop trigger if exists trg_audit_quotation_items on public.quotation_items;
drop trigger if exists trg_audit_bookings on public.bookings;
drop trigger if exists trg_audit_job_cards on public.job_cards;
drop trigger if exists trg_audit_job_tasks on public.job_tasks;
drop trigger if exists trg_audit_qc_records on public.qc_records;
drop trigger if exists trg_audit_qc_checklist_results on public.qc_checklist_results;
drop trigger if exists trg_audit_invoices on public.invoices;
drop trigger if exists trg_audit_invoice_items on public.invoice_items;
drop trigger if exists trg_audit_payments on public.payments;
drop trigger if exists trg_audit_inventory_items on public.inventory_items;
drop trigger if exists trg_audit_inventory_transactions on public.inventory_transactions;
drop trigger if exists trg_audit_job_issues on public.job_issues;
drop trigger if exists trg_audit_communications on public.communications;
drop trigger if exists trg_audit_lead_activities on public.lead_activities;
drop trigger if exists trg_audit_salary_payments on public.salary_payments;
drop trigger if exists trg_audit_attendance on public.attendance;

create trigger trg_audit_leads
after insert or update or delete on public.leads
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_quotations
after insert or update or delete on public.quotations
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_quotation_items
after insert or update or delete on public.quotation_items
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_bookings
after insert or update or delete on public.bookings
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_job_cards
after insert or update or delete on public.job_cards
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_job_tasks
after insert or update or delete on public.job_tasks
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_qc_records
after insert or update or delete on public.qc_records
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_qc_checklist_results
after insert or update or delete on public.qc_checklist_results
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_invoices
after insert or update or delete on public.invoices
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_invoice_items
after insert or update or delete on public.invoice_items
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_payments
after insert or update or delete on public.payments
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_inventory_items
after insert or update or delete on public.inventory_items
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_inventory_transactions
after insert or update or delete on public.inventory_transactions
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_job_issues
after insert or update or delete on public.job_issues
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_communications
after insert or update or delete on public.communications
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_lead_activities
after insert or update or delete on public.lead_activities
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_salary_payments
after insert or update or delete on public.salary_payments
for each row execute function public.audit_activity_trigger();

create trigger trg_audit_attendance
after insert or update or delete on public.attendance
for each row execute function public.audit_activity_trigger();
