import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileQuestion className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Halaman Tidak Ditemukan</h2>
              <p className="text-sm text-muted-foreground">
                Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
