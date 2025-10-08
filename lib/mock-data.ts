// Mock data for when Supabase is not configured
export const mockProducts = [
  {
    id: "1",
    name: "Premium Digital Course",
    description: "Complete guide to modern web development with React, Next.js, and TypeScript",
    price: 99.99,
    image: "/placeholder.jpg",
    category: "education",
    stock: 50,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "2", 
    name: "UI Design Templates",
    description: "Professional UI design templates for modern applications",
    price: 49.99,
    image: "/placeholder.jpg",
    category: "design",
    stock: 100,
    created_at: "2024-01-02T00:00:00Z"
  },
  {
    id: "3",
    name: "Code Snippets Library",
    description: "Collection of useful code snippets and utilities",
    price: 29.99,
    image: "/placeholder.jpg", 
    category: "development",
    stock: 75,
    created_at: "2024-01-03T00:00:00Z"
  },
  {
    id: "4",
    name: "Digital Marketing Guide",
    description: "Complete digital marketing strategy and implementation guide",
    price: 79.99,
    image: "/placeholder.jpg",
    category: "marketing", 
    stock: 30,
    created_at: "2024-01-04T00:00:00Z"
  },
  {
    id: "5",
    name: "Mobile App Templates",
    description: "Ready-to-use mobile application templates for iOS and Android",
    price: 149.99,
    image: "/placeholder.jpg",
    category: "mobile",
    stock: 25,
    created_at: "2024-01-05T00:00:00Z"
  },
  {
    id: "6",
    name: "SEO Optimization Toolkit",
    description: "Tools and strategies for search engine optimization",
    price: 39.99,
    image: "/placeholder.jpg",
    category: "seo",
    stock: 60,
    created_at: "2024-01-06T00:00:00Z"
  }
]

export const mockUser = {
  id: "demo-user",
  email: "demo@example.com",
  name: "Demo User"
}

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return !!(supabaseUrl && supabaseKey && 
    supabaseUrl !== "https://your-project.supabase.co" && 
    supabaseKey !== "your-anon-key")
}