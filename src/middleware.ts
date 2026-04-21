import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isRouteAllowed, getDefaultRoute, isMobileRole } from '@/lib/auth/roles'
import type { AppRole } from '@/types/database'
import type { Database } from '@/types/database'

const PUBLIC_ROUTES = ['/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public assets and API routes to pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // Build a response to mutate cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session (required by @supabase/ssr)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ---------------------------------------------------------------------------
  // UNAUTHENTICATED USER
  // ---------------------------------------------------------------------------
  if (!user) {
    if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
      return supabaseResponse
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED USER on login page → redirect to their dashboard
  // ---------------------------------------------------------------------------
  if (pathname === '/login' || pathname === '/') {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const profile1 = profileData as { role: AppRole; is_active: boolean } | null
    if (!profile1?.is_active) {
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('error', 'Account+deactivated')
      return NextResponse.redirect(loginUrl)
    }

    const defaultRoute = getDefaultRoute(profile1.role)
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = defaultRoute
    return NextResponse.redirect(redirectUrl)
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED USER — check route permissions
  // ---------------------------------------------------------------------------
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: AppRole; is_active: boolean } | null
  if (!profile?.is_active) {
    await supabase.auth.signOut()
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'Account+deactivated')
    return NextResponse.redirect(loginUrl)
  }

  const role = profile.role

  // Redirect mobile-role users away from desktop-only routes and vice versa
  const desktopOnlyPrefixes = ['/owner', '/manager', '/sales', '/accounts', '/front-desk']
  const mobileOnlyPrefixes = ['/technician', '/qc']

  if (isMobileRole(role) && desktopOnlyPrefixes.some((p) => pathname.startsWith(p))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = getDefaultRoute(role)
    return NextResponse.redirect(redirectUrl)
  }

  if (!isMobileRole(role) && mobileOnlyPrefixes.some((p) => pathname.startsWith(p))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = getDefaultRoute(role)
    return NextResponse.redirect(redirectUrl)
  }

  // Check granular route permissions
  if (!isRouteAllowed(pathname, role)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = getDefaultRoute(role)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
