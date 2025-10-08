# Supabase + React TypeScript Debugging Guide

This comprehensive debugging and optimization system provides advanced error handling, performance monitoring, and type safety for your Supabase + React TypeScript application.

## 📁 Files Created

### Core Debugging System
- `/lib/debug/supabase-debugger.ts` - Main debugging utility with error tracking and retry logic
- `/lib/supabase/enhanced-client.ts` - Type-safe Supabase client wrapper with debugging
- `/components/error-boundary.tsx` - React Error Boundary for handling Supabase errors
- `/components/debug-dashboard.tsx` - Real-time debugging dashboard (dev mode only)
- `/components/auth-form-enhanced.tsx` - Example enhanced auth component with debugging

## 🚀 Quick Start

### 1. Setup Error Boundaries
Wrap your app with the error boundary in your root layout:

```tsx
// app/layout.tsx
import { SupabaseErrorProvider } from '@/components/error-boundary'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SupabaseErrorProvider>
          {children}
        </SupabaseErrorProvider>
      </body>
    </html>
  )
}
```

### 2. Add Debug Dashboard (Development Only)
Add the debug dashboard to monitor operations in real-time:

```tsx
// app/page.tsx or any component
import DebugDashboard from '@/components/debug-dashboard'

export default function HomePage() {
  return (
    <div>
      {/* Your page content */}
      <DebugDashboard />
    </div>
  )
}
```

### 3. Use Enhanced Supabase Client
Replace your existing Supabase usage with the enhanced client:

```tsx
// Before
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// After
import { createEnhancedBrowserClient } from '@/lib/supabase/enhanced-client'
const supabase = createEnhancedBrowserClient('YourComponent')

// Usage with debugging and retry
const { data, error } = await supabase.db.select('users', '*', { withRetry: true })
  .execute({ is_active: true })
```

## 🔧 Enhanced Features

### Type-Safe Database Operations

```tsx
// Fully type-safe with IntelliSense
const { data: users, error } = await supabase.db
  .select('users', 'id, email, full_name')
  .execute({ is_active: true })

// Single record with automatic error handling
const { data: user, error } = await supabase.db
  .select('users')
  .single('user-id-123')

// Insert with type checking
const { data: newUser, error } = await supabase.db
  .insert('users', {
    email: 'user@example.com',
    full_name: 'John Doe'
  })

// Update with filters
const { data: updatedUser, error } = await supabase.db
  .update('users', 
    { full_name: 'Jane Doe' }, 
    { id: 'user-id-123' }
  )
```

### Authentication with Enhanced Error Handling

```tsx
// Sign up with detailed error handling
const handleSignup = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp(email, password, {
    data: { display_name: name }
  })
  
  // Errors are automatically logged and displayed to users
  if (error) {
    // Error is already handled by the debugging system
    return
  }
  
  // Success handling
  console.log('User created:', data.user)
}
```

### Storage Operations with Retry Logic

```tsx
// File upload with automatic retry on failure
const uploadAvatar = async (file: File) => {
  const { data, error } = await supabase.storage.upload(
    'avatars', 
    `${userId}/${file.name}`, 
    file,
    { upsert: true }
  )
  
  if (error) {
    // Error automatically handled and retried if appropriate
    return
  }
  
  // Get public URL
  const { data: publicUrl } = supabase.storage.getPublicUrl('avatars', data.path)
  return publicUrl.publicUrl
}
```

### Real-time Subscriptions with Debugging

```tsx
// Set up subscription with automatic logging
const subscription = supabase.subscribe(
  'orders',
  (payload) => {
    console.log('Order updated:', payload)
    // Handle real-time updates
  },
  { 
    event: 'UPDATE', 
    filter: `user_id=eq.${userId}` 
  }
)

// Clean up subscription
useEffect(() => {
  return () => subscription.unsubscribe()
}, [])
```

## 🔍 Debugging Features

### Automatic Error Tracking
- **Global Error Handling**: Catches unhandled promises and React errors
- **Context Logging**: Records component name, function, and parameters for each error
- **User-Friendly Messages**: Shows appropriate messages to users while logging technical details
- **Error Classification**: Distinguishes between auth, database, storage, and general errors

### Performance Monitoring
- **Operation Timing**: Tracks duration of all Supabase operations
- **Slow Query Detection**: Identifies operations taking >500ms or >1000ms
- **Performance Stats**: Calculates average, min, and max operation times
- **Visual Indicators**: Color-coded performance metrics in the debug dashboard

### Retry Logic
- **Exponential Backoff**: Automatically retries failed operations with increasing delays
- **Smart Retry Logic**: Avoids retrying authentication and validation errors
- **Configurable Limits**: Set custom retry counts and delays
- **User Feedback**: Shows retry attempts to users when appropriate

## 🛠️ Configuration Options

### Retry Configuration
```tsx
import { supabaseDebugger } from '@/lib/debug/supabase-debugger'

// Configure retry behavior
supabaseDebugger.setRetryConfig({
  maxRetries: 5,        // Default: 3
  baseDelay: 2000,      // Default: 1000ms
  maxDelay: 30000       // Default: 10000ms
})
```

