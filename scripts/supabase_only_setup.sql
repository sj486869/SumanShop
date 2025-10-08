-- =====================================================
-- SUPABASE-ONLY SETUP (NO LOCALSTORAGE)
-- Complete database setup for checkout without localStorage
-- =====================================================

-- 1. Create cart table for storing user cart items
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 2. Create orders table (if not exists)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('binance', 'paypal', 'phonepe', 'upi')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create payment_proofs table (if not exists)
CREATE TABLE IF NOT EXISTS payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create payment_methods table (if not exists)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    qr_code_path TEXT NOT NULL,
    wallet_address TEXT,
    upi_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false) ON CONFLICT DO NOTHING;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user_id ON payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON payment_proofs(order_id);

-- 7. Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cart_updated_at ON cart;
CREATE TRIGGER update_cart_updated_at
    BEFORE UPDATE ON cart
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Disable RLS for development (ENABLE IN PRODUCTION!)
ALTER TABLE cart DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 9. Add missing columns to products table if needed
DO $$
BEGIN
    -- Add download_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'download_url') THEN
        ALTER TABLE products ADD COLUMN download_url TEXT;
        RAISE NOTICE 'Added download_url column to products table';
    END IF;
    
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
        ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'digital';
        RAISE NOTICE 'Added category column to products table';
    END IF;
    
    -- Add stock column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock') THEN
        ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 999;
        RAISE NOTICE 'Added stock column to products table';
    END IF;
END $$;

-- 10. Insert payment methods data
INSERT INTO payment_methods (name, display_name, qr_code_path, wallet_address, upi_id, is_active) VALUES
    ('binance', 'Binance Pay', '/binance-qr.jpg', 'binance-wallet-address-here', NULL, true),
    ('paypal', 'PayPal', '/paypal-qr.jpg', 'paypal@example.com', NULL, true),
    ('phonepe', 'PhonePe', '/phonepe-qr.jpg', NULL, 'phonepe@upi', true),
    ('upi', 'UPI', '/phonepe-qr.jpg', NULL, 'generic@upi', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    qr_code_path = EXCLUDED.qr_code_path,
    wallet_address = EXCLUDED.wallet_address,
    upi_id = EXCLUDED.upi_id,
    is_active = EXCLUDED.is_active;

-- 11. Insert test products if table is empty
INSERT INTO products (id, name, description, price, image, category, stock, download_url) VALUES
    (
        '22222222-2222-2222-2222-222222222222',
        'Digital Art Bundle',
        'Premium digital art collection with high-resolution images',
        29.99,
        '/placeholder.svg',
        'digital',
        999,
        'https://example.com/downloads/digital-art-bundle.zip'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Video Course',
        'Complete web development video course',
        99.99,
        '/placeholder.svg',
        'education',
        999,
        'https://example.com/downloads/web-dev-course.zip'
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'Software License',
        'Premium software license key',
        199.99,
        '/placeholder.svg',
        'software',
        50,
        'https://example.com/downloads/software-key.txt'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    download_url = EXCLUDED.download_url;

-- 12. Create a real user for testing (requires Supabase Auth)
-- Note: In production, users are created through auth.signup()
-- For testing, you'll need to sign up through your app's auth system

-- 13. Add sample cart items for testing (replace USER_ID with actual authenticated user ID)
-- INSERT INTO cart (user_id, product_id, quantity) VALUES
--     ('YOUR-AUTHENTICATED-USER-ID-HERE', '22222222-2222-2222-2222-222222222222', 1),
--     ('YOUR-AUTHENTICATED-USER-ID-HERE', '33333333-3333-3333-3333-333333333333', 2)
-- ON CONFLICT (user_id, product_id) DO UPDATE SET
--     quantity = EXCLUDED.quantity,
--     updated_at = NOW();

-- 14. Storage policy for payment proofs (adjust as needed for production)
CREATE POLICY "Users can upload payment proofs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Users can view their own payment proofs" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-proofs');

-- 15. Verify the setup
SELECT 'Table Verification' as check_type;

SELECT 
    'cart' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT user_id) as unique_users
FROM cart
UNION ALL
SELECT 
    'orders' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
FROM orders
UNION ALL
SELECT 
    'products' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN download_url IS NOT NULL THEN 1 END) as with_download_url
FROM products
UNION ALL
SELECT 
    'payment_methods' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_methods
FROM payment_methods
UNION ALL
SELECT 
    'payment_proofs' as table_name, 
    COUNT(*) as record_count,
    0 as extra_info
FROM payment_proofs;

-- 16. Show table structures
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('cart', 'orders', 'products', 'payment_methods', 'payment_proofs')
ORDER BY table_name, ordinal_position;

-- =====================================================
-- IMPORTANT SETUP NOTES:
-- =====================================================
-- 1. This setup requires Supabase Authentication
-- 2. Users must sign up/login through your auth system
-- 3. Cart items are stored in Supabase cart table
-- 4. Payment proofs are uploaded to Supabase Storage
-- 5. No localStorage dependency
-- 6. RLS is DISABLED for development - ENABLE in production
-- 7. Storage bucket 'payment-proofs' is created automatically
-- 8. Update storage policies for production use
-- =====================================================

COMMIT;