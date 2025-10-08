-- =====================================================
-- QUICK VERIFICATION SCRIPT
-- Run this to check if your fixes are working
-- =====================================================

-- 1. Check orders table exists and has correct structure
SELECT 'ORDERS TABLE CHECK' as status;
SELECT COUNT(*) as total_orders FROM public.orders;
SELECT DISTINCT status FROM public.orders;

-- 2. Check products table
SELECT 'PRODUCTS TABLE CHECK' as status;
SELECT COUNT(*) as total_products FROM public.products;
SELECT id, name, price FROM public.products LIMIT 3;

-- 3. Check payment_methods table
SELECT 'PAYMENT METHODS CHECK' as status;
SELECT COUNT(*) as total_payment_methods FROM public.payment_methods WHERE is_active = true;

-- 4. Check admin users
SELECT 'ADMIN USERS CHECK' as status;
SELECT email, role FROM public.admin_users WHERE is_active = true;

-- 5. Show recent orders (last 5)
SELECT 'RECENT ORDERS' as status;
SELECT 
    id,
    user_id,
    product_id,
    total_amount,
    payment_method,
    status,
    created_at
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Test if you can insert a new order
INSERT INTO public.orders (
    user_id,
    product_id,
    quantity,
    total_amount,
    payment_method,
    status
) VALUES (
    'demo-22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    1,
    29.99,
    'binance',
    'pending'
) RETURNING id, user_id, total_amount, status, created_at;

-- 7. Final summary
SELECT 'SETUP VERIFICATION COMPLETE' as status;
SELECT 
    'Orders: ' || COUNT(*) as summary
FROM public.orders
UNION ALL
SELECT 
    'Products: ' || COUNT(*) as summary  
FROM public.products
UNION ALL
SELECT 
    'Payment Methods: ' || COUNT(*) as summary
FROM public.payment_methods WHERE is_active = true;