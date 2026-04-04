-- Session 13 (2026-04-03)
-- Restore critical master data if verticals/service packages were accidentally emptied.

with seed_verticals(name, description, sort_order, base_price) as (
  values
    ('Audio & Acoustics', 'Audio upgrades, damping, DSP tuning and related integrations', 1, 18000::numeric),
    ('Interior Themes & Custom Seat Designs', 'Seat upholstery, interior trims and cabin customization', 2, 22000::numeric),
    ('Sun Protection Film, PPF & Detailing', 'PPF, tinting, ceramic and detailing services', 3, 25000::numeric),
    ('Base-to-Top OEM Upgrades', 'OEM accessory upgrades and retrofit enhancements', 4, 20000::numeric),
    ('Custom Cores (Headlights, Conversions, Body Kits)', 'Custom fabrication, body kits and conversion work', 5, 30000::numeric),
    ('Lighting & Visibility Solutions', 'Headlight, fog, auxiliary and visibility upgrades', 6, 16000::numeric)
)
insert into public.verticals (name, description, sort_order, is_active)
select sv.name, sv.description, sv.sort_order, true
from seed_verticals sv
where not exists (select 1 from public.verticals);

with seed_verticals(name, sort_order, base_price) as (
  values
    ('Audio & Acoustics', 1, 18000::numeric),
    ('Interior Themes & Custom Seat Designs', 2, 22000::numeric),
    ('Sun Protection Film, PPF & Detailing', 3, 25000::numeric),
    ('Base-to-Top OEM Upgrades', 4, 20000::numeric),
    ('Custom Cores (Headlights, Conversions, Body Kits)', 5, 30000::numeric),
    ('Lighting & Visibility Solutions', 6, 16000::numeric)
)
insert into public.service_packages (vertical_id, name, tier, segment, base_price, is_active)
select
  v.id,
  v.name || ' - ' || initcap(t.tier::text) || ' (' || initcap(s.segment::text) || ')',
  t.tier,
  s.segment,
  round((sv.base_price * t.multiplier * s.multiplier)::numeric, 2),
  true
from public.verticals v
join seed_verticals sv on sv.name = v.name
cross join (values
  ('essential'::public.pricing_tier, 1.00::numeric),
  ('enhanced'::public.pricing_tier, 1.25::numeric),
  ('elite'::public.pricing_tier, 1.50::numeric),
  ('luxe'::public.pricing_tier, 1.85::numeric)
) as t(tier, multiplier)
cross join (values
  ('hatchback'::public.car_segment, 1.00::numeric),
  ('sedan'::public.car_segment, 1.15::numeric),
  ('suv'::public.car_segment, 1.35::numeric),
  ('luxury'::public.car_segment, 1.70::numeric)
) as s(segment, multiplier)
where not exists (select 1 from public.service_packages);
