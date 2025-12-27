"use client";

import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        const Icon = {
          success: CheckCircle,
          error: AlertCircle,
          warning: AlertTriangle,
          default: Info,
        }[toast.type || "default"];

        const colorClasses = {
          success: "bg-green-50 border-green-200 text-green-900",
          error: "bg-red-50 border-red-200 text-red-900",
          warning: "bg-amber-50 border-amber-200 text-amber-900",
          default: "bg-white border-border text-foreground",
        }[toast.type || "default"];

        const iconColorClasses = {
          success: "text-green-600",
          error: "text-red-600",
          warning: "text-amber-600",
          default: "text-blue-600",
        }[toast.type || "default"];

        return (
          <div
            key={toast.id}
            className={cn(
              "rounded-lg border shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300",
              colorClasses
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColorClasses)} />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="font-medium text-sm">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-sm opacity-90 mt-0.5">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
