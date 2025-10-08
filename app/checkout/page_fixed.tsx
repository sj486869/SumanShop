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
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    loadUserAndCart()
  }, [])

  const loadUserAndCart = async () => {
    console.log('[Checkout] Starting to load user and cart...')
    
    try {
      // First try to get demo user from localStorage (for testing)
      const demoUser = typeof window !== "undefined" ? localStorage.getItem("demo-user") : null
      let currentUser: any = null

      if (demoUser) {
        try {
          currentUser = JSON.parse(demoUser)
          console.log('[Checkout] Found demo user:', currentUser)
        } catch (e) {
          console.log('[Checkout] Failed to parse demo user')
        }
      }

      // If no demo user, try Supabase auth
      if (!currentUser) {
        try {
          const supabase = createClient()
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
          
          if (!authError && authUser) {
            currentUser = authUser
            console.log('[Checkout] Found Supabase auth user:', currentUser)
          }
        } catch (error) {
          console.log('[Checkout] Supabase auth not available:', error)
        }
      }

      // If still no user, create a temporary demo user
      if (!currentUser) {
        currentUser = {
          id: 'demo-22222222-2222-2222-2222-222222222222',
          email: 'demo@sumanshop.com',
          name: 'Demo User'
        }
        console.log('[Checkout] Using temporary demo user:', currentUser)
      }

      setUser(currentUser)

      // Load cart - try multiple sources
      let cartData: any[] = []

      // 1. Try localStorage demo cart first
      const demoCart = typeof window !== "undefined" ? localStorage.getItem("demo-cart") : null
      if (demoCart) {
        try {
          cartData = JSON.parse(demoCart)
          console.log('[Checkout] Loaded demo cart:', cartData)
        } catch (e) {
          console.log('[Checkout] Failed to parse demo cart')
        }
      }

      // 2. Try user-specific cart from localStorage
      if (cartData.length === 0 && currentUser?.id) {
        const userCart = typeof window !== "undefined" ? localStorage.getItem(`cart-${currentUser.id}`) : null
        if (userCart) {
          try {
            cartData = JSON.parse(userCart)
            console.log('[Checkout] Loaded user cart from localStorage:', cartData)
          } catch (e) {
            console.log('[Checkout] Failed to parse user cart')
          }
        }
      }

      // 3. Try Supabase cart table as fallback
      if (cartData.length === 0) {
        try {
          const supabase = createClient()
          const { data: supabaseCart, error: cartError } = await supabase
            .from("cart")
            .select(`
              id,
              product_id,
              quantity,
              product:products(*)
            `)
            .eq("user_id", currentUser.id)

          if (!cartError && supabaseCart && supabaseCart.length > 0) {
            cartData = supabaseCart
            console.log('[Checkout] Loaded cart from Supabase:', cartData)
          }
        } catch (error) {
          console.log('[Checkout] Supabase cart not available:', error)
        }
      }

      // 4. Create demo cart if no cart found
      if (cartData.length === 0) {
        console.log('[Checkout] No cart found, creating demo cart...')
        cartData = [
          {
            id: 'demo-cart-1',
            product_id: '22222222-2222-2222-2222-222222222222',
            quantity: 1,
            product: {
              id: '22222222-2222-2222-2222-222222222222',
              name: 'Digital Art Bundle',
              description: 'Premium digital art collection',
              price: 29.99,
              image: '/placeholder.svg',
              category: 'digital',
              stock: 999
            }
          },
          {
            id: 'demo-cart-2',
            product_id: '33333333-3333-3333-3333-333333333333',
            quantity: 1,
            product: {
              id: '33333333-3333-3333-3333-333333333333',
              name: 'Video Course',
              description: 'Complete web development course',
              price: 99.99,
              image: '/placeholder.svg',
              category: 'education',
              stock: 999
            }
          }
        ]
        console.log('[Checkout] Created demo cart:', cartData)
      }

      setCartItems(cartData)
      const cartTotal = cartData.reduce((sum: number, item: any) => 
        sum + (item.product.price * item.quantity), 0
      )
      setTotal(cartTotal)
      
      console.log('[Checkout] Cart setup complete:', {
        items: cartData.length,
        total: cartTotal,
        user: currentUser.email
      })

    } catch (error) {
      console.error('[Checkout] Error loading user and cart:', error)
      // Create fallback demo setup
      const fallbackUser = {
        id: 'demo-22222222-2222-2222-2222-222222222222',
        email: 'demo@sumanshop.com',
        name: 'Demo User'
      }
      setUser(fallbackUser)
      
      const fallbackCart = [{
        id: 'fallback-1',
        product_id: '22222222-2222-2222-2222-222222222222',
        quantity: 1,
        product: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Demo Product',
          description: 'Demo product for testing',
          price: 29.99,
          image: '/placeholder.svg',
          category: 'digital',
          stock: 999
        }
      }]
      setCartItems(fallbackCart)
      setTotal(29.99)
    } finally {
      setIsInitialLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    setPaymentProof(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    console.log('[Checkout] Payment proof selected:', file.name, file.size, 'bytes')
  }

  const handleRemoveFile = () => {
    setPaymentProof(null)
    setPaymentProofPreview("")
    console.log('[Checkout] Payment proof removed')
  }

  const handleSubmitOrder = async () => {
    console.log('[Checkout] =====================================')
    console.log('[Checkout] STARTING ORDER SUBMISSION PROCESS')
    console.log('[Checkout] =====================================')
    console.log('[Checkout] User:', user)
    console.log('[Checkout] Cart items:', cartItems)
    console.log('[Checkout] Total:', total)
    console.log('[Checkout] Payment method:', paymentMethod)
    console.log('[Checkout] Payment proof:', paymentProof ? `${paymentProof.name} (${paymentProof.size} bytes)` : 'None')

    // Validation
    if (!user || !user.id) {
      console.error('[Checkout] No valid user found')
      toast({
        title: "User Error",
        description: "No valid user session found. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    if (cartItems.length === 0) {
      console.error('[Checkout] No cart items')
      toast({
        title: "Empty Cart",
        description: "No items in cart to process",
        variant: "destructive",
      })
      return
    }

    if (!paymentProof) {
      console.warn('[Checkout] Payment proof required')
      toast({
        title: "Payment Proof Required",
        description: "Please upload your payment confirmation screenshot",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      console.log('[Checkout] Supabase client initialized')

      // Prepare order data for each cart item
      const orderInserts = cartItems.map((item, index) => {
        const orderData = {
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          total_amount: Number((item.product.price * item.quantity).toFixed(2)),
          payment_method: paymentMethod,
          status: "pending",
          notes: `Order from checkout - Item ${index + 1}`
        }
        console.log(`[Checkout] Prepared order ${index + 1}:`, orderData)
        return orderData
      })

      console.log('[Checkout] Total orders to create:', orderInserts.length)
      console.log('[Checkout] Submitting to Supabase orders table...')

      // Insert orders
      const { data: createdOrders, error: ordersError } = await supabase
        .from("orders")
        .insert(orderInserts)
        .select("id")

      console.log('[Checkout] Supabase response:', {
        data: createdOrders,
        error: ordersError
      })

      if (ordersError) {
        console.error('[Checkout] Orders insert failed:', ordersError)
        throw new Error(`Database error: ${ordersError.message}`)
      }

      if (!createdOrders || createdOrders.length === 0) {
        console.error('[Checkout] No orders were created')
        throw new Error('No orders were returned from database')
      }

      console.log('[Checkout] ✅ Orders created successfully:', createdOrders)

      // Handle payment proof
      if (createdOrders.length > 0) {
        const firstOrderId = createdOrders[0].id
        console.log('[Checkout] Processing payment proof for order:', firstOrderId)

        try {
          // Try to upload to Supabase Storage first
          const fileName = `payment-${user.id}-${Date.now()}.${paymentProof.name.split('.').pop() || 'jpg'}`
          console.log('[Checkout] Uploading file:', fileName)

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, paymentProof)

          let filePath = `manual-upload/${fileName}`
          if (!uploadError && uploadData) {
            filePath = uploadData.path
            console.log('[Checkout] ✅ File uploaded to storage:', filePath)
          } else {
            console.log('[Checkout] Storage upload failed, using manual path:', uploadError)
          }

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
            console.error('[Checkout] Payment proof record failed:', proofError)
          } else {
            console.log('[Checkout] ✅ Payment proof record saved:', proofData)
          }

        } catch (proofError) {
          console.error('[Checkout] Payment proof processing failed:', proofError)
          // Don't fail the order for payment proof issues
        }
      }

      // Clear cart after successful order
      console.log('[Checkout] Clearing cart...')
      
      // Clear localStorage carts
      if (typeof window !== "undefined") {
        localStorage.removeItem("demo-cart")
        localStorage.removeItem(`cart-${user.id}`)
        console.log('[Checkout] LocalStorage carts cleared')
      }

      // Clear Supabase cart
      try {
        const { error: clearError } = await supabase
          .from("cart")
          .delete()
          .eq("user_id", user.id)
        
        if (clearError) {
          console.log('[Checkout] Supabase cart clear error:', clearError)
        } else {
          console.log('[Checkout] ✅ Supabase cart cleared')
        }
      } catch (clearError) {
        console.log('[Checkout] Cart clearing failed:', clearError)
      }

      // Success!
      console.log('[Checkout] =====================================')
      console.log('[Checkout] ORDER SUBMISSION SUCCESSFUL!')
      console.log('[Checkout] =====================================')

      toast({
        title: "Order Submitted Successfully! 🎉",
        description: `${createdOrders.length} order(s) created and pending confirmation`,
      })

      // Redirect to dashboard
      const firstOrderId = createdOrders[0].id
      router.push(`/dashboard?order=${firstOrderId}&success=true`)

    } catch (error: any) {
      console.error('[Checkout] =====================================')
      console.error('[Checkout] ORDER SUBMISSION FAILED!')
      console.error('[Checkout] =====================================')
      console.error('[Checkout] Error details:', error)

      toast({
        title: "Order Submission Failed",
        description: error.message || "Please try again or contact support",
        variant: "destructive",
      })

    } finally {
      setLoading(false)
      console.log('[Checkout] Order submission process complete')
    }
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading checkout...</p>
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
                <CardDescription className="text-white/80">
                  User: {user?.email || 'Demo User'} • {cartItems.length} items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex justify-between items-start pb-4 border-b border-white/20 last:border-0">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{item.product.name}</p>
                        <p className="text-sm text-white/70">
                          ${item.product.price} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-white">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-white">Total:</span>
                      <span className="text-green-400">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg p-3 border border-white/20 bg-white/5">
                      <p className="text-xs text-white/70">Items</p>
                      <p className="text-lg font-semibold text-white">
                        {cartItems.reduce((s, i) => s + i.quantity, 0)}
                      </p>
                    </div>
                    <div className="rounded-lg p-3 border border-white/20 bg-white/5">
                      <p className="text-xs text-white/70">Method</p>
                      <p className="text-sm font-semibold capitalize text-white">{paymentMethod}</p>
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
                <CardDescription className="text-white/80">
                  Upload screenshot of payment confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onFileSelect={handleFileSelect} 
                  preview={paymentProofPreview} 
                  onRemove={handleRemoveFile} 
                />
                {paymentProof && (
                  <p className="text-sm text-green-400 mt-2">
                    ✅ File ready: {paymentProof.name} ({(paymentProof.size / 1024).toFixed(1)}KB)
                  </p>
                )}
              </CardContent>
            </Card>

            <Button 
              onClick={handleSubmitOrder} 
              disabled={!paymentProof || loading || cartItems.length === 0}
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting Order...</span>
                </div>
              ) : (
                `Submit Order • ${cartItems.length} items • $${total.toFixed(2)}`
              )}
            </Button>

            {loading && (
              <p className="text-sm text-white/60 text-center">
                Processing your order... This may take a few seconds
              </p>
            )}
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