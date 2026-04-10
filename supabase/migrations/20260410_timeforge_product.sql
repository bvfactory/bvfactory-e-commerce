-- Add TimeForge product to product_settings with its dedicated FNV-1a algorithm
INSERT INTO product_settings (product_id, price_cents, algorithm_id)
VALUES ('timeforge', 25000, 'timeforge-fnv1a-v1')
ON CONFLICT (product_id) DO UPDATE
SET algorithm_id = 'timeforge-fnv1a-v1',
    price_cents = 25000;
