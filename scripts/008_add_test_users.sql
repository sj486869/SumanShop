-- ======================================================
-- 🧑‍💼 ADD TEST USERS TO SUPABASE DATABASE
-- ======================================================

-- Create test users (including the one from your error)
INSERT INTO public.users (name, email, password, role) VALUES
('Test User', 'noobtuhin500@gmail.com', 'rimsum', 'user'),
('Admin User', 'admin@example.com', 'admin123', 'admin'),
('Suman', 'suman@test.com', 'password123', 'user'),
('Demo Admin', 'demo@admin.com', 'demo123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT id, name, email, role, created_at 
FROM public.users 
ORDER BY created_at DESC;

-- Test the specific user from your error
SELECT * FROM public.users 
WHERE lower(email) = lower('noobtuhin500@gmail.com');