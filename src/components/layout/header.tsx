"use client";

import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <div className="flex items-center justify-between border-b bg-card px-6 py-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
