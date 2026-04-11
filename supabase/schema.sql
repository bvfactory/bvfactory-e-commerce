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
  stripe_payment_intent_id TEXT,
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
  algorithm_version TEXT DEFAULT 'hmac-sha256-v1',
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
CREATE POLICY "Allow anon insert orders"
  ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read orders via service role"
  ON orders FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Allow update orders via service role"
  ON orders FOR UPDATE USING (auth.role() = 'service_role');

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Licenses readable via service role"
  ON licenses FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Licenses insertable via service role"
  ON licenses FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Licenses updatable via service role"
  ON licenses FOR UPDATE USING (auth.role() = 'service_role');

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discount codes are readable"
  ON discount_codes FOR SELECT USING (true);
CREATE POLICY "Discount codes modifiable via service role"
  ON discount_codes FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Discount codes updatable via service role"
  ON discount_codes FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Discount codes deletable via service role"
  ON discount_codes FOR DELETE USING (auth.role() = 'service_role');

-- =============================================
-- RPC Functions
-- =============================================

-- Atomically increment discount code usage (legacy, kept for compatibility)
CREATE OR REPLACE FUNCTION increment_discount_usage(d_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = current_uses + 1
  WHERE code = d_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically validate AND increment discount usage in one operation.
-- Returns the discount row if valid, empty set if invalid/exhausted.
-- This prevents TOCTOU race conditions on limited-use codes.
CREATE OR REPLACE FUNCTION try_use_discount(d_code TEXT)
RETURNS TABLE(id UUID, code TEXT, percent_off INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE discount_codes
  SET current_uses = current_uses + 1
  WHERE discount_codes.code = d_code
    AND active = true
    AND (expires_at IS NULL OR expires_at >= NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
  RETURNING discount_codes.id, discount_codes.code, discount_codes.percent_off;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically decrement discount usage on refund (floor at 0)
CREATE OR REPLACE FUNCTION decrement_discount_usage(d_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = GREATEST(current_uses - 1, 0)
  WHERE code = d_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_orders_activation_code ON orders(activation_code);
CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX idx_orders_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_licenses_order_id ON licenses(order_id);
CREATE INDEX idx_licenses_product_core ON licenses(product_id, core_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_key_hash ON licenses(key_hash);

-- Product settings (admin-managed price overrides & promotions)
CREATE TABLE product_settings (
  product_id TEXT PRIMARY KEY,
  price_cents INTEGER,
  promo_percent INTEGER CHECK (promo_percent IS NULL OR (promo_percent >= 0 AND promo_percent <= 100)),
  promo_active BOOLEAN DEFAULT false,
  promo_label TEXT,
  algorithm_id TEXT DEFAULT 'hmac-sha256-v1',
  content JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product settings readable by everyone"
  ON product_settings FOR SELECT USING (true);
CREATE POLICY "Product settings modifiable via service role"
  ON product_settings FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Product settings updatable via service role"
  ON product_settings FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Product settings deletable via service role"
  ON product_settings FOR DELETE USING (auth.role() = 'service_role');

-- Admin panel indexes
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_licenses_created_at ON licenses(created_at DESC);
