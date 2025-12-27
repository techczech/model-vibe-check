"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Keyboard } from "lucide-react";
import { formatShortcut, type ShortcutAction } from "@/hooks/use-keyboard-shortcuts";

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutAction[];
}

interface KeyboardHelpProps {
  shortcuts?: ShortcutAction[];
  groups?: ShortcutGroup[];
  title?: string;
  modalShortcuts?: ShortcutAction[];  // Shortcuts shown when a modal is open
  isModalOpen?: boolean;              // Whether a modal is currently open
}

// Common shortcuts that are always available
const globalShortcuts: ShortcutAction[] = [
  { key: "?", description: "Toggle keyboard help", action: () => {} },
  { key: "Escape", description: "Close modal / clear focus", action: () => {} },
];

// Default modal shortcuts (evaluation form)
const defaultModalShortcuts: ShortcutAction[] = [
  { key: "j", description: "Next rubric item", action: () => {} },
  { key: "k", description: "Previous rubric item", action: () => {} },
  { key: "y", description: "Yes (binary items)", action: () => {} },
  { key: "n", description: "No (binary items)", action: () => {} },
  { key: "1", description: "Scale value 1", action: () => {} },
  { key: "2", description: "Scale value 2", action: () => {} },
  { key: "3", description: "Scale value 3", action: () => {} },
  { key: "4", description: "Scale value 4", action: () => {} },
  { key: "5", description: "Scale value 5", action: () => {} },
  { key: "Enter", modifiers: ["meta"], description: "Submit evaluation", action: () => {} },
  { key: "Enter", modifiers: ["meta", "shift"], description: "Submit & evaluate next", action: () => {} },
  { key: "Escape", description: "Close modal", action: () => {} },
];

export function KeyboardHelp({ 
  shortcuts = [], 
  groups = [],
  title = "Keyboard Shortcuts",
  modalShortcuts,
  isModalOpen = false,
}: KeyboardHelpProps) {
  const [open, setOpen] = useState(false);

  // Listen for ? key to toggle help
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Build display groups based on context
  const displayGroups: ShortcutGroup[] = [];

  if (isModalOpen) {
    // When modal is open, show modal shortcuts prominently
    const modalShortcutsToShow = modalShortcuts || defaultModalShortcuts;
    displayGroups.push({
      title: "Evaluation Modal",
      shortcuts: modalShortcutsToShow,
    });
  } else {
    // Add passed groups first
    if (groups.length > 0) {
      displayGroups.push(...groups);
    }
    
    // Add individual shortcuts as a group if provided
    if (shortcuts.length > 0) {
      displayGroups.push({
        title: "Page Shortcuts",
        shortcuts: shortcuts,
      });
    }
  }

  // Always add global shortcuts
  displayGroups.push({
    title: "Global",
    shortcuts: globalShortcuts,
  });

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 opacity-50 hover:opacity-100 z-40"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-background rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <h2 className="font-semibold">{title}</h2>
            {isModalOpen && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                Modal Active
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {displayGroups.map((group, gi) => (
              <div key={gi}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  {group.shortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <ShortcutKey shortcut={shortcut} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/30 text-center text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono border">?</kbd> to toggle
        </div>
      </div>
    </div>
  );
}

// Component to render a nicely formatted shortcut key
function ShortcutKey({ shortcut }: { shortcut: ShortcutAction }) {
  const modifiers = shortcut.modifiers || [];
  
  // Format special keys with better symbols
  const keyDisplay: Record<string, string> = {
    " ": "Space",
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "ArrowLeft": "←",
    "ArrowRight": "→",
    "Enter": "↵",
    "Escape": "Esc",
    "Tab": "⇥",
    "Backspace": "⌫",
    "Delete": "⌦",
  };

  const modifierSymbols: Record<string, string> = {
    ctrl: "⌃",
    meta: "⌘",
    shift: "⇧",
    alt: "⌥",
  };

  const parts: string[] = [];
  
  // Add modifiers in standard order
  if (modifiers.includes("ctrl")) parts.push(modifierSymbols.ctrl);
  if (modifiers.includes("alt")) parts.push(modifierSymbols.alt);
  if (modifiers.includes("shift")) parts.push(modifierSymbols.shift);
  if (modifiers.includes("meta")) parts.push(modifierSymbols.meta);
  
  // Add the key
  const displayKey = keyDisplay[shortcut.key] || shortcut.key.toUpperCase();
  parts.push(displayKey);

  // If it's a simple single key, show in one kbd
  if (parts.length === 1) {
    return (
      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono min-w-[1.75rem] text-center border shadow-sm">
        {parts[0]}
      </kbd>
    );
  }

  // For modifier combinations, show each part separately
  return (
    <span className="flex items-center gap-0.5">
      {parts.map((part, i) => (
        <kbd 
          key={i}
          className="px-1.5 py-1 bg-muted rounded text-xs font-mono text-center border shadow-sm"
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}
