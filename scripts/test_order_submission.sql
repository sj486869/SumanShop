-- Test Order Submission Flow
-- Run this to verify the order submission process works correctly

-- ======================================================
-- 1️⃣ Check Current Database State
-- ======================================================
SELECT 'DATABASE STATE CHECK:' as debug_info;

-- Check if required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products', 'orders', 'payment_proofs', 'payment_methods')
ORDER BY table_name;

-- Check orders table structure
SELECT 'ORDERS TABLE COLUMNS:' as debug_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================================================
-- 2️⃣ Check Products Available for Purchase
-- ======================================================
SELECT 'AVAILABLE PRODUCTS:' as debug_info;
SELECT id, title, price, stock, download_url 
FROM public.products 
WHERE stock > 0
ORDER BY title;

-- ======================================================
-- 3️⃣ Check Test User Exists
-- ======================================================
SELECT 'TEST USER CHECK:' as debug_info;
SELECT id, name, email, role, created_at 
FROM public.users 
WHERE email = 'test@example.com'
LIMIT 1;

-- If user doesn't exist, create it
INSERT INTO public.users (id, name, email, password, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test@example.com', 'password123', 'user')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

-- ======================================================
-- 4️⃣ Simulate Order Creation (Test the INSERT)
-- ======================================================
SELECT 'TESTING ORDER CREATION:' as debug_info;

-- Test inserting a sample order
WITH test_product AS (
    SELECT id, title, price FROM public.products LIMIT 1
)
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
    price,
    'PhonePe UPI',
    'pending'
FROM test_product
RETURNING id, user_id, product_id, total_amount, payment_method, status, created_at;

-- ======================================================
-- 5️⃣ Check if Payment Proofs Table Works
-- ======================================================
SELECT 'TESTING PAYMENT PROOFS:' as debug_info;

-- Test inserting a payment proof
WITH latest_order AS (
    SELECT id FROM public.orders 
    WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
    ORDER BY created_at DESC LIMIT 1
)
INSERT INTO public.payment_proofs (
    user_id,
    order_id,
    file_path
)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    id,
    'payment-proofs/test-user/test-proof.jpg'
FROM latest_order
RETURNING id, user_id, order_id, file_path, created_at;

-- ======================================================
-- 6️⃣ Check Payment Methods
-- ======================================================
SELECT 'PAYMENT METHODS CHECK:' as debug_info;
SELECT method_name, active, upi_qr, binance_qr, paypal_qr 
FROM public.payment_methods 
WHERE active = true;

-- ======================================================
-- 7️⃣ Final Verification - Check All User Orders
-- ======================================================
SELECT 'USER ORDERS SUMMARY:' as debug_info;
SELECT 
    o.id,
    o.user_id,
    o.status,
    o.payment_method,
    o.total_amount,
    o.quantity,
    o.created_at,
    p.title as product_title,
    p.download_url,
    pp.file_path as payment_proof
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
LEFT JOIN public.payment_proofs pp ON o.id = pp.order_id
WHERE o.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
ORDER BY o.created_at DESC;

-- ======================================================
-- 8️⃣ Check Dashboard Query (What the frontend uses)
-- ======================================================
SELECT 'DASHBOARD QUERY TEST:' as debug_info;
SELECT 
    o.id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.payment_method,
    o.status,
    o.created_at,
    p.id as product_id_check,
    p.title,
    p.image_url,
    p.download_url,
    p.price
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
WHERE o.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
ORDER BY o.created_at DESC;

-- ======================================================
-- 9️⃣ Row Level Security Status
-- ======================================================
SELECT 'RLS STATUS:' as debug_info;
SELECT 
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'products', 'orders', 'payment_proofs', 'payment_methods');

-- ======================================================
-- ✅ SUMMARY
-- ======================================================
SELECT 'TEST SUMMARY:' as debug_info;
SELECT 
    (SELECT COUNT(*) FROM public.users WHERE email = 'test@example.com') as test_users,
    (SELECT COUNT(*) FROM public.products WHERE stock > 0) as available_products,
    (SELECT COUNT(*) FROM public.orders WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid) as user_orders,
    (SELECT COUNT(*) FROM public.payment_methods WHERE active = true) as active_payment_methods,
    (SELECT COUNT(*) FROM public.payment_proofs WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid) as payment_proofs;