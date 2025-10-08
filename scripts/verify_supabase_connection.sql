-- Quick Supabase Connection and Table Verification
-- Run this in your Supabase SQL Editor to verify everything is set up correctly

-- ======================================================
-- 1️⃣ Check if all required tables exist
-- ======================================================
SELECT 'TABLE EXISTENCE CHECK:' as status;
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'products', 'orders', 'payment_methods', 'payment_proofs')
ORDER BY table_name;

-- ======================================================
-- 2️⃣ Check orders table structure specifically
-- ======================================================
SELECT 'ORDERS TABLE STRUCTURE:' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================================================
-- 3️⃣ Check Row Level Security status
-- ======================================================
SELECT 'ROW LEVEL SECURITY STATUS:' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN '⚠️ ENABLED (may block inserts)' ELSE '✅ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'products', 'orders')
ORDER BY tablename;

-- ======================================================
-- 4️⃣ Test if we can insert into orders table
-- ======================================================
SELECT 'TESTING ORDERS TABLE INSERT:' as status;

-- First, ensure we have a test user
INSERT INTO public.users (id, name, email, password, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test@example.com', 'password123', 'user')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

-- Ensure we have a test product
INSERT INTO public.products (id, title, description, price, image_url, stock) VALUES 
    ('product-test-12345', 'Test Product for Orders', 'Test product description', 29.99, '/placeholder.svg', 10)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    price = EXCLUDED.price;

-- Now try to insert a test order
INSERT INTO public.orders (
    user_id, 
    product_id, 
    quantity, 
    total_amount, 
    payment_method, 
    status
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'product-test-12345',
    1,
    29.99,
    'PhonePe UPI',
    'pending'
)
RETURNING id, user_id, product_id, total_amount, payment_method, status, created_at;

-- ======================================================
-- 5️⃣ Check if the test order was created successfully
-- ======================================================
SELECT 'VERIFICATION - ORDERS IN DATABASE:' as status;
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
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC
LIMIT 5;

-- ======================================================
-- 6️⃣ Check products table
-- ======================================================
SELECT 'PRODUCTS IN DATABASE:' as status;
SELECT 
    id,
    title,
    price,
    stock,
    download_url
FROM public.products 
ORDER BY created_at DESC
LIMIT 5;

-- ======================================================
-- 7️⃣ Check users table
-- ======================================================
SELECT 'USERS IN DATABASE:' as status;
SELECT 
    id,
    name,
    email,
    role,
    created_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 5;

-- ======================================================
-- ✅ FINAL SUMMARY
-- ======================================================
SELECT 'SUMMARY:' as status;
SELECT 
    'Orders Table' as item,
    COUNT(*) as count,
    'Total orders in database' as description
FROM public.orders
UNION ALL
SELECT 
    'Products Table' as item,
    COUNT(*) as count,
    'Total products in database' as description
FROM public.products
UNION ALL
SELECT 
    'Users Table' as item,
    COUNT(*) as count,
    'Total users in database' as description
FROM public.users;

-- If this script runs without errors, your database is properly configured!
SELECT '🎉 Database verification complete! Check the results above.' as final_message;