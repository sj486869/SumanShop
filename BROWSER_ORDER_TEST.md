# Browser Order Submission Test

## Problem
Orders are not being saved to Supabase when submitted through the checkout form.

## Step 1: Database Verification
1. **Open Supabase Dashboard** → SQL Editor
2. **Run the verification script**: Copy and paste from `scripts/verify_supabase_connection.sql`
3. **Check the results** - make sure all tables exist and RLS is disabled

## Step 2: Browser Console Test

### 2.1 Set Up Test Environment
1. **Open your application** at `http://localhost:3000`
2. **Press F12** → Console tab
3. **Run this setup code**:

```javascript
// Clear any existing data
localStorage.clear();

// Set test user
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User'
}));

// Add test cart item
localStorage.setItem('demo-cart', JSON.stringify([
  {
    id: Date.now().toString(),
    product_id: 'product-test-12345', // This should match a real product ID
    quantity: 1,
    product: {
      id: 'product-test-12345',
      name: 'Test Product',
      price: 29.99,
      image: '/placeholder.svg'
    }
  }
]));

console.log('✅ Test environment set up');
location.reload();
```

### 2.2 Test Supabase Connection
```javascript
// Test Supabase connection and authentication
const testSupabaseConnection = async () => {
  try {
    // Check if we can access createClient
    const { createClient } = await import('/lib/supabase/client.js');
    const supabase = createClient();
    
    console.log('✅ Supabase client created successfully');
    
    // Test a simple query
    const { data, error } = await supabase
      .from('products')
      .select('id, title, price')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase query failed:', error);
      return false;
    }
    
    console.log('✅ Supabase query successful:', data);
    return true;
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
};

testSupabaseConnection();
```

### 2.3 Test Order Creation Directly
```javascript
const testOrderCreation = async () => {
  try {
    // Get user and product data
    const user = JSON.parse(localStorage.getItem('demo-user'));
    console.log('👤 User:', user);
    
    const { createClient } = await import('/lib/supabase/client.js');
    const supabase = createClient();
    
    // Get the first available product
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, title, price')
      .limit(1);
    
    if (productError) {
      console.error('❌ Failed to fetch products:', productError);
      return;
    }
    
    if (!products || products.length === 0) {
      console.error('❌ No products found in database');
      return;
    }
    
    const product = products[0];
    console.log('🛍️ Using product:', product);
    
    // Create order data exactly like the checkout form does
    const orderData = {
      user_id: user.id,
      product_id: product.id,
      quantity: 1,
      total_amount: product.price,
      payment_method: 'PhonePe UPI',
      status: 'pending'
    };
    
    console.log('📦 Order data to insert:', orderData);
    
    // Insert the order
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    
    if (orderError) {
      console.error('❌ Order creation failed:', orderError);
      console.error('Error details:', {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint
      });
      return;
    }
    
    console.log('✅ Order created successfully!', createdOrder);
    
    // Verify the order was saved
    const { data: verification, error: verifyError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', createdOrder.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Order verification failed:', verifyError);
    } else {
      console.log('✅ Order verified in database:', verification);
    }
    
    return createdOrder;
    
  } catch (error) {
    console.error('❌ Test order creation failed:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Run the test
testOrderCreation();
```

### 2.4 Test Environment Variables
```javascript
// Check if environment variables are properly set
console.log('Environment check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process?.env?.NEXT_PUBLIC_SUPABASE_URL || 'Not found in process.env');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not found');

// Check if they're accessible from browser
console.log('Browser environment check:');
console.log('Window location:', window.location.origin);
```

### 2.5 Test Complete Checkout Flow
```javascript
const testCheckoutFlow = async () => {
  try {
    console.log('🛒 Testing complete checkout flow...');
    
    // Navigate to checkout
    if (window.location.pathname !== '/checkout') {
      console.log('Navigating to checkout...');
      window.location.href = '/checkout';
      return;
    }
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find and click submit button
    const submitButton = document.querySelector('button:contains("Submit Order")') || 
                        document.querySelector('[data-testid="submit-order"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.includes('Submit')
                        );
    
    if (submitButton) {
      console.log('✅ Found submit button:', submitButton);
      
      // Monitor console for checkout logs
      console.log('🔍 Watch console for [Checkout] logs when clicking submit...');
      
      // Click the button
      submitButton.click();
    } else {
      console.error('❌ Submit button not found');
      console.log('Available buttons:', 
        Array.from(document.querySelectorAll('button')).map(btn => btn.textContent)
      );
    }
    
  } catch (error) {
    console.error('❌ Checkout flow test failed:', error);
  }
};

// Run if on checkout page
if (window.location.pathname === '/checkout') {
  testCheckoutFlow();
}
```

## Step 3: Check Results

After running the tests, check for:

### ✅ Success Indicators:
- "Supabase client created successfully"
- "Supabase query successful"  
- "Order created successfully"
- "Order verified in database"
- No console errors

### ❌ Failure Indicators:
- "Supabase connection failed"
- "Order creation failed"
- Database permission errors
- Missing table errors
- Environment variable errors

## Step 4: Common Issues & Solutions

### Issue 1: Environment Variables Not Set
**Check**: Your `.env.local` file has:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Issue 2: Database Tables Missing
**Solution**: Run the database verification script in Supabase

### Issue 3: RLS Blocking Inserts
**Solution**: Run in Supabase SQL Editor:
```sql
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

### Issue 4: Product IDs Don't Match
**Solution**: Make sure cart items have valid product_id values from your products table

## What To Do Next

1. **Run the database verification script** first
2. **Run all browser console tests** step by step
3. **Check the detailed console logs** I added to the checkout page
4. **Report which specific test fails** so I can help you fix it

The enhanced logging will show us exactly where the order submission is failing!