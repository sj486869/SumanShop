"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { AdminGuard } from "@/components/admin-guard"
import { ProductFormDialog } from "@/components/product-form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
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

export default function AdminProductsPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])

  const loadProducts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("products")
      .select("id, title, description, price, image_url, stock, download_url, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading products:", error)
      return
    }

    const normalized = (data || []).map((p: any) => ({
      id: p.id,
      name: p.title || 'Untitled',
      description: p.description || '',
      price: Number(p.price) || 0,
      image: p.image_url || '/placeholder.svg',
      category: 'general',
      stock: Number(p.stock) || 0,
      download_url: p.download_url || '',
    }))

    setProducts(normalized)
  }

  useEffect(() => {
    loadProducts()

    // Realtime: refresh on products change
    const supabase = createClient()
    const channel = supabase
      .channel("admin-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const supabase = createClient()
      const { error } = await supabase.from("products").delete().eq("id", id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive",
        })
        return
      }

      loadProducts()
      toast({
        title: "Product Deleted",
        description: "Product has been removed successfully",
      })
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <AdminHeader />

        <main className="container py-8">
          <AdminNav />

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Products Management</CardTitle>
                  <CardDescription className="text-white/80">Manage your product catalog</CardDescription>
                </div>
                <ProductFormDialog onSuccess={loadProducts} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Download URL</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                          <Image
                            src={product.image || "/placeholder.svg"}
                            alt={product.name || 'Product image'}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${product.price}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell className="max-w-xs">
                        {product.download_url ? (
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 text-xs">✓ Available</span>
                            <a 
                              href={product.download_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs truncate block max-w-32"
                              title={product.download_url}
                            >
                              {product.download_url}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No download</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ProductFormDialog product={product} onSuccess={loadProducts} />
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </AdminGuard>
  )
}
