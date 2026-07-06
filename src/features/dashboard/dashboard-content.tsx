"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Package, Users, Truck, ShoppingCart, FileText, TrendingUp, AlertTriangle, ArrowDown, ArrowUp, Warehouse } from "lucide-react";
import { BarChart } from "@/components/bar-chart";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalPurchaseOrders: number;
  totalSalesOrders: number;
  totalInvoices: number;
  lowStock: number;
  totalRevenue: number;
  totalInventoryValue: number;
}

interface ChartData {
  label: string;
  value: number;
}

interface ActivityItem {
  id: string;
  type: "in" | "out" | "adjustment";
  product_name: string;
  qty: number;
  reference: string;
  created_at: string;
}

export default function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0, totalCustomers: 0, totalSuppliers: 0,
    totalPurchaseOrders: 0, totalSalesOrders: 0, totalInvoices: 0,
    lowStock: 0, totalRevenue: 0, totalInventoryValue: 0,
  });
  const [salesChart, setSalesChart] = useState<ChartData[]>([]);
  const [purchaseChart, setPurchaseChart] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [products, customers, suppliers, po, so, invoices, lowStock, revenue, inventoryValue] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("suppliers").select("id", { count: "exact", head: true }),
      supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
      supabase.from("sales_orders").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 5),
      supabase.from("invoices").select("total").eq("status", "paid"),
      supabase.from("products").select("stock, purchase_price"),
    ]);

    const totalRevenue = revenue.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
    const totalInventoryValue = inventoryValue.data?.reduce((sum, p) => sum + (p.stock || 0) * (p.purchase_price || 0), 0) || 0;

    setStats({
      totalProducts: products.count || 0,
      totalCustomers: customers.count || 0,
      totalSuppliers: suppliers.count || 0,
      totalPurchaseOrders: po.count || 0,
      totalSalesOrders: so.count || 0,
      totalInvoices: invoices.count || 0,
      lowStock: lowStock.count || 0,
      totalRevenue,
      totalInventoryValue,
    });

    await Promise.all([fetchSalesChart(), fetchPurchaseChart(), fetchTopProducts(), fetchRecentActivity()]);
    setLoading(false);
  }

  async function fetchSalesChart() {
    const { data } = await supabase.from("invoices").select("date, total").eq("status", "paid");
    const monthly: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    data?.forEach((inv) => {
      const d = new Date(inv.date);
      const key = monthNames[d.getMonth()];
      monthly[key] = (monthly[key] || 0) + (inv.total || 0);
    });
    setSalesChart(Object.entries(monthly).map(([label, value]) => ({ label, value })));
  }

  async function fetchPurchaseChart() {
    const { data } = await supabase.from("purchase_orders").select("date, total");
    const monthly: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    data?.forEach((po) => {
      const d = new Date(po.date);
      const key = monthNames[d.getMonth()];
      monthly[key] = (monthly[key] || 0) + (po.total || 0);
    });
    setPurchaseChart(Object.entries(monthly).map(([label, value]) => ({ label, value })));
  }

  async function fetchTopProducts() {
    const { data } = await supabase.from("invoice_items").select("product_id, qty, product:products(name)");
    const productSales: Record<string, { name: string; qty: number }> = {};
    data?.forEach((item) => {
      const p = item.product as any;
      if (p) {
        if (!productSales[item.product_id]) productSales[item.product_id] = { name: p.name, qty: 0 };
        productSales[item.product_id].qty += item.qty;
      }
    });
    const sorted = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);
    setTopProducts(sorted.map((p) => ({ label: p.name, value: p.qty })));
  }

  async function fetchRecentActivity() {
    const { data } = await supabase
      .from("stock_movements")
      .select("*, product:products(name)")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentActivity(
      (data || []).map((m) => ({
        id: m.id,
        type: m.type,
        product_name: (m.product as any)?.name || "-",
        qty: m.qty,
        reference: m.reference || "",
        created_at: m.created_at,
      }))
    );
  }

  const cards = [
    { title: "Total Barang", value: stats.totalProducts, icon: Package, color: "text-blue-600 bg-blue-100" },
    { title: "Total Pelanggan", value: stats.totalCustomers, icon: Users, color: "text-green-600 bg-green-100" },
    { title: "Total Supplier", value: stats.totalSuppliers, icon: Truck, color: "text-purple-600 bg-purple-100" },
    { title: "Pembelian", value: stats.totalPurchaseOrders, icon: ShoppingCart, color: "text-orange-600 bg-orange-100" },
    { title: "Penjualan", value: stats.totalSalesOrders, icon: FileText, color: "text-cyan-600 bg-cyan-100" },
    { title: "Nilai Persediaan", value: formatCurrency(stats.totalInventoryValue), icon: Warehouse, color: "text-amber-600 bg-amber-100" },
    { title: "Barang Hampir Habis", value: stats.lowStock, icon: AlertTriangle, color: "text-red-600 bg-red-100" },
    { title: "Pendapatan Bulan Ini", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "text-emerald-600 bg-emerald-100" },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={`rounded-lg p-2 ${card.color}`}><Icon className="h-4 w-4" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : (typeof card.value === "number" ? formatNumber(card.value) : card.value)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BarChart data={salesChart} title="Penjualan per Bulan" color="bg-cyan-500" />
          <BarChart data={purchaseChart} title="Pembelian per Bulan" color="bg-orange-500" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BarChart data={topProducts} title="Barang Terlaris" color="bg-emerald-500" />

          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Aktivitas Terbaru</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada aktivitas</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${item.type === "in" ? "bg-green-100 text-green-600" : item.type === "out" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                      {item.type === "in" ? <ArrowDown className="h-3 w-3" /> : item.type === "out" ? <ArrowUp className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.reference}</p>
                    </div>
                    <Badge variant={item.type === "in" ? "default" : "destructive"} className="text-xs">
                      {item.qty > 0 ? "+" : ""}{item.qty}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
