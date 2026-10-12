export const KNOWN_CLERK_COOKIES = [
  '__session',
  '__client_uat',
  '__clerk_handshake',
  '__clerk_db_jwt',
  '__clerk_redirect_count',
  '__piyak_loop_count',
];

/**
 * Returns distinct domain scopes for cookie deletion.
 * In RFC 6265, leading dots are treated identically by modern browsers
 * (e.g. '.jimiroi.com' matches 'jimiroi.com' and subdomains).
 * We target:
 * 1. Host-only (undefined) - for cookies set without Domain attribute
 * 2. Hostname with dot (e.g. '.piyak.jimiroi.com') - for cookies set explicitly on the subdomain
 * 3. Root domain with dot (e.g. '.jimiroi.com') - for cookies shared across the root domain
 */
export function getDomainVariants(hostname: string): (string | undefined)[] {
  const domains: (string | undefined)[] = [undefined];

  if (hostname && hostname !== 'localhost' && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    domains.push(`.${hostname}`);
    const parts = hostname.split('.');
    if (parts.length > 2) {
      domains.push(`.${parts.slice(-2).join('.')}`);
    }
  }

  return domains;
}

/**
 * Extracts cookie names from a raw Cookie header that are related to auth/Clerk.
 */
export function extractAuthCookieNames(cookieHeader?: string | null): string[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(';')
    .map(c => c.trim().split('=')[0])
    .filter(name => 
      name.startsWith('__session') || 
      name.startsWith('__client') || 
      name.startsWith('__clerk') || 
      name.startsWith('__refresh') || 
      name.startsWith('__piyak')
    );
}

/**
 * Appends compact Set-Cookie deletion headers for essential Clerk auth cookies across all
 * possible domain scopes and SameSite policies.
 * Kept intentionally lightweight (~5 KB) to stay well under Vercel Edge's 16 KB header limit.
 */
export function appendAuthCookiePurgeHeaders(
  headers: Headers,
  hostname: string,
  cookieHeader?: string | null
): void {
  const dynamicNames = extractAuthCookieNames(cookieHeader);
  const allNames = Array.from(new Set([...KNOWN_CLERK_COOKIES, ...dynamicNames]));
  const domains = getDomainVariants(hostname);
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
