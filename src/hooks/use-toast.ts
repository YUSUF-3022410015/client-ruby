"use client";

import { useCallback, useState, useRef } from "react";

interface ToastState {
  open: boolean;
  title: string;
  description: string;
  variant: "default" | "success" | "error";
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    title: "",
    description: "",
    variant: "default",
  });
  const timerRef = useRef<NodeJS.Timeout>();

  const toastFn = useCallback(
    (options: { title: string; description?: string; variant?: "default" | "success" | "error" }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({
        open: true,
        title: options.title,
        description: options.description || "",
        variant: options.variant || "default",
      });
      timerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }));
      }, 3000);
    },
    []
  );

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  return { toast, toastFn, dismiss };
}
