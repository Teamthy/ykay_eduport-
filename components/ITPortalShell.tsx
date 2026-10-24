"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ITPortalSidebar from "@/components/ITPortalSidebar";

export default function ITPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const standaloneRoute =
    pathname === "/it-portal/auth" || /^\/it-portal\/courses\/[^/]+\/learn(?:\/|$)/.test(pathname);

  if (standaloneRoute) return children;

  return (
    <div className="flex min-h-screen w-full flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:gap-5 lg:px-6">
      <ITPortalSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
