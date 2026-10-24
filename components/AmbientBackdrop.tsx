"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The public site retains its slow brand glow and fine grid. Authenticated
// workspaces use a quieter, grid-free background so the navigation and data
// remain the visual focus instead of reading like a checkerboard.
const PORTAL_ROUTE_PREFIXES = [
  "/admin",
  "/admin-admissions",
  "/teacher",
  "/student",
  "/parent",
  "/staff",
  "/super-admin",
  "/it-portal",
  "/settings",
  "/portal",
  "/change-password",
];

export function AmbientBackdrop() {
  const pathname = usePathname();
  const isPortalRoute = PORTAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  useEffect(() => {
    if (isPortalRoute) {
      document.documentElement.dataset.portalRoute = "true";
    } else {
      delete document.documentElement.dataset.portalRoute;
    }
    return () => {
      delete document.documentElement.dataset.portalRoute;
    };
  }, [isPortalRoute]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${
        isPortalRoute ? "ambient-backdrop--portal" : ""
      }`}
    >
      {/* Subtle brand glows remain on portals, without the public-site grid. */}
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      {!isPortalRoute ? <div className="ambient-grid" /> : null}
    </div>
  );
}
