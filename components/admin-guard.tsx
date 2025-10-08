"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AdminGuardProps {
  children: React.ReactNode
}

function getLocalSession(): { role?: string } | null {
  if (typeof window === "undefined") return null
  const supa = localStorage.getItem("supabase-user")
  const demo = localStorage.getItem("demo-user")
  const legacy = localStorage.getItem("crime_zone_current_user")
  const raw = supa || demo || legacy
  return raw ? JSON.parse(raw) : null
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking")

  useEffect(() => {
    try {
      const session = getLocalSession()
      if (session && session.role === "admin") {
        setStatus("authorized")
      } else {
        setStatus("unauthorized")
      }
    } catch (e) {
      setStatus("unauthorized")
    }
  }, [router])

  if (status === "checking") {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-md w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur p-6 text-white text-center space-y-4">
          <h2 className="text-2xl font-semibold">Admin Access Required</h2>
          <p className="text-white/80">Please login as an admin to access the admin dashboard.</p>
          <div className="flex items-center justify-center gap-3">
            <a href="/auth/login" className="px-4 py-2 rounded-md bg-white/20 hover:bg-white/30 border border-white/30">Go to Login</a>
            <a href="/" className="px-4 py-2 rounded-md bg-transparent hover:bg-white/10 border border-white/30">Back to Home</a>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
