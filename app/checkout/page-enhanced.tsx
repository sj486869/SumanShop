'use client'

/**
 * Enhanced Checkout Page with Supabase Debugging
 * 
 * Features:
 * - Uses enhanced Supabase client with debugging
 * - Better error handling with user-friendly messages
 * - Automatic retry logic for failed operations
 * - Performance monitoring for database operations
 * - Type-safe database operations
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/file-upload"
import { PaymentQR } from "@/components/payment-qr"
import { ArrowLeft, CheckCircle, AlertCircle, Upload, Database } from "lucide-react"
import Link from "next/link"

// Enhanced imports
import { createEnhancedBrowserClient } from "@/lib/supabase/enhanced-client"
import { useErrorHandler } from "@/components/error-boundary"
import { useSupabaseDebugger } from "@/lib/debug/supabase-debugger"

// Types
interface CartItem {
  product_id: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    image_url?: string
  }
}

interface User {
  id: string
  email?: string
}

export default function EnhancedCheckoutPage() {
  // State
  const [user, setUser] = useState<User | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [supabaseConnected, setSupabaseConnected] = useState(false)

  // Enhanced debugging
  const { handleError } = useErrorHandler()
  const debugger = useSupabaseDebugger()
  const router = useRouter()

  // Enhanced Supabase client
  const supabase = createEnhancedBrowserClient('CheckoutPage')

  // Calculate totals
  const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Initialize and check Supabase connection
  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        console.log('[Checkout] Initializing enhanced checkout page...')
        
        // Health check
        const { healthy, error } = await supabase.healthCheck()
        if (!healthy) {
          console.warn('[Checkout] Supabase health check failed:', error)
          toast({
            title: "Database Connection Issue",
            description: "Please refresh the page and try again.",
            variant: "destructive",
          })
          return
        }

        setSupabaseConnected(true)
        console.log('[Checkout] ✅ Supabase connection verified')

        // Get user session
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`)
        }

        if (session.data?.session?.user) {
          const userData = {
            id: session.data.session.user.id,
            email: session.data.session.user.email
          }
          setUser(userData)
          console.log('[Checkout] ✅ User session loaded:', userData.email)
        } else {
          console.warn('[Checkout] ⚠️ No active user session')
          // Redirect to auth or handle guest checkout
        }

        // Load cart from localStorage (or your cart management system)
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart)
            setCartItems(parsedCart)
            console.log('[Checkout] ✅ Cart loaded:', parsedCart.length, 'items')
          } catch (error) {
            console.error('[Checkout] Failed to parse saved cart:', error)
          }
        }

      } catch (error) {
        console.error('[Checkout] Initialization failed:', error)
        handleError(error instanceof Error ? error : new Error('Initialization failed'))
      }
    }

    initializeCheckout()
  }, [supabase, handleError])

  // Handle file upload with enhanced error handling
  const handleFileSelect = useCallback((file: File) => {
    if (!file) return

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      })
      return
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPEG, PNG, or WebP image.",
        variant: "destructive",
      })
      return
    }

    setPaymentProof(file)

    // Generate preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    
    console.log('[Checkout] ✅ Payment proof selected:', file.name, `(${(file.size / 1024).toFixed(1)}KB)`)
  }, [])

  const handleRemoveFile = useCallback(() => {
    setPaymentProof(null)
    setPaymentProofPreview("")
    console.log('[Checkout] Payment proof removed')
  }, [])

  // Enhanced order submission with debugging
  const handleSubmitOrder = useCallback(async () => {
    console.log('[Checkout] ========================================')
    console.log('[Checkout] 🚀 STARTING ENHANCED ORDER SUBMISSION')
    console.log('[Checkout] ========================================')

    // Validation
    if (!supabaseConnected) {
      toast({
        title: "Database Connection Required",
        description: "Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Authentication Required", 
        description: "Please sign in to complete your order.",
        variant: "destructive",
      })
      return
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to your cart before checking out.",
        variant: "destructive",
      })
      return
    }

    if (!paymentProof) {
      toast({
        title: "Payment Proof Required",
        description: "Please upload your payment confirmation screenshot.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Prepare order data (without 'notes' field that caused the error)
      const orderInserts = cartItems.map((item, index) => ({
        user_id: String(user.id),
        product_id: String(item.product_id),
        quantity: Number(item.quantity),
        total_amount: Number((item.product.price * item.quantity).toFixed(2)),
        payment_method: String(paymentMethod),
        status: 'pending'
      }))

      console.log('[Checkout] 📦 Order data prepared:', orderInserts.length, 'orders')

      // Insert orders using enhanced client with automatic retry
      const { data: createdOrders, error: ordersError } = await supabase.db.insert(
        'orders',
        orderInserts,
        { withRetry: true } // Enable automatic retry
      )

      if (ordersError) {
        throw new Error(`Order creation failed: ${ordersError.message}`)
      }

      if (!createdOrders || createdOrders.length === 0) {
        throw new Error('No orders were created - database returned empty result')
      }

      console.log('[Checkout] ✅ Orders created successfully:', createdOrders.length)

      // Handle payment proof upload
      if (createdOrders.length > 0 && paymentProof) {
        const firstOrderId = createdOrders[0].id
        console.log('[Checkout] 📤 Processing payment proof for order:', firstOrderId)

        try {
          // Upload to storage with enhanced error handling
          const fileName = `payment-${user.id}-${Date.now()}.${paymentProof.name.split('.').pop() || 'jpg'}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage.upload(
            'payment-proofs',
            fileName,
            paymentProof,
            { upsert: true }
          )

          let filePath = `manual-${fileName}`
          if (!uploadError && uploadData) {
            filePath = uploadData.data.path
            console.log('[Checkout] ✅ Payment proof uploaded:', filePath)
          } else {
            console.warn('[Checkout] ⚠️ Storage upload failed, using fallback path')
          }

          // Save payment proof record
          const { data: proofData, error: proofError } = await supabase.db.insert(
            'payment_proofs',
            {
              user_id: String(user.id),
              order_id: firstOrderId,
              file_path: filePath,
              original_filename: paymentProof.name,
              file_size: paymentProof.size,
              mime_type: paymentProof.type
            }
          )

          if (proofError) {
            console.warn('[Checkout] ⚠️ Payment proof record failed:', proofError.message)
            // Continue - don't fail order for payment proof issues
          } else {
            console.log('[Checkout] ✅ Payment proof record saved')
          }

        } catch (proofError) {
          console.warn('[Checkout] ⚠️ Payment proof processing failed:', proofError)
          // Continue - don't fail order for payment proof issues
        }
      }

      // Clear cart on success
      localStorage.removeItem('cart')
      setCartItems([])

      // Success feedback
      console.log('[Checkout] ========================================')
      console.log('[Checkout] ✅✅✅ ORDER SUBMISSION SUCCESSFUL! ✅✅✅')
      console.log('[Checkout] ========================================')

      toast({
        title: "Order Submitted Successfully! 🎉",
        description: `${createdOrders.length} order(s) saved and pending confirmation`,
        duration: 5000,
      })

      // Redirect to success page
      const firstOrderId = createdOrders[0].id
      router.push(`/dashboard?order=${firstOrderId}&success=true&source=enhanced`)

    } catch (error) {
      console.error('[Checkout] ❌ Order submission failed:', error)
      
      // The error is automatically handled by our debugging system
      // Just show user-friendly message
      toast({
        title: "Order Submission Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
        duration: 10000,
      })

      // Re-throw to be caught by error boundary if needed
      if (error instanceof Error) {
        handleError(error)
      }

    } finally {
      setLoading(false)
    }
  }, [supabaseConnected, user, cartItems, paymentMethod, paymentProof, supabase, handleError, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/products" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <Database className={`h-5 w-5 ${supabaseConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm">
                Database Status: {supabaseConnected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
          </div>

          {/* Order Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                User: {user?.email || 'Loading...'} • {itemCount} items • Enhanced checkout with debugging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ${item.product.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                  <span>Items: {itemCount}</span>
                  <span>Method: {paymentMethod}</span>
                  <Badge variant="outline">Enhanced Mode</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Payment QR */}
            <Card>
              <CardHeader>
                <CardTitle>Select Payment Method</CardTitle>
                <CardDescription>Choose your preferred payment method and scan the QR code</CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentQR 
                  amount={total} 
                  method={paymentMethod}
                  onMethodChange={setPaymentMethod}
                />
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Payment Proof</CardTitle>
                <CardDescription>Upload screenshot of payment confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  selectedFile={paymentProof}
                  onRemoveFile={handleRemoveFile}
                  preview={paymentProofPreview}
                />
                
                {/* Submit Button */}
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={loading || !paymentProof || !supabaseConnected}
                  className="w-full mt-6"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-pulse" />
                      Submitting Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Submit Order to Database • {itemCount} items • ${total.toFixed(2)}
                    </>
                  )}
                </Button>

                {!supabaseConnected && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Database connection required. Please refresh the page.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}