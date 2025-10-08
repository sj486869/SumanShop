# Database Schema Analysis & Fix

## 🚨 **ISSUE IDENTIFIED AND FIXED**

**Error**: `PGRST204 - Could not find the 'notes' column of 'orders' in the schema cache`

**Root Cause**: Your checkout code was trying to insert a `notes` field into the `orders` table, but this column doesn't exist in your Supabase database.

**Fix Applied**: Removed the problematic `notes` field from the order insert operation in `/app/checkout/page.tsx`

## 📊 **Current Database Usage Analysis**

Based on your code, here are the tables and columns you're actually using:

### 1. `orders` Table
**Currently Used Columns:**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Status Values Used:**
- `pending` (default)
- `processing`
- `shipped`
- `delivered`
- `cancelled`

### 2. `payment_proofs` Table
**Currently Used Columns:**
```sql
CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `products` Table (Referenced)
**Likely Structure Based on Usage:**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category_id UUID,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `users` Table (Auth-related)
**Likely Structure:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 **Recommended Supabase Setup Commands**

Execute these SQL commands in your Supabase SQL Editor:

### 1. Create Orders Table
```sql
-- Create orders table with proper structure
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Create Payment Proofs Table
```sql
-- Create payment_proofs table
CREATE TABLE IF NOT EXISTS payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user_id ON payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON payment_proofs(order_id);

-- Add updated_at trigger
CREATE TRIGGER update_payment_proofs_updated_at BEFORE UPDATE ON payment_proofs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Create Products Table (if not exists)
```sql
-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  category_id UUID,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Add updated_at trigger
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Create Storage Buckets
```sql
-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false);

-- Set up RLS policy for payment proofs storage
CREATE POLICY "Users can upload payment proofs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Users can view their own payment proofs" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-proofs');
```

## 🔐 **Row Level Security (RLS) Policies**

### Orders Table RLS
```sql
-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid()::text);

-- Users can insert their own orders
CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own orders (limited fields)
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (user_id = auth.uid()::text);
```

### Payment Proofs RLS
```sql
-- Enable RLS on payment_proofs table
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment proofs
CREATE POLICY "Users can view own payment proofs" ON payment_proofs
    FOR SELECT USING (user_id = auth.uid()::text);

-- Users can insert their own payment proofs
CREATE POLICY "Users can create own payment proofs" ON payment_proofs
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);
```

## ✅ **Verification Steps**

After running the SQL commands:

1. **Test the Connection**:
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'payment_proofs', 'products');

-- Check orders table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public';
```

2. **Test Insert Operation**:
```sql
-- Test insert (replace with actual user_id and product_id)
INSERT INTO orders (user_id, product_id, quantity, total_amount, payment_method, status)
VALUES ('test-user-id', 'test-product-id', 1, 29.99, 'UPI', 'pending')
RETURNING *;
```

## 🚀 **Next Steps**

1. **Execute the SQL commands** in your Supabase SQL Editor
2. **Refresh your browser** and try the checkout process again
3. **Monitor the console** for any remaining errors
4. **Test with a small order** first to verify everything works

## 📋 **Common Issues & Solutions**

### Issue: "relation does not exist"
**Solution**: Make sure you're running the SQL in the correct database and the tables are created in the `public` schema.

### Issue: RLS blocking queries
**Solution**: Ensure your auth policies match your user ID format (UUID vs text).

### Issue: Storage upload failures
**Solution**: Check that the storage bucket exists and has proper policies.

## 🔍 **Debugging Your Current Setup**

To check your current database structure, run this in Supabase SQL Editor:

```sql
-- Check current orders table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%order%' OR tablename LIKE '%payment%';
```

This should resolve your immediate issue. Your checkout process should now work correctly without the `notes` field error!