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
  const [supabaseConnected, setSupabaseConnected] = useState(false)

  useEffect(() => {
    loadUserAndCart()
  }, [])

  const testSupabaseConnection = async () => {
    console.log('[Checkout] Testing Supabase connection...')
    
    try {
      const supabase = createClient()
      
      // Test basic connection
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .limit(1)
      
      if (error) {
        console.error('[Checkout] Supabase connection failed:', error)
        throw error
      }
      
      console.log('[Checkout] ✅ Supabase connection successful')
      setSupabaseConnected(true)
      return true
      
    } catch (error) {
      console.error('[Checkout] ❌ Supabase connection failed:', error)
      setSupabaseConnected(false)
      
      toast({
        title: "Database Connection Failed",
        description: "Cannot connect to Supabase. Orders will not be saved properly.",
        variant: "destructive",
      })
      
      return false
    }
  }

  const loadUserAndCart = async () => {
    console.log('[Checkout] Starting to load user and cart...')
    
    // Test Supabase connection first
    await testSupabaseConnection()
    
    try {
      // Set up demo user for testing
      const demoUser = {
        id: 'demo-22222222-2222-2222-2222-222222222222',
        email: 'demo@sumanshop.com',
        name: 'Demo User'
      }
      
      console.log('[Checkout] Using demo user for checkout:', demoUser)
      setUser(demoUser)

      // Create demo cart with test products
      const demoCart = [
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
      
      setCartItems(demoCart)
      const cartTotal = demoCart.reduce((sum: number, item: any) => 
        sum + (item.product.price * item.quantity), 0
      )
      setTotal(cartTotal)
      
      console.log('[Checkout] Demo cart setup complete:', {
        items: demoCart.length,
        total: cartTotal,
        user: demoUser.email
      })

    } catch (error) {
      console.error('[Checkout] Error in loadUserAndCart:', error)
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
    console.log('[Checkout] ========================================')
    console.log('[Checkout] FORCING SUPABASE ORDER SUBMISSION')
    console.log('[Checkout] ========================================')
    console.log('[Checkout] User:', user)
    console.log('[Checkout] Cart items:', cartItems)
    console.log('[Checkout] Total:', total)
    console.log('[Checkout] Payment method:', paymentMethod)
    console.log('[Checkout] Payment proof:', paymentProof ? `${paymentProof.name} (${paymentProof.size} bytes)` : 'None')
    console.log('[Checkout] Supabase connected:', supabaseConnected)

    // STRICT validation - no fallback to localStorage
    if (!supabaseConnected) {
      console.error('[Checkout] ❌ Supabase not connected - BLOCKING order submission')
      toast({
        title: "Database Connection Required",
        description: "Cannot submit order without database connection. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    if (!user || !user.id) {
      console.error('[Checkout] ❌ No valid user found')
      toast({
        title: "User Error",
        description: "No valid user session found. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    if (cartItems.length === 0) {
      console.error('[Checkout] ❌ No cart items')
      toast({
        title: "Empty Cart",
        description: "No items in cart to process",
        variant: "destructive",
      })
      return
    }

    if (!paymentProof) {
      console.warn('[Checkout] ⚠️ Payment proof required')
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
      console.log('[Checkout] Initializing Supabase client for order submission...')

      // Double-check connection before proceeding
      const { data: connectionTest, error: connectionError } = await supabase
        .from('orders')
        .select('id')
        .limit(1)
      
      if (connectionError) {
        console.error('[Checkout] ❌ Connection test failed:', connectionError)
        throw new Error(`Database connection failed: ${connectionError.message}`)
      }
      
      console.log('[Checkout] ✅ Connection test passed, proceeding with order creation...')

      // Prepare order data - ensure all fields are properly formatted
      const orderInserts = cartItems.map((item, index) => {
        const orderData = {
          user_id: String(user.id), // Ensure string
          product_id: String(item.product_id), // Ensure string
          quantity: Number(item.quantity),
          total_amount: Number((item.product.price * item.quantity).toFixed(2)),
          payment_method: String(paymentMethod),
          status: 'pending',
          notes: `Checkout order ${index + 1} - ${new Date().toISOString()}`
        }
        console.log(`[Checkout] Order ${index + 1} prepared:`, orderData)
        return orderData
      })

      console.log('[Checkout] Total orders to create:', orderInserts.length)
      console.log('[Checkout] 🚀 SUBMITTING TO SUPABASE orders TABLE...')

      // Insert orders with detailed error handling
      const { data: createdOrders, error: ordersError } = await supabase
        .from("orders")
        .insert(orderInserts)
        .select("id, user_id, product_id, total_amount, payment_method, status, created_at")

      console.log('[Checkout] Supabase insert response:', {
        success: !ordersError,
        data: createdOrders,
        error: ordersError,
        rowsCreated: createdOrders?.length || 0
      })

      if (ordersError) {
        console.error('[Checkout] ❌ SUPABASE INSERT FAILED:', ordersError)
        console.error('[Checkout] Error code:', ordersError.code)
        console.error('[Checkout] Error message:', ordersError.message)
        console.error('[Checkout] Error details:', ordersError.details)
        console.error('[Checkout] Error hint:', ordersError.hint)
        
        // DO NOT fallback to localStorage - force the issue to be fixed
        throw new Error(`Supabase insert failed: ${ordersError.message} (Code: ${ordersError.code})`)
      }

      if (!createdOrders || createdOrders.length === 0) {
        console.error('[Checkout] ❌ No orders returned from database')
        throw new Error('No orders were created - database returned empty result')
      }

      console.log('[Checkout] ✅✅✅ ORDERS SUCCESSFULLY SAVED TO SUPABASE! ✅✅✅')
      console.log('[Checkout] Created orders:', createdOrders)

      // Handle payment proof upload
      if (createdOrders.length > 0) {
        const firstOrderId = createdOrders[0].id
        console.log('[Checkout] Processing payment proof for order:', firstOrderId)

        try {
          // Upload to Supabase Storage
          const fileName = `payment-${user.id}-${Date.now()}.${paymentProof.name.split('.').pop() || 'jpg'}`
          console.log('[Checkout] Uploading payment proof:', fileName)

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, paymentProof)

          let filePath = `manual-${fileName}`
          if (!uploadError && uploadData) {
            filePath = uploadData.path
            console.log('[Checkout] ✅ Payment proof uploaded to storage:', filePath)
          } else {
            console.log('[Checkout] ⚠️ Storage upload failed, using manual path:', uploadError)
          }

          // Save payment proof record
          const { data: proofData, error: proofError } = await supabase
            .from('payment_proofs')
            .insert({
              user_id: String(user.id),
              order_id: firstOrderId,
              file_path: filePath
            })
            .select()

          if (proofError) {
            console.error('[Checkout] ⚠️ Payment proof record failed:', proofError)
          } else {
            console.log('[Checkout] ✅ Payment proof record saved:', proofData)
          }

        } catch (proofError) {
          console.error('[Checkout] ⚠️ Payment proof processing failed:', proofError)
          // Continue - don't fail order for payment proof issues
        }
      }

      // Success message
      console.log('[Checkout] ========================================')
      console.log('[Checkout] ✅✅✅ ORDER SUBMISSION SUCCESSFUL! ✅✅✅')
      console.log('[Checkout] ✅ Orders saved to Supabase database')
      console.log('[Checkout] ✅ No localStorage fallback used')
      console.log('[Checkout] ========================================')

      toast({
        title: "Order Submitted Successfully! 🎉",
        description: `${createdOrders.length} order(s) saved to database and pending confirmation`,
        duration: 5000,
      })

      // Redirect to dashboard
      const firstOrderId = createdOrders[0].id
      router.push(`/dashboard?order=${firstOrderId}&success=true&source=supabase`)

    } catch (error: any) {
      console.error('[Checkout] ========================================')
      console.error('[Checkout] ❌❌❌ ORDER SUBMISSION FAILED! ❌❌❌')
      console.error('[Checkout] ========================================')
      console.error('[Checkout] Error type:', typeof error)
      console.error('[Checkout] Error message:', error.message)
      console.error('[Checkout] Full error:', error)
      console.error('[Checkout] Stack trace:', error.stack)

      // Show detailed error to user
      const errorMessage = error.message || 'Unknown database error occurred'
      
      toast({
        title: "Order Submission Failed ❌",
        description: `Database Error: ${errorMessage}. Please check console for details.`,
        variant: "destructive",
        duration: 10000,
      })

      // DO NOT save to localStorage - force user to fix the issue
      console.error('[Checkout] ❌ NO LOCALSTORAGE FALLBACK - Database must be fixed')

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
          <p className="text-white/80">Loading checkout & testing database...</p>
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

        {/* Database Connection Status */}
        <div className="mb-6">
          <div className={`p-3 rounded-lg border ${supabaseConnected 
            ? 'bg-green-900/20 border-green-500/20 text-green-400' 
            : 'bg-red-900/20 border-red-500/20 text-red-400'
          }`}>
            <p className="text-sm">
              🗄️ Database Status: {supabaseConnected ? '✅ Connected' : '❌ Disconnected'}
              {!supabaseConnected && ' - Orders cannot be submitted'}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
                <CardDescription className="text-white/80">
                  User: {user?.email || 'Demo User'} • {cartItems.length} items • Will save to Supabase
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
                      <p className="text-xs text-white/70">Status</p>
                      <p className="text-xs font-semibold text-white">Supabase Only</p>
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
              disabled={!paymentProof || loading || cartItems.length === 0 || !supabaseConnected}
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving to Database...</span>
                </div>
              ) : !supabaseConnected ? (
                'Database Not Connected'
              ) : (
                `Submit Order to Supabase • ${cartItems.length} items • $${total.toFixed(2)}`
              )}
            </Button>

            {loading && (
              <p className="text-sm text-white/60 text-center">
                🗄️ Saving order to Supabase database... No localStorage fallback
              </p>
            )}

            {!supabaseConnected && (
              <p className="text-sm text-red-400 text-center">
                ⚠️ Database connection required to submit orders
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