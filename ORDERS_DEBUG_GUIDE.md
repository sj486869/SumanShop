# Orders Not Showing - Debug Guide

## Problem
You have orders in your database but they're not showing up in either the user dashboard or admin panel.

## Step-by-Step Debugging

### Step 1: Check Your Database
Run the diagnostic script in Supabase SQL Editor:
```sql
-- Copy and paste contents from scripts/debug_orders.sql
```

This will show you:
- What tables exist
- What data is in each table
- The structure of your tables

### Step 2: Check Console Logs
1. Open your browser and press **F12** to open DevTools
2. Go to the **Console** tab
3. Navigate to `/dashboard` and `/admin/orders`
4. Look for log messages starting with `[Dashboard]` and `[Admin]`

### Step 3: Common Issues and Solutions

#### Issue 1: User ID Mismatch
**Symptom:** Console shows "No user ID found" or user ID doesn't match
**Solution:**
1. Check what user data is stored in localStorage:
```javascript
// Run this in browser console
console.log('Stored user data:', {
  supabase: localStorage.getItem('supabase-user'),
  demo: localStorage.getItem('demo-user'),
  crime: localStorage.getItem('crime_zone_current_user')
});
```

2. If the user ID format doesn't match your database, create a proper user session:
```javascript
// Set a test user in localStorage
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com'
}));
```

#### Issue 2: Missing Users Table
**Symptom:** Error about users table not existing
**Solution:** Run the complete database schema:
```sql
-- Run scripts/setup_database_schema.sql in Supabase
```

#### Issue 3: Orders Table Structure Mismatch
**Symptom:** SQL errors or empty results
**Solution:** Ensure your orders table has these columns:
- `id` (uuid)
- `user_id` (uuid)
- `product_id` (uuid)
- `quantity` (integer)
- `total_amount` (numeric)
- `payment_method` (text)
- `status` (text)
- `created_at` (timestamptz)

#### Issue 4: Foreign Key Constraints
**Symptom:** Orders exist but joins fail
**Solution:** Check that:
- Products exist for the product_ids in orders
- Users exist for the user_ids in orders

### Step 4: Create Test Data
Run the test data script to create sample orders:
```sql
-- Copy and paste contents from scripts/create_test_data.sql
```

### Step 5: Test with Known User
1. Use the test user ID: `550e8400-e29b-41d4-a716-446655440000`
2. Set it in localStorage:
```javascript
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com'
}));
```
3. Refresh the dashboard

### Step 6: Check Database Permissions
Make sure Row Level Security is disabled for testing:
```sql
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

## Manual Testing Steps

### Test Dashboard
1. Go to `/dashboard`
2. Check browser console for logs
3. Should see orders count > 0

### Test Admin Panel
1. Go to `/admin/orders` 
2. Check browser console for logs
3. Should see orders listed

### Test Order Creation
1. Go to homepage
2. Add product to cart
3. Go through checkout process
4. Check if order appears in dashboard

## Quick Fixes

### Fix 1: Reset User Session
```javascript
// Clear all stored user data
localStorage.clear();
// Set test user
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com'
}));
```

### Fix 2: Simple Order Query Test
Run this in Supabase to see if orders exist:
```sql
SELECT COUNT(*) as order_count FROM public.orders;
SELECT * FROM public.orders LIMIT 5;
```

### Fix 3: Create Minimal Order
```sql
INSERT INTO public.orders (
  user_id, 
  product_id, 
  quantity, 
  total_amount, 
  status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM public.products LIMIT 1),
  1,
  29.99,
  'pending'
);
```

## Expected Console Output

When working correctly, you should see:
```
[Dashboard] Loading user and orders...
[Dashboard] Saved user from localStorage: Found
[Dashboard] Parsed user: {id: "550e8400-e29b-41d4-a716-446655440000", email: "test@example.com"}
[Dashboard] Loading orders for user ID: 550e8400-e29b-41d4-a716-446655440000
[Dashboard] User check result: {userCheck: {...}, userError: null}
[Dashboard] Orders query result: {rawOrders: [...], error: null}
[Dashboard] Normalized orders: [...]
```

## Still Not Working?

If orders still don't show up after following this guide:

1. **Check Supabase Dashboard Logs**
   - Go to Supabase Dashboard → Logs
   - Look for any SQL errors

2. **Verify Environment Variables**
   - Check `.env.local` has correct Supabase URL and key

3. **Test Direct Database Connection**
   - Use Supabase dashboard to run queries directly

4. **Check Network Tab**
   - Look for failed API requests in browser DevTools

The updated code now includes extensive logging to help identify exactly where the issue occurs!