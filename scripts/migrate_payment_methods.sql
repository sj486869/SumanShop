-- Migration script to update payment_methods table to match application expectations
-- Run this in your Supabase SQL Editor

-- First, check current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns to payment_methods table if they don't exist
DO $$
BEGIN
    -- Add upi_qr column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' 
        AND column_name = 'upi_qr'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_methods ADD COLUMN upi_qr text;
    END IF;

    -- Add upi_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' 
        AND column_name = 'upi_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_methods ADD COLUMN upi_id text;
    END IF;

    -- Add binance_qr column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' 
        AND column_name = 'binance_qr'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_methods ADD COLUMN binance_qr text;
    END IF;

    -- Add binance_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' 
        AND column_name = 'binance_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_methods ADD COLUMN binance_id text;
    END IF;

    -- Add paypal_qr column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' 
        AND column_name = 'paypal_qr'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_methods ADD COLUMN paypal_qr text;
    END IF;

    -- Add paypal_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' 
        AND column_name = 'paypal_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_methods ADD COLUMN paypal_id text;
    END IF;
END
$$;

-- Clean up existing payment methods and insert the ones your app expects
DELETE FROM public.payment_methods;

-- Insert the expected payment methods with proper naming
INSERT INTO public.payment_methods (method_name, active, upi_qr, binance_qr, paypal_qr) VALUES 
    ('PhonePe UPI', true, '/phonepe-qr.jpg', null, null),
    ('Binance Pay', true, null, '/binance-qr-new.jpg', null),
    ('PayPal', true, null, null, '/paypal-qr.jpg');

-- Verify the structure after migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the data
SELECT * FROM public.payment_methods;