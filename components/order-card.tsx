"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "@/components/order-status-badge"

type Order = {
  id: string
  user_id: string
  total: number
  status: string
  payment_method: string
  payment_proof: string | null
  notes?: string | null
  created_at: string
  order_items: Array<{
    id: string
    product_id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      description: string
      image: string
    }
  }>
}

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order #{order.id.slice(0, 8)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">${order.total.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-semibold capitalize">{order.payment_method}</p>
          </div>
        </div>

        {order.notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-1">Admin Notes:</p>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-full">
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Items
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Items ({order.order_items.length})
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
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

        {order.payment_proof && (
          <div className="pt-2 border-t">
            <p className="text-sm font-semibold mb-2">Payment Proof:</p>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={order.payment_proof || "/placeholder.svg"}
                alt="Payment proof"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
