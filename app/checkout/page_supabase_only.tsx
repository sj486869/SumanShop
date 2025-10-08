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
    console.log('[Checkout] Loading user and cart from Supabase only...')
    
    try {
      const supabase = createClient()
      
      // Get authenticated user from Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error('[Checkout] Authentication error:', authError)
        toast({
          title: "Authentication Required",
          description: "Please login to continue with checkout",
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }

      console.log('[Checkout] Authenticated user:', { id: authUser.id, email: authUser.email })
      setUser(authUser)

      // Load cart items from Supabase cart table
      const { data: cartData, error: cartError } = await supabase
        .from("cart")
        .select(`
          id,
          product_id,
          quantity,
          product:products(*)
        `)
        .eq("user_id", authUser.id)

      if (cartError) {
        console.error('[Checkout] Error loading cart:', cartError)
        toast({
          title: "Error Loading Cart",
          description: "Could not load your cart items",
          variant: "destructive",
        })
        router.push("/")
        return
      }

      if (!cartData || cartData.length === 0) {
        console.log('[Checkout] No cart items found')
        toast({
          title: "Empty Cart",
          description: "Your cart is empty",
          variant: "destructive",
        })
        router.push("/")
        return
      }

      console.log('[Checkout] Cart loaded from Supabase:', cartData)
      setCartItems(cartData as any)
      
      const cartTotal = cartData.reduce((sum: number, item: any) => 
        sum + (item.product.price * item.quantity), 0
      )
      setTotal(cartTotal)
      
      console.log('[Checkout] Cart total calculated:', cartTotal)

    } catch (error) {
      console.error('[Checkout] Error in loadUserAndCart:', error)
      toast({
        title: "Error",
        description: "Failed to load user data and cart",
        variant: "destructive",
      })
      router.push("/")
    }
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
      toast({
        title: "Authentication Error",
        description: "Please login to submit your order",
        variant: "destructive",
      })
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

    if (cartItems.length === 0) {
      console.warn('[Checkout] No cart items to submit')
      toast({
        title: "Empty Cart",
        description: "No items in cart to submit order",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    console.log('[Checkout] Loading state set to true')

    try {
      const supabase = createClient()
      console.log('[Checkout] Supabase client created successfully')

      // Upload payment proof to Supabase Storage first
      const fileName = `payment-proof-${user.id}-${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProof)

      let proofFilePath = `payment-proofs/${user.id}/${fileName}`
      if (uploadError) {
        console.error('[Checkout] Payment proof upload failed:', uploadError)
        // Continue with order submission even if upload fails
        proofFilePath = `local-${fileName}`
      } else {
        console.log('[Checkout] ✅ Payment proof uploaded successfully:', uploadData)
        proofFilePath = uploadData.path
      }

      // Insert orders (one per cart item)
      const orderInserts = cartItems.map((item, index) => {
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
      
      console.log('[Checkout] All order inserts prepared:', orderInserts)
      console.log('[Checkout] Attempting to insert orders into database...')

      const { data: createdOrders, error: ordersError } = await supabase
        .from("orders")
        .insert(orderInserts)
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

      // Create payment proof records for the first order
      if (createdOrders && createdOrders.length > 0) {
        console.log('[Checkout] Creating payment proof record...')
        const firstOrderId = createdOrders[0].id
        
        const { data: proofData, error: proofError } = await supabase
          .from('payment_proofs')
          .insert({
            user_id: user.id,
            order_id: firstOrderId,
            file_path: proofFilePath
          })
          .select()
        
        if (proofError) {
          console.error('[Checkout] Error saving payment proof:', proofError)
        } else {
          console.log('[Checkout] ✅ Payment proof record saved successfully:', proofData)
        }
      }

      // Clear cart from Supabase
      console.log('[Checkout] Clearing cart from Supabase...')
      const { error: clearCartError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", user.id)

      if (clearCartError) {
        console.error('[Checkout] Error clearing cart:', clearCartError)
        // Don't fail the order submission if cart clearing fails
      } else {
        console.log('[Checkout] ✅ Cart cleared successfully')
      }

      toast({
        title: "Order Submitted Successfully",
        description: `${createdOrders.length} order(s) submitted and pending confirmation`,
      })

      // Redirect to dashboard with first order ID
      const firstOrderId = createdOrders[0].id
      console.log('[Checkout] Redirecting to dashboard with order:', firstOrderId)
      console.log('[Checkout] =================================')
      console.log('[Checkout] ORDER SUBMISSION SUCCESSFUL')
      console.log('[Checkout] =================================')
      router.push(`/dashboard?order=${firstOrderId}`)
      
    } catch (error: any) {
      console.error('[Checkout] =================================')
      console.error('[Checkout] ORDER SUBMISSION FAILED')
      console.error('[Checkout] =================================')
      console.error("[Checkout] Error submitting order:", error?.message || error)
      console.error('[Checkout] Full error object:', error)
      
      toast({
        title: "Order Submission Failed",
        description: error?.message || "Failed to submit order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.log('[Checkout] Loading state set to false')
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/80 mb-4">Loading cart...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
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
              disabled={!paymentProof || loading || cartItems.length === 0} 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Submitting Order..." : `Submit Order (${cartItems.length} items)`}
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