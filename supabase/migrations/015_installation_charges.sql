-- =============================================================================
-- AOTIC CRM — Migration 015: Installation Charges & Vehicle Label
-- Adds installation_base, installation_gst columns to quotations for the
-- separate GST-exclusive installation pricing section, and vehicle_label
-- for a free-text vehicle override on the quotation builder.
-- =============================================================================

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS installation_base numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installation_gst  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_label     text;
