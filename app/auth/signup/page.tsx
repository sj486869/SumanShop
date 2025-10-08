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

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setStatus('error')
      setStatusMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setStatus('error')
      setStatusMessage('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - create local user
        const isAdmin = email.toLowerCase().includes('admin')
        const newUser = {
          id: Date.now().toString(),
          name: email.split('@')[0],
          email: email,
          role: isAdmin ? "admin" : "user"
        }
        
        // Store in localStorage for demo
        localStorage.setItem('demo-user', JSON.stringify(newUser))
        // Cookies for middleware to recognize session immediately
        document.cookie = "sb_local_session=1; Max-Age=604800; path=/";
        document.cookie = `sb_local_role=${isAdmin ? 'admin' : 'user'}; Max-Age=604800; path=/`;
        
        setStatus('success')
        setStatusMessage(isAdmin ? "Admin account created! Redirecting..." : "Account created! Redirecting...")
        
        setTimeout(() => router.push("/"), 1500)
        return
      }

      const supabase = createClient()
      
      // Since Supabase Auth might not be enabled, create user directly in users table
      // Check if user already exists using maybeSingle() to avoid 406 errors
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle() // Prevents 406 error when no user found
      
      // Handle database errors (but not "no rows" which is expected)
      if (checkError) {
        console.error('Database error during user check:', checkError)
        throw new Error("Database connection error. Please try again.")
      }
      
      // If user already exists, throw error
      if (existingUser) {
        throw new Error("User with this email already exists. Please login instead.")
      }
      
      // Create user directly in users table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          name: email.split('@')[0],
          email: email,
          password: password, // Note: In production, hash this!
          role: email.toLowerCase().includes('admin') ? 'admin' : 'user'
        })
      
      if (insertError) {
        throw new Error(insertError.message || "Failed to create account")
      }
      
      setStatus('success')
      setStatusMessage('Account created successfully! Redirecting to login...')
      
      setTimeout(() => router.push("/auth/login"), 1500)
    } catch (error: any) {
      setStatus('error')
      setStatusMessage(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      <Card className="w-full max-w-md glass-card">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Sign Up</CardTitle>
          <CardDescription className="text-white/70">
            {!isSupabaseConfigured() ? 
              "Demo Mode - Any email/password works (use 'admin' in email for admin access)" : 
              "Create a new account to get started"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? "Creating account..." : 
               status === 'success' ? "Success! Redirecting..." :
               status === 'error' ? "Try Again" :
               "Sign Up"}
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
                Already have an account?{" "}
                <Link href="/auth/login" className="text-white underline hover:text-white/90">
                  Login
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
