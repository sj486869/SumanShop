"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import Image from "next/image"

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

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (cartItemId: string, quantity: number) => void
  onRemove: (cartItemId: string) => void
  onCheckout: () => void
}

export function CartDrawer({ open, onClose, items, onUpdateQuantity, onRemove, onCheckout }: CartDrawerProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({items.length})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-card border">
                  <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={item.product.image || "/placeholder.svg"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground">${item.product.price}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-auto text-destructive"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <Button onClick={onCheckout} size="lg" className="w-full">
              Proceed to Checkout
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
