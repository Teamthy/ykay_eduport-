"use client";

import { useEffect } from "react";
import { useSyncStatus } from "@/lib/offline/hooks";
import { initSyncManager } from "@/lib/offline/sync";
import { Wifi, WifiOff, CloudUpload, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Floating offline/sync status indicator.
 * Shows: offline banner, syncing spinner, pending count, or "all synced".
 *
 * Also initialises the sync manager on mount (call once in the root layout).
 */
export default function OfflineIndicator() {
  const { status, pending } = useSyncStatus();

  useEffect(() => {
    const cleanup = initSyncManager();
    return cleanup;
  }, []);

  // Don't render anything when idle and nothing pending
  if (status === "idle" && pending === 0) return null;

  let icon = <CheckCircle2 size={14} className="text-green-500" />;
  let text = "All changes synced";
  let bg = "bg-green-500/10 border-green-500/20";
  let textColor = "text-green-500";

  if (status === "offline") {
    icon = <WifiOff size={14} className="text-orange-500" />;
    text = pending > 0 ? `Offline — ${pending} change${pending > 1 ? "s" : ""} queued` : "Offline";
    bg = "bg-orange-500/10 border-orange-500/20";
    textColor = "text-orange-500";
  } else if (status === "syncing") {
    icon = <Loader2 size={14} className="text-blue-500 animate-spin" />;
    text = `Syncing ${pending} change${pending > 1 ? "s" : ""}...`;
    bg = "bg-blue-500/10 border-blue-500/20";
    textColor = "text-blue-500";
  } else if (status === "error") {
    icon = <CloudUpload size={14} className="text-red-500" />;
    text = `${pending} change${pending > 1 ? "s" : ""} failed to sync — will retry`;
    bg = "bg-red-500/10 border-red-500/20";
    textColor = "text-red-500";
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-full border backdrop-blur-md shadow-lg text-xs font-medium animate-[fade-in_0.3s_ease-out]">
      <span className={`inline-flex items-center gap-2 ${textColor}`}>
        {icon}
        {text}
      </span>
      <style>{`@keyframes fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
