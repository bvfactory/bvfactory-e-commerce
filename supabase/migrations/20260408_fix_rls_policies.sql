-- =============================================
-- Security Fix: Restrict RLS policies
-- All USING(true) policies replaced with proper role-based access
-- =============================================

-- ── Orders ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow read by activation_code" ON orders;
DROP POLICY IF EXISTS "Allow update orders" ON orders;

-- Anon can INSERT orders (checkout flow creates pending orders)
CREATE POLICY "Allow anon insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Only service_role can SELECT orders (all reads go through server-side API)
CREATE POLICY "Allow read orders via service role"
  ON orders FOR SELECT
  USING (auth.role() = 'service_role');

-- Only service_role can UPDATE orders (webhooks use admin client)
CREATE POLICY "Allow update orders via service role"
  ON orders FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── Licenses ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Licenses readable via service role" ON licenses;
DROP POLICY IF EXISTS "Licenses insertable via service role" ON licenses;
DROP POLICY IF EXISTS "Licenses updatable via service role" ON licenses;

CREATE POLICY "Licenses readable via service role"
  ON licenses FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Licenses insertable via service role"
  ON licenses FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Licenses updatable via service role"
  ON licenses FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── Discount codes ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Discount codes are readable" ON discount_codes;

-- Anon can SELECT (checkout validation needs this)
CREATE POLICY "Discount codes are readable"
  ON discount_codes FOR SELECT
  USING (true);

-- Only service_role can modify discount codes
CREATE POLICY "Discount codes modifiable via service role"
  ON discount_codes FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Discount codes updatable via service role"
  ON discount_codes FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Discount codes deletable via service role"
  ON discount_codes FOR DELETE
  USING (auth.role() = 'service_role');

-- ── Product settings ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Product settings readable by everyone" ON product_settings;
DROP POLICY IF EXISTS "Product settings modifiable via service role" ON product_settings;

-- Anon can read (storefront needs prices/product data)
CREATE POLICY "Product settings readable by everyone"
  ON product_settings FOR SELECT
  USING (true);

-- Only service_role can modify
CREATE POLICY "Product settings modifiable via service role"
  ON product_settings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Product settings updatable via service role"
  ON product_settings FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Product settings deletable via service role"
  ON product_settings FOR DELETE
  USING (auth.role() = 'service_role');

-- ── Atomic discount validation ──────────────────────────────────────

-- Atomically validate AND increment discount usage in one operation.
-- Prevents TOCTOU race conditions on limited-use codes.
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
