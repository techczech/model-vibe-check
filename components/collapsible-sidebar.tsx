"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  FileText,
  Cpu,
  Play,
  Settings,
  Zap,
  ClipboardCheck,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Vibe Check", href: "/vibe-check", icon: Sparkles },
  { name: "Prompts", href: "/prompts", icon: FileText },
  // Sequences removed - now part of Prompts (multi-step prompts)
  { name: "Models", href: "/models", icon: Cpu },
  { name: "Runs", href: "/runs", icon: Play },
  { name: "Evaluations", href: "/evaluations", icon: ClipboardCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

const STORAGE_KEY = "sidebar-collapsed";

// Detect if user is on Mac for keyboard shortcut display
function useIsMac() {
  const [isMac, setIsMac] = useState(true); // Default to Mac symbol
  
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);
  
  return isMac;
}

export function CollapsibleSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMac = useIsMac();
  const shortcutKey = isMac ? "⌘" : "Ctrl+";

  // Load preference from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  // Save preference to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    }
  }, [collapsed, mounted]);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check if a nav item is active
  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "border-r bg-card flex flex-col transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "p-4 border-b flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary shrink-0" />
            {!collapsed && (
              <span className="font-semibold text-lg whitespace-nowrap">
                Model Vibe Check
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              
              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <li key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.name}>{linkContent}</li>;
            })}
          </ul>
        </nav>

        {/* Footer with collapse toggle */}
        <div className={cn(
          "p-2 border-t",
          collapsed ? "flex justify-center" : ""
        )}>
          {/* Collapse toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  !collapsed && "w-full justify-start"
                )}
              >
                {collapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <>
                    <PanelLeftClose className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Collapse</span>
                    <kbd className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                      {shortcutKey}B
                    </kbd>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={10}>
                <span>Expand sidebar</span>
                <kbd className="ml-2 text-[10px] font-mono bg-primary-foreground/20 px-1 py-0.5 rounded">
                  {shortcutKey}B
                </kbd>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Tagline - only when expanded */}
          {!collapsed && (
            <p className="text-xs text-muted-foreground mt-2 px-2">
              Your prompts, your models, your vibes.
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
