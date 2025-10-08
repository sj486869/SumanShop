-- =====================================================
-- FIX ORDERS TABLE FOR SAVING ORDERS TO SUPABASE
-- Run this in Supabase SQL Editor > Table Editor > orders
-- =====================================================

-- 1. Check if orders table exists and show its structure
SELECT 'Current Orders Table Structure' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 2. Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID NOT NULL;
        RAISE NOTICE 'Added user_id column';
    END IF;

    -- Add product_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_id' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN product_id UUID NOT NULL;
        RAISE NOTICE 'Added product_id column';
    END IF;

    -- Add quantity if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'quantity' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'Added quantity column';
    END IF;

    -- Add total_amount if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN total_amount DECIMAL(10,2) NOT NULL;
        RAISE NOTICE 'Added total_amount column';
    END IF;

    -- Add payment_method if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT NOT NULL;
        RAISE NOTICE 'Added payment_method column';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        RAISE NOTICE 'Added status column';
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- 4. Disable RLS to allow inserts (for development)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 6. Test insert to verify the table works
INSERT INTO public.orders (
    user_id, 
    product_id, 
    quantity, 
    total_amount, 
    payment_method, 
    status
) VALUES (
    'test-user-id-12345',
    'test-product-id-12345',
    1,
    29.99,
    'binance',
    'pending'
) RETURNING id, user_id, product_id, quantity, total_amount, payment_method, status, created_at;

-- 7. Show current orders count
SELECT 'Orders Table Status' as info;
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
    MIN(created_at) as oldest_order,
    MAX(created_at) as newest_order
FROM public.orders;

-- 8. Show last 5 orders
SELECT 'Recent Orders' as info;
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

-- 9. Show table permissions (RLS status)
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    hasinserts as can_insert,
    hasselects as can_select
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- 10. Final verification - show complete table structure
SELECT 'Final Orders Table Structure' as info;
\d public.orders;

-- =====================================================
-- VERIFICATION COMMANDS
-- =====================================================
-- Run these to check if orders are being saved:

-- Check total orders
-- SELECT COUNT(*) FROM public.orders;

-- Check orders by user
-- SELECT * FROM public.orders WHERE user_id = 'your-user-id-here';

-- Check recent orders
-- SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 10;

-- Check orders by status
-- SELECT status, COUNT(*) FROM public.orders GROUP BY status;

-- =====================================================