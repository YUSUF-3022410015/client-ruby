"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

function Toast({ open, onClose, title, description, variant = "default" }: ToastProps) {
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  const variants = {
    default: "border bg-background text-foreground",
    success: "border-green-200 bg-green-50 text-green-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <div className={cn("rounded-lg border p-4 shadow-lg", variants[variant])}>
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm mt-1">{description}</div>}
      </div>
    </div>
  );
}

export { Toast };
export type { ToastProps };
