import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { appendAuthCookiePurgeHeaders } from '@/utils/auth-cookies';

async function performReset(request: Request, isRedirect: boolean) {
  try {
    const { sessionId } = await auth().catch(() => ({ sessionId: null }));
    if (sessionId) {
      try {
        const client = await clerkClient();
        await client.sessions.revokeSession(sessionId);
      } catch (err) {
        console.warn('Could not revoke Clerk session on reset:', err);
      }
    }
  } catch {
    // Safe to ignore session resolution failure during reset
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const response = isRedirect 
    ? NextResponse.redirect(new URL('/', origin), { status: 303 })
    : NextResponse.json({ success: true, message: 'Auth session reset successfully' });

  // Add no-store headers to prevent caching of the reset response
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Purge all Clerk auth cookies across host-only and domain scopes, including cookies from request
  const cookieHeader = request.headers.get('cookie');
  appendAuthCookiePurgeHeaders(response.headers, requestUrl.hostname, cookieHeader);

  response.headers.append(
    'Set-Cookie',
    '__piyak_loop_count=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  );

  return response;
}

export async function POST(request: Request) {
  return performReset(request, false);
}

export async function GET(request: Request) {
  return performReset(request, true);
}
