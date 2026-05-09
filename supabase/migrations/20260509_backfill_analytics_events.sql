-- Backfill analytics_events from existing data.
-- Run once after the initial analytics_events table is created.
-- Page views and plugin downloads have no historical data and cannot be backfilled.

-- checkout_initiated: one event per (order × item), dated at order creation
insert into public.analytics_events (event_type, product_id, created_at)
select
    'checkout_initiated',
    item -> 'product' ->> 'id',
    o.created_at
from public.orders o,
     jsonb_array_elements(o.items) as item
where o.items is not null
  and jsonb_typeof(o.items) = 'array';

-- license_activated: one event per licence row, dated at licence creation
insert into public.analytics_events (event_type, product_id, created_at)
select
    'license_activated',
    product_id,
    created_at
from public.licenses;
