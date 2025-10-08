# Test Checkout Flow - Complete Order Submission Test

## Step 1: Set Up Test Environment

### 1.1 Run Database Test Script
1. Open your **Supabase SQL Editor**
2. Copy and paste the contents of `scripts/test_order_submission.sql`
3. Run the script - it will test your database setup

### 1.2 Set Test User in Browser
1. Open your application at `http://localhost:3000`
2. Press **F12** to open DevTools → Console tab
3. Run this command:

```javascript
// Set test user
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User'
}));

// Add a test item to cart
localStorage.setItem('demo-cart', JSON.stringify([
  {
    id: Date.now().toString(),
    product_id: 'test-product-id', // This will be replaced by actual product
    quantity: 1,
    product: {
      id: 'test-product-id',
      name: 'Test Product',
      price: 29.99,
      image: '/placeholder.svg'
    }
  }
]));

console.log('Test environment set up!');
location.reload();
```

## Step 2: Test Homepage Functionality

### 2.1 Check Products Load
```javascript
// Check if products are loading on homepage
fetch('/api/products').then(r => r.json()).then(data => {
  console.log('Products loaded:', data);
}).catch(e => console.log('Products API not available, using fallback'));
```

### 2.2 Test Add to Cart
1. Go to homepage
2. Click "Add to Cart" on any product
3. Check if cart count increases
4. Open browser console and check:

```javascript
console.log('Demo cart:', localStorage.getItem('demo-cart'));
console.log('User cart:', localStorage.getItem('cart-550e8400-e29b-41d4-a716-446655440000'));
```

## Step 3: Test Checkout Flow

### 3.1 Navigate to Checkout
1. Click on the cart button
2. Click "Checkout" or navigate to `/checkout`
3. Check browser console for any errors

### 3.2 Test Payment Method Selection
```javascript
// Test payment method loading
const testPaymentMethods = async () => {
  try {
    const supabase = window.supabase || createClient();
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('active', true);
    
    console.log('Payment methods:', { data, error });
    return data;
  } catch (error) {
    console.error('Payment methods test failed:', error);
  }
};

testPaymentMethods();
```

### 3.3 Test Order Submission (Without File Upload)
First, let's modify the checkout to allow testing without file upload:

```javascript
// Temporarily disable payment proof requirement for testing
if (window.location.pathname === '/checkout') {
  // Override the submit button click
  setTimeout(() => {
    const submitBtn = document.querySelector('button[type="submit"], button:contains("Submit Order")');
    if (submitBtn) {
      console.log('Found submit button, testing order submission...');
    }
  }, 2000);
}
```

### 3.4 Manual Order Creation Test
Run this in console to test direct order creation:

```javascript
const testOrderCreation = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('demo-user'));
    console.log('Testing order creation for user:', user);
    
    // Get first available product
    const response = await fetch('/_vercel/insights/vitals', {method: 'GET'}).catch(() => null);
    
    // Create test order via Supabase
    const { createClient } = await import('./lib/supabase/client');
    const supabase = createClient();
    
    const { data: products } = await supabase
      .from('products')
      .select('id, title, price')
      .limit(1);
    
    if (!products || products.length === 0) {
      console.error('No products available for testing');
      return;
    }
    
    const product = products[0];
    console.log('Testing with product:', product);
    
    const orderData = {
      user_id: user.id,
      product_id: product.id,
      quantity: 1,
      total_amount: product.price,
      payment_method: 'PhonePe UPI',
      status: 'pending'
    };
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    
    if (error) {
      console.error('Order creation failed:', error);
      return;
    }
    
    console.log('Order created successfully:', order);
    
    // Test payment proof creation
    const proofData = {
      user_id: user.id,
      order_id: order.id,
      file_path: 'test-payment-proof.jpg'
    };
    
    const { data: proof, error: proofError } = await supabase
      .from('payment_proofs')
      .insert([proofData])
      .select()
      .single();
    
    if (proofError) {
      console.error('Payment proof creation failed:', proofError);
    } else {
      console.log('Payment proof created successfully:', proof);
    }
    
    return { order, proof };
    
  } catch (error) {
    console.error('Test order creation failed:', error);
  }
};

// Run the test
testOrderCreation();
```

## Step 4: Test Dashboard Display

### 4.1 Check Dashboard Orders
1. Navigate to `/dashboard`
2. Check if orders appear
3. Run this in console:

```javascript
const testDashboard = async () => {
  const user = JSON.parse(localStorage.getItem('demo-user'));
  console.log('Testing dashboard for user:', user);
  
  try {
    const { createClient } = await import('./lib/supabase/client');
    const supabase = createClient();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        total_amount,
        payment_method,
        status,
        created_at,
        products:product_id ( id, title, image_url, download_url, price )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('Dashboard orders query:', { orders, error });
    
    if (orders && orders.length > 0) {
      console.log(`Found ${orders.length} orders for user`);
      orders.forEach((order, index) => {
        console.log(`Order ${index + 1}:`, {
          id: order.id,
          status: order.status,
          product: order.products?.title,
          amount: order.total_amount
        });
      });
    } else {
      console.log('No orders found for user');
    }
    
  } catch (error) {
    console.error('Dashboard test failed:', error);
  }
};

testDashboard();
```

## Step 5: Test Admin Panel

### 5.1 Set Admin User
```javascript
// Set admin user
localStorage.setItem('demo-user', JSON.stringify({
  id: '550e8400-e29b-41d4-a716-446655441111',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin'
}));

location.reload();
```

### 5.2 Test Admin Orders View
1. Navigate to `/admin/orders`
2. Check if all orders are visible
3. Test order status updates

## Expected Results

### ✅ Success Indicators:
- Products load on homepage
- Add to cart works
- Cart shows items
- Checkout page loads payment methods
- Orders can be created in database
- Dashboard shows user orders
- Admin panel shows all orders
- Order status can be updated

### ❌ Failure Indicators:
- Console errors about missing tables
- "No payment methods available"
- Orders not appearing in dashboard
- Supabase connection errors
- RLS permission denied errors

## Common Issues & Solutions

### Issue 1: Database Schema Mismatch
**Solution**: Run `scripts/fix_database_schema.sql`

### Issue 2: User ID Mismatch
**Solution**: Use the test user ID: `550e8400-e29b-41d4-a716-446655440000`

### Issue 3: RLS Blocking Queries
**Solution**: 
```sql
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

### Issue 4: Payment Proof Required
**Solution**: Create a test image file or modify validation temporarily

Run through these tests step by step to identify exactly where the order submission is failing!