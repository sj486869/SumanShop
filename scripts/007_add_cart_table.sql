-- ======================================================
-- 🛒 CART TABLE FOR SUPABASE E-COMMERCE
-- ======================================================

-- 6️⃣ CART TABLE (Add this to your Supabase SQL Editor)
create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Disable RLS for cart table
alter table public.cart disable row level security;

-- Create index for better performance
create index if not exists idx_cart_user_id on public.cart(user_id);
create index if not exists idx_cart_product_id on public.cart(product_id);

-- Create unique constraint to prevent duplicate items
create unique index if not exists idx_cart_user_product on public.cart(user_id, product_id);

-- ======================================================
-- 🔄 UPDATE TRIGGER FOR CART TABLE
-- ======================================================

-- Function to automatically update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for cart table
create trigger update_cart_updated_at
  before update on public.cart
  for each row
  execute function update_updated_at_column();

-- ======================================================
-- ✅ VERIFICATION QUERY
-- ======================================================
-- Run this to verify the cart table was created:
-- select table_name, is_rls_enabled from information_schema.tables where table_name = 'cart' and table_schema = 'public';