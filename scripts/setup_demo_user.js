// =====================================================
// BROWSER SETUP FOR SUBMIT ORDER TESTING
// Run this in your browser console (F12)
// =====================================================

console.log('Setting up demo user and cart for submit order testing...');

// 1. Set up demo user in localStorage
const demoUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'demo@example.com',
  name: 'Demo User',
  created_at: new Date().toISOString()
};

localStorage.setItem('demo-user', JSON.stringify(demoUser));
localStorage.setItem('supabase-user', JSON.stringify(demoUser));
console.log('✅ Demo user set:', demoUser);

// 2. Set up demo cart with test products
const demoCart = [
  {
    id: 'cart-1',
    product_id: '22222222-2222-2222-2222-222222222222',
    quantity: 1,
    product: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Digital Art Bundle',
      description: 'Premium digital art collection with high-resolution images',
      price: 29.99,
      image: '/placeholder.svg',
      category: 'digital',
      stock: 999
    }
  },
  {
    id: 'cart-2', 
    product_id: '33333333-3333-3333-3333-333333333333',
    quantity: 2,
    product: {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Video Course',
      description: 'Complete web development video course',
      price: 99.99,
      image: '/placeholder.svg',
      category: 'education',
      stock: 999
    }
  }
];

localStorage.setItem('demo-cart', JSON.stringify(demoCart));
localStorage.setItem(`cart-${demoUser.id}`, JSON.stringify(demoCart));
console.log('✅ Demo cart set:', demoCart);

// 3. Clear any existing orders to test fresh
localStorage.removeItem(`local-orders-${demoUser.id}`);
localStorage.removeItem('local-orders');
console.log('✅ Cleared existing local orders');

// 4. Test Supabase environment variables
console.log('🔍 Checking environment variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not found');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not found');

// 5. Calculate cart total
const cartTotal = demoCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
console.log('💰 Cart total: $' + cartTotal.toFixed(2));

// 6. Show setup summary
console.log(`
🚀 SETUP COMPLETE!

Demo User: ${demoUser.email}
User ID: ${demoUser.id}
Cart Items: ${demoCart.length}
Cart Total: $${cartTotal.toFixed(2)}

Next steps:
1. Go to /checkout page
2. Select payment method (binance, paypal, phonepe, or upi)
3. Upload a payment proof image
4. Click "Submit Order"
5. Check browser console for detailed logs
6. Orders will appear in /dashboard

If Supabase fails, orders will be saved locally and still show in dashboard.
`);

// 7. Show current localStorage state
console.log('📦 Current localStorage state:');
Object.keys(localStorage).filter(key => 
  key.includes('demo') || key.includes('cart') || key.includes('user') || key.includes('order')
).forEach(key => {
  console.log(`${key}:`, localStorage.getItem(key)?.substring(0, 100) + '...');
});