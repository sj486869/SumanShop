"use client"

import { useEffect, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { AdminGuard } from "@/components/admin-guard"
import { OrderManagementCard } from "@/components/order-management-card"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Order = {
  id: string
  user_id: string
  product_id?: string | null
  quantity?: number | null
  total?: number | null
  total_amount?: number | null
  status: string
  payment_method?: string | null
  payment_proof?: string | null
  notes?: string | null
  created_at: string
  // Normalized for UI
  order_items?: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      description?: string | null
      image: string
    }
  }>
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])

  const loadOrders = async () => {
    console.log('[Admin] Loading orders...')
    const supabase = createClient()

    const { data: rawOrders, error } = await supabase
      .from("orders")
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
        users:user_id ( id, name, email ),
        products:product_id ( id, title, image_url, price )
      `)
      .order("created_at", { ascending: false })

    console.log('[Admin] Orders query result:', { rawOrders, error })

    if (error) {
      console.error("[Admin] Error loading orders:", error?.message || error)
      // Try simple query without joins
      const { data: simpleOrders, error: simpleError } = await supabase
        .from("orders")
        .select('*')
        .order("created_at", { ascending: false })
      
      console.log('[Admin] Simple orders query:', { simpleOrders, simpleError })
      
      if (!simpleError && simpleOrders) {
        const simplified = simpleOrders.map((o: any) => ({
          id: o.id,
          user_id: o.user_id,
          total_amount: Number(o.total_amount || 0),
          status: o.status,
          payment_method: o.payment_method,
          notes: o.notes,
          created_at: o.created_at,
          order_items: [
            {
              id: `${o.id}-item`,
              product_id: o.product_id || '',
              quantity: o.quantity || 1,
              price: Number(o.total_amount || 0),
              product: { id: o.product_id || '', name: 'Product', description: '', image: '/placeholder.svg' }
            }
          ]
        }))
        setOrders(simplified)
        return
      }
      
      setOrders([])
      return
    }

    const normalized: Order[] = (rawOrders || []).map((o: any) => {
      const p = o.products
      const price = p?.price ? Number(p.price) : 0
      const qty = o.quantity ?? 1
      const image = p?.image_url || '/placeholder.svg'
      const name = p?.title || 'Product'
      return {
        id: o.id,
        user_id: o.user_id,
        total_amount: Number(o.total_amount || price * qty),
        status: o.status,
        created_at: o.created_at,
        order_items: [
          {
            id: `${o.id}-item`,
            product_id: o.product_id || '',
            quantity: qty,
            price,
            product: { id: o.product_id || '', name, description: '', image }
          }
        ]
      }
    })

    setOrders(normalized)
  }

  useEffect(() => {
    loadOrders()

    // Realtime: refresh on any change to orders
    const supabase = createClient()
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const pendingOrders = orders.filter((o) => o.status === "pending")
  const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "processing")
  const completedOrders = orders.filter((o) => o.status === "completed")
  const cancelledOrders = orders.filter((o) => o.status === "cancelled")

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <AdminHeader />

        <main className="container py-8">
          <AdminNav />

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="bg-white/10 backdrop-blur border-white/20">
              <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed ({confirmedOrders.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelledOrders.length})</TabsTrigger>
              <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending orders</p>
                  </CardContent>
                </Card>
              ) : (
                pendingOrders.map((order) => <OrderManagementCard key={order.id} order={order} onUpdate={loadOrders} />)
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="space-y-4">
              {confirmedOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No confirmed orders</p>
                  </CardContent>
                </Card>
              ) : (
                confirmedOrders.map((order) => (
                  <OrderManagementCard key={order.id} order={order} onUpdate={loadOrders} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No completed orders</p>
                  </CardContent>
                </Card>
              ) : (
                completedOrders.map((order) => (
                  <OrderManagementCard key={order.id} order={order} onUpdate={loadOrders} />
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {cancelledOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No cancelled orders</p>
                  </CardContent>
                </Card>
              ) : (
                cancelledOrders.map((order) => (
                  <OrderManagementCard key={order.id} order={order} onUpdate={loadOrders} />
                ))
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => <OrderManagementCard key={order.id} order={order} onUpdate={loadOrders} />)
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AdminGuard>
  )
}
