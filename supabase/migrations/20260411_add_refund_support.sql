-- Add stripe_payment_intent_id to orders for refund support
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(stripe_payment_intent_id);

-- Function to decrement discount usage on refund (floor at 0)
CREATE OR REPLACE FUNCTION decrement_discount_usage(d_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = GREATEST(current_uses - 1, 0)
  WHERE code = d_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
