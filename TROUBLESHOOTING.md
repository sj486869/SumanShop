# Troubleshooting Guide - Payment Methods Error

## Error Description
```
[admin] upsertMethod update error {}
```

This error occurs when the `payment_methods` table in your Supabase database doesn't have all the columns that the application expects.

## Root Cause
The application code expects these columns in the `payment_methods` table:
- `id` (UUID, primary key)
- `method_name` (text)
- `active` (boolean)
- `upi_qr` (text)
- `upi_id` (text)
- `binance_qr` (text)
- `binance_id` (text)
- `paypal_qr` (text)
- `paypal_id` (text)
- `created_at` (timestamptz)

But your current database might only have basic columns like `id`, `method_name`, and `active`.

## Quick Fix

### Option 1: Run Migration Script (Recommended)
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `scripts/migrate_payment_methods.sql`
4. Execute the script
5. Refresh your application

### Option 2: Recreate Table Manually
1. Open Supabase SQL Editor
2. Run this script:

```sql
-- Drop and recreate payment_methods table with all required columns
DROP TABLE IF EXISTS public.payment_methods CASCADE;

CREATE TABLE public.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    method_name text NOT NULL,
    active boolean DEFAULT true,
    upi_qr text,
    upi_id text,
    binance_qr text,
    binance_id text,
    paypal_qr text,
    paypal_id text,
    created_at timestamptz DEFAULT now()
);

-- Insert default payment methods
INSERT INTO public.payment_methods (method_name, active, upi_qr, binance_qr, paypal_qr) VALUES 
    ('PhonePe UPI', true, '/phonepe-qr.jpg', null, null),
    ('Binance Pay', true, null, '/binance-qr-new.jpg', null),
    ('PayPal', true, null, null, '/paypal-qr.jpg');

-- Disable RLS for now
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
```

### Option 3: Check Your Current Schema
First, see what columns you actually have:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Verification Steps

After running the fix:

1. **Check the table structure:**
```sql
SELECT * FROM public.payment_methods;
```

2. **Test the admin panel:**
   - Go to `/admin/settings`
   - Switch to "Payment Methods" tab
   - Try to toggle a payment method on/off
   - The error should be gone

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for any remaining errors
   - The upsertMethod error should no longer appear

## Common Issues

### Issue 1: Table doesn't exist
**Error:** `relation "payment_methods" does not exist`
**Solution:** Run the full database schema setup from `scripts/setup_database_schema.sql`

### Issue 2: Permission denied
**Error:** `permission denied for table payment_methods`
**Solution:** Make sure RLS is disabled:
```sql
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
```

### Issue 3: Still getting empty error object
**Error:** `upsertMethod update error {}`
**Solution:** Check that all expected columns exist and have correct data types.

## Prevention

To avoid similar issues in the future:
1. Always use the complete database schema from `scripts/setup_database_schema.sql`
2. Run migrations when updating the application
3. Check the application logs when adding new features
4. Test admin functionality after any database changes

## Need Help?

If you're still experiencing issues:
1. Check your Supabase project URL and API keys in `.env.local`
2. Verify your internet connection to Supabase
3. Check Supabase dashboard for any service outages
4. Look at the Network tab in browser DevTools for failed API calls
5. Check Supabase logs in the dashboard under "Logs"

The error should be resolved after running the migration script!