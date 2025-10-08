/**
 * Enhanced Supabase Client with Type Safety and Error Handling
 * 
 * Features:
 * - Improved TypeScript types for database operations
 * - Built-in error handling and retry logic
 * - Performance monitoring
 * - Connection health checking
 * - Row Level Security (RLS) helpers
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from './client'
import { createClient as createServerClient } from './server'
import { debugSupabaseOperation, DebugContext } from '../debug/supabase-debugger'

// Database Types - Define your actual database schema here
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          category_id: string | null
          stock_quantity: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          category_id?: string | null
          stock_quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          category_id?: string | null
          stock_quantity?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total_amount: number
          shipping_address: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total_amount: number
          shipping_address: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total_amount?: number
          shipping_address?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type TableRow<T extends keyof Database['public']['Tables']> = Tables<T>['Row']
export type TableInsert<T extends keyof Database['public']['Tables']> = Tables<T>['Insert']
export type TableUpdate<T extends keyof Database['public']['Tables']> = Tables<T>['Update']

// Enhanced Supabase Client
export class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>
  private context: Pick<DebugContext, 'component'>

  constructor(client: SupabaseClient<Database>, component: string) {
    this.client = client
    this.context = { component }
  }

  /**
   * Check if the client is properly configured and can connect
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const { error } = await debugSupabaseOperation(
        () => this.client.from('users').select('id').limit(1),
        { ...this.context, function: 'healthCheck' }
      )

      if (error) {
        return { healthy: false, error: error.message }
      }

      return { healthy: true }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Enhanced auth operations with debugging
   */
  auth = {
    signUp: async (email: string, password: string, options?: { data?: Record<string, any> }) => {
      return debugSupabaseOperation(
        () => this.client.auth.signUp({ email, password, options }),
        { ...this.context, function: 'signUp', parameters: { email } }
      )
    },

    signIn: async (email: string, password: string) => {
      return debugSupabaseOperation(
        () => this.client.auth.signInWithPassword({ email, password }),
        { ...this.context, function: 'signIn', parameters: { email } }
      )
    },

    signOut: async () => {
      return debugSupabaseOperation(
        () => this.client.auth.signOut(),
        { ...this.context, function: 'signOut' }
      )
    },

    resetPassword: async (email: string) => {
      return debugSupabaseOperation(
        () => this.client.auth.resetPasswordForEmail(email),
        { ...this.context, function: 'resetPassword', parameters: { email } }
      )
    },

    updatePassword: async (password: string) => {
      return debugSupabaseOperation(
        () => this.client.auth.updateUser({ password }),
        { ...this.context, function: 'updatePassword' }
      )
    },

    getUser: async () => {
      return debugSupabaseOperation(
        () => this.client.auth.getUser(),
        { ...this.context, function: 'getUser' }
      )
    },

    getSession: async () => {
      return debugSupabaseOperation(
        () => this.client.auth.getSession(),
        { ...this.context, function: 'getSession' }
      )
    }
  }

  /**
   * Enhanced database operations with debugging and type safety
   */
  db = {
    select: <T extends keyof Database['public']['Tables']>(
      table: T,
      query = '*',
      options?: { withRetry?: boolean }
    ) => ({
      execute: async (filters?: Record<string, any>) => {
        return debugSupabaseOperation(
          () => {
            let queryBuilder = this.client.from(table).select(query as any)
            
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  queryBuilder = queryBuilder.eq(key, value)
                }
              })
            }
            
            return queryBuilder
          },
          { 
            ...this.context, 
            function: `select_${table}`, 
            parameters: { query, filters } 
          },
          options?.withRetry
        )
      },

      single: async (id: string) => {
        return debugSupabaseOperation(
          () => this.client.from(table).select(query as any).eq('id', id).single(),
          { 
            ...this.context, 
            function: `select_single_${table}`, 
            parameters: { id, query } 
          },
          options?.withRetry
        )
      },

      range: async (from: number, to: number, filters?: Record<string, any>) => {
        return debugSupabaseOperation(
          () => {
            let queryBuilder = this.client.from(table).select(query as any, { count: 'exact' })
            
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  queryBuilder = queryBuilder.eq(key, value)
                }
              })
            }
            
            return queryBuilder.range(from, to)
          },
          { 
            ...this.context, 
            function: `select_range_${table}`, 
            parameters: { from, to, filters } 
          },
          options?.withRetry
        )
      }
    }),

    insert: <T extends keyof Database['public']['Tables']>(
      table: T,
      data: TableInsert<T> | TableInsert<T>[],
      options?: { withRetry?: boolean }
    ) => {
      return debugSupabaseOperation(
        () => this.client.from(table).insert(data as any).select(),
        { 
          ...this.context, 
          function: `insert_${table}`, 
          parameters: { data: Array.isArray(data) ? `${data.length} records` : data } 
        },
        options?.withRetry
      )
    },

    update: <T extends keyof Database['public']['Tables']>(
      table: T,
      data: TableUpdate<T>,
      filters: Record<string, any>,
      options?: { withRetry?: boolean }
    ) => {
      return debugSupabaseOperation(
        () => {
          let queryBuilder = this.client.from(table).update(data as any)
          
          Object.entries(filters).forEach(([key, value]) => {
            queryBuilder = queryBuilder.eq(key, value)
          })
          
          return queryBuilder.select()
        },
        { 
          ...this.context, 
          function: `update_${table}`, 
          parameters: { data, filters } 
        },
        options?.withRetry
      )
    },

    upsert: <T extends keyof Database['public']['Tables']>(
      table: T,
      data: TableInsert<T> | TableInsert<T>[],
      options?: { withRetry?: boolean }
    ) => {
      return debugSupabaseOperation(
        () => this.client.from(table).upsert(data as any).select(),
        { 
          ...this.context, 
          function: `upsert_${table}`, 
          parameters: { data: Array.isArray(data) ? `${data.length} records` : data } 
        },
        options?.withRetry
      )
    },

    delete: <T extends keyof Database['public']['Tables']>(
      table: T,
      filters: Record<string, any>,
      options?: { withRetry?: boolean }
    ) => {
      return debugSupabaseOperation(
        () => {
          let queryBuilder = this.client.from(table).delete()
          
          Object.entries(filters).forEach(([key, value]) => {
            queryBuilder = queryBuilder.eq(key, value)
          })
          
          return queryBuilder.select()
        },
        { 
          ...this.context, 
          function: `delete_${table}`, 
          parameters: { filters } 
        },
        options?.withRetry
      )
    },

    // RLS Policy helpers
    rls: {
      checkPolicy: async <T extends keyof Database['public']['Tables']>(
        table: T,
        operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
        testData?: Record<string, any>
      ) => {
        const operationMap = {
          SELECT: () => this.client.from(table).select('*').limit(1),
          INSERT: () => this.client.from(table).insert(testData as any),
          UPDATE: () => this.client.from(table).update(testData as any).eq('id', 'test'),
          DELETE: () => this.client.from(table).delete().eq('id', 'test')
        }

        return debugSupabaseOperation(
          operationMap[operation],
          { 
            ...this.context, 
            function: `rls_check_${operation.toLowerCase()}_${table}`,
            parameters: { operation, testData } 
          }
        )
      }
    }
  }

  /**
   * Enhanced storage operations with debugging
   */
  storage = {
    upload: async (bucket: string, path: string, file: File, options?: { upsert?: boolean }) => {
      return debugSupabaseOperation(
        () => this.client.storage.from(bucket).upload(path, file, options),
        { 
          ...this.context, 
          function: 'storage_upload', 
          parameters: { bucket, path, fileName: file.name, fileSize: file.size } 
        },
        true // Enable retry for storage operations
      )
    },

    download: async (bucket: string, path: string) => {
      return debugSupabaseOperation(
        () => this.client.storage.from(bucket).download(path),
        { 
          ...this.context, 
          function: 'storage_download', 
          parameters: { bucket, path } 
        },
        true
      )
    },

    getPublicUrl: (bucket: string, path: string) => {
      console.log(`📁 Getting public URL for ${bucket}/${path}`)
      return this.client.storage.from(bucket).getPublicUrl(path)
    },

    delete: async (bucket: string, paths: string[]) => {
      return debugSupabaseOperation(
        () => this.client.storage.from(bucket).remove(paths),
        { 
          ...this.context, 
          function: 'storage_delete', 
          parameters: { bucket, paths } 
        }
      )
    },

    list: async (bucket: string, path?: string) => {
      return debugSupabaseOperation(
        () => this.client.storage.from(bucket).list(path),
        { 
          ...this.context, 
          function: 'storage_list', 
          parameters: { bucket, path } 
        }
      )
    }
  }

  /**
   * Real-time subscriptions with debugging
   */
  subscribe = <T extends keyof Database['public']['Tables']>(
    table: T,
    callback: (payload: any) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      filter?: string
    }
  ) => {
    console.log(`🔄 Setting up subscription for table: ${table}`)
    
    const channel = this.client
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { 
          event: options?.event || '*', 
          schema: 'public', 
          table: table as string,
          filter: options?.filter 
        },
        (payload) => {
          console.log(`📡 Received ${payload.eventType} event for ${table}:`, payload)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${table}:`, status)
      })

    return {
      unsubscribe: () => {
        console.log(`🔄 Unsubscribing from table: ${table}`)
        return this.client.removeChannel(channel)
      }
    }
  }

  /**
   * Get the underlying Supabase client for advanced operations
   */
  getClient(): SupabaseClient<Database> {
    return this.client
  }
}

// Factory functions
export function createEnhancedBrowserClient(component: string = 'BrowserClient'): EnhancedSupabaseClient {
  const client = createBrowserClient() as SupabaseClient<Database>
  return new EnhancedSupabaseClient(client, component)
}

export async function createEnhancedServerClient(component: string = 'ServerClient'): Promise<EnhancedSupabaseClient> {
  const client = await createServerClient() as SupabaseClient<Database>
  return new EnhancedSupabaseClient(client, component)
}

// Default exports for common usage
export const supabase = createEnhancedBrowserClient('DefaultBrowserClient')

// Type exports for external use
export type { Database, TableRow, TableInsert, TableUpdate }