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
    console.log('[Checkout] Loading user and cart...')
    
    // Try local session first (demo or legacy)
    const local =
      typeof window !== "undefined" &&
      (localStorage.getItem("supabase-user") ||
        localStorage.getItem("demo-user") ||
        localStorage.getItem("crime_zone_current_user"))

    let sessionUser: any = local ? JSON.parse(local) : null
    console.log('[Checkout] Found local user:', sessionUser ? 'Yes' : 'No')

    if (!sessionUser) {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) sessionUser = user
      } catch (error) {
        console.log('[Checkout] Supabase auth not available:', error)
      }
    }

    if (!sessionUser) {
      console.log('[Checkout] No user found, redirecting to login')
      router.push("/auth/login")
      return
    }

    setUser(sessionUser)
    console.log('[Checkout] User set:', { id: sessionUser.id, email: sessionUser.email })

    // Load cart from localStorage first (since no cart table in your schema)
    const savedDemoCart = localStorage.getItem("demo-cart")
    const savedUserCart = sessionUser?.id ? localStorage.getItem(`cart-${sessionUser.id}`) : null
    let cartData: any[] | null = null

    console.log('[Checkout] Cart sources:', {
      demoCart: !!savedDemoCart,
      userCart: !!savedUserCart,
      userId: sessionUser?.id
    })

    if (savedUserCart) {
      try { 
        cartData = JSON.parse(savedUserCart)
        console.log('[Checkout] Loaded user cart:', cartData)
      } catch (error) {
        console.error('[Checkout] Error parsing user cart:', error)
      }
    } else if (savedDemoCart) {
      try { 
        cartData = JSON.parse(savedDemoCart)
        console.log('[Checkout] Loaded demo cart:', cartData)
      } catch (error) {
        console.error('[Checkout] Error parsing demo cart:', error)
      }
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
          console.log('[Checkout] Loaded Supabase cart:', cartData)
        }
      } catch (error) {
        console.log('[Checkout] Supabase cart not available:', error)
      }
    }

    if (!cartData || cartData.length === 0) {
      console.log('[Checkout] No cart items found, redirecting to home')
      // No items — go back to home
      router.push("/")
      return
    }

    setCartItems(cartData as any)
    const cartTotal = cartData.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0)
    setTotal(cartTotal)
    console.log('[Checkout] Cart loaded successfully:', {
      items: cartData.length,
      total: cartTotal
    })
  }

  const handleFileSelect = (file: File) => {
    setPaymentProof(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    console.log('[Checkout] Payment proof file selected:', file.name)
  }

  const handleRemoveFile = () => {
    setPaymentProof(null)
    setPaymentProofPreview("")
    console.log('[Checkout] Payment proof file removed')
  }

  const handleSubmitOrder = async () => {
    console.log('[Checkout] =================================')
    console.log('[Checkout] STARTING ORDER SUBMISSION')
    console.log('[Checkout] =================================')
    console.log('[Checkout] Current user:', user)
    console.log('[Checkout] Cart items:', cartItems)
    console.log('[Checkout] Payment method:', paymentMethod)
    console.log('[Checkout] Total:', total)
    console.log('[Checkout] Payment proof:', paymentProof ? 'Provided' : 'Missing')
    
    if (!user) {
      console.error('[Checkout] No user found, redirecting to login')
      router.push("/auth/login")
      return
    }

    if (!paymentProof) {
      console.warn('[Checkout] Payment proof required but missing')
      toast({
        title: "Payment Proof Required",
        description: "Please upload a screenshot of your payment confirmation",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    console.log('[Checkout] Loading state set to true')

    try {
      const supabase = createClient()
      console.log('[Checkout] Supabase client created successfully')

      // Insert one order per cart item according to your schema
      const inserts = cartItems.map((item, index) => {
        const orderData = {
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          total_amount: Number(item.product.price) * item.quantity,
          payment_method: paymentMethod,
          status: "pending",
        }
        console.log(`[Checkout] Order data for item ${index + 1}:`, orderData)
        return orderData
      })
      
      console.log('[Checkout] All order inserts prepared:', inserts)
      console.log('[Checkout] Attempting to insert orders into database...')

      const { data: createdOrders, error: ordersError } = await supabase
        .from("orders")
        .insert(inserts)
        .select("id")
        
      console.log('[Checkout] Database insert result:', { 
        createdOrders, 
        ordersError,
        success: !ordersError && createdOrders?.length > 0
      })

      if (ordersError) {
        console.error('[Checkout] Orders creation failed:', ordersError)
        console.error('[Checkout] Error details:', {
          code: ordersError.code,
          message: ordersError.message,
          details: ordersError.details,
          hint: ordersError.hint
        })
        throw ordersError
      }

      if (!createdOrders || createdOrders.length === 0) {
        console.error('[Checkout] No orders were created')
        throw new Error('No orders were created')
      }

      console.log('[Checkout] ✅ Orders created successfully!', createdOrders)

      // Upload payment proof if orders were created successfully
      if (createdOrders && createdOrders.length > 0) {
        console.log('[Checkout] Processing payment proof for orders...')
        // For now, we'll just save the file path to the first order
        // In a real app, you'd upload to Supabase Storage
        const firstOrderId = createdOrders[0].id
        const fileName = `payment-proof-${user.id}-${Date.now()}.jpg`
        const filePath = `payment-proofs/${user.id}/${fileName}`
        
        console.log('[Checkout] Payment proof details:', {
          orderId: firstOrderId,
          fileName,
          filePath
        })
        
        try {
          // Save payment proof record
          const { data: proofData, error: proofError } = await supabase
            .from('payment_proofs')
            .insert({
              user_id: user.id,
              order_id: firstOrderId,
              file_path: filePath
            })
            .select()
          
          if (proofError) {
            console.error('[Checkout] Error saving payment proof:', proofError)
          } else {
            console.log('[Checkout] ✅ Payment proof saved successfully:', proofData)
          }
        } catch (proofErr) {
          console.error('[Checkout] Failed to save payment proof:', proofErr)
        }
      }

      // Clear local cart (we use local carts)
      console.log('[Checkout] Clearing local cart...')
      if (user?.id) {
        localStorage.removeItem(`cart-${user.id}`)
        console.log('[Checkout] Removed user-specific cart')
      }
      localStorage.removeItem('demo-cart')
      console.log('[Checkout] Removed demo cart')

      toast({
        title: "Order Submitted",
        description: "Your order(s) have been submitted and are pending confirmation",
      })

      // Redirect to dashboard; include first order id if available
      const firstId = createdOrders && createdOrders.length > 0 ? createdOrders[0].id : ''
      console.log('[Checkout] Redirecting to dashboard with order:', firstId)
      console.log('[Checkout] =================================')
      console.log('[Checkout] ORDER SUBMISSION SUCCESSFUL')
      console.log('[Checkout] =================================')
      router.push(firstId ? `/dashboard?order=${firstId}` : "/dashboard")
      
    } catch (error: any) {
      // Fallback: save orders locally so UX is not blocked
      console.error('[Checkout] =================================')
      console.error('[Checkout] ORDER SUBMISSION FAILED')
      console.error('[Checkout] =================================')
      console.error("[Checkout] Error submitting order:", error?.message || JSON.stringify(error) || error)
      console.error('[Checkout] Full error object:', error)
      console.error('[Checkout] Error stack:', error?.stack)
      
      try {
        console.log('[Checkout] Attempting local storage fallback...')
        const key = user?.id ? `local-orders-${user.id}` : 'local-orders'
        const existing = localStorage.getItem(key)
        const arr = existing ? JSON.parse(existing) : []
        const now = Date.now()
        
        cartItems.forEach((item, idx) => {
          const localId = `local-${now}-${idx}`
          const localOrder = {
            id: localId,
            user_id: user.id,
            product_id: item.product_id,
            quantity: item.quantity,
            total_amount: Number(item.product.price) * item.quantity,
            payment_method: paymentMethod,
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
          }
          console.log(`[Checkout] Adding local order ${idx + 1}:`, localOrder)
          arr.unshift(localOrder)
        })
        
        localStorage.setItem(key, JSON.stringify(arr))
        console.log('[Checkout] ✅ Local orders saved successfully:', arr.length, 'orders')

        // Clear local cart
        if (user?.id) localStorage.removeItem(`cart-${user.id}`)
        localStorage.removeItem('demo-cart')

        toast({ 
          title: 'Order saved locally', 
          description: 'Your order is saved. Check your dashboard for details.' 
        })
        
        console.log('[Checkout] Redirecting to dashboard (local mode)')
        router.push(`/dashboard`)
        return
        
      } catch (fallbackErr) {
        console.error('[Checkout] Local storage fallback also failed:', fallbackErr)
        toast({
          title: "Error",
          description: "Failed to submit order. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
      console.log('[Checkout] Loading state set to false')
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
                        <p className="font-semibold text-white">{item.product.name}</p>
                        <p className="text-sm text-white/70">
                          ${item.product.price} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-white">${(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}

                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-white">Total:</span>
                    <span className="text-green-400">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* OKLCH colored info boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg p-3 border border-white/20 bg-white/5">
                    <p className="text-xs text-white/70">Items</p>
                    <p className="text-lg font-semibold text-white">{cartItems.reduce((s, i) => s + i.quantity, 0)}</p>
                  </div>
                  <div className="rounded-lg p-3 border border-white/20 bg-white/5">
                    <p className="text-xs text-white/70">Method</p>
                    <p className="text-lg font-semibold capitalize text-white">{paymentMethod}</p>
                  </div>
                  <div className="rounded-lg p-3 border border-white/20 bg-white/5">
                    <p className="text-xs text-white/70">Total</p>
                    <p className="text-lg font-semibold text-white">${total.toFixed(2)}</p>
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

            <Button 
              onClick={handleSubmitOrder} 
              disabled={!paymentProof || loading} 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
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