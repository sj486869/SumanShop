-- =====================================================
-- FORCE FIX SUPABASE DATABASE FOR ORDER SUBMISSION
-- This will fix all common issues preventing orders from saving
-- =====================================================

-- 1. Drop and recreate orders table with proper structure
DROP TABLE IF EXISTS public.orders CASCADE;
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Changed to TEXT for flexibility
    product_id TEXT NOT NULL, -- Changed to TEXT for flexibility  
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Drop and recreate payment_proofs table
DROP TABLE IF EXISTS public.payment_proofs CASCADE;
CREATE TABLE public.payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure products table exists with proper structure
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- TEXT for flexibility
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image TEXT,
    category TEXT DEFAULT 'digital',
    stock INTEGER DEFAULT 999,
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    qr_code_path TEXT NOT NULL,
    wallet_address TEXT,
    upi_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DISABLE ALL RLS (Row Level Security) for development
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;

-- 6. Drop any existing RLS policies that might block inserts
DROP POLICY IF EXISTS "orders_policy" ON public.orders;
DROP POLICY IF EXISTS "payment_proofs_policy" ON public.payment_proofs;
DROP POLICY IF EXISTS "products_policy" ON public.products;

-- 7. Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false) 
ON CONFLICT (id) DO NOTHING;

-- 8. Set up storage policies (permissive for development)
DROP POLICY IF EXISTS "payment_proofs_upload" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_view" ON storage.objects;

CREATE POLICY "payment_proofs_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_view" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-proofs');

-- 9. Insert test products
INSERT INTO public.products (id, name, description, price, image, category, stock, download_url) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Digital Art Bundle', 'Premium digital art collection', 29.99, '/placeholder.svg', 'digital', 999, 'https://example.com/download/art.zip'),
    ('33333333-3333-3333-3333-333333333333', 'Video Course', 'Complete web development course', 99.99, '/placeholder.svg', 'education', 999, 'https://example.com/download/course.zip'),
    ('44444444-4444-4444-4444-444444444444', 'Software License', 'Premium software license', 199.99, '/placeholder.svg', 'software', 50, 'https://example.com/download/license.txt')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    download_url = EXCLUDED.download_url;

-- 10. Insert payment methods
INSERT INTO public.payment_methods (name, display_name, qr_code_path, wallet_address, upi_id, is_active) VALUES
    ('binance', 'Binance Pay', '/binance-qr.jpg', 'binance-wallet-here', NULL, true),
    ('paypal', 'PayPal', '/paypal-qr.jpg', 'paypal@example.com', NULL, true),
    ('phonepe', 'PhonePe', '/phonepe-qr.jpg', NULL, 'phonepe@upi', true),
    ('upi', 'UPI', '/phonepe-qr.jpg', NULL, 'generic@upi', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    qr_code_path = EXCLUDED.qr_code_path,
    is_active = EXCLUDED.is_active;

-- 11. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON public.payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user_id ON public.payment_proofs(user_id);

-- 12. Test insert to verify everything works
INSERT INTO public.orders (
    user_id,
    product_id,
    quantity, 
    total_amount,
    payment_method,
    status,
    notes
) VALUES (
    'test-force-fix-user',
    '22222222-2222-2222-2222-222222222222',
    1,
    29.99,
    'binance', 
    'pending',
    'Test order from force fix script'
) RETURNING 
    id,
    user_id,
    product_id,
    total_amount,
    payment_method,
    status,
    created_at;

-- 13. Test payment proof insert
INSERT INTO public.payment_proofs (
    user_id,
    order_id,
    file_path
) VALUES (
    'test-force-fix-user',
    (SELECT id FROM public.orders WHERE user_id = 'test-force-fix-user' ORDER BY created_at DESC LIMIT 1),
    'test-payment-proof-path.jpg'
) RETURNING *;

-- 14. Verification queries
SELECT 'VERIFICATION RESULTS' as info;

SELECT 'Orders table test' as test_type, COUNT(*) as test_records 
FROM public.orders WHERE user_id = 'test-force-fix-user'
UNION ALL
SELECT 'Payment proofs table test' as test_type, COUNT(*) as test_records
FROM public.payment_proofs WHERE user_id = 'test-force-fix-user' 
UNION ALL
SELECT 'Products available' as test_type, COUNT(*) as test_records
FROM public.products
UNION ALL
SELECT 'Payment methods available' as test_type, COUNT(*) as test_records
FROM public.payment_methods WHERE is_active = true;

-- 15. Show final table structures
SELECT 'ORDERS TABLE STRUCTURE' as info;
\d public.orders;

SELECT 'PRODUCTS TABLE STRUCTURE' as info; 
\d public.products;

-- 16. Show RLS status (should all be disabled)
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'products', 'payment_proofs', 'payment_methods')
ORDER BY tablename;

-- 17. Clean up test data
DELETE FROM public.payment_proofs WHERE user_id = 'test-force-fix-user';
DELETE FROM public.orders WHERE user_id = 'test-force-fix-user';

-- 18. Final success message
SELECT 'SETUP COMPLETE! 🎉' as status;
SELECT 'Orders can now be saved to Supabase' as message;
SELECT 'RLS is disabled for development' as security_note;
SELECT 'Test products and payment methods are ready' as data_note;

COMMIT;