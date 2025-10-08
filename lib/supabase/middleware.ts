import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow local sessions set by the app (non-Supabase auth)
  const hasLocalSession = request.cookies.get("sb_local_session")?.value === "1"
  const localRole = request.cookies.get("sb_local_role")?.value

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // If Supabase user exists, optionally verify role from DB
    if (user) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
        if ((profile?.role ?? null) !== "admin") {
          const url = request.nextUrl.clone()
          url.pathname = "/"
          return NextResponse.redirect(url)
        }
      } catch {
        // If role check fails, fall back to local cookie role
        if (localRole !== "admin") {
          const url = request.nextUrl.clone()
          url.pathname = "/"
          return NextResponse.redirect(url)
        }
      }
    } else {
      // No Supabase session — require local admin cookie
      if (!hasLocalSession) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
      if (localRole !== "admin") {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
    }
  }

  // Protect dashboard routes: allow either Supabase session or local cookie session
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user && !hasLocalSession) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
  }

  // Protect checkout routes
  if (request.nextUrl.pathname.startsWith("/checkout")) {
    if (!user && !hasLocalSession) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
