-- =====================================================
-- DIAGNOSE SUPABASE DATABASE FOR ORDER SUBMISSION
-- Run this first to check your database setup
-- =====================================================

-- 1. Check if orders table exists and its structure
SELECT 'ORDERS TABLE CHECK' as check_type;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 2. Check table permissions and RLS status
SELECT 'TABLE PERMISSIONS' as check_type;
SELECT 
    tablename,
    tableowner,
    rowsecurity as rls_enabled,
    hasinserts as can_insert,
    hasselects as can_select,
    hasupdates as can_update
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- 3. Test direct insert to see if table accepts data
SELECT 'TESTING DIRECT INSERT' as check_type;
INSERT INTO public.orders (
    user_id,
    product_id, 
    quantity,
    total_amount,
    payment_method,
    status,
    notes
) VALUES (
    'test-diagnosis-user',
    'test-diagnosis-product',
    1,
    29.99,
    'binance',
    'pending',
    'Direct insert test from diagnostic script'
) RETURNING 
    id,
    user_id,
    product_id,
    total_amount,
    payment_method,
    status,
    created_at;

-- 4. Check if insert worked
SELECT 'INSERT VERIFICATION' as check_type;
SELECT COUNT(*) as total_orders FROM public.orders;
SELECT COUNT(*) as test_orders FROM public.orders WHERE user_id = 'test-diagnosis-user';

-- 5. Check products table (needed for foreign key)
SELECT 'PRODUCTS TABLE CHECK' as check_type;
SELECT COUNT(*) as total_products FROM public.products;
SELECT id, name, price FROM public.products LIMIT 3;

-- 6. Check if payment_proofs table exists
SELECT 'PAYMENT PROOFS TABLE CHECK' as check_type;
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payment_proofs'
ORDER BY ordinal_position;

-- 7. Check storage buckets for payment proofs
SELECT 'STORAGE BUCKETS CHECK' as check_type;
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE name = 'payment-proofs';

-- 8. Show current orders (if any)
SELECT 'CURRENT ORDERS' as check_type;
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
ORDER BY created_at DESC 
LIMIT 5;

-- 9. Check for any RLS policies that might block inserts
SELECT 'RLS POLICIES CHECK' as check_type;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- 10. Final diagnostic summary
SELECT 'DIAGNOSTIC SUMMARY' as check_type;
SELECT 
    'Orders table exists: ' || 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') 
         THEN 'YES' 
         ELSE 'NO' 
    END as orders_table_status,
    
    'Products table exists: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') 
         THEN 'YES' 
         ELSE 'NO' 
    END as products_table_status,
    
    'Payment proofs table exists: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_proofs' AND table_schema = 'public') 
         THEN 'YES' 
         ELSE 'NO' 
    END as payment_proofs_table_status,
    
    'Storage bucket exists: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'payment-proofs') 
         THEN 'YES' 
         ELSE 'NO' 
    END as storage_bucket_status;

-- Cleanup test data
DELETE FROM public.orders WHERE user_id = 'test-diagnosis-user';

-- =====================================================
-- WHAT TO LOOK FOR:
-- 
-- 1. Orders table should exist with all required columns
-- 2. RLS should be disabled (rls_enabled = false) 
-- 3. Direct insert should work without errors
-- 4. Products table should have some test products
-- 5. Payment proofs table should exist
-- 6. Storage bucket 'payment-proofs' should exist
-- 
-- If any of these fail, the checkout won't save to Supabase
-- =====================================================