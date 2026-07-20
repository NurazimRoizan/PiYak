<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lessons Learned (PiYak specific constraints)
1. **Clerk v7 Middleware**: Never use the old synchronous `auth().protect()`. You MUST use `await auth.protect()` inside an `async (auth, req)` block to prevent 500 crashes.
2. **Clerk Route Matchers**: When using `createRouteMatcher` in middleware, ALWAYS explicitly whitelist SEO files (`/sitemap.xml`, `/robots.txt`, `/manifest.json`). Failure to do this blocks Googlebot behind authentication and gets the site de-indexed.
3. **PWA Best Practices**:
   - Always include an empty `fetch` listener in `sw.js` to trigger the browser's PWA install heuristic.
   - Always register the Service Worker globally (e.g., via a Script in `layout.tsx`), never hidden behind a UI interaction.
   - Always include `self.skipWaiting()` in the `install` event to prevent broken service workers from getting trapped in the background on mobile devices.
4. **Security**: Never create open database endpoints (like `/api/admin-migrate`) without explicit cryptographic or strict ownership verification. Doing so opens the app to IDOR attacks.
