"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type PaymentMethodType = "UPI" | "Binance" | "PayPal"

type PaymentMethodData = {
  id: string
  method_name: string
  active: boolean
  upi_qr?: string
  upi_id?: string
  binance_qr?: string
  binance_id?: string
  paypal_qr?: string
  paypal_id?: string
}

interface PaymentQRProps {
  total: number
  onMethodChange: (method: string) => void
}

export function PaymentQR({ total, onMethodChange }: PaymentQRProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("PhonePe UPI")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('active', true)
        .order('method_name')

      if (error) {
        console.error('Error loading payment methods:', error)
        // Fallback to local QR codes
        setPaymentMethods([
          {
            id: '1',
            method_name: 'PhonePe UPI',
            active: true,
            upi_qr: '/phonepe-qr.jpg',
            upi_id: 'your-upi-id@paytm'
          },
          {
            id: '2', 
            method_name: 'Binance Pay',
            active: true,
            binance_qr: '/binance-qr-new.jpg',
            binance_id: 'your-binance-id'
          },
          {
            id: '3',
            method_name: 'PayPal',
            active: true,
            paypal_qr: '/paypal-qr.jpg',
            paypal_id: 'your-paypal-id'
          }
        ])
      } else {
        setPaymentMethods(data || [])
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method)
    onMethodChange(method)
  }

  const currentMethod = paymentMethods.find(m => m.method_name === selectedMethod)
  
  const getQRImage = (method: PaymentMethodData) => {
    switch (method.method_name) {
      case 'PhonePe UPI':
      case 'UPI':
        return method.upi_qr || '/phonepe-qr.jpg'
      case 'Binance Pay':
      case 'Binance':
        return method.binance_qr || '/binance-qr-new.jpg'
      case 'PayPal':
        return method.paypal_qr || '/paypal-qr.jpg'
      default:
        return '/placeholder.svg'
    }
  }
  
  const getPaymentId = (method: PaymentMethodData) => {
    switch (method.method_name) {
      case 'PhonePe UPI':
      case 'UPI':
        return method.upi_id || 'your-upi-id@paytm'
      case 'Binance Pay':
      case 'Binance':
        return method.binance_id || 'your-binance-id'
      case 'PayPal':
        return method.paypal_id || 'your-paypal-id'
      default:
        return 'Not configured'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-white/70">Loading payment methods...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-white/70">No payment methods available</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Select Payment Method</CardTitle>
          <CardDescription className="text-white/70">Choose your preferred payment method and scan the QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedMethod} onValueChange={handleMethodChange}>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-white/20 hover:bg-white/5 cursor-pointer"
                >
                  <RadioGroupItem value={method.method_name} id={method.method_name} className="border-white/30" />
                  <Label htmlFor={method.method_name} className="flex-1 cursor-pointer text-white">
                    <div className="font-semibold">{method.method_name}</div>
                    <div className="text-sm text-white/70">Pay with {method.method_name}</div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {currentMethod && (
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Payment Details</CardTitle>
            <CardDescription className="text-white/70">Scan the QR code or use the ID below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative w-64 h-64 bg-white rounded-lg p-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setIsModalOpen(true)}
                title="Click to enlarge"
              >
                <Image
                  src={getQRImage(currentMethod)}
                  alt={`${currentMethod.method_name} QR Code`}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="w-full space-y-2">
                <div className="text-center">
                  <p className="text-sm text-white/70">Amount to Pay</p>
                  <p className="text-3xl font-bold text-green-400">${total.toFixed(2)}</p>
                </div>

                <div className="p-3 bg-white/5 rounded-lg border border-white/20">
                  <p className="text-xs text-white/70 mb-1">{currentMethod.method_name} ID</p>
                  <p className="font-mono text-sm break-all text-white">{getPaymentId(currentMethod)}</p>
                </div>
              </div>
            </div>

            <div className="text-sm text-white/70 space-y-1 border-t border-white/20 pt-4">
              <p className="font-semibold text-white">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Scan the QR code with your {currentMethod.method_name} app</li>
                <li>Send exactly ${total.toFixed(2)} to the address shown</li>
                <li>Take a screenshot of the payment confirmation</li>
                <li>Upload the screenshot below to complete your order</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="relative w-full aspect-square bg-white rounded-lg p-8">
              <Image
                src={currentMethod ? getQRImage(currentMethod) : "/placeholder.svg"}
                alt={`${currentMethod?.method_name} QR Code - Enlarged`}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-4 text-center text-white">
              <p className="text-lg font-semibold">{currentMethod?.method_name}</p>
              <p className="text-sm opacity-80">Click outside to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
