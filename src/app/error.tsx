"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Gagal Memuat Halaman</h2>
              <p className="text-sm text-muted-foreground">
                Terjadi kesalahan saat memuat konten. Coba muat ulang halaman.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {error.digest}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/dashboard")}>
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button size="sm" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
