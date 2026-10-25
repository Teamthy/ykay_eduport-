/**
 * Resolve one active navigation item using path-segment boundaries.
 *
 * Exact matches win; for nested routes, the most specific registered href is
 * selected. This prevents `/admin/staff-assignments` from activating
 * `/admin/staff`, and prevents parent menu items from staying highlighted next
 * to a more specific child route.
 */
export function activeNavigationHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((href) => {
    const normalisedHref = href.length > 1 ? href.replace(/\/+$/, "") : href;
    if (pathname === normalisedHref) return true;
    if (normalisedHref === "/admin") return false;
    return pathname.startsWith(`${normalisedHref}/`);
  });

  return matches.sort((left, right) => right.length - left.length)[0] ?? null;
}