### Error Boundary Options
```tsx
<SupabaseErrorBoundary
  maxRetries={5}
  showErrorDetails={true}
  onError={(error, errorInfo) => {
    // Custom error handling
    console.error('Custom error handler:', error)
  }}
  fallback={(error, errorInfo, retry) => (
    // Custom error UI
    <div>Custom error display</div>
  )}
>
  {children}
</SupabaseErrorBoundary>
```

### Database Schema Types
Update the database types in `/lib/supabase/enhanced-client.ts`:

```tsx
export interface Database {
  public: {
    Tables: {
      // Update this with your actual database schema
      your_table: {
        Row: {
          id: string
          // ... your columns
        }
        Insert: {
          // ... insert types
        }
        Update: {
          // ... update types
        }
      }
    }
  }
}
```

## 📊 Debug Dashboard Features

The debug dashboard provides real-time monitoring:

### Overview Tab
- **Error Count**: Total errors encountered
- **Operation Count**: Total database operations
- **Performance Summary**: Average, max, and min response times
- **Recent Errors**: Last 5 errors with details
- **Slow Operations**: Operations taking >500ms

### Errors Tab
- **Complete Error Log**: All errors with timestamps
- **Error Details**: Full error messages, stack traces, and context
- **Component Context**: Which component and function caused the error
- **Parameter Logging**: Input parameters that caused the error

### Performance Tab
- **Operation Timing**: Duration of each database operation
- **Performance Trends**: Visual indicators for slow operations
- **Context Details**: Parameters and metadata for each operation

### Export & Management
- **Export Logs**: Download all logs as JSON for analysis
- **Clear Logs**: Reset all logging data
- **Auto-refresh**: Real-time updates every 2 seconds

## 🔒 Security & Production

### Development vs Production
- Debug dashboard only shows in development mode
- Error details hidden from users in production
- Sensitive information automatically filtered from logs
- Console logging reduced in production builds

### Error Reporting
```tsx
// In production, errors can be sent to external services
const { error, errorInfo, errorId } = this.state

// Send to error reporting service
await fetch('/api/report-error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    errorId,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
    logs: supabaseDebugger.exportLogs()
  })
})
```

## 🧪 Testing & Validation

### Health Checks
```tsx
// Check Supabase connection health
const { healthy, error } = await supabase.healthCheck()
if (!healthy) {
  console.warn('Database connection issue:', error)
}
```

### RLS Policy Testing
```tsx
// Test Row Level Security policies
const result = await supabase.db.rls.checkPolicy(
  'users', 
  'SELECT',
  { id: 'test-user-id' }
)
```

## 🚨 Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Ensure all imports use correct paths and that components exist:
```tsx
// Make sure these imports work in your project
import { toast } from 'sonner'  // or your toast library
import { Button } from '@/components/ui/button'  // verify UI components exist
```

### Issue: TypeScript errors with database types
**Solution**: Update the Database interface with your actual schema:
```tsx
// In enhanced-client.ts, replace with your actual table structure
export interface Database {
  public: {
    Tables: {
      // Your actual tables here
    }
  }
}
```

### Issue: Supabase client not found
**Solution**: Verify your existing Supabase setup and update imports:
```tsx
// Ensure these files exist and export the correct functions
import { createClient as createBrowserClient } from './client'
import { createClient as createServerClient } from './server'
```

## 📈 Best Practices

1. **Use Type-Safe Operations**: Always use the enhanced client for type safety
2. **Enable Retries for Critical Operations**: Use `{ withRetry: true }` for important database operations
3. **Monitor Performance**: Check the debug dashboard regularly for slow operations
4. **Handle Errors Gracefully**: Let the error boundary handle errors while providing fallback UI
5. **Export Logs Regularly**: Download logs for analysis and debugging
6. **Test RLS Policies**: Use the RLS testing helpers to verify security policies
7. **Update Database Types**: Keep the Database interface in sync with your schema changes

## 🔄 Migration from Existing Code

To migrate existing Supabase code to use the debugging system:

1. **Replace client imports**:
   ```tsx
   // Old
   import { createClient } from '@/lib/supabase/client'
   
   // New
   import { createEnhancedBrowserClient } from '@/lib/supabase/enhanced-client'
   ```

2. **Update database operations**:
   ```tsx
   // Old
   const { data, error } = await supabase.from('users').select('*')
   
   // New
   const { data, error } = await supabase.db.select('users').execute()
   ```

3. **Add error boundaries**:
   ```tsx
   // Wrap components with error boundary
   <SupabaseErrorBoundary>
     <YourComponent />
   </SupabaseErrorBoundary>
   ```

4. **Enable debugging dashboard**:
   ```tsx
   // Add to your main layout or pages
   import DebugDashboard from '@/components/debug-dashboard'
   ```

This debugging system will significantly improve your development experience and help you catch and resolve issues quickly while providing a better user experience in production.