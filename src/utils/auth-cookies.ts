export const KNOWN_AUTH_COOKIES = [
  '__session',
  '__client_uat',
  '__clerk_handshake',
  '__clerk_db_jwt',
  '__clerk_handshake_nonce',
  '__clerk_help',
  '__clerk_hs_reason',
  '__clerk_redirect_count',
  '__piyak_loop_count',
];

/**
 * Returns all possible domain scopes for a given hostname so that
 * cookies set at host, subdomain, or root domain levels can be properly deleted.
 */
export function getDomainVariants(hostname: string): (string | undefined)[] {
  const domains: (string | undefined)[] = [undefined]; // host-only

  if (hostname && hostname !== 'localhost' && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // Add exact hostname and dot-prefixed hostname
    domains.push(hostname);
    domains.push(`.${hostname}`);

    const parts = hostname.split('.');
    if (parts.length > 2) {
      // e.g. piyak.jimiroi.com -> jimiroi.com
      const rootDomain = parts.slice(-2).join('.');
      domains.push(rootDomain);
      domains.push(`.${rootDomain}`);
    }
  }

  return Array.from(new Set(domains));
}

/**
 * Appends Set-Cookie deletion headers across all domain variations and SameSite configurations.
 * Uses headers.append to avoid Next.js response cookie map key collision.
 */
export function appendAuthCookiePurgeHeaders(
  headers: Headers,
  hostname: string,
  extraCookieNames: string[] = []
): void {
  const domains = getDomainVariants(hostname);
  const allNames = Array.from(new Set([...KNOWN_AUTH_COOKIES, ...extraCookieNames]));

  const isSecure = process.env.NODE_ENV === 'production' || (hostname !== 'localhost' && !hostname.startsWith('127.0.0.1'));
  const secureAttr = isSecure ? '; Secure' : '';

  for (const name of allNames) {
    for (const domain of domains) {
      const domainAttr = domain ? `; Domain=${domain}` : '';

      // 1. SameSite=Lax (standard Clerk browser setting)
      headers.append(
        'Set-Cookie',
        `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${domainAttr}; SameSite=Lax; HttpOnly${secureAttr}`
      );

      // 2. SameSite=None; Secure (for cross-site / third-party context)
      if (isSecure) {
        headers.append(
          'Set-Cookie',
          `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${domainAttr}; SameSite=None; Secure; HttpOnly`
        );
      }
    }
  }
}

/**
 * Helper to parse cookie names from a raw Cookie header string
 */
export function extractCookieNamesFromHeader(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(';')
    .map(c => c.trim().split('=')[0])
    .filter(Boolean);
}
