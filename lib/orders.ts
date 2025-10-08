import type { CartItem } from "./cart"
import type { User } from "./auth"

export type PaymentMethod = "binance" | "upi" | "paypal"
export type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled"

export interface Order {
  id: string
  userId: string
  userEmail: string
  userName: string
  items: CartItem[]
  total: number
  paymentMethod: PaymentMethod
  paymentProof?: string
  status: OrderStatus
  createdAt: string
  confirmedAt?: string
  notes?: string
}

const ORDERS_KEY = "crime_zone_orders"

export function getOrders(): Order[] {
  if (typeof window === "undefined") return []
  const orders = localStorage.getItem(ORDERS_KEY)
  return orders ? JSON.parse(orders) : []
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function createOrder(
  user: User,
  items: CartItem[],
  total: number,
  paymentMethod: PaymentMethod,
  paymentProof?: string,
): Order {
  const orders = getOrders()
  const newOrder: Order = {
    id: `ORD-${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    items,
    total,
    paymentMethod,
    paymentProof,
    status: "pending",
    createdAt: new Date().toISOString(),
  }

  orders.push(newOrder)
  saveOrders(orders)
  return newOrder
}

export function getUserOrders(userId: string): Order[] {
  const orders = getOrders()
  return orders
    .filter((order) => order.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getOrderById(orderId: string): Order | null {
  const orders = getOrders()
  return orders.find((order) => order.id === orderId) || null
}

export function updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): boolean {
  const orders = getOrders()
  const order = orders.find((o) => o.id === orderId)

  if (!order) return false

  order.status = status
  if (notes) order.notes = notes
  if (status === "confirmed" && !order.confirmedAt) {
    order.confirmedAt = new Date().toISOString()
  }

  saveOrders(orders)
  return true
}

export function getPendingOrders(): Order[] {
  const orders = getOrders()
  return orders
    .filter((order) => order.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getAllOrdersForAdmin(): Order[] {
  const orders = getOrders()
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
