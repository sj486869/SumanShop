"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, User, LogOut, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"

interface SessionUser {
  id: string
  email: string
  name?: string
  role?: string
}

function getUnifiedUser(): SessionUser | null {
  if (typeof window === "undefined") return null
  const supa = localStorage.getItem("supabase-user")
  const demo = localStorage.getItem("demo-user")
  const legacy = localStorage.getItem("crime_zone_current_user")
  const raw = supa || demo || legacy
  return raw ? JSON.parse(raw) : null
}

interface HeaderProps {
  cartCount?: number
  onCartClick?: () => void
}

export function Header({ cartCount = 0, onCartClick }: HeaderProps) {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(getUnifiedUser())

  useEffect(() => {
    setUser(getUnifiedUser())
  }, [])

  const handleLogout = async () => {
    try {
      const u = getUnifiedUser() as any
      if (u?.id) {
        localStorage.removeItem(`cart-${u.id}`)
      }
      localStorage.removeItem("supabase-user")
      localStorage.removeItem("demo-user")
      localStorage.removeItem("crime_zone_current_user")
      document.cookie = "sb_local_session=; Max-Age=0; path=/";
      document.cookie = "sb_local_role=; Max-Age=0; path=/";
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    setUser(null)
    router.push("/")
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">SS</span>
          </div>
          <h1 className="text-xl font-bold">Suman Store</h1>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {onCartClick && (
                <Button variant="ghost" size="icon" className="relative" onClick={onCartClick}>
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    My Dashboard
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => router.push("/admin")}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => router.push("/auth/login")}>Login</Button>
          )}
        </div>
      </div>
    </header>
  )
}
