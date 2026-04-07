-- Session (2026-04-07)
-- Add proof_url to payments for advance payment proof tracking
-- Ensure advance_percentage setting exists in system_settings

ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url text;

INSERT INTO system_settings (key, value, category)
VALUES ('advance_percentage', '{"default": 50, "override_requires": "owner"}'::jsonb, 'business')
ON CONFLICT (key) DO NOTHING;
