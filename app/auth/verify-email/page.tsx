import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      <Card className="w-full max-w-md glass-card">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
          <CardDescription className="text-white/70">We've sent you a confirmation link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/90">
            Please check your email and click the confirmation link to activate your account.
          </p>
          <p className="text-sm text-white/70">After confirming your email, you can log in to your account.</p>
          <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
            <Link href="/auth/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
