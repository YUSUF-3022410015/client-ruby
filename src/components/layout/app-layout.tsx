"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { RoleProvider } from "@/lib/role-context";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RoleProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          {children}
        </main>
      </div>
    </RoleProvider>
  );
}
