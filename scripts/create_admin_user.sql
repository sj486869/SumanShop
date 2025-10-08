-- =====================================================
-- ADMIN PANEL SETUP - CREATE ADMIN USER
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create admin users table if not exists
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disable RLS for admin table (for development)
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 3. Insert admin user credentials
-- Email: admin@sumanshop.com
-- Password: admin123
INSERT INTO public.admin_users (
    id,
    email, 
    password_hash, 
    name, 
    role, 
    is_active
) VALUES (
    'admin-11111111-1111-1111-1111-111111111111',
    'admin@sumanshop.com',
    '$2a$12$LQv3c1yqBwEHxv.EZ7b.fO8XbJPNvs5BdWF5xP3oQzF8/ZjxsJ/b2', -- admin123
    'Suman Shop Admin',
    'admin',
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4. Create demo user for testing
INSERT INTO public.admin_users (
    id,
    email, 
    password_hash, 
    name, 
    role, 
    is_active
) VALUES (
    'demo-22222222-2222-2222-2222-222222222222',
    'demo@sumanshop.com',
    '$2a$12$LQv3c1yqBwEHxv.EZ7b.fO8XbJPNvs5BdWF5xP3oQzF8/ZjxsJ/b2', -- admin123
    'Demo User',
    'user',
    true
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    updated_at = NOW();

-- 5. Show created admin users
SELECT 'Admin Users Created' as info;
SELECT 
    id,
    email,
    name,
    role,
    is_active,
    created_at
FROM public.admin_users
ORDER BY created_at;

-- =====================================================
-- ADMIN CREDENTIALS FOR LOGIN:
-- =====================================================
-- 
-- ADMIN PANEL ACCESS:
-- Email: admin@sumanshop.com
-- Password: admin123
--
-- DEMO USER ACCESS:
-- Email: demo@sumanshop.com  
-- Password: admin123
--
-- =====================================================

-- 6. Create admin sessions table for login tracking
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Disable RLS for sessions table
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON public.admin_sessions(admin_user_id);

-- 9. Verification - Show admin users
SELECT 'ADMIN LOGIN CREDENTIALS' as info;
SELECT 
    'Email: ' || email || ' | Password: admin123 | Role: ' || role as login_info
FROM public.admin_users
WHERE is_active = true
ORDER BY role DESC;

COMMIT;