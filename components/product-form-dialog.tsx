"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  stock: number
  download_url?: string
}

interface ProductFormDialogProps {
  product?: Product
  onSuccess: () => void
}

export function ProductFormDialog({ product, onSuccess }: ProductFormDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    category: product?.category || "",
    stock: product?.stock || 0,
    image: product?.image || "",
    download_url: product?.download_url || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()

    // Map UI form data to Supabase schema columns
    const supaData = {
      title: formData.name,
      description: formData.description,
      price: formData.price,
      image_url: formData.image,
      stock: formData.stock,
      download_url: formData.download_url,
    }

    if (product) {
      const { error } = await supabase.from("products").update(supaData).eq("id", product.id)

      if (error) {
        console.error("[admin] Failed to update product", { id: product.id, error })
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive",
        })
        return
      }

      console.log("[admin] Product updated", { id: product.id })
      toast({
        title: "Product Updated",
        description: "Product has been updated successfully",
      })
    } else {
      const { error } = await supabase.from("products").insert(supaData)

      if (error) {
        console.error("[admin] Failed to add product", { error })
        toast({
          title: "Error",
          description: "Failed to add product",
          variant: "destructive",
        })
        return
      }

      console.log("[admin] Product added")
      toast({
        title: "Product Added",
        description: "New product has been added successfully",
      })
    }

    setOpen(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="outline" size="sm">
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update product information" : "Add a new product to your store"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="/placeholder.svg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="download_url">Download URL (for digital products)</Label>
            <Input
              id="download_url"
              value={formData.download_url}
              onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
              placeholder="https://example.com/download/product.zip"
            />
            <p className="text-xs text-muted-foreground">
              Only users who have confirmed orders will see the download button
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Update Product" : "Add Product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
