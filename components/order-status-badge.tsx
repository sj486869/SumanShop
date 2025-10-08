import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/orders"

interface OrderStatusBadgeProps {
  status: OrderStatus
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const variants: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> =
    {
      pending: { label: "Pending", variant: "secondary" },
      confirmed: { label: "Confirmed", variant: "default" },
      processing: { label: "Processing", variant: "default" },
      completed: { label: "Completed", variant: "outline" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    }

  const { label, variant } = variants[status]

  return <Badge variant={variant}>{label}</Badge>
}
