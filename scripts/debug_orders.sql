-- Diagnostic script to debug orders not showing up
-- Run this in your Supabase SQL Editor to see what's in your database

-- 1. Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'orders', 'products')
ORDER BY table_name;

-- 2. Check users table structure and data
SELECT 'USERS TABLE STRUCTURE:' as debug_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'USERS TABLE DATA:' as debug_info;
SELECT id, email, name, role, created_at 
FROM public.users 
LIMIT 10;

-- 3. Check orders table structure and data
SELECT 'ORDERS TABLE STRUCTURE:' as debug_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ORDERS TABLE DATA:' as debug_info;
SELECT id, user_id, product_id, quantity, total_amount, status, payment_method, created_at 
FROM public.orders 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check products table
SELECT 'PRODUCTS TABLE DATA:' as debug_info;
SELECT id, title, price, image_url, download_url, stock 
FROM public.products 
LIMIT 10;

-- 5. Check if there are any orders with joined data
SELECT 'ORDERS WITH PRODUCT INFO:' as debug_info;
SELECT 
    o.id,
    o.user_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.payment_method,
    o.created_at,
    p.title as product_title,
    p.price as product_price,
    u.email as user_email
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
LEFT JOIN public.users u ON o.user_id = u.id
ORDER BY o.created_at DESC
LIMIT 10;

-- 6. Check for any auth.users data (if using Supabase Auth)
SELECT 'AUTH USERS DATA:' as debug_info;
SELECT id, email, created_at 
FROM auth.users 
LIMIT 5;