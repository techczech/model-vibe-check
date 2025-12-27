"use client";

import { useEffect, useCallback } from "react";

export interface ShortcutAction {
  key: string;
  modifiers?: ("ctrl" | "meta" | "shift" | "alt")[];
  description: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: ShortcutAction[];
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const modifiers = shortcut.modifiers || [];
        
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = modifiers.includes("ctrl") ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = modifiers.includes("meta") ? e.metaKey : !e.metaKey;
        const shiftMatch = modifiers.includes("shift") ? e.shiftKey : !e.shiftKey;
        const altMatch = modifiers.includes("alt") ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Format shortcut for display
export function formatShortcut(shortcut: ShortcutAction): string {
  const parts: string[] = [];
  const modifiers = shortcut.modifiers || [];

  if (modifiers.includes("ctrl")) parts.push("Ctrl");
  if (modifiers.includes("meta")) parts.push("⌘");
  if (modifiers.includes("shift")) parts.push("⇧");
  if (modifiers.includes("alt")) parts.push("Alt");

  // Format special keys
  const keyDisplay: Record<string, string> = {
    " ": "Space",
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "ArrowLeft": "←",
    "ArrowRight": "→",
    "Enter": "↵",
    "Escape": "Esc",
  };

  parts.push(keyDisplay[shortcut.key] || shortcut.key.toUpperCase());

  return parts.join(" ");
}
