import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware for authentication and CORS handling
 * Runs on all routes to manage Supabase auth session and API CORS
 */
export async function middleware(req: NextRequest) {
  // Clone the request URL for potential redirects
  const url = req.nextUrl.clone()
  
  // For API routes, add CORS headers and skip authentication
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    
    // Add CORS headers for API routes
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: res.headers })
    }
    
    return res
  }
  
  // For Next.js App Router _next routes, skip authentication
  if (req.nextUrl.pathname.includes('/_next/')) {
    return NextResponse.next()
  }
  
  // For non-API routes, handle authentication normally
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh session if expired and get current session
  // This keeps the user's session alive and refreshes tokens as needed
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/admin',
    '/servers/create',
    '/servers/edit',
  ]
  
  // Public routes that are always accessible
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/auth/confirm',
    '/servers$', // Server listing page is public
    '/servers/[id]$', // Server detail pages are public
  ]
  
  // Check if route is explicitly protected
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )
  
  // Check if route is explicitly public
  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith('$')) {
      // For exact matching with $ pattern
      const pattern = route.slice(0, -1)
      return new RegExp(`^${pattern.replace(/\[.*?\]/g, '[^/]+')}$`).test(req.nextUrl.pathname)
    }
    return req.nextUrl.pathname.startsWith(route)
  })
  
  // If the route is protected and user is not authenticated
  if (isProtectedRoute && !session) {
    // Store the original URL to redirect after login
    url.pathname = '/login'
    url.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  
  // For routes that are neither explicitly protected nor public
  // Let them through and let the page-level checks handle auth
  
  return res
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Apply this middleware to all routes
    '/(.*)',
  ],
}
