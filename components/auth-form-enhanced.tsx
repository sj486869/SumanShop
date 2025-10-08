"use client"

/**
 * Enhanced Auth Form Component with Supabase Debugging
 * 
 * Features:
 * - Uses enhanced Supabase client with debugging
 * - Type-safe authentication operations
 * - Better error handling and user feedback
 * - Loading states and retry functionality
 * - Form validation with proper TypeScript types
 */

import React, { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { createEnhancedBrowserClient } from "@/lib/supabase/enhanced-client"
import { useSupabaseDebugger, useErrorHandler } from "@/lib/debug/supabase-debugger"
import { toast } from "sonner"

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long")
})

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long")
    .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .regex(/(?=.*\d)/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type LoginFormData = z.infer<typeof loginSchema>
type SignupFormData = z.infer<typeof signupSchema>

interface AuthFormProps {
  onSuccess?: (user: any) => void
  mode?: 'login' | 'signup'
  redirectTo?: string
}

export function EnhancedAuthForm({ 
  onSuccess, 
  mode: initialMode = 'login',
  redirectTo = '/'
}: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Enhanced debugging hooks
  const { handleError } = useErrorHandler()
  const debugger = useSupabaseDebugger()
  
  // Enhanced Supabase client
  const supabase = createEnhancedBrowserClient('AuthForm')

  // Form setup with validation
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      confirmPassword: ""
    }
  })

  const currentForm = mode === 'login' ? loginForm : signupForm
  const currentSchema = mode === 'login' ? loginSchema : signupSchema

  // Health check on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const { healthy, error } = await supabase.healthCheck()
        if (!healthy) {
          console.warn('Supabase connection issue:', error)
          toast.warning('Connection issue detected. Please check your internet connection.')
        }
      } catch (error) {
        console.warn('Failed to perform health check:', error)
      }
    }

    checkConnection()
  }, [supabase])

  const handleLogin = useCallback(async (data: LoginFormData) => {
    setLoading(true)
    
    try {
      const result = await supabase.auth.signIn(data.email, data.password)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      if (result.data?.user) {
        toast.success('Login successful!')
        
        // Store session info for middleware
        document.cookie = "sb_local_session=1; Max-Age=604800; path=/"
        if (result.data.user.user_metadata?.role) {
          document.cookie = `sb_local_role=${result.data.user.user_metadata.role}; Max-Age=604800; path=/`
        }

        // Call success callback
        onSuccess?.(result.data.user)
        
        // Navigate or redirect
        if (redirectTo && redirectTo !== '/') {
          window.location.href = redirectTo
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      
      // Handle specific error types
      if (errorMessage.includes('Invalid login credentials')) {
        currentForm.setError('email', { message: 'Invalid email or password' })
        currentForm.setError('password', { message: 'Invalid email or password' })
      } else if (errorMessage.includes('Email not confirmed')) {
        toast.error('Please verify your email before signing in', {
          description: 'Check your inbox for a confirmation email'
        })
      } else {
        handleError(error instanceof Error ? error : new Error(errorMessage))
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, currentForm, onSuccess, redirectTo, handleError])

  const handleSignup = useCallback(async (data: SignupFormData) => {
    setLoading(true)
    
    try {
      const result = await supabase.auth.signUp(data.email, data.password, {
        data: {
          full_name: data.name,
          display_name: data.name
        }
      })
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      if (result.data?.user) {
        // Check if user needs email confirmation
        if (!result.data.session) {
          toast.success('Account created successfully!', {
            description: 'Please check your email to verify your account before signing in.'
          })
          setMode('login')
          loginForm.setValue('email', data.email)
        } else {
          toast.success('Account created and signed in successfully!')
          
          // Store session info
          document.cookie = "sb_local_session=1; Max-Age=604800; path=/"
          
          onSuccess?.(result.data.user)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed'
      
      // Handle specific error types
      if (errorMessage.includes('User already registered')) {
        currentForm.setError('email', { message: 'An account with this email already exists' })
        toast.info('Account exists', {
          description: 'Try signing in instead or use the password reset feature.'
        })
      } else {
        handleError(error instanceof Error ? error : new Error(errorMessage))
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, currentForm, onSuccess, loginForm, handleError])

  const onSubmit = (data: LoginFormData | SignupFormData) => {
    if (mode === 'login') {
      handleLogin(data as LoginFormData)
    } else {
      handleSignup(data as SignupFormData)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    // Clear form errors when switching modes
    currentForm.clearErrors()
  }

  const handleForgotPassword = async () => {
    const email = currentForm.getValues('email')
    if (!email) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      const result = await supabase.auth.resetPassword(email)
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      toast.success('Password reset email sent!', {
        description: 'Check your inbox for instructions to reset your password.'
      })
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to send password reset email'))
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        </CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? 'Enter your credentials to access your account' 
            : 'Create a new account to get started'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name field for signup */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...signupForm.register('name')}
                className={signupForm.formState.errors.name ? 'border-destructive' : ''}
              />
              {signupForm.formState.errors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {signupForm.formState.errors.name.message}
                </p>
              )}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...currentForm.register('email')}
              className={currentForm.formState.errors.email ? 'border-destructive' : ''}
            />
            {currentForm.formState.errors.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {currentForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...currentForm.register('password')}
                className={`pr-10 ${currentForm.formState.errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {currentForm.formState.errors.password && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {currentForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password field for signup */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...signupForm.register('confirmPassword')}
                  className={`pr-10 ${signupForm.formState.errors.confirmPassword ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {signupForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {signupForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          )}

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                {mode === 'login' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </>
            )}
          </Button>

          {/* Mode toggle */}
          <div className="text-center text-sm space-y-2">
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>

            {/* Forgot password link for login mode */}
            {mode === 'login' && (
              <div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>

          {/* Development info */}
          {process.env.NODE_ENV === 'development' && mode === 'login' && (
            <Alert className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Development Mode:</strong><br/>
                Admin login - Email: admin@example.com, Password: Mafi123
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default EnhancedAuthForm