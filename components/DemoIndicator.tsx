"use client";

import { usePathname } from "next/navigation";

export default function DemoIndicator() {
  const pathname = usePathname();
  const isPortal = pathname.includes("/admin") || pathname.includes("/teacher") || pathname.includes("/student") || pathname.includes("/parent");
  if (!isPortal) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green text-white text-xs font-bold uppercase tracking-widest shadow-lg">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      Demo Live
    </div>
  );
}
