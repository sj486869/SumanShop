export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  stock: number
  createdAt: string
}

const PRODUCTS_KEY = "crime_zone_products"

export function getProducts(): Product[] {
  if (typeof window === "undefined") return []
  const products = localStorage.getItem(PRODUCTS_KEY)
  if (!products) {
    // Initialize with sample products
    const sampleProducts: Product[] = [
      {
        id: "1",
        name: "Premium Digital Asset",
        description: "High-quality digital product with instant delivery",
        price: 49.99,
        image: "/digital-product-abstract.jpg",
        category: "Digital",
        stock: 100,
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Exclusive Access Pass",
        description: "Lifetime access to premium content and features",
        price: 99.99,
        image: "/vip-pass-card.jpg",
        category: "Access",
        stock: 50,
        createdAt: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Pro Toolkit Bundle",
        description: "Complete toolkit for professionals",
        price: 149.99,
        image: "/toolkit-bundle.jpg",
        category: "Bundle",
        stock: 75,
        createdAt: new Date().toISOString(),
      },
    ]
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(sampleProducts))
    return sampleProducts
  }
  return JSON.parse(products)
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
}

export function addProduct(product: Omit<Product, "id" | "createdAt">): Product {
  const products = getProducts()
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  }
  products.push(newProduct)
  saveProducts(products)
  return newProduct
}

export function updateProduct(id: string, updates: Partial<Product>): boolean {
  const products = getProducts()
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return false

  products[index] = { ...products[index], ...updates }
  saveProducts(products)
  return true
}

export function deleteProduct(id: string): boolean {
  const products = getProducts()
  const filtered = products.filter((p) => p.id !== id)
  if (filtered.length === products.length) return false

  saveProducts(filtered)
  return true
}

export function searchProducts(query: string): Product[] {
  const products = getProducts()
  const lowerQuery = query.toLowerCase()
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery),
  )
}
