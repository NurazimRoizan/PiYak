import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

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
  // purge the stale cookie from the response to prevent broken handshake/redirect loops.
  if (!authObj.userId && (req.cookies.has('__session') || req.cookies.has('__client_uat'))) {
    const res = NextResponse.next();
    res.cookies.delete('__session');
    res.cookies.delete('__client_uat');
    res.cookies.delete('__clerk_handshake');
    return res;
  }
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  try {
    return await clerkHandler(req, event);
  } catch (error) {
    console.error("Clerk middleware error. Clearing stale cookies and recovering:", error);
    const redirectRes = NextResponse.redirect(new URL('/', req.url));
    redirectRes.cookies.delete('__session');
    redirectRes.cookies.delete('__client_uat');
    redirectRes.cookies.delete('__clerk_handshake');
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
