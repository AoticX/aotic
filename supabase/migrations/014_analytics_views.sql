-- Migration 014: Analytics Views
-- Creates the three aggregate views referenced by owner/manager dashboard pages.
-- These views were missing from all prior migrations.

-- ── Revenue Summary ── (owner dashboard KPIs)
create or replace view public.revenue_summary_view as
select
  (select coalesce(sum(total_amount), 0)
   from public.invoices
   where status in ('finalized', 'partially_paid', 'paid'))    as total_revenue,

  (select coalesce(sum(amount), 0)
   from public.payments)                                        as total_collected,

  (select coalesce(sum(amount_due), 0)
   from public.invoices
   where status in ('finalized', 'partially_paid'))            as total_outstanding,

  (select count(*)
   from public.job_cards
   where status = 'delivered')                                  as total_completed_jobs;

-- ── Conversion Funnel ── (owner → reports → sales)
create or replace view public.conversion_funnel_view as
select
  (select count(*) from public.leads)                                             as total_leads,
  (select count(distinct lead_id) from public.quotations)                        as leads_with_quotation,
  (select count(distinct lead_id) from public.bookings)                          as leads_with_booking,
  (select count(distinct b.lead_id)
   from public.job_cards jc
   join public.bookings b on b.id = jc.booking_id)                               as leads_with_job,
  (select count(*) from public.leads where status = 'lost')                      as leads_lost,

  round(
    100.0 * (select count(distinct lead_id) from public.quotations)
    / nullif((select count(*) from public.leads), 0), 2
  )                                                                               as quotation_rate,

  round(
    100.0 * (select count(distinct lead_id) from public.bookings)
    / nullif((select count(*) from public.leads), 0), 2
  )                                                                               as booking_rate,

  round(
    100.0 * (select count(distinct b.lead_id)
             from public.job_cards jc
             join public.bookings b on b.id = jc.booking_id)
    / nullif((select count(*) from public.leads), 0), 2
  )                                                                               as job_rate;

-- ── Technician Performance ── (owner → reports → sales)
create or replace view public.technician_performance_view as
select
  p.full_name                                                                     as technician_name,
  count(jc.id) filter (where jc.status = 'delivered')                            as jobs_completed,
  round(
    avg(
      extract(epoch from (
        coalesce(jc.delivered_at, jc.updated_at) - jc.created_at
      )) / 3600.0
    ) filter (where jc.status = 'delivered'),
    1
  )                                                                               as avg_completion_hours,
  round(
    100.0 * count(jc.id) filter (where jc.status = 'rework_scheduled')
    / nullif(count(jc.id), 0),
    2
  )                                                                               as comeback_rate
from public.profiles p
left join public.job_cards jc on jc.assigned_to = p.id
where p.role = 'workshop_technician'
group by p.id, p.full_name;
