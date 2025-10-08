-- =====================================================
-- SQL SETUP FOR SUBMIT ORDER BUTTON FUNCTIONALITY
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create orders table (if not exists)
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

-- 2. Create payment_proofs table (if not exists)
CREATE TABLE IF NOT EXISTS payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create payment_methods table (if not exists)
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

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user_id ON payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON payment_proofs(order_id);

-- 5. Add updated_at trigger for orders table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Disable RLS for development (ENABLE IN PRODUCTION!)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 7. Insert payment methods data
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

-- 8. Add missing columns to products table if needed
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

-- 9. Create a test user if not exists
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'demo@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 10. Insert test products if table is empty
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

-- 11. Create test orders for demo user
INSERT INTO orders (id, user_id, product_id, quantity, total_amount, payment_method, status, created_at) VALUES
    (
        '55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        1,
        29.99,
        'binance',
        'confirmed',
        NOW() - INTERVAL '2 days'
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        1,
        99.99,
        'paypal',
        'pending',
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    payment_method = EXCLUDED.payment_method;

-- 12. Create test payment proofs
INSERT INTO payment_proofs (user_id, order_id, file_path) VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '55555555-5555-5555-5555-555555555555',
        'payment-proofs/demo-user/payment-proof-1.jpg'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        '66666666-6666-6666-6666-666666666666',
        'payment-proofs/demo-user/payment-proof-2.jpg'
    )
ON CONFLICT DO NOTHING;

-- 13. Verify the setup
SELECT 'Orders Table' as table_name, COUNT(*) as record_count FROM orders
UNION ALL
SELECT 'Products Table' as table_name, COUNT(*) as record_count FROM products
UNION ALL
SELECT 'Payment Methods Table' as table_name, COUNT(*) as record_count FROM payment_methods
UNION ALL
SELECT 'Payment Proofs Table' as table_name, COUNT(*) as record_count FROM payment_proofs;

-- 14. Show sample data
SELECT 
    'SAMPLE ORDER DATA' as info,
    o.id as order_id,
    o.user_id,
    p.name as product_name,
    o.quantity,
    o.total_amount,
    o.payment_method,
    o.status,
    o.created_at
FROM orders o
JOIN products p ON p.id = o.product_id
ORDER BY o.created_at DESC
LIMIT 5;

-- =====================================================
-- IMPORTANT NOTES:
-- 1. RLS is DISABLED for development - ENABLE in production
-- 2. Test user: demo@example.com (password: password123)
-- 3. Demo user ID: 11111111-1111-1111-1111-111111111111
-- 4. QR code images should be in public folder
-- 5. Update wallet addresses and UPI IDs in payment_methods table
-- =====================================================

COMMIT;