import type { Product } from "./products"

export interface CartItem {
  product: Product
  quantity: number
}

const CART_KEY = "crime_zone_cart"

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []
  const cart = localStorage.getItem(CART_KEY)
  return cart ? JSON.parse(cart) : []
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function addToCart(product: Product, quantity = 1): CartItem[] {
  const cart = getCart()
  const existingItem = cart.find((item) => item.product.id === product.id)

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({ product, quantity })
  }

  saveCart(cart)
  return cart
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart()
  const filtered = cart.filter((item) => item.product.id !== productId)
  saveCart(filtered)
  return filtered
}

export function updateCartQuantity(productId: string, quantity: number): CartItem[] {
  const cart = getCart()
  const item = cart.find((item) => item.product.id === productId)

  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId)
    }
    item.quantity = quantity
    saveCart(cart)
  }

  return cart
}

export function clearCart() {
  localStorage.removeItem(CART_KEY)
}

export function getCartTotal(): number {
  const cart = getCart()
  return cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
}

export function getCartCount(): number {
  const cart = getCart()
  return cart.reduce((count, item) => count + item.quantity, 0)
}
