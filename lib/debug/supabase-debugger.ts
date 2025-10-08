/**
 * Supabase Debug & Error Tracking Utility
 * 
 * Features:
 * - Tracks all Supabase operations (Auth, Database, Storage)
 * - Catches unhandled Promise rejections
 * - Logs contextual information with component/function names
 * - Type-safe error handling for Supabase operations
 * - Performance monitoring for database queries
 * - Automatic retry mechanism with exponential backoff
 * - Real-time error notifications
 */

import { PostgrestError, AuthError } from '@supabase/supabase-js'
import { toast } from 'sonner' // assuming you're using sonner for notifications

// Types for better error tracking
export interface DebugContext {
  component: string
  function: string
  parameters?: Record<string, any>
  timestamp: Date
  userId?: string
}

export interface SupabaseOperationResult<T> {
  data: T | null
  error: PostgrestError | AuthError | Error | null
  context: DebugContext
  duration: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

class SupabaseDebugger {
  private static instance: SupabaseDebugger
  private errorLog: Array<{
    error: Error | PostgrestError | AuthError
    context: DebugContext
    stack?: string
  }> = []
  
  private performanceLog: Array<{
    operation: string
    duration: number
    context: DebugContext
  }> = []

  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }

  private constructor() {
    this.setupGlobalErrorHandling()
  }

  public static getInstance(): SupabaseDebugger {
    if (!SupabaseDebugger.instance) {
      SupabaseDebugger.instance = new SupabaseDebugger()
    }
    return SupabaseDebugger.instance
  }

