-- Add algorithm_id column to product_settings
-- Allows each product to use a different license generation algorithm
ALTER TABLE product_settings
  ADD COLUMN IF NOT EXISTS algorithm_id TEXT DEFAULT 'hmac-sha256-v1';
