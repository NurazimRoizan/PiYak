import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, clerkClient } from '@clerk/nextjs/server';

const KNOWN_AUTH_COOKIES = [
    '__session',
    '__client_uat',
    '__clerk_handshake',
    '__clerk_db_jwt',
    '__clerk_handshake_nonce',
    '__clerk_help',
    '__clerk_hs_reason'
];

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

    // 1. Clear all cookies currently present on the request
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        for (const cookie of allCookies) {
            response.cookies.delete(cookie.name);
        }
    } catch {
        // Fallback if cookies() store cannot be accessed
    }

    // 2. Explicitly set expiration on all known Clerk cookies with path=/
    for (const cookieName of KNOWN_AUTH_COOKIES) {
        response.cookies.set({
            name: cookieName,
            value: '',
            path: '/',
            expires: new Date(0),
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
    }

    return response;
}

export async function POST(request: Request) {
    return performReset(request, false);
}

export async function GET(request: Request) {
    return performReset(request, true);
}
