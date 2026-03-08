import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  const protectedPrefixes = ['/cashier', '/storekeeper', '/admin']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  // Redirect unauthenticated users to login
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If authenticated and on a protected route, check role
  if (isProtected && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = profile.role
    const roleRouteMap: Record<string, string> = {
      cashier: '/cashier',
      storekeeper: '/storekeeper',
      admin: '/admin',
    }
    const homeRouteMap: Record<string, string> = {
      cashier: '/cashier/new-order',
      storekeeper: '/storekeeper/queue',
      admin: '/admin/dashboard',
    }

    const allowedPrefix = roleRouteMap[role]
    if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(homeRouteMap[role], request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
