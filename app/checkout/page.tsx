"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { PaymentQR } from "@/components/payment-qr"
import { FileUpload } from "@/components/file-upload"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

type PaymentMethod = "binance" | "paypal" | "phonepe" | "upi"

type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  stock: number
}

type CartItem = {
  id: string
  product_id: string
  quantity: number
  product: Product
}

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("binance")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserAndCart()
  }, [])

  const loadUserAndCart = async () => {
    // Try local session first (demo or legacy)
    const local =
      typeof window !== "undefined" &&
      (localStorage.getItem("supabase-user") ||
        localStorage.getItem("demo-user") ||
        localStorage.getItem("crime_zone_current_user"))

    let sessionUser: any = local ? JSON.parse(local) : null

    if (!sessionUser) {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) sessionUser = user
      } catch {}
    }

    if (!sessionUser) {
      router.push("/auth/login")
      return
    }

    setUser(sessionUser)

    // Load cart from localStorage first (since no cart table in your schema)
    const savedDemoCart = localStorage.getItem("demo-cart")
    const savedUserCart = sessionUser?.id ? localStorage.getItem(`cart-${sessionUser.id}`) : null
    let cartData: any[] | null = null

    if (savedUserCart) {
      try { cartData = JSON.parse(savedUserCart) } catch {}
    } else if (savedDemoCart) {
      try { cartData = JSON.parse(savedDemoCart) } catch {}
    }

    // As a fallback, try Supabase cart table if it exists
    if (!cartData) {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("cart")
          .select(`*, product:products(*)`)
          .eq("user_id", sessionUser.id)
        if (data && data.length > 0) {
          cartData = data as any[]
        }
      } catch {}
    }

    if (!cartData || cartData.length === 0) {
      // No items — go back to home
      router.push("/")
      return
    }

    setCartItems(cartData as any)
    const cartTotal = cartData.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0)
    setTotal(cartTotal)
  }

  const handleFileSelect = (file: File) => {
    setPaymentProof(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setPaymentProof(null)
    setPaymentProofPreview("")
  }

  const handleSubmitOrder = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    if (!paymentProof) {
      toast({
        title: "Payment Proof Required",
        description: "Please upload a screenshot of your payment confirmation",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Insert one order per cart item according to your schema
      // CRITICAL FIX: Removed 'notes' field that was causing PGRST204 error
      const inserts = cartItems.map((item) => ({
        user_id: user.id,
        product_id: item.product_id,
        quantity: item.quantity,
        total_amount: Number(item.product.price) * item.quantity,
        status: "pending",
        // NO 'notes' field - this was causing the error!
      }))

      console.log("[Checkout] Inserting orders:", inserts)

      const { data: createdOrders, error: ordersError } = await supabase
        .from("orders")
        .insert(inserts)
        .select("id")

      if (ordersError) {
        console.error("[Checkout] Orders insert error:", ordersError)
        throw ordersError
      }

      console.log("[Checkout] ✅ Orders created successfully:", createdOrders)

      // Clear local cart (we use local carts)
      if (user?.id) {
        localStorage.removeItem(`cart-${user.id}`)
      }
      localStorage.removeItem('demo-cart')

      toast({
        title: "Order Submitted",
        description: "Your order(s) have been submitted and are pending confirmation",
      })

      // Redirect to dashboard; include first order id if available
      const firstId = createdOrders && createdOrders.length > 0 ? createdOrders[0].id : ''
      router.push(firstId ? `/dashboard?order=${firstId}` : "/dashboard")
      
    } catch (error: any) {
      // Fallback: save orders locally so UX is not blocked
      console.error("[Checkout] Error submitting order:", error?.message || JSON.stringify(error) || error)
      
      try {
        const key = user?.id ? `local-orders-${user.id}` : 'local-orders'
        const existing = localStorage.getItem(key)
        const arr = existing ? JSON.parse(existing) : []
        const now = Date.now()
        
        cartItems.forEach((item, idx) => {
          const localId = `local-${now}-${idx}`
          arr.unshift({
            id: localId,
            user_id: user.id,
            product_id: item.product_id,
            quantity: item.quantity,
            total_amount: Number(item.product.price) * item.quantity,
            status: 'pending',
            created_at: new Date().toISOString(),
            order_items: [
              {
                id: `local-item-${item.id}`,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.product.price,
                product: item.product,
              }
            ]
          })
        })
        localStorage.setItem(key, JSON.stringify(arr))

        // Clear local cart
        if (user?.id) localStorage.removeItem(`cart-${user.id}`)
        localStorage.removeItem('demo-cart')

        toast({ 
          title: 'Order saved locally', 
          description: 'Showing on your dashboard (demo mode).' 
        })
        router.push(`/dashboard`)
        return
        
      } catch (fallbackErr) {
        toast({
          title: "Error",
          description: "Failed to submit order. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <p className="text-white/80">Your cart is empty. Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <Header />

      <main className="container py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
                <CardDescription className="text-white/80">Review your items before payment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start pb-4 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.product.price} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* OKLCH colored info boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg p-3 border text-foreground" style={{ background: 'oklch(var(--chart-1) / 0.18)', borderColor: 'oklch(var(--chart-1))' }}>
                    <p className="text-xs opacity-80">Items</p>
                    <p className="text-lg font-semibold">{cartItems.reduce((s, i) => s + i.quantity, 0)}</p>
                  </div>
                  <div className="rounded-lg p-3 border text-foreground" style={{ background: 'oklch(var(--chart-2) / 0.18)', borderColor: 'oklch(var(--chart-2))' }}>
                    <p className="text-xs opacity-80">Method</p>
                    <p className="text-lg font-semibold capitalize">{paymentMethod}</p>
                  </div>
                  <div className="rounded-lg p-3 border text-foreground" style={{ background: 'oklch(var(--chart-4) / 0.18)', borderColor: 'oklch(var(--chart-4))' }}>
                    <p className="text-xs opacity-80">Total</p>
                    <p className="text-lg font-semibold">${total.toFixed(2)}</p>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Upload Payment Proof</CardTitle>
                <CardDescription className="text-white/80">Upload a screenshot of your payment confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileSelect} preview={paymentProofPreview} onRemove={handleRemoveFile} />
              </CardContent>
            </Card>

            <Button onClick={handleSubmitOrder} disabled={!paymentProof || loading} size="lg" className="w-full">
              {loading ? "Submitting Order..." : "Submit Order"}
            </Button>
          </div>

          <div>
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-2">
              <PaymentQR total={total} onMethodChange={setPaymentMethod} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}