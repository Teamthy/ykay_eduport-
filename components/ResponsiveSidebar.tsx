"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

const SIDEBAR_PREFERENCE_KEY = "ykay-portal-sidebar-collapsed";
const SIDEBAR_PREFERENCE_EVENT = "ykay-portal-sidebar-preference";
const SidebarCollapseContext = createContext({ collapsed: false });

function getSidebarPreference() {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

function subscribeToSidebarPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, onChange);
  };
}

/** Read the desktop sidebar state inside a role-specific navigation tree. */
export function useResponsiveSidebar() {
  return useContext(SidebarCollapseContext);
}

/**
 * Shared portal navigation shell. Desktop gets a viewport-fixed rail with its
 * own scroll area that can collapse to an icon dock; mobile keeps the accessible
 * drawer with focus management and Escape handling.
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
  const collapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    () => false,
  );
  const setCollapsed = useCallback((value: boolean | ((_current: boolean) => boolean)) => {
    const current = getSidebarPreference();
    const next = typeof value === "function" ? value(current) : value;
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(next));
    } catch {
      // A storage preference is optional; the current session still works.
    }
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }, []);
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
    const focusableSelector =
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const visibleFocusable = () =>
      Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
        (element) =>
          element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
      );
    visibleFocusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = visibleFocusable();
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
    const closeOnDesktopResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", closeOnDesktopResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", closeOnDesktopResize);
      trigger?.focus();
    };
  }, [open, setOpen]);

  const desktopCollapsed = collapsed && !open;

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
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <div
        aria-hidden="true"
        data-sidebar-spacer="true"
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${
          desktopCollapsed ? "lg:w-[80px]" : "lg:w-[272px]"
        }`}
      />

      <aside
        ref={drawerRef}
        id={id}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={`${label} navigation`}
        data-sidebar-collapsed={desktopCollapsed ? "true" : "false"}
        className={`${
          open
            ? "fixed inset-y-0 left-0 z-[60] block w-[min(88vw,22rem)] overflow-y-auto overscroll-contain border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 pb-8 shadow-2xl"
            : "hidden"
        } ${
          desktopCollapsed ? "lg:w-[80px]" : "lg:w-[272px]"
        } lg:fixed lg:left-4 lg:top-[5.5rem] lg:bottom-4 lg:z-30 lg:flex lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-[1.4rem] lg:border lg:border-[var(--border-subtle)] lg:bg-[var(--surface-card)]/90 lg:p-2 lg:pb-3 lg:shadow-[var(--shadow-lg)] lg:backdrop-blur-xl lg:transition-[width] lg:duration-200`}
      >
        <div className="sticky top-0 z-10 mb-2 hidden min-h-10 items-center justify-end rounded-xl border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/95 px-1 pb-2 pt-1 backdrop-blur lg:flex">
          <button
            type="button"
            aria-label={`${desktopCollapsed ? "Expand" : "Collapse"} ${label} sidebar`}
            aria-expanded={!desktopCollapsed}
            title={`${desktopCollapsed ? "Expand" : "Collapse"} sidebar`}
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            {desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

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

        <SidebarCollapseContext.Provider value={{ collapsed: desktopCollapsed }}>
          {children}
        </SidebarCollapseContext.Provider>
      </aside>
    </>
  );
}
