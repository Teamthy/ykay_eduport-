"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/**
 * Shared portal navigation shell. Desktop keeps a persistent sidebar; mobile
 * gets one accessible, scrollable drawer rather than losing or stacking the
 * navigation below the page content.
 */
export default function ResponsiveSidebar({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState({ pathname, open: false });
  const open = drawer.pathname === pathname && drawer.open;
  const setOpen = useCallback(
    (value: boolean | ((_current: boolean) => boolean)) => {
      setDrawer((current) => {
        const currentOpen = current.pathname === pathname && current.open;
        return {
          pathname,
          open: typeof value === "function" ? value(currentOpen) : value,
        };
      });
    },
    [pathname],
  );
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = drawerRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    firstLink?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open, setOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${open ? "Close" : "Open"} ${label} navigation`}
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-4 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] shadow-lg backdrop-blur lg:hidden"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
        <span>{open ? "Close" : "Menu"}</span>
      </button>

      {open && (
        <button
          type="button"
          aria-label={`Close ${label} navigation`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        ref={drawerRef}
        id={id}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={`${label} navigation`}
        className={`${
          open
            ? "fixed inset-y-0 left-0 z-[60] block w-[min(88vw,22rem)] overflow-y-auto overscroll-contain border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 pb-8 shadow-2xl"
            : "hidden"
        } lg:sticky lg:inset-auto lg:left-auto lg:top-24 lg:z-auto lg:block lg:w-[280px] lg:shrink-0 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:shadow-none`}
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] px-2 pb-3 lg:hidden">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
            {label} menu
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={`Close ${label} navigation`}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
