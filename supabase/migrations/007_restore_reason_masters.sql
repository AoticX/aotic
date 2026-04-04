-- Session 13 (2026-04-03)
-- Restore discount and lost reason master data when accidentally emptied.

insert into public.discount_reasons (label, is_active)
values
  ('Customer Loyalty Discount', true),
  ('Multiple Services Bundle', true),
  ('Repeat Customer Benefit', true),
  ('Referral Discount', true),
  ('Promotional / Campaign Offer', true),
  ('Competitive Price Match', true),
  ('Management Special Approval', true),
  ('Other (specify in notes)', true)
on conflict (label)
do update set is_active = true;

insert into public.lost_reasons (label, is_active)
values
  ('Price Too High', true),
  ('Chose Competitor', true),
  ('Budget Constraints', true),
  ('No Longer Interested', true),
  ('Wrong Timing', true),
  ('No Response / Unreachable', true),
  ('Service Not Available', true),
  ('Other (specify in notes)', true)
on conflict (label)
do update set is_active = true;
