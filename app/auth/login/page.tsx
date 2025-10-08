"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { mockUser, isSupabaseConfigured } from "@/lib/mock-data"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - any email/password combination works
        const isAdmin = email.toLowerCase().includes('admin')
        const demoUser = { 
          ...mockUser, 
          email: email || mockUser.email,
          role: isAdmin ? "admin" : "user"
        }
        localStorage.setItem('demo-user', JSON.stringify(demoUser))
        // Set lightweight cookies for middleware to recognize client session
        document.cookie = "sb_local_session=1; Max-Age=604800; path=/";
        document.cookie = `sb_local_role=${isAdmin ? 'admin' : 'user'}; Max-Age=604800; path=/`;
        
        toast({
          title: "Login Successful",
          description: isAdmin ? "Welcome Admin! (Demo Mode)" : "Welcome back! (Demo Mode)",
        })
        
        router.push("/")
        return
      }

      const supabase = createClient()

      // Since Supabase Auth might not be enabled, use direct users table login
      // First get user by email using maybeSingle() to avoid 406 errors
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle() // This prevents 406 errors when no rows found
      
      // Handle error (but not "no rows" which is normal)
      if (userError) {
        console.error('Database error:', userError)
        throw new Error("Database connection error. Please try again.")
      }
      
      // If no user found, try default admin fallback
      if (!userData) {
        if (email === 'admin@example.com' && password === 'admin123') {
          const adminUser = {
            id: 'admin-user',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin'
          }
          
          // Store admin session locally
          localStorage.setItem('supabase-user', JSON.stringify(adminUser))
          // Cookies for middleware
          document.cookie = "sb_local_session=1; Max-Age=604800; path=/";
          document.cookie = "sb_local_role=admin; Max-Age=604800; path=/";
          
          setStatus('success')
          setStatusMessage('Admin login successful! Redirecting...')
          
          setTimeout(() => router.push("/"), 1500)
          return
        }
        
        throw new Error("User not found. Please sign up first or check your email.")
      }
      
      // Simple password check (In production, use proper password hashing!)
      if (userData.password !== password) {
        throw new Error("Invalid password")
      }
      
      // Store user session locally
      localStorage.setItem('supabase-user', JSON.stringify(userData))
      // Cookies for middleware
      document.cookie = "sb_local_session=1; Max-Age=604800; path=/";
      document.cookie = `sb_local_role=${userData.role || 'user'}; Max-Age=604800; path=/`;
      
      setStatus('success')
      setStatusMessage(userData.role === "admin" ? "Admin login successful! Redirecting..." : "Login successful! Redirecting...")
      
      setTimeout(() => router.push("/"), 1500)
    } catch (error: any) {
      setStatus('error')
      setStatusMessage(error.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      <Card className="w-full max-w-md glass-card">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Login</CardTitle>
          <CardDescription className="text-white/70">
            {!isSupabaseConfigured() ? 
              "Demo Mode - Any email/password works (use 'admin' in email for admin access)" : 
              "Enter your credentials to access your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={isSupabaseConfigured()}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={isSupabaseConfigured()}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <Button
              type="submit"
              className={`w-full transition-all duration-300 ${
                status === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' :
                status === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : 
               status === 'success' ? "Success! Redirecting..." :
               status === 'error' ? "Try Again" :
               "Login"}
            </Button>
            {statusMessage && (
              <div className={`text-center text-sm font-medium transition-all duration-300 ${
                status === 'success' ? 'text-green-300' :
                status === 'error' ? 'text-red-300' :
                'text-white/70'
              }`}>
                {statusMessage}
              </div>
            )}
            <div className="text-center text-sm text-white/70 space-y-2">
              <div>
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-white underline hover:text-white/90">
                  Sign up
                </Link>
              </div>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/")}
                  className="text-white/70 hover:text-white text-sm"
                >
                  Back to Store
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
