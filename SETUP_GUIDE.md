# Suman Shop Frontend - Setup Guide

This guide will help you set up the Suman Shop frontend application with proper database configuration according to your specifications.

## Features Implemented

✅ **Product Management**
- Products table with title, description, price, image_url, download_url, stock
- Product display on homepage with search functionality
- Product cards with "Buy Now" buttons

✅ **Payment System**
- Payment methods table with QR codes and payment IDs  
- Dynamic payment method loading from database
- Support for UPI, Binance, and PayPal payments
- QR code display with enlargement modal
- Payment proof upload functionality

✅ **Order Management**
- Orders table with user_id, product_id, quantity, total_amount, payment_method, status
- Order creation from cart items
- Order status management (pending → confirmed → completed)
- Admin order confirmation workflow

✅ **Dashboard**
- User dashboard with Orders and Downloads tabs
- Download links only show for confirmed orders
- Order history with status tracking

✅ **Admin Panel**
- Order management with status updates
- Payment proof viewing
- Admin notes functionality
- Payment method configuration

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **npm** or **pnpm** package manager
3. **Supabase** account and project

## Setup Instructions

### 1. Database Setup

1. **Create a Supabase Project**
   - Go to [https://app.supabase.com/](https://app.supabase.com/)
   - Create a new project
   - Wait for the project to be ready

2. **Run the Database Schema**
   - Open the Supabase SQL Editor
   - Copy and paste the contents of `scripts/setup_database_schema.sql`
   - Execute the script to create all necessary tables and policies

3. **Get Your Supabase Credentials**
   - Go to Project Settings → API
   - Copy your `Project URL` and `anon public key`

### 2. Environment Configuration

1. **Update .env.local**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 3. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 4. Run the Application

```bash
npm run dev
# or 
pnpm dev
```

The application will be available at `http://localhost:3000`

## Application Flow

### Customer Journey

1. **Browse Products** (`/`)
   - View all available products
   - Search products by name/description
   - Click "Buy Now" to add to cart

2. **Checkout Process** (`/checkout`)
   - Review cart items and total
   - Select payment method (UPI/Binance/PayPal)
   - View QR code for selected payment method
   - Upload payment proof screenshot
   - Submit order (status: pending)

3. **Dashboard** (`/dashboard`)
   - View all orders with status
   - Access Downloads tab for confirmed orders
   - Download digital products

### Admin Workflow

1. **Order Management** (`/admin/orders`)
   - View pending orders
   - Review payment proofs
   - Confirm or reject orders
   - Add admin notes

2. **Payment Methods** (`/admin/settings`)
   - Manage payment method QR codes
   - Update payment IDs
   - Enable/disable payment methods

## Database Schema Overview

### Tables Created

- **users** - User profiles extending auth.users
- **products** - Product catalog with download URLs
- **orders** - Individual order records per product
- **payment_methods** - Payment gateway configurations
- **payment_proofs** - Uploaded payment confirmations

### Key Features

- **Row Level Security (RLS)** enabled on all tables
- **Real-time updates** for admin order management
- **File upload paths** for payment proofs
- **Status workflow**: pending → confirmed → completed

## Payment Methods Configuration

The system supports three payment methods with QR codes:

1. **UPI/PhonePe** - `/phonepe-qr.jpg`
2. **Binance** - `/binance-qr-new.jpg`  
3. **PayPal** - `/paypal-qr.jpg`

QR codes are automatically loaded from the public directory and displayed based on the payment_methods table configuration.

## Admin Setup

1. **Create Admin User**
   - Sign up through the normal registration flow
   - In Supabase SQL Editor, run:
   ```sql
   SELECT create_admin_user('your-admin-email@domain.com');
   ```

2. **Access Admin Panel**
   - Login with admin account
   - Navigate to `/admin`
   - Manage orders, products, and settings

## Troubleshooting

### Common Issues

1. **Supabase Connection Errors**
   - Verify .env.local has correct credentials
   - Check Supabase project is active
   - Ensure RLS policies are applied

2. **QR Code Not Loading**
   - Verify image files are in `/public` directory
   - Check payment_methods table has correct paths
   - Ensure images are properly named

3. **Order Creation Fails**
   - Check database schema is up to date
   - Verify user authentication
   - Check console for specific errors

### Development Tips

- Use browser dev tools to monitor API calls
- Check Supabase logs for database errors
- Test payment flow end-to-end
- Verify RLS policies allow proper access

## Next Steps

1. **Set up Supabase Storage** for proper file uploads
2. **Configure email notifications** for order confirmations  
3. **Add product categories** and filtering
4. **Implement inventory management**
5. **Add analytics and reporting**

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify database connections in Supabase
3. Test with sample data first
4. Ensure all environment variables are set correctly

---

**Made by Suman** - Complete e-commerce solution for digital products