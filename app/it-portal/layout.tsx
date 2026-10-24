import type { ReactNode } from "react";
import ITPortalShell from "@/components/ITPortalShell";

export default function ITPortalLayout({ children }: { children: ReactNode }) {
  return <ITPortalShell>{children}</ITPortalShell>;
}
