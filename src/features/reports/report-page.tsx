"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface SalesReport {
  number: string;
  date: string;
  customer: string;
  total: number;
  status: string;
}

interface PurchaseReport {
  number: string;
  date: string;
  supplier: string;
  total: number;
  status: string;
}

interface StockReport {
  code: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  warehouse: string;
}

export default function ReportPage() {
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [purchaseData, setPurchaseData] = useState<PurchaseReport[]>([]);
  const [stockData, setStockData] = useState<StockReport[]>([]);
  const [, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const supabase = createClient();

  useEffect(() => { fetchData(); }, [filter, monthFilter]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchSales(), fetchPurchases(), fetchStock()]);
    setLoading(false);
  }

  function getDateRange(): { start: string; end: string } {
    const now = new Date();
    if (filter === "daily") {
      const today = now.toISOString().split("T")[0];
      return { start: today, end: today };
    }
    if (filter === "monthly") {
      const [year, month] = monthFilter.split("-").map(Number);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      return { start, end };
    }
    return { start: "2000-01-01", end: "2099-12-31" };
  }

  async function fetchSales() {
    const { start, end } = getDateRange();
    const { data } = await supabase
      .from("invoices")
      .select("number, date, total, status, customer:customers(name)")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });
    setSalesData(
      (data || []).map((d) => ({
        number: d.number,
        date: d.date,
        customer: (d.customer as any)?.name || "-",
        total: d.total || 0,
        status: d.status,
      }))
    );
  }

  async function fetchPurchases() {
    const { start, end } = getDateRange();
    const { data } = await supabase
      .from("purchase_orders")
      .select("number, date, total, status, supplier:suppliers(name)")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });
    setPurchaseData(
      (data || []).map((d) => ({
        number: d.number,
        date: d.date,
        supplier: (d.supplier as any)?.name || "-",
        total: d.total || 0,
        status: d.status,
      }))
    );
  }

  async function fetchStock() {
    const { data } = await supabase
      .from("products")
      .select("code, name, stock, unit, warehouse, category:categories(name)")
      .order("name");
    setStockData(
      (data || []).map((d) => ({
        code: d.code,
        name: d.name,
        category: (d.category as any)?.name || "-",
        stock: d.stock || 0,
        unit: d.unit,
        warehouse: d.warehouse || "-",
      }))
    );
  }

  function exportCSV(headers: string[], rows: any[][], filename: string) {
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  }

  function exportSalesCSV() {
    exportCSV(
      ["Nomor", "Tanggal", "Pelanggan", "Total", "Status"],
      salesData.map((d) => [d.number, d.date, d.customer, d.total, d.status]),
      `laporan-penjualan-${monthFilter}`
    );
  }

  function exportPurchaseCSV() {
    exportCSV(
      ["Nomor", "Tanggal", "Supplier", "Total", "Status"],
      purchaseData.map((d) => [d.number, d.date, d.supplier, d.total, d.status]),
      `laporan-pembelian-${monthFilter}`
    );
  }

  function exportStockCSV() {
    exportCSV(
      ["Kode", "Nama", "Kategori", "Stok", "Satuan", "Lokasi"],
      stockData.map((d) => [d.code, d.name, d.category, d.stock, d.unit, d.warehouse]),
      `laporan-persediaan`
    );
  }

  const totalSales = salesData.reduce((s, d) => s + d.total, 0);
  const totalPurchases = purchaseData.reduce((s, d) => s + d.total, 0);
  const lowStockCount = stockData.filter((d) => d.stock <= 5).length;

  function printPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const filterLabel = filter === "daily" ? "Harian" : filter === "monthly" ? `Bulanan (${monthFilter})` : "Semua";
    printWindow.document.write(`
      <html><head><title>Laporan CRM</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        h2 { font-size: 14px; margin: 15px 0 8px; color: #555; }
        .meta { font-size: 12px; color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .summary div { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>CRM Manajemen Barang - Laporan</h1>
      <div class="meta">Filter: ${filterLabel} | Cetak: ${new Date().toLocaleDateString("id-ID")}</div>
      <div class="summary">
        <div><strong>Total Penjualan:</strong> ${formatCurrency(totalSales)}</div>
        <div><strong>Total Pembelian:</strong> ${formatCurrency(totalPurchases)}</div>
        <div><strong>Stok Rendah:</strong> ${lowStockCount} barang</div>
      </div>
      <h2>Laporan Penjualan</h2>
      <table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Pelanggan</th><th class="text-right">Total</th><th>Status</th></tr></thead><tbody>
      ${salesData.map((d) => `<tr><td>${d.number}</td><td>${d.date}</td><td>${d.customer}</td><td class="text-right">${formatCurrency(d.total)}</td><td>${d.status}</td></tr>`).join("")}
      ${salesData.length === 0 ? '<tr><td colspan="5" style="text-align:center">Tidak ada data</td></tr>' : ""}
      </tbody></table>
      <h2>Laporan Pembelian</h2>
      <table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Supplier</th><th class="text-right">Total</th><th>Status</th></tr></thead><tbody>
      ${purchaseData.map((d) => `<tr><td>${d.number}</td><td>${d.date}</td><td>${d.supplier}</td><td class="text-right">${formatCurrency(d.total)}</td><td>${d.status}</td></tr>`).join("")}
      ${purchaseData.length === 0 ? '<tr><td colspan="5" style="text-align:center">Tidak ada data</td></tr>' : ""}
      </tbody></table>
      <h2>Laporan Persediaan</h2>
      <table><thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th class="text-right">Stok</th><th>Satuan</th><th>Lokasi</th></tr></thead><tbody>
      ${stockData.map((d) => `<tr><td>${d.code}</td><td>${d.name}</td><td>${d.category}</td><td class="text-right">${d.stock}</td><td>${d.unit}</td><td>${d.warehouse}</td></tr>`).join("")}
      ${stockData.length === 0 ? '<tr><td colspan="6" style="text-align:center">Tidak ada data</td></tr>' : ""}
      </tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div>
      <Header title="Laporan">
        <Button variant="outline" size="sm" onClick={printPDF}><FileText className="h-4 w-4 mr-2" /> Export PDF</Button>
      </Header>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Semua</option>
            <option value="daily">Harian</option>
            <option value="monthly">Bulanan</option>
          </select>
          {filter === "monthly" && (
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Penjualan</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{formatCurrency(totalSales)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Pembelian</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{formatCurrency(totalPurchases)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Barang Stok Rendah</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{formatNumber(lowStockCount)} barang</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">Penjualan</TabsTrigger>
            <TabsTrigger value="purchases">Pembelian</TabsTrigger>
            <TabsTrigger value="stock">Persediaan</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Laporan Penjualan</h3>
              <Button variant="outline" size="sm" onClick={exportSalesCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Nomor</th>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-left p-3">Pelanggan</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Tidak ada data</td></tr>
                  ) : salesData.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-3">{d.number}</td>
                      <td className="p-3">{formatDate(d.date)}</td>
                      <td className="p-3">{d.customer}</td>
                      <td className="p-3 text-right">{formatCurrency(d.total)}</td>
                      <td className="p-3"><Badge variant={d.status === "paid" ? "default" : "outline"}>{d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="purchases" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Laporan Pembelian</h3>
              <Button variant="outline" size="sm" onClick={exportPurchaseCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Nomor</th>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-left p-3">Supplier</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseData.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Tidak ada data</td></tr>
                  ) : purchaseData.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-3">{d.number}</td>
                      <td className="p-3">{formatDate(d.date)}</td>
                      <td className="p-3">{d.supplier}</td>
                      <td className="p-3 text-right">{formatCurrency(d.total)}</td>
                      <td className="p-3"><Badge variant="outline">{d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Laporan Persediaan</h3>
              <Button variant="outline" size="sm" onClick={exportStockCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Kode</th>
                    <th className="text-left p-3">Nama</th>
                    <th className="text-left p-3">Kategori</th>
                    <th className="text-right p-3">Stok</th>
                    <th className="text-left p-3">Satuan</th>
                    <th className="text-left p-3">Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Tidak ada data</td></tr>
                  ) : stockData.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-3">{d.code}</td>
                      <td className="p-3">{d.name}</td>
                      <td className="p-3">{d.category}</td>
                      <td className="p-3 text-right">
                        <Badge variant={d.stock <= 5 ? "destructive" : "secondary"}>{formatNumber(d.stock)}</Badge>
                      </td>
                      <td className="p-3">{d.unit}</td>
                      <td className="p-3">{d.warehouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
