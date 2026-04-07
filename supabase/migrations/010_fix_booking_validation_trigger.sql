-- Session (2026-04-07)
-- Fix validate_booking_creation trigger to accept both 'accepted' and 'approved'
-- quotation statuses.
--
-- 'accepted' = customer accepted the quote (normal booking path via app workflow)
-- 'approved' = owner approved a high-discount quote (also valid for booking)
--
-- The trigger previously hard-coded only 'approved', blocking all normal bookings.

CREATE OR REPLACE FUNCTION public.validate_booking_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q_status text;
  q_discount_percent numeric;
  q_discount_approved_by uuid;
  threshold numeric := 5;
  settings_val jsonb;
BEGIN
  SELECT status, discount_percent, discount_approved_by
  INTO q_status, q_discount_percent, q_discount_approved_by
  FROM public.quotations WHERE id = NEW.quotation_id;

  -- Allow booking from 'accepted' (customer accepted) or 'approved' (owner approved discount)
  IF q_status NOT IN ('accepted', 'approved') THEN
    RAISE EXCEPTION 'Cannot create booking: quotation must be accepted by the customer (current status: %)', q_status;
  END IF;

  SELECT value INTO settings_val FROM public.system_settings WHERE key = 'discount_rules';
  IF settings_val IS NOT NULL THEN
    threshold := COALESCE((settings_val->>'max_without_approval')::numeric, 5);
  END IF;

  IF q_discount_percent > threshold AND q_discount_approved_by IS NULL THEN
    RAISE EXCEPTION 'Cannot create booking: discount requires owner approval first';
  END IF;

  RETURN NEW;
END;
$$;
