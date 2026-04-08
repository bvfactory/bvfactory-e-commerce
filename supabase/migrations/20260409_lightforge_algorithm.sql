-- Add algorithm_id column if not already present (idempotent with 20260408 migration)
ALTER TABLE product_settings
  ADD COLUMN IF NOT EXISTS algorithm_id TEXT DEFAULT 'hmac-sha256-v1';

-- Assign the LightForge FNV-1a algorithm to the LightForge product
UPDATE product_settings
SET algorithm_id = 'lightforge-fnv1a-v1'
WHERE product_id = 'lightforge';
