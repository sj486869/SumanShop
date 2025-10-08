"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Mail, Download, CheckCircle, Clock, XCircle } from "lucide-react"
import { Header } from "@/components/header"
import { OrderCard } from "@/components/order-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  download_url?: string
}

type Order = {
  id: string
  user_id: string
  product_id: string
  quantity: number
  total_amount: number
  payment_method: string
  status: string
  notes?: string
  created_at: string
  product?: Product
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseConnected, setSupabaseConnected] = useState(false)

  useEffect(() => {
    loadUserAndOrders()
  }, [])

  const testSupabaseConnection = async () => {
    console.log('[Dashboard] Testing Supabase connection...')
    
    try {
      const supabase = createClient()
      
      // Test basic connection
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .limit(1)
      
      if (error) {
        console.error('[Dashboard] Supabase connection failed:', error)
        setSupabaseConnected(false)
        return false
      }
      
      console.log('[Dashboard] ✅ Supabase connection successful')
      setSupabaseConnected(true)
      return true
      
    } catch (error) {
      console.error('[Dashboard] ❌ Supabase connection failed:', error)
      setSupabaseConnected(false)
      return false
    }
  }

  const loadUserAndOrders = async () => {
    console.log('[Dashboard] ========================================')
    console.log('[Dashboard] LOADING USER AND ORDERS')
    console.log('[Dashboard] ========================================')
    
    // Test Supabase connection first
    const connected = await testSupabaseConnection()
    
    try {
      // Get user from multiple sources
      let currentUser: any = null
      
      // 1. Try localStorage demo user
      const demoUser = typeof window !== "undefined" ? localStorage.getItem("demo-user") : null
      if (demoUser) {
        try {
          currentUser = JSON.parse(demoUser)
          console.log('[Dashboard] Found demo user:', currentUser)
        } catch (e) {
          console.log('[Dashboard] Failed to parse demo user')
        }
      }
      
      // 2. Try other localStorage sources
      if (!currentUser) {
        const sources = ['supabase-user', 'crime_zone_current_user']
        for (const source of sources) {
          const stored = typeof window !== "undefined" ? localStorage.getItem(source) : null
          if (stored) {
            try {
              currentUser = JSON.parse(stored)
              console.log(`[Dashboard] Found user from ${source}:`, currentUser)
              break
            } catch (e) {
              console.log(`[Dashboard] Failed to parse user from ${source}`)
            }
          }
        }
      }
      
      // 3. Try Supabase auth
      if (!currentUser && connected) {
        try {
          const supabase = createClient()
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
          
          if (!authError && authUser) {
            currentUser = authUser
            console.log('[Dashboard] Found Supabase auth user:', currentUser)
          }
        } catch (error) {
          console.log('[Dashboard] Supabase auth not available:', error)
        }
      }
      
      // 4. Use fallback demo user if nothing found
      if (!currentUser) {
        currentUser = {
          id: 'demo-22222222-2222-2222-2222-222222222222',
          email: 'demo@sumanshop.com',
          name: 'Demo User'
        }
        console.log('[Dashboard] Using fallback demo user:', currentUser)
      }
      
      setUser(currentUser)
      console.log('[Dashboard] Final user set:', { id: currentUser.id, email: currentUser.email })
      
      // Load orders
      await loadOrders(currentUser, connected)
      
    } catch (error) {
      console.error('[Dashboard] Error in loadUserAndOrders:', error)
      
      // Set fallback user
      const fallbackUser = {
        id: 'demo-22222222-2222-2222-2222-222222222222',
        email: 'demo@sumanshop.com',
        name: 'Demo User'
      }
      setUser(fallbackUser)
      
      // Try to load orders with fallback user
      await loadOrders(fallbackUser, connected)
      
    } finally {
      setLoading(false)
      
      // Handle success redirect from checkout
      const success = searchParams.get("success")
      const source = searchParams.get("source")
      if (success === "true") {
        toast({
          title: "Order Submitted Successfully! 🎉",
          description: source === "supabase" ? "Order saved to database" : "Order processed",
          duration: 5000,
        })
      }
    }
  }

  const loadOrders = async (user: any, connected: boolean) => {
    console.log('[Dashboard] ========================================')
    console.log('[Dashboard] LOADING ORDERS FOR USER:', user.id)
    console.log('[Dashboard] Supabase connected:', connected)
    console.log('[Dashboard] ========================================')
    
    let allOrders: Order[] = []
    
    // 1. Try to load from Supabase if connected
    if (connected) {
      try {
        const supabase = createClient()
        console.log('[Dashboard] Attempting to load orders from Supabase...')
        
        // Load orders with products data
        const { data: supabaseOrders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            product_id,
            quantity,
            total_amount,
            payment_method,
            status,
            notes,
            created_at,
            products!inner (
              id,
              name,
              description,
              price,
              image,
              download_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (ordersError) {
          console.error('[Dashboard] Orders query with join failed:', ordersError)
          
          // Fallback: Load orders without join
          const { data: simpleOrders, error: simpleError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          
          if (simpleError) {
            console.error('[Dashboard] Simple orders query also failed:', simpleError)
          } else if (simpleOrders && simpleOrders.length > 0) {
            console.log('[Dashboard] ✅ Loaded orders without products:', simpleOrders)
            
            // Load products separately
            const productIds = [...new Set(simpleOrders.map((o: any) => o.product_id))]
            const { data: products } = await supabase
              .from('products')
              .select('*')
              .in('id', productIds)
            
            const productsMap = new Map(products?.map(p => [p.id, p]) || [])
            
            allOrders = simpleOrders.map((order: any) => ({
              ...order,
              product: productsMap.get(order.product_id) || {
                id: order.product_id,
                name: 'Unknown Product',
                description: '',
                price: order.total_amount,
                image: '/placeholder.svg'
              }
            }))
            
            console.log('[Dashboard] ✅ Orders with products loaded:', allOrders)
          }
        } else if (supabaseOrders && supabaseOrders.length > 0) {
          console.log('[Dashboard] ✅ Loaded orders with products:', supabaseOrders)
          
          allOrders = supabaseOrders.map((order: any) => ({
            ...order,
            product: order.products
          }))
        } else {
          console.log('[Dashboard] No orders found in Supabase for user:', user.id)
        }
        
      } catch (error) {
        console.error('[Dashboard] Error loading from Supabase:', error)
      }
    }
    
    // 2. Load from localStorage as fallback/additional source
    try {
      const localKeys = [
        `local-orders-${user.id}`,
        'local-orders',
        'demo-orders'
      ]
      
      for (const key of localKeys) {
        const localData = typeof window !== "undefined" ? localStorage.getItem(key) : null
        if (localData) {
          try {
            const localOrders = JSON.parse(localData)
            console.log(`[Dashboard] Found ${localOrders.length} local orders from ${key}:`, localOrders)
            
            // Convert local orders to match our schema
            const convertedOrders = localOrders.map((order: any) => ({
              id: order.id,
              user_id: order.user_id,
              product_id: order.product_id,
              quantity: order.quantity || 1,
              total_amount: order.total_amount,
              payment_method: order.payment_method,
              status: order.status,
              notes: order.notes || 'Local order',
              created_at: order.created_at,
              product: order.order_items?.[0]?.product || {
                id: order.product_id,
                name: 'Local Product',
                description: '',
                price: order.total_amount,
                image: '/placeholder.svg'
              }
            }))
            
            // Add to orders list (avoid duplicates by ID)
            convertedOrders.forEach((localOrder: Order) => {
              if (!allOrders.find(o => o.id === localOrder.id)) {
                allOrders.push(localOrder)
              }
            })
            
          } catch (e) {
            console.log(`[Dashboard] Failed to parse local orders from ${key}`)
          }
        }
      }
      
    } catch (error) {
      console.error('[Dashboard] Error loading local orders:', error)
    }
    
    // 3. Create demo orders if no orders found
    if (allOrders.length === 0) {
      console.log('[Dashboard] No orders found, creating demo orders...')
      allOrders = [
        {
          id: 'demo-order-1',
          user_id: user.id,
          product_id: '22222222-2222-2222-2222-222222222222',
          quantity: 1,
          total_amount: 29.99,
          payment_method: 'binance',
          status: 'confirmed',
          notes: 'Demo confirmed order',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          product: {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Digital Art Bundle (Demo)',
            description: 'Premium digital art collection',
            price: 29.99,
            image: '/placeholder.svg',
            download_url: 'https://example.com/download/art.zip'
          }
        },
        {
          id: 'demo-order-2',
          user_id: user.id,
          product_id: '33333333-3333-3333-3333-333333333333',
          quantity: 1,
          total_amount: 99.99,
          payment_method: 'paypal',
          status: 'pending',
          notes: 'Demo pending order',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          product: {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Video Course (Demo)',
            description: 'Complete web development course',
            price: 99.99,
            image: '/placeholder.svg'
          }
        }
      ]
    }
    
    // Sort by created date (newest first)
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    console.log('[Dashboard] ========================================')
    console.log('[Dashboard] FINAL ORDERS LOADED:', allOrders.length)
    console.log('[Dashboard] Orders:', allOrders)
    console.log('[Dashboard] ========================================')
    
    setOrders(allOrders)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/80 mb-4">Please login to view your dashboard</p>
          <Button onClick={() => router.push("/auth/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  const pendingOrders = orders.filter((o) => o.status === "pending")
  const confirmedOrders = orders.filter((o) => o.status === "confirmed")
  const cancelledOrders = orders.filter((o) => o.status === "cancelled")
  
  // Get downloads (confirmed orders with download URLs)
  const downloads = confirmedOrders.filter(order => order.product?.download_url)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-white/70">
            Welcome back, {user?.email || user?.name || 'User'}
          </p>
          
          {/* Database Connection Status */}
          <div className="mt-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${supabaseConnected 
              ? 'bg-green-900/20 text-green-400 border border-green-500/20' 
              : 'bg-red-900/20 text-red-400 border border-red-500/20'
            }`}>
              🗄️ Database: {supabaseConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                  <p className="text-sm text-white/70">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{pendingOrders.length}</p>
                  <p className="text-sm text-white/70">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{confirmedOrders.length}</p>
                  <p className="text-sm text-white/70">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Download className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{downloads.length}</p>
                  <p className="text-sm text-white/70">Downloads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed ({confirmedOrders.length})</TabsTrigger>
            <TabsTrigger value="downloads">Downloads ({downloads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {orders.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-white/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Orders Yet</h3>
                  <p className="text-white/70 mb-4">You haven't placed any orders yet.</p>
                  <Button onClick={() => router.push("/")} variant="outline">
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => <OrderItem key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-white/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Pending Orders</h3>
                  <p className="text-white/70">All your orders have been processed.</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map((order) => <OrderItem key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            {confirmedOrders.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-white/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Confirmed Orders</h3>
                  <p className="text-white/70">No confirmed orders yet.</p>
                </CardContent>
              </Card>
            ) : (
              confirmedOrders.map((order) => <OrderItem key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="downloads" className="space-y-4">
            {downloads.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-8 text-center">
                  <Download className="h-12 w-12 text-white/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Downloads Available</h3>
                  <p className="text-white/70">Downloads will appear here once your orders are confirmed.</p>
                </CardContent>
              </Card>
            ) : (
              downloads.map((order) => <OrderItem key={order.id} order={order} showDownload />)
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function OrderItem({ order, showDownload = false }: { order: Order; showDownload?: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'confirmed': return 'bg-green-500/20 text-green-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white mb-1">
              {order.product?.name || 'Product'}
            </h3>
            <p className="text-sm text-white/70">
              Order ID: {order.id.slice(0, 8)}...
            </p>
            <p className="text-sm text-white/70">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="capitalize">{order.status}</span>
            </div>
            <p className="text-lg font-bold text-white mt-2">
              ${order.total_amount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-white/70">
            <span>Qty: {order.quantity}</span>
            <span className="capitalize">via {order.payment_method}</span>
          </div>

          {showDownload && order.product?.download_url && order.status === 'confirmed' && (
            <Button
              size="sm"
              onClick={() => window.open(order.product?.download_url, '_blank')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>

        {order.notes && (
          <p className="text-sm text-white/60 mt-3 italic">
            Note: {order.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}