import type { ReactNode } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:gap-5 lg:px-6">
      <SuperAdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
