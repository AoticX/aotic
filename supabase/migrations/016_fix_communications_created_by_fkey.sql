-- communications.created_by was FK'd to auth.users instead of public.profiles.
-- PostgREST couldn't resolve the profiles(full_name) relational join, so the
-- activity log query silently returned null and showed "No activity logged yet."
-- Fix: re-point the FK to profiles and make the column nullable to match SET NULL.

ALTER TABLE communications DROP CONSTRAINT communications_created_by_fkey;

ALTER TABLE communications
  ADD CONSTRAINT communications_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE communications ALTER COLUMN created_by DROP NOT NULL;
