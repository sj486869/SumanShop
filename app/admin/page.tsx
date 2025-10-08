"use client"

import { useEffect, useState } from "react"
import { Package, ShoppingBag, Users, DollarSign } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { AdminGuard } from "@/components/admin-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const supabase = createClient()

    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, total_amount")

    const { data: products } = await supabase
      .from("products")
      .select("id")

    const { data: users } = await supabase
      .from("users")
      .select("id")

    const pendingOrders = (orders || []).filter((o: any) => o.status === "pending")
    const completedOrders = (orders || []).filter((o: any) => o.status === "completed")
    const revenue = completedOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0)

    setStats({
      totalOrders: orders?.length || 0,
      pendingOrders: pendingOrders.length,
      totalProducts: products?.length || 0,
      totalUsers: users?.length || 0,
      totalRevenue: revenue,
    })
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <AdminHeader />

        <main className="container py-8">
          <AdminNav />

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
            <p className="text-white/80">Monitor your e-commerce platform</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-white/80">From completed orders</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
                <p className="text-xs text-white/80">{stats.pendingOrders} pending approval</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Products</CardTitle>
                <Package className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalProducts}</div>
                <p className="text-xs text-white/80">Active products</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Users</CardTitle>
                <Users className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                <p className="text-xs text-white/80">Registered users</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AdminGuard>
  )
}
