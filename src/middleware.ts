import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { appendAuthCookiePurgeHeaders, extractCookieNamesFromHeader } from "./utils/auth-cookies";

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth/(.*)',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.json'
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const authObj = await auth();
  // Self-healing: if client sends a session cookie but is not authenticated (e.g. expired session token),
  // purge stale cookies across all domains from the response to prevent broken handshake/redirect loops.
  if (!authObj.userId && (req.cookies.has('__session') || req.cookies.has('__client_uat'))) {
    const res = NextResponse.next();
    const cookieNames = extractCookieNamesFromHeader(req.headers.get('cookie'));
    appendAuthCookiePurgeHeaders(res.headers, req.nextUrl.hostname, cookieNames);
    return res;
  }
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // 1. Completely bypass Clerk for the auth reset route.
  // This guarantees the reset handler can execute even if Clerk's authenticateRequest
  // would otherwise trigger a redirect to handshake on expired sessions.
  if (req.nextUrl.pathname.startsWith('/api/auth/reset')) {
    return NextResponse.next();
  }

  try {
    const res = await clerkHandler(req, event);

    if (res) {
      const location = res.headers.get('location') || '';
      const isHandshakeRedirect = location.includes('/v1/client/handshake') || location.includes('__clerk_handshake');
      const isReturningFromHandshake = req.nextUrl.searchParams.has('__clerk_handshake') || req.nextUrl.searchParams.has('__clerk_hs_reason');

      const currentLoopCount = parseInt(req.cookies.get('__piyak_loop_count')?.value || '0', 10);

      // Handshake loop breaker:
      // If we are redirecting to handshake while already returning from handshake,
      // or if we have bounced through handshake redirects multiple times:
      if (isHandshakeRedirect && (isReturningFromHandshake || currentLoopCount >= 2)) {
        console.warn(`[Middleware] Clerk handshake redirect loop detected (count=${currentLoopCount}, returning=${isReturningFromHandshake}). Breaking loop and purging stale auth cookies.`);

        // Build clean URL without Clerk handshake query params
        const cleanUrl = new URL(req.nextUrl.pathname, req.url);
        for (const [key, value] of req.nextUrl.searchParams.entries()) {
          if (!key.startsWith('__clerk')) {
            cleanUrl.searchParams.set(key, value);
          }
        }

        const breakRedirect = NextResponse.redirect(cleanUrl, { status: 303 });
        const cookieNames = extractCookieNamesFromHeader(req.headers.get('cookie'));
        appendAuthCookiePurgeHeaders(breakRedirect.headers, req.nextUrl.hostname, cookieNames);
        breakRedirect.headers.append(
          'Set-Cookie',
          '__piyak_loop_count=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
        );
        return breakRedirect;
      }

      if (isHandshakeRedirect) {
        // Track redirect count with a 30s window (much more reliable than Clerk's 2s cookie on mobile networks)
        res.headers.append(
          'Set-Cookie',
          `__piyak_loop_count=${currentLoopCount + 1}; Path=/; Max-Age=30; SameSite=Lax; HttpOnly`
        );
      } else if (currentLoopCount > 0 && !isReturningFromHandshake) {
        // Clear counter on healthy non-handshake response
        res.headers.append(
          'Set-Cookie',
          '__piyak_loop_count=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
        );
      }

      return res;
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Clerk middleware error. Clearing stale cookies and recovering:", error);
    const redirectRes = NextResponse.redirect(new URL('/', req.url), { status: 303 });
    const cookieNames = extractCookieNamesFromHeader(req.headers.get('cookie'));
    appendAuthCookiePurgeHeaders(redirectRes.headers, req.nextUrl.hostname, cookieNames);
    return redirectRes;
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/(.*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
