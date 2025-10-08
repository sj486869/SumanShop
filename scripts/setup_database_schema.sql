-- Suman Shop Database Schema - Updated to match specification
-- Run this script in Supabase SQL Editor

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table according to specification
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL, -- specification uses 'title' not 'name'
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT NOT NULL, -- specification uses 'image_url' not 'image'
    download_url TEXT, -- for digital products
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create orders table according to specification
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT, -- UPI, Binance, PayPal
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    notes TEXT, -- Admin notes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payment_methods table according to specification
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method_name TEXT UNIQUE NOT NULL, -- UPI, Binance, PayPal
    active BOOLEAN NOT NULL DEFAULT true,
    upi_qr TEXT, -- path to QR code image
    upi_id TEXT,
    binance_qr TEXT, -- path to QR code image
    binance_id TEXT,
    paypal_qr TEXT, -- path to QR code image
    paypal_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payment_proofs table according to specification
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, -- path to uploaded proof file
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for products table
CREATE POLICY "Anyone can read products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for orders table
CREATE POLICY "Users can read own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for payment_methods table
CREATE POLICY "Anyone can read active payment methods" ON public.payment_methods
    FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for payment_proofs table
CREATE POLICY "Users can read own payment proofs" ON public.payment_proofs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment proofs" ON public.payment_proofs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all payment proofs" ON public.payment_proofs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default payment methods
INSERT INTO public.payment_methods (method_name, active, upi_qr, binance_qr, paypal_qr) VALUES
    ('UPI', true, '/phonepe-qr.jpg', null, null),
    ('Binance', true, null, '/binance-qr-new.jpg', null),
    ('PayPal', true, null, null, '/paypal-qr.jpg')
ON CONFLICT (method_name) DO UPDATE SET
    active = EXCLUDED.active,
    upi_qr = EXCLUDED.upi_qr,
    binance_qr = EXCLUDED.binance_qr,
    paypal_qr = EXCLUDED.paypal_qr;

-- Insert sample products
INSERT INTO public.products (title, description, price, image_url, download_url, stock) VALUES
    ('Digital Toolkit Bundle', 'Complete digital toolkit with premium templates and resources', 29.99, '/toolkit-bundle.jpg', 'https://example.com/download/toolkit', 100),
    ('Premium Design Pack', 'High-quality design assets for modern projects', 19.99, '/digital-product-abstract.jpg', 'https://example.com/download/design-pack', 50)
ON CONFLICT DO NOTHING;

-- Create an admin user function (to be called after creating a user in Supabase Auth)
CREATE OR REPLACE FUNCTION create_admin_user(user_email TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- This function should be called after creating the user in Supabase Auth
    -- It updates the user's role to admin
    UPDATE public.users SET role = 'admin' WHERE email = user_email;
    
    -- Return the user ID
    SELECT id INTO user_id FROM public.users WHERE email = user_email;
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();