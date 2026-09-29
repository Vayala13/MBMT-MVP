import { useEffect, useRef } from "react";

/**
 * App keyboard shortcuts (single keys, no modifiers):
 *   C = Log a call · N = New task · / = Search cases
 * Ignored while typing in a field or when a dialog is already open,
 * so the letters still type normally.
 */
export const SHORTCUTS = [
  { key: "c", label: "C", action: "Log a call" },
  { key: "n", label: "N", action: "New task" },
  { key: "/", label: "/", action: "Search cases" },
] as const;

export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    el.getAttribute("role") === "combobox" ||
    el.closest("[role=dialog]") !== null
  );
}

export function useShortcut(key: string, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key || e.metaKey || e.ctrlKey || e.altKey)
        return;
      if (isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}
