-- Complete Database Schema Fix for Suman Shop
-- Run this in your Supabase SQL Editor

-- ======================================================
-- 1️⃣ Fix Products Table - Add missing columns
-- ======================================================
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS download_url text,
ADD COLUMN IF NOT EXISTS image_url text;

-- Update existing products with download URLs
UPDATE public.products 
SET download_url = 'https://example.com/men-premium-shirt.zip'
WHERE title = 'Men Premium Shirt';

UPDATE public.products 
SET download_url = 'https://example.com/women-casual-top.zip'
WHERE title = 'Women Casual Top';

UPDATE public.products 
SET download_url = 'https://example.com/classic-hoodie.zip'
WHERE title = 'Classic Hoodie';

-- ======================================================
-- 2️⃣ Fix Orders Table - Add missing columns
-- ======================================================
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- ======================================================
-- 3️⃣ Fix Users Table - Add missing columns
-- ======================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- ======================================================
-- 4️⃣ Create Payment Methods Table with all columns
-- ======================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    method_name text NOT NULL,
    active boolean DEFAULT true,
    upi_qr text,
    upi_id text,
    binance_qr text,
    binance_id text,
    paypal_qr text,
    paypal_id text,
    created_at timestamptz DEFAULT now()
);

-- Clear and insert proper payment methods
DELETE FROM public.payment_methods;
INSERT INTO public.payment_methods (method_name, active, upi_qr, binance_qr, paypal_qr) VALUES 
    ('PhonePe UPI', true, '/phonepe-qr.jpg', null, null),
    ('Binance Pay', true, null, '/binance-qr-new.jpg', null),
    ('PayPal', true, null, null, '/paypal-qr.jpg');

-- ======================================================
-- 5️⃣ Create Payment Proofs Table
-- ======================================================
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    file_path text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ======================================================
-- 6️⃣ Disable RLS for all tables
-- ======================================================
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- ======================================================
-- 7️⃣ Create test user and orders for debugging
-- ======================================================
-- Create test user
INSERT INTO public.users (id, name, email, password, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test@example.com', 'password123', 'user')
ON CONFLICT (id) DO NOTHING;

-- Create admin user
INSERT INTO public.users (name, email, password, role) VALUES 
    ('Admin User', 'admin@example.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create test orders
INSERT INTO public.orders (user_id, product_id, quantity, total_amount, payment_method, status) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    id,
    1,
    price,
    'PhonePe UPI',
    'pending'
FROM public.products 
LIMIT 2
ON CONFLICT DO NOTHING;

-- Create one confirmed order for testing downloads
INSERT INTO public.orders (user_id, product_id, quantity, total_amount, payment_method, status) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    id,
    1,
    price,
    'Binance Pay',
    'confirmed'
FROM public.products 
WHERE title = 'Men Premium Shirt'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ======================================================
-- 8️⃣ Verify the setup
-- ======================================================
SELECT 'PRODUCTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ORDERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'PRODUCTS WITH DOWNLOAD URLS:' as info;
SELECT id, title, price, download_url FROM public.products;

SELECT 'TEST ORDERS:' as info;
SELECT 
    o.id,
    o.user_id,
    o.status,
    o.payment_method,
    o.total_amount,
    p.title as product_title,
    p.download_url
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- ======================================================
-- ✅ SCHEMA FIX COMPLETE
-- ======================================================