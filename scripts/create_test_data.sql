-- Test data creation script for debugging orders issue
-- Run this in Supabase SQL Editor after running your main schema

-- 1. First, make sure we have products
INSERT INTO public.products (title, description, price, image_url, download_url, stock) VALUES 
    ('Test Digital Product', 'A test digital product for debugging', 29.99, '/toolkit-bundle.jpg', 'https://example.com/download/test', 100),
    ('Test Premium Pack', 'Premium test package', 49.99, '/digital-product-abstract.jpg', 'https://example.com/download/premium', 50)
ON CONFLICT DO NOTHING;

-- 2. Create a test user (if using public.users table)
INSERT INTO public.users (id, email, name, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User', 'user')
ON CONFLICT (id) DO NOTHING;

-- 3. Create test orders for the test user
WITH product_ids AS (
    SELECT id FROM public.products LIMIT 2
),
user_id AS (
    SELECT '550e8400-e29b-41d4-a716-446655440000'::uuid as id
)
INSERT INTO public.orders (user_id, product_id, quantity, total_amount, payment_method, status) 
SELECT 
    user_id.id,
    product_ids.id,
    1,
    29.99,
    'PhonePe UPI',
    'pending'
FROM user_id, product_ids
LIMIT 2
ON CONFLICT DO NOTHING;

-- 4. Create one confirmed order
INSERT INTO public.orders (
    user_id, 
    product_id, 
    quantity, 
    total_amount, 
    payment_method, 
    status
) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    id,
    1,
    49.99,
    'Binance Pay',
    'confirmed'
FROM public.products 
WHERE title = 'Test Premium Pack'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 5. Verify the test data
SELECT 'TEST USERS:' as info;
SELECT id, email, name FROM public.users WHERE email = 'test@example.com';

SELECT 'TEST PRODUCTS:' as info;
SELECT id, title, price FROM public.products WHERE title LIKE 'Test%';

SELECT 'TEST ORDERS:' as info;
SELECT 
    o.id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.payment_method,
    o.created_at,
    p.title as product_title
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
WHERE o.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
ORDER BY o.created_at DESC;