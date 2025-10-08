"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, LogOut } from "lucide-react"
import { SimpleParticles } from "@/components/simple-particles"
import { ProductCard } from "@/components/product-card"
import { CartDrawer } from "@/components/cart-drawer"
import { ChatWidget } from "@/components/chat-widget"
import { DiscountBanner } from "@/components/discount-banner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { mockProducts, mockUser, isSupabaseConfigured } from "@/lib/mock-data"

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

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [cartOpen, setCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [cartAnimation, setCartAnimation] = useState(false)

  useEffect(() => {
    loadUser()
    loadProducts()
  }, [])

  useEffect(() => {
    if (user) {
      loadCart()
    }
  }, [user])

  const loadUser = async () => {
    if (!isSupabaseConfigured()) {
      // Use mock user when Supabase is not configured
      const savedUser = localStorage.getItem('demo-user')
      if (savedUser) {
        const user = JSON.parse(savedUser)
        setUser(user)
        setUserRole(user.role || "user")
      }
      return
    }

    // Check for stored user session first
    const savedUser = localStorage.getItem('supabase-user')
      || localStorage.getItem('demo-user')
      || localStorage.getItem('crime_zone_current_user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setUser(user)
      setUserRole(user.role || "user")
      return
    }

    // Fallback to Supabase Auth if available (but likely won't work if auth is disabled)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        // Try to get user role from users table
        const { data: profile } = await supabase.from("users").select("role, name").eq("email", user.email).maybeSingle()
        setUserRole(profile?.role || "user")
      }
    } catch (error) {
      // Supabase Auth not available, which is fine
      console.log("Supabase Auth not available, using localStorage sessions")
    }
  }

  const loadProducts = async () => {
    if (!isSupabaseConfigured()) {
      // Use mock data when Supabase is not configured
      console.log("[v0] Using mock products (Supabase not configured)")
      setProducts(mockProducts)
      setAllProducts(mockProducts)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading products:", error)
      // Fallback to mock data on error
      console.log("[v0] Falling back to mock products")
      setProducts(mockProducts)
      setAllProducts(mockProducts)
      return
    }

    // Transform Supabase data to match our Product type
    const transformedProducts = (data || []).map(product => ({
      id: product.id,
      name: product.title, // Supabase uses 'title', our app expects 'name'
      description: product.description || '',
      price: parseFloat(product.price) || 0,
      image: product.image_url || '/placeholder.jpg', // Supabase uses 'image_url', our app expects 'image'
      category: 'general', // Default category since it's not in your schema
      stock: product.stock || 0
    }))

    setProducts(transformedProducts)
    setAllProducts(transformedProducts)
  }

  const loadCart = async () => {
    if (!isSupabaseConfigured()) {
      // Use localStorage when Supabase is not configured
      const savedCart = localStorage.getItem('demo-cart')
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        setCartItems(cartData)
        setCartCount(cartData.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0)
      }
      return
    }

    // For now, use localStorage as cart since cart table doesn't exist in your schema
    // In the future, you can create a cart table in Supabase
    const savedCart = localStorage.getItem(`cart-${user.id}`)
    if (savedCart) {
      const cartData = JSON.parse(savedCart)
      setCartItems(cartData)
      setCartCount(cartData.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0)
    }

    // Uncomment this when you add a cart table to your Supabase
    /*
    const supabase = createClient()
    const { data, error } = await supabase
      .from("cart")
      .select(`
        *,
        product:products(*)
      `)
      .eq("user_id", user.id)

    if (error) {
      console.error("[v0] Error loading cart:", error)
      return
    }

    setCartItems(data || [])
    setCartCount(data?.reduce((sum, item) => sum + item.quantity, 0) || 0)
    */
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const filtered = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()),
      )
      setProducts(filtered)
    } else {
      setProducts(allProducts)
    }
  }

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      // Auto-login with demo user when Supabase is not configured
      if (!isSupabaseConfigured()) {
        const demoUser = { ...mockUser, role: "user" }
        localStorage.setItem('demo-user', JSON.stringify(demoUser))
        setUser(demoUser)
        setUserRole("user")
        // Continue with adding to cart
      } else {
        toast({
          title: "Login Required",
          description: "Please login to add items to cart",
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }
    }

    if (!isSupabaseConfigured()) {
      // Handle cart with localStorage
      const savedCart = localStorage.getItem('demo-cart')
      let cartData = savedCart ? JSON.parse(savedCart) : []
      
      const existingItem = cartData.find((item: any) => item.product_id === product.id)
      
      if (existingItem) {
        existingItem.quantity += 1
      } else {
        cartData.push({
          id: Date.now().toString(),
          product_id: product.id,
          quantity: 1,
          product: product
        })
      }
      
      localStorage.setItem('demo-cart', JSON.stringify(cartData))
      await loadCart()
    } else {
      // Handle cart with user-specific localStorage (since no cart table in Supabase yet)
      const savedCart = localStorage.getItem(`cart-${user.id}`)
      let cartData = savedCart ? JSON.parse(savedCart) : []
      
      const existingItem = cartData.find((item: any) => item.product_id === product.id)
      
      if (existingItem) {
        existingItem.quantity += 1
      } else {
        cartData.push({
          id: Date.now().toString(),
          product_id: product.id,
          quantity: 1,
          product: product
        })
      }
      
      localStorage.setItem(`cart-${user.id}`, JSON.stringify(cartData))
      await loadCart()
    }

    /* Uncomment when you add cart table to Supabase
    const supabase = createClient()

    // Check if item already in cart
    const existingItem = cartItems.find((item) => item.product_id === product.id)

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from("cart")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update cart",
          variant: "destructive",
        })
        return
      }
    } else {
      // Add new item
      const { error } = await supabase.from("cart").insert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
      })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add to cart",
          variant: "destructive",
        })
        return
      }
    }

    await loadCart()
    */

    setCartAnimation(true)
    setTimeout(() => setCartAnimation(false), 600)

    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart`,
    })
  }

  const handleUpdateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemove(cartItemId)
      return
    }

    if (!isSupabaseConfigured()) {
      // Handle with localStorage
      const savedCart = localStorage.getItem('demo-cart')
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        const itemIndex = cartData.findIndex((item: any) => item.id === cartItemId)
        if (itemIndex !== -1) {
          cartData[itemIndex].quantity = quantity
          localStorage.setItem('demo-cart', JSON.stringify(cartData))
          await loadCart()
        }
      }
    } else {
      // Handle with user-specific localStorage
      const savedCart = localStorage.getItem(`cart-${user.id}`)
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        const itemIndex = cartData.findIndex((item: any) => item.id === cartItemId)
        if (itemIndex !== -1) {
          cartData[itemIndex].quantity = quantity
          localStorage.setItem(`cart-${user.id}`, JSON.stringify(cartData))
          await loadCart()
        }
      }
    }
    return

    /* Uncomment when you add cart table to Supabase
    const supabase = createClient()
    const { error } = await supabase.from("cart").update({ quantity }).eq("id", cartItemId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      })
      return
    }

    await loadCart()
    */
  }

  const handleRemove = async (cartItemId: string) => {
    if (!isSupabaseConfigured()) {
      // Handle with localStorage
      const savedCart = localStorage.getItem('demo-cart')
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        const filteredCart = cartData.filter((item: any) => item.id !== cartItemId)
        localStorage.setItem('demo-cart', JSON.stringify(filteredCart))
        await loadCart()
      }
    } else {
      // Handle with user-specific localStorage
      const savedCart = localStorage.getItem(`cart-${user.id}`)
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        const filteredCart = cartData.filter((item: any) => item.id !== cartItemId)
        localStorage.setItem(`cart-${user.id}`, JSON.stringify(filteredCart))
        await loadCart()
      }
    }
    return

    /* Uncomment when you add cart table to Supabase
    const supabase = createClient()
    const { error } = await supabase.from("cart").delete().eq("id", cartItemId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      })
      return
    }

    await loadCart()
    */
  }

  const handleCheckout = () => {
    setCartOpen(false)
    router.push("/checkout")
  }

  const handleLogout = async () => {
    if (!isSupabaseConfigured()) {
      // Clear localStorage
      localStorage.removeItem('demo-user')
      localStorage.removeItem('demo-cart')
    } else {
      // Clear user-specific cart and logout
      if (user?.id) {
        localStorage.removeItem(`cart-${user.id}`)
      }
      localStorage.removeItem('supabase-user')
      
      // Try to sign out from Supabase Auth if available
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch (error) {
        // Auth not available, which is fine
      }
    }
    
    setUser(null)
    setUserRole(null)
    setCartItems([])
    setCartCount(0)
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    })
    router.push("/")
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <SimpleParticles />

      {/* Header */}
      <header className="flex items-center justify-between mb-6 max-w-6xl mx-auto p-6 relative z-10">
        <div className="flex items-center gap-2 cursor-pointer hover-3d" onClick={() => router.push("/")}>
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur logo-3d">
            <span className="text-white font-bold text-lg">SS</span>
          </div>
          <h1 className="text-2xl font-bold text-white neon-text">SUMAN STORE</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/70 input-3d"
            />
          </div>
          {user && (
            <Button
              onClick={() => setCartOpen(true)}
              className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 relative button-3d ${cartAnimation ? "cart-bounce" : ""}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center neon-glow pulse-glow">
                  {cartCount}
                </span>
              )}
            </Button>
          )}
          {user ? (
            <>
              <Button
                onClick={() => router.push(userRole === "admin" ? "/admin" : "/dashboard")}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 button-3d"
              >
                {userRole === "admin" ? "Admin Panel" : "Dashboard"}
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 button-3d bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => router.push("/auth/login")} className="bg-red-600 hover:bg-red-700 button-3d">
              Login
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12 relative z-10">
        <DiscountBanner />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-white/70">No products found</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="glass-card rounded-2xl shadow p-4 flex flex-col card-3d product-hover">
                <ProductCard product={product} onAddToCart={handleAddToCart} currentUser={user} />
              </div>
            ))
          )}
        </section>
      </main>

      <footer className="mt-12 text-center pb-6 relative z-10">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a
            href="https://discord.gg/Mn6MsY4uuS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 hover-3d"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Discord
          </a>
          <a
            href="https://www.youtube.com/@SumanPanel"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 hover-3d"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube
          </a>
        </div>
        <p className="text-white/70">Made By Suman</p>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemove}
        onCheckout={handleCheckout}
      />

      <ChatWidget />
    </div>
  )
}
