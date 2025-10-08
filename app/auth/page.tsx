"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { getCurrentUser } from "@/lib/auth"

export default function AuthPage() {
  const router = useRouter()

  useEffect(() => {
    if (getCurrentUser()) {
      router.push("/")
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthForm onSuccess={() => router.push("/")} />
      </div>
    </div>
  )
}
