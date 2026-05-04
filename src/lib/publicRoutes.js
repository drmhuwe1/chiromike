/**
 * Routes that do not require a signed-in user (marketing, legal, intake, payments).
 * Keep in sync with public <Route> paths in App.jsx.
 */
export function isPublicPath(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith('/intake')) return true;
  if (pathname === '/payment-success' || pathname === '/payment-cancelled') return true;
  if (
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/baa' ||
    pathname === '/sla' ||
    pathname === '/about' ||
    pathname === '/contact'
  ) {
    return true;
  }
  return false;
}

/**
 * Skip public-settings + auth.me bootstrap (kiosk / payments only).
 */
export function skipsAuthBootstrap(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith('/intake')) return true;
  if (pathname === '/payment-success' || pathname === '/payment-cancelled') return true;
  return false;
}
