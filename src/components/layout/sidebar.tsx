"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  Truck,
  Warehouse,
  ShoppingCart,
  FileText,
  CreditCard,
  BarChart3,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { useTheme } from "@/lib/theme-context";

const allMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "owner", "gudang", "sales"] },
  { href: "/products", label: "Barang", icon: Package, roles: ["admin", "owner", "gudang", "sales"] },
  { href: "/categories", label: "Kategori", icon: Tags, roles: ["admin", "owner", "sales"] },
  { href: "/customers", label: "Pelanggan", icon: Users, roles: ["admin", "owner", "sales"] },
  { href: "/suppliers", label: "Supplier", icon: Truck, roles: ["admin", "owner", "sales"] },
  { href: "/stock", label: "Persediaan", icon: Warehouse, roles: ["admin", "owner", "gudang"] },
  { href: "/purchases", label: "Pembelian", icon: ShoppingCart, roles: ["admin", "owner"] },
  { href: "/sales", label: "Sales Order", icon: FileText, roles: ["admin", "owner", "sales"] },
  { href: "/sales/invoices", label: "Invoice", icon: FileText, roles: ["admin", "owner", "sales"] },
  { href: "/payments", label: "Pembayaran", icon: CreditCard, roles: ["admin", "owner", "sales"] },
  { href: "/reports", label: "Laporan", icon: BarChart3, roles: ["admin", "owner"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useRole();
  const { theme, toggleTheme } = useTheme();

  const menuItems = allMenuItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            CR
          </div>
          <span className="font-semibold text-lg">Client Ruby</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 space-y-1">
        {user && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{user.name || user.email}</div>
            <div className="capitalize">{user.role}</div>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
