"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

export type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  stock: number
  download_url?: string
}

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
  currentUser?: any
}

export function ProductCard({ product, onAddToCart, currentUser }: ProductCardProps) {
  const [hasConfirmedOrder, setHasConfirmedOrder] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUser?.id) {
      checkUserOrder()
    }
  }, [currentUser, product.id])

  const checkUserOrder = async () => {
    if (!currentUser?.id) return
    
    try {
      const supabase = createClient()
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          products:product_id ( id, title, download_url )
        `)
        .eq('user_id', currentUser.id)
        .eq('product_id', product.id)
        .eq('status', 'confirmed')
      
      if (!error && orders && orders.length > 0) {
        setHasConfirmedOrder(true)
        const productData = orders[0].products as any
        setDownloadUrl(productData?.download_url || product.download_url || null)
      }
    } catch (error) {
      console.error('Error checking user orders:', error)
    }
  }

  const handleDownload = async () => {
    if (!downloadUrl) return
    
    setLoading(true)
    try {
      // Open download link in new tab
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
          <span className="text-lg font-bold text-primary whitespace-nowrap">${product.price}</span>
        </div>
        <CardDescription className="line-clamp-2">{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Category: {product.category}</span>
          <span className={product.stock > 0 ? "text-green-500" : "text-destructive"}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {hasConfirmedOrder && downloadUrl ? (
          <Button 
            onClick={handleDownload} 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Downloading...' : 'Download'}
          </Button>
        ) : hasConfirmedOrder && !downloadUrl ? (
          <Button disabled className="w-full bg-gray-500">
            <Check className="h-4 w-4 mr-2" />
            Purchased - No Download Available
          </Button>
        ) : (
          <Button onClick={() => onAddToCart(product)} disabled={product.stock === 0} className="w-full">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        )}
        
        {hasConfirmedOrder && (
          <div className="text-center">
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
              ✓ Purchased
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
