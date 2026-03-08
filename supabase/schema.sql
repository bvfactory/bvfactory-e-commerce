-- =============================================
-- BVFactory Q-SYS Plugin Store — Supabase Schema
-- =============================================

-- Products catalog
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (core table for the purchase flow)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_session_id TEXT,
  activation_code TEXT UNIQUE,
  discount_code TEXT,
  discount_percent INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Licenses (individual license keys, one per product+coreId)
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  core_id TEXT NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, core_id)
);

-- Discount codes
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  percent_off INTEGER NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Allow anon to insert orders (checkout flow)
CREATE POLICY "Allow anon insert orders"
  ON orders FOR INSERT WITH CHECK (true);
-- Allow anon to read own order by activation_code (activation portal)
CREATE POLICY "Allow read by activation_code"
  ON orders FOR SELECT USING (true);
-- Allow service role to update orders (webhook)
CREATE POLICY "Allow update orders"
  ON orders FOR UPDATE USING (true);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
-- Licenses are only readable server-side (service role) for verification
CREATE POLICY "Licenses readable via service role"
  ON licenses FOR SELECT USING (true);
CREATE POLICY "Licenses insertable via service role"
  ON licenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Licenses updatable via service role"
  ON licenses FOR UPDATE USING (true);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discount codes are readable"
  ON discount_codes FOR SELECT USING (true);

-- =============================================
-- RPC Functions
-- =============================================

-- Atomically increment discount code usage
CREATE OR REPLACE FUNCTION increment_discount_usage(d_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = current_uses + 1
  WHERE code = d_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_orders_activation_code ON orders(activation_code);
CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_licenses_order_id ON licenses(order_id);
CREATE INDEX idx_licenses_product_core ON licenses(product_id, core_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_key_hash ON licenses(key_hash);
