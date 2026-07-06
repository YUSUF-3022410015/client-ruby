import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
  fullPage?: boolean;
}

export function Loading({ text = "Memuat data...", fullPage }: LoadingProps) {
  if (fullPage) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}
