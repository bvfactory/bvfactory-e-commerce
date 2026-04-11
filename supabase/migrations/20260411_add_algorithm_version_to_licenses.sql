-- Add algorithm_version column to licenses table
-- This column was referenced in code (checkout + webhook) but missing from the schema,
-- causing silent insert failures and licenses stuck in PENDING.
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS algorithm_version TEXT DEFAULT 'hmac-sha256-v1';
