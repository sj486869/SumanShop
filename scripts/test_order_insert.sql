-- =====================================================
-- TEST ORDER INSERT - Manual Test for Orders Table
-- Run this in Supabase SQL Editor to test order saving
-- =====================================================

-- 1. Clear any existing test orders (optional)
DELETE FROM public.orders WHERE user_id = 'test-user-123';

-- 2. Insert a test order to verify the table works
INSERT INTO public.orders (
    user_id, 
    product_id, 
    quantity, 
    total_amount, 
    payment_method, 
    status,
    notes
) VALUES (
    'test-user-123',
    'test-product-456', 
    2,
    59.98,
    'binance',
    'pending',
    'Test order from SQL'
) RETURNING 
    id, 
    user_id, 
    product_id, 
    quantity, 
    total_amount, 
    payment_method, 
    status, 
    created_at;

-- 3. Insert multiple orders to simulate checkout
INSERT INTO public.orders (user_id, product_id, quantity, total_amount, payment_method, status) VALUES
    ('demo-user-789', 'product-1', 1, 29.99, 'paypal', 'pending'),
    ('demo-user-789', 'product-2', 3, 89.97, 'phonepe', 'confirmed'),
    ('demo-user-789', 'product-3', 1, 199.99, 'upi', 'pending');

-- 4. Show all inserted orders
SELECT 'All Test Orders' as info;
SELECT 
    id,
    user_id,
    product_id,
    quantity,
    total_amount,
    payment_method,
    status,
    created_at
FROM public.orders 
ORDER BY created_at DESC;

-- 5. Count orders by status
SELECT 'Orders by Status' as info;
SELECT 
    status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_value
FROM public.orders 
GROUP BY status;

-- 6. Count orders by payment method
SELECT 'Orders by Payment Method' as info;
SELECT 
    payment_method,
    COUNT(*) as order_count,
    AVG(total_amount) as avg_order_value
FROM public.orders 
GROUP BY payment_method;

-- 7. Show orders from last 24 hours
SELECT 'Recent Orders (Last 24h)' as info;
SELECT 
    id,
    user_id,
    product_id,
    quantity,
    total_amount,
    payment_method,
    status,
    created_at
FROM public.orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these individually to check your orders:
-- =====================================================

-- Total orders count
-- SELECT COUNT(*) as total_orders FROM public.orders;

-- Orders for specific user
-- SELECT * FROM public.orders WHERE user_id = 'your-actual-user-id';

-- Pending orders
-- SELECT * FROM public.orders WHERE status = 'pending';

-- Orders from today
-- SELECT * FROM public.orders WHERE DATE(created_at) = CURRENT_DATE;

-- Latest 10 orders
-- SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 10;

-- Delete all test orders (run only if you want to clean up)
-- DELETE FROM public.orders WHERE user_id IN ('test-user-123', 'demo-user-789');

-- =====================================================