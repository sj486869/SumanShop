'use client'

/**
 * Enhanced Error Boundary for Supabase + React Applications
 * 
 * Features:
 * - Catches React component errors and async errors
 * - Handles Supabase-specific errors with user-friendly messages
 * - Provides fallback UI with error details
 * - Logs errors for debugging
 * - Retry functionality for failed operations
 */

import React, { Component, ReactNode } from 'react'
import { PostgrestError, AuthError } from '@supabase/supabase-js'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabaseDebugger } from '@/lib/debug/supabase-debugger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: React.ErrorInfo, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
  showErrorDetails?: boolean
}

export class SupabaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries: number

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.maxRetries = props.maxRetries || 3
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to our debugger
    supabaseDebugger.executeSupabaseOperation(
      async () => ({ data: null, error: null }),
      {
        component: 'ErrorBoundary',
        function: 'componentDidCatch',
        timestamp: new Date(),
        parameters: { 
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      }
    )

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to console with better formatting
    console.group('🚨 React Error Boundary Caught Error')
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Component Stack:', errorInfo.componentStack)
    console.groupEnd()
  }

  private isSupabaseError = (error: Error): error is PostgrestError | AuthError => {
    return 'code' in error || error.message.includes('supabase')
  }

  private getErrorMessage = (error: Error): { title: string; description: string; userFriendly: boolean } => {
    if (this.isSupabaseError(error)) {
      // Handle Supabase-specific errors
      const supabaseError = error as PostgrestError | AuthError

      if ('code' in supabaseError) {
        const errorCode = supabaseError.code
        
        switch (errorCode) {
          case 'PGRST116':
            return {
              title: 'No Data Found',
              description: 'The requested data could not be found. It may have been deleted or moved.',
              userFriendly: true
            }
          case '23505':
            return {
              title: 'Duplicate Entry',
              description: 'This item already exists. Please try with different information.',
              userFriendly: true
            }
          case '23503':
            return {
              title: 'Cannot Delete',
              description: 'This item cannot be deleted because it\'s being used elsewhere.',
              userFriendly: true
            }
          case '42501':
            return {
              title: 'Permission Denied',
              description: 'You don\'t have permission to perform this action. Please check your account permissions.',
              userFriendly: true
            }
          default:
            return {
              title: 'Database Error',
              description: `Database operation failed with code: ${errorCode}. Please try again.`,
              userFriendly: false
            }
        }
      }

      // Handle Auth errors
      if (error.message.includes('Invalid login credentials')) {
        return {
          title: 'Login Failed',
          description: 'Invalid email or password. Please check your credentials and try again.',
          userFriendly: true
        }
      }

      if (error.message.includes('Email not confirmed')) {
        return {
          title: 'Email Not Verified',
          description: 'Please check your email and click the verification link before signing in.',
          userFriendly: true
        }
      }

      if (error.message.includes('User not found')) {
        return {
          title: 'Account Not Found',
          description: 'No account found with this email address. Please sign up first.',
          userFriendly: true
        }
      }
    }

    // Handle common React errors
    if (error.message.includes('ChunkLoadError')) {
      return {
        title: 'Loading Error',
        description: 'Failed to load application resources. Please refresh the page.',
        userFriendly: true
      }
    }

    if (error.message.includes('NetworkError')) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        userFriendly: true
      }
    }

    // Generic error
    return {
      title: 'Something Went Wrong',
      description: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred. Please try again.',
      userFriendly: false
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state
    
    if (!error) return

    const errorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      logs: supabaseDebugger.exportLogs()
    }

    // In a real app, you'd send this to your error reporting service
    console.log('Error Report:', errorReport)
    
    // Copy to clipboard for easy sharing
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error report copied to clipboard!')
    }).catch(() => {
      console.log('Failed to copy to clipboard, check console for error report')
    })
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback, showErrorDetails = process.env.NODE_ENV === 'development' } = this.props

    if (!hasError) {
      return children
    }

    if (!error) {
      return <div>An unknown error occurred</div>
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback(error, this.state.errorInfo!, this.handleRetry)
    }

    const { title, description, userFriendly } = this.getErrorMessage(error)
    const canRetry = retryCount < this.maxRetries

    return (
      <div className=\"min-h-screen bg-background flex items-center justify-center p-4\">
        <Card className=\"w-full max-w-md\">
          <CardHeader className=\"text-center pb-4\">
            <div className=\"mx-auto mb-4 h-12 w-12 text-destructive\">
              <AlertTriangle className=\"h-full w-full\" />
            </div>
            <CardTitle className=\"text-xl font-semibold\">{title}</CardTitle>
            <CardDescription className=\"text-muted-foreground\">
              {description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className=\"space-y-4\">
            {/* Action Buttons */}
            <div className=\"flex flex-col gap-2\">
              {canRetry && (
                <Button onClick={this.handleRetry} className=\"w-full\">
                  <RefreshCw className=\"mr-2 h-4 w-4\" />
                  Try Again {retryCount > 0 && `(${retryCount}/${this.maxRetries})`}
                </Button>
              )}
              
              <Button variant=\"outline\" onClick={this.handleGoHome} className=\"w-full\">
                <Home className=\"mr-2 h-4 w-4\" />
                Go Home
              </Button>
            </div>

            {/* Error Details (Development Only) */}
            {showErrorDetails && (
              <div className=\"space-y-2\">
                <Button
                  variant=\"ghost\"
                  size=\"sm\"
                  onClick={this.handleReportError}
                  className=\"w-full text-xs\"
                >
                  <Bug className=\"mr-1 h-3 w-3\" />
                  Report Error
                </Button>
                
                <details className=\"text-xs\">
                  <summary className=\"cursor-pointer text-muted-foreground hover:text-foreground\">
                    Technical Details
                  </summary>
                  <div className=\"mt-2 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32\">
                    <div><strong>Error ID:</strong> {this.state.errorId}</div>
                    <div><strong>Message:</strong> {error.message}</div>
                    {error.stack && (
                      <div><strong>Stack:</strong> <pre className=\"whitespace-pre-wrap\">{error.stack}</pre></div>
                    )}
                    <div><strong>Retry Count:</strong> {retryCount}</div>
                  </div>
                </details>
              </div>
            )}

            {/* Retry Exhausted Message */}
            {!canRetry && retryCount >= this.maxRetries && (
              <div className=\"text-center text-sm text-muted-foreground\">
                <p>Multiple attempts failed. Please try refreshing the page or contact support if the problem persists.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }
}

// Hook for handling async errors in function components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    setError(error)
    
    // Log to debugger
    supabaseDebugger.executeSupabaseOperation(
      async () => ({ data: null, error: null }),
      {
        component: 'useErrorHandler',
        function: 'handleError',
        timestamp: new Date(),
        parameters: { error: error.message }
      }
    )
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  // Throw error to be caught by Error Boundary
  if (error) {
    throw error
  }

  return { handleError, clearError }
}

// Simple wrapper component for convenience
export function SupabaseErrorProvider({ children }: { children: ReactNode }) {
  return (
    <SupabaseErrorBoundary
      maxRetries={3}
      onError={(error, errorInfo) => {
        // You can add additional error logging here
        console.error('Global error caught:', error, errorInfo)
      }}
    >
      {children}
    </SupabaseErrorBoundary>
  )
}