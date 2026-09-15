export const ESSENTIAL_CLERK_COOKIES = [
  '__session',
  '__client_uat',
  '__clerk_handshake',
];

/**
 * Returns distinct domain scopes for cookie deletion.
 * In RFC 6265, leading dots are ignored (e.g. '.jimiroi.com' == 'jimiroi.com').
 * So we only need:
 * 1. Host-only (undefined)
 * 2. Root domain with dot (e.g. '.jimiroi.com') if the host is a subdomain
 */
export function getDomainVariants(hostname: string): (string | undefined)[] {
  const domains: (string | undefined)[] = [undefined]; // host-only

  if (hostname && hostname !== 'localhost' && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    const parts = hostname.split('.');
    if (parts.length > 2) {
      // e.g. piyak.jimiroi.com -> .jimiroi.com
      const rootDomain = `.${parts.slice(-2).join('.')}`;
      domains.push(rootDomain);
    }
  }

  return domains;
}

/**
 * Appends compact Set-Cookie deletion headers for essential Clerk auth cookies.
 * Kept intentionally lightweight (< 1 KB) to stay well under Vercel Edge's 16 KB header limit.
 */
export function appendAuthCookiePurgeHeaders(
  headers: Headers,
  hostname: string
): void {
  const domains = getDomainVariants(hostname);
  const isSecure = process.env.NODE_ENV === 'production' || (hostname !== 'localhost' && !hostname.startsWith('127.0.0.1'));
  const secureAttr = isSecure ? '; Secure' : '';

  for (const name of ESSENTIAL_CLERK_COOKIES) {
    for (const domain of domains) {
      const domainAttr = domain ? `; Domain=${domain}` : '';
      headers.append(
        'Set-Cookie',
        `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${domainAttr}; SameSite=Lax; HttpOnly${secureAttr}`
      );
    }
  }
}
