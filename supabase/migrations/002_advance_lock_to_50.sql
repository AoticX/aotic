-- Session 9 (2026-04-02)
-- Align booking advance hard lock with updated business policy: 50% minimum.

create or replace function enforce_advance_before_job_card()
returns trigger
language plpgsql
security definer
as $$
declare
  adv_pct numeric;
  override_exists boolean;
begin
  select b.advance_pct,
         (b.advance_override_by is not null and b.advance_override_note is not null)
    into adv_pct, override_exists
  from bookings b
  where b.id = new.booking_id;

  if adv_pct < 50 and not override_exists then
    raise exception 'HARD_LOCK: Job card requires minimum 50%% advance payment (current: %%%). Obtain a manager override with documented reason.',
      coalesce(adv_pct, 0)
      using errcode = 'P0007';
  end if;

  return new;
end;
$$;
