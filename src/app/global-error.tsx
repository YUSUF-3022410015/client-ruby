"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
              <p className="text-muted-foreground">
                Aplikasi mengalami error yang tidak terduga. Silakan coba lagi.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => (window.location.href = "/")}>
                <Home className="h-4 w-4 mr-2" />
                Beranda
              </Button>
              <Button onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
