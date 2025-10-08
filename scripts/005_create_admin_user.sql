-- Create admin user with email admin@gmail.com and password admin123
-- This user will have immediate access to the admin panel without email verification

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate a UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Insert into auth.users with confirmed email (no verification needed)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    'admin@gmail.com',
    crypt('admin123', gen_salt('bf')), -- Securely hash the password
    NOW(), -- Email confirmed immediately
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}',
    '{"role":"admin"}',
    NOW(),
    NOW(),
    false
  )
  ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('admin123', gen_salt('bf')),
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
  RETURNING id INTO admin_user_id;

  -- Create or update profile with admin role
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (admin_user_id, 'admin@gmail.com', 'admin', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    email = 'admin@gmail.com',
    updated_at = NOW();

END $$;

-- Verify the admin user was created
SELECT 
  u.email,
  u.email_confirmed_at,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@gmail.com';
