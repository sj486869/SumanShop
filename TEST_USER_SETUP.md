# Test User Setup - Quick Fix for Dashboard

## Problem
Your dashboard shows "No orders yet" even though you have orders in the database.

## Quick Solution

### Step 1: Fix Your Database
Run this in your **Supabase SQL Editor** (copy and paste from `scripts/fix_database_schema.sql`):

```sql
-- Add missing columns to tables
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS download_url text,
ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Update products with download URLs
UPDATE public.products 
SET download_url = 'https://example.com/men-premium-shirt.zip'
WHERE title = 'Men Premium Shirt';

UPDATE public.products 
SET download_url = 'https://example.com/women-casual-top.zip'
WHERE title = 'Women Casual Top';

UPDATE public.products 
SET download_url = 'https://example.com/classic-hoodie.zip'
WHERE title = 'Classic Hoodie';

-- Create test user and orders
INSERT INTO public.users (id, name, email, password, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test@example.com', 'password123', 'user')
ON CONFLICT (id) DO NOTHING;

-- Create test orders
INSERT INTO public.orders (user_id, product_id, quantity, total_amount, payment_method, status) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    id,
    1,
    price,
    'PhonePe UPI',
    'pending'
FROM public.products 
LIMIT 2;

-- Create confirmed order for download testing
INSERT INTO public.orders (user_id, product_id, quantity, total_amount, payment_method, status) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    id,
    1,
    price,
    'Binance Pay',
    'confirmed'
FROM public.products 
WHERE title = 'Men Premium Shirt'
LIMIT 1;
```

### Step 2: Set Test User in Browser
1. Open your application at `http://localhost:3000`
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Run this command:

```javascript
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User'
}));
location.reload();
```

### Step 3: Test Everything
1. **Homepage** - Should show download button for "Men Premium Shirt" (confirmed order)
2. **Dashboard** (`/dashboard`) - Should show 3 orders (2 pending, 1 confirmed)
3. **Admin Panel** (`/admin/orders`) - Should show all orders with management options
4. **Admin Products** (`/admin/products`) - Should show download URLs and edit capability

## Expected Results

### Homepage
- **Men Premium Shirt**: Shows green "Download" button (confirmed order)
- **Other products**: Show "Add to Cart" button (no confirmed orders)

### Dashboard
- **Total Orders**: 3
- **Pending Orders**: 2  
- **Confirmed Orders**: 1
- **Downloads Tab**: Shows "Men Premium Shirt" with download link

### Admin Panel
- **Orders**: Shows all orders with status management
- **Products**: Shows products with download URLs, ability to edit

## Verification Commands

Run these in Supabase to verify data:

```sql
-- Check users
SELECT id, name, email, role FROM public.users;

-- Check products with downloads
SELECT id, title, price, download_url FROM public.products;

-- Check orders
SELECT 
    o.id,
    o.user_id,
    o.status,
    o.payment_method,
    o.total_amount,
    p.title as product_title
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
```

## If Still Not Working

1. **Check Console Logs**:
   - Open browser DevTools → Console
   - Look for `[Dashboard]` and `[Admin]` log messages

2. **Verify Database**:
   - Make sure all SQL commands ran without errors
   - Check that tables have the required columns

3. **Check User Session**:
   ```javascript
   console.log('User data:', localStorage.getItem('demo-user'));
   ```

After following these steps, your dashboard should show the orders and the download functionality should work!