  private setupGlobalErrorHandling() {
    // Catch unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(new Error('Unhandled Promise Rejection: ' + event.reason), {
          component: 'Global',
          function: 'unhandledrejection',
          timestamp: new Date()
        })
        console.error('🚨 Unhandled Promise Rejection:', event.reason)
      })
    }

    // Catch general errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError(new Error(event.message), {
          component: 'Global',
          function: 'error',
          parameters: { 
            filename: event.filename, 
            lineno: event.lineno, 
            colno: event.colno 
          },
          timestamp: new Date()
        })
      })
    }
  }

  /**
   * Enhanced wrapper for Supabase operations with debugging
   */
  public async executeSupabaseOperation<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | AuthError | null }>,
    context: DebugContext,
    withRetry: boolean = false
  ): Promise<SupabaseOperationResult<T>> {
    const startTime = performance.now()

    const executeOnce = async (): Promise<SupabaseOperationResult<T>> => {
      try {
        const result = await operation()
        const duration = performance.now() - startTime

        // Log performance
        this.logPerformance({
          operation: `${context.component}.${context.function}`,
          duration,
          context
        })

        if (result.error) {
          this.logError(result.error, context)
          this.showErrorNotification(result.error, context)
        } else {
          console.log(`✅ ${context.component}.${context.function}:`, result.data)
        }

        return { ...result, context, duration }
      } catch (error) {
        const duration = performance.now() - startTime
        const errorObj = error instanceof Error ? error : new Error(String(error))
        
        this.logError(errorObj, context)
        this.showErrorNotification(errorObj, context)

        return {
          data: null,
          error: errorObj,
          context,
          duration
        }
      }
    }

    if (withRetry) {
      return this.executeWithRetry(executeOnce, context)
    } else {
      return executeOnce()
    }
  }

  /**
   * Execute operation with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<SupabaseOperationResult<T>>,
    context: DebugContext
  ): Promise<SupabaseOperationResult<T>> {
    let lastResult: SupabaseOperationResult<T>
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      lastResult = await operation()
      
      if (!lastResult.error || !this.shouldRetry(lastResult.error)) {
        return lastResult
      }

      if (attempt < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        )
        
        console.log(`🔄 Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} for ${context.component}.${context.function} in ${delay}ms`)
        await this.sleep(delay)
      }
    }

    return lastResult!
  }

  private shouldRetry(error: PostgrestError | AuthError | Error | null): boolean {
    if (!error) return false
    
    // Don't retry authentication errors
    if ('message' in error && typeof error.message === 'string') {
      const authErrorMessages = ['Invalid login credentials', 'Email not confirmed', 'User not found']
      if (authErrorMessages.some(msg => error.message.includes(msg))) {
        return false
      }
    }

    // Don't retry validation errors (4xx)
    if ('code' in error && typeof error.code === 'string') {
      const nonRetryableCodes = ['PGRST116', '22P02', '23505', '23503']
      if (nonRetryableCodes.includes(error.code)) {
        return false
      }
    }

    return true
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logError(error: Error | PostgrestError | AuthError, context: DebugContext) {
    const errorEntry = {
      error,
      context,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }

    this.errorLog.push(errorEntry)
    
    // Console logging with better formatting
    console.group(`🚨 Error in ${context.component}.${context.function}`)
    console.error('Error:', error)
    console.error('Context:', context)
    console.error('Parameters:', context.parameters)
    if (error.stack) console.error('Stack:', error.stack)
    console.groupEnd()

    // Keep only last 100 errors to prevent memory leaks
    if (this.errorLog.length > 100) {
      this.errorLog.shift()
    }
  }

  private logPerformance(entry: { operation: string; duration: number; context: DebugContext }) {
    this.performanceLog.push(entry)
    
    const durationColor = entry.duration > 1000 ? '🐌' : entry.duration > 500 ? '⚠️' : '⚡'
    console.log(`${durationColor} ${entry.operation}: ${entry.duration.toFixed(2)}ms`)

    // Keep only last 50 performance logs
    if (this.performanceLog.length > 50) {
      this.performanceLog.shift()
    }
  }

  private showErrorNotification(error: Error | PostgrestError | AuthError, context: DebugContext) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    let message = 'An error occurred'
    if ('message' in error) {
      message = error.message
    }

    // Show user-friendly messages in production
    if (!isDevelopment) {
      const userFriendlyMessages: Record<string, string> = {
        'Invalid login credentials': 'Invalid email or password',
        'Email not confirmed': 'Please check your email and confirm your account',
        'User not found': 'Account not found',
        'PGRST116': 'No data found matching your request',
        '23505': 'This item already exists',
        '23503': 'Cannot delete: item is being used elsewhere'
      }

      for (const [key, friendlyMessage] of Object.entries(userFriendlyMessages)) {
        if (message.includes(key)) {
          message = friendlyMessage
          break
        }
      }
    }

    toast.error(message, {
      description: isDevelopment ? `${context.component}.${context.function}` : undefined,
      duration: 5000
    })
  }

  /**
   * Get error logs for debugging
   */
  public getErrorLogs() {
    return this.errorLog
  }

  /**
   * Get performance logs
   */
  public getPerformanceLogs() {
    return this.performanceLog
  }

  /**
   * Clear all logs
   */
  public clearLogs() {
    this.errorLog = []
    this.performanceLog = []
  }

  /**
   * Export logs for external analysis
   */
  public exportLogs() {
    return {
      errors: this.errorLog,
      performance: this.performanceLog,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Set retry configuration
   */
  public setRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig = { ...this.retryConfig, ...config }
  }
}

// Export singleton instance
export const supabaseDebugger = SupabaseDebugger.getInstance()

/**
 * Utility function to wrap Supabase operations with debugging
 * Usage:
 * const result = await debugSupabaseOperation(
 *   () => supabase.from('users').select('*'),
 *   { component: 'UserList', function: 'fetchUsers' }
 * )
 */
export async function debugSupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | AuthError | null }>,
  context: Omit<DebugContext, 'timestamp'>,
  withRetry: boolean = false
): Promise<SupabaseOperationResult<T>> {
  return supabaseDebugger.executeSupabaseOperation(
    operation,
    { ...context, timestamp: new Date() },
    withRetry
  )
}

/**
 * React Hook for using the debugger in components
 */
export function useSupabaseDebugger() {
  return {
    debugOperation: debugSupabaseOperation,
    getErrorLogs: () => supabaseDebugger.getErrorLogs(),
    getPerformanceLogs: () => supabaseDebugger.getPerformanceLogs(),
    clearLogs: () => supabaseDebugger.clearLogs(),
    exportLogs: () => supabaseDebugger.exportLogs()
  }
}