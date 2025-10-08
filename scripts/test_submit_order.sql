-- =====================================================
-- TEST SCRIPT FOR SUBMIT ORDER FUNCTIONALITY
-- Run this in Supabase SQL Editor AFTER setup
-- =====================================================

-- 1. Verify table structures
SELECT 'Table Verification' as check_type;

SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('orders', 'products', 'payment_methods', 'payment_proofs')
ORDER BY table_name, ordinal_position;

-- 2. Check if tables have data
SELECT 'Data Verification' as check_type;

SELECT 
    'orders' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders
FROM orders
UNION ALL
SELECT 
    'products' as table_name, 
    COUNT(*) as record_count,
    AVG(price)::DECIMAL(10,2) as avg_price,
    COUNT(CASE WHEN download_url IS NOT NULL THEN 1 END) as with_download_url
FROM products
UNION ALL
SELECT 
    'payment_methods' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_methods,
    0 as extra_info
FROM payment_methods
UNION ALL
SELECT 
    'payment_proofs' as table_name, 
    COUNT(*) as record_count,
    0 as extra_info1,
    0 as extra_info2
FROM payment_proofs;

-- 3. Test insert order (simulate what the frontend does)
INSERT INTO orders (
    user_id, 
    product_id, 
    quantity, 
    total_amount, 
    payment_method, 
    status
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM products LIMIT 1),
    1,
    29.99,
    'binance',
    'pending'
) RETURNING id, user_id, product_id, total_amount, payment_method, status, created_at;

-- 4. Test payment proof insert
INSERT INTO payment_proofs (
    user_id,
    order_id,
    file_path
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM orders WHERE user_id = '11111111-1111-1111-1111-111111111111' ORDER BY created_at DESC LIMIT 1),
    'payment-proofs/test/test-proof.jpg'
) RETURNING id, user_id, order_id, file_path, created_at;

-- 5. Show complete order data with joins (what the dashboard/admin sees)
SELECT 'Complete Order View' as view_type;

SELECT 
    o.id as order_id,
    o.user_id,
    p.name as product_name,
    p.price as product_price,
    o.quantity,
    o.total_amount,
    o.payment_method,
    o.status,
    pp.file_path as payment_proof,
    o.created_at as order_date
FROM orders o
JOIN products p ON p.id = o.product_id
LEFT JOIN payment_proofs pp ON pp.order_id = o.id
WHERE o.user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY o.created_at DESC;

-- 6. Test queries that the frontend will use

-- Dashboard query (user's orders)
SELECT 'Dashboard Orders Query' as query_type;
SELECT 
    o.id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.payment_method,
    o.status,
    o.created_at,
    p.name as product_name,
    p.description as product_description,
    p.image as product_image,
    p.download_url as product_download_url
FROM orders o
JOIN products p ON p.id = o.product_id  
WHERE o.user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY o.created_at DESC;

-- Admin orders query (all orders)
SELECT 'Admin Orders Query' as query_type;
SELECT 
    o.id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.payment_method,
    o.status,
    o.created_at,
    p.name as product_name,
    pp.file_path as payment_proof_path
FROM orders o
JOIN products p ON p.id = o.product_id
LEFT JOIN payment_proofs pp ON pp.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 10;

-- Payment methods query (for checkout page)
SELECT 'Payment Methods Query' as query_type;
SELECT 
    name,
    display_name,
    qr_code_path,
    wallet_address,
    upi_id,
    is_active
FROM payment_methods 
WHERE is_active = true
ORDER BY name;

-- 7. Simulate order status update (what admin would do)
UPDATE orders 
SET status = 'confirmed', updated_at = NOW()
WHERE user_id = '11111111-1111-1111-1111-111111111111' 
AND status = 'pending'
AND id = (SELECT id FROM orders WHERE user_id = '11111111-1111-1111-1111-111111111111' AND status = 'pending' ORDER BY created_at DESC LIMIT 1)
RETURNING id, status, updated_at;

-- 8. Final verification - show all data
SELECT 'Final Data Summary' as summary_type;

SELECT 
    'Total Orders: ' || COUNT(*) as summary
FROM orders
UNION ALL
SELECT 
    'Pending Orders: ' || COUNT(*) as summary
FROM orders WHERE status = 'pending'
UNION ALL
SELECT 
    'Confirmed Orders: ' || COUNT(*) as summary
FROM orders WHERE status = 'confirmed'
UNION ALL
SELECT 
    'Payment Proofs: ' || COUNT(*) as summary
FROM payment_proofs
UNION ALL
SELECT 
    'Active Payment Methods: ' || COUNT(*) as summary
FROM payment_methods WHERE is_active = true
UNION ALL
SELECT 
    'Products with Download URLs: ' || COUNT(*) as summary
FROM products WHERE download_url IS NOT NULL;

-- 9. Check RLS status (should be disabled for development)
SELECT 'RLS Status Check' as check_type;
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('orders', 'products', 'payment_methods', 'payment_proofs')
ORDER BY tablename;