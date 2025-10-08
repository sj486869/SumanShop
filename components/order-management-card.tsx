"use client"

import { useState } from "react"
import { Check, X, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

type Order = {
  id: string
  user_id: string
  total?: number | null
  total_amount?: number | null
  status: string
  payment_method?: string | null
  payment_proof?: string | null
  notes?: string | null
  created_at: string
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

interface OrderManagementCardProps {
  order: Order
  onUpdate: () => void
}

export function OrderManagementCard({ order, onUpdate }: OrderManagementCardProps) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(order.notes || "")
  const [showProof, setShowProof] = useState(false)

  const handleStatusUpdate = async (status: "confirmed" | "cancelled", adminNotes?: string) => {
    const supabase = createClient()
    const updateData: any = { status }
    if (adminNotes) {
      updateData.notes = adminNotes
    }
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id)
      .select()

    if (error) {
      console.error("[admin] Failed to update order status", { orderId: order.id, status, error })
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      })
      return
    }

    console.log("[admin] Order status updated", { orderId: order.id, status })
    toast({
      title: "Order Updated",
      description: `Order has been ${status}`,
    })
    onUpdate()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Derive items for denormalized orders (single product)
  const derivedItems = order.order_items && order.order_items.length > 0
    ? order.order_items
    : [
        {
          id: `${order.id}-item`,
          product_id: "unknown",
          quantity: 1,
          price: Number(order.total ?? order.total_amount ?? 0),
          product: { id: "unknown", name: "Item", description: null, image: "/placeholder.svg" },
        },
      ]

  const totalValue = Number(order.total ?? order.total_amount ?? 0)

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20 text-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
            <div className="space-y-1 mt-2">
              <p className="text-sm text-muted-foreground">Customer ID: {order.user_id.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">Date: {formatDate(order.created_at)}</p>
            </div>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">${totalValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-semibold capitalize">{order.payment_method || 'n/a'}</p>
          </div>
        </div>

        <div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-full">
            {expanded ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {expanded ? "Hide Items" : `Show Items (${derivedItems.length})`}
          </Button>

          {expanded && (
            <div className="space-y-2 mt-4 p-4 border rounded-lg">
              {derivedItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start pb-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.price} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {order.payment_proof && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Payment Proof</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowProof(!showProof)}>
                {showProof ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showProof ? "Hide" : "Show"}
              </Button>
            </div>

            {showProof && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
                <img
                  src={order.payment_proof || "/placeholder.svg"}
                  alt="Payment proof"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        )}

        {order.status === "pending" && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor={`notes-${order.id}`}>Admin Notes (Optional)</Label>
              <Textarea
                id={`notes-${order.id}`}
                placeholder="Add notes for the customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleStatusUpdate("confirmed", notes)} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate("cancelled", notes || "Order cancelled by admin")}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject Order
              </Button>
            </div>
          </div>
        )}

        {order.notes && order.status !== "pending" && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-1">Admin Notes:</p>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
