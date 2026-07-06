"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Product, StockMovement } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"in" | "out" | "adjustment">("in");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ product_id: "", qty: 0, notes: "", adjustment_type: "add" as "add" | "subtract" });
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [productsRes, movementsRes] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("stock_movements").select("*, product:products(name, code)").order("created_at", { ascending: false }).limit(100),
    ]);
    setProducts(productsRes.data || []);
    setMovements(movementsRes.data || []);
    setLoading(false);
  }

  function openStockDialog(type: "in" | "out" | "adjustment") {
    setDialogType(type);
    setFormData({ product_id: "", qty: 0, notes: "", adjustment_type: "add" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.product_id || formData.qty <= 0) return;
    setSaving(true);
    const product = products.find((p) => p.id === formData.product_id);
    if (!product) { setSaving(false); return; }

    let newStock = product.stock;
    let movementType: "in" | "out" | "adjustment" = dialogType;
    let movementQty = formData.qty;

    if (dialogType === "in") {
      newStock += formData.qty;
    } else if (dialogType === "out") {
      if (formData.qty > product.stock) { toastFn({ title: "Gagal", description: "Stok tidak mencukupi", variant: "error" }); setSaving(false); return; }
      newStock -= formData.qty;
      movementQty = -formData.qty;
    } else {
      if (formData.adjustment_type === "add") { newStock += formData.qty; }
      else {
        if (formData.qty > product.stock) { toastFn({ title: "Gagal", description: "Stok tidak mencukupi", variant: "error" }); setSaving(false); return; }
        newStock -= formData.qty;
        movementQty = -formData.qty;
      }
    }

    try {
      await Promise.all([
        supabase.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", product.id),
        supabase.from("stock_movements").insert({ product_id: product.id, type: movementType, qty: movementQty, reference: dialogType === "in" ? "Barang Masuk" : dialogType === "out" ? "Barang Keluar" : "Penyesuaian", notes: formData.notes || null }),
      ]);
      toastFn({ title: "Berhasil", description: `Stok ${product.name} berhasil diperbarui`, variant: "success" });
      setDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchData();
  }

  const productColumns: ColumnDef<Product, any>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "name", header: "Nama Barang" },
    { accessorKey: "stock", header: "Stok", cell: ({ row }) => <Badge variant={row.original.stock <= 5 ? "destructive" : "secondary"}>{formatNumber(row.original.stock)} {row.original.unit}</Badge> },
    { accessorKey: "warehouse", header: "Lokasi", cell: ({ row }) => row.original.warehouse || "-" },
  ];

  const movementColumns: ColumnDef<StockMovement, any>[] = [
    { accessorKey: "created_at", header: "Tanggal", cell: ({ row }) => formatDate(row.original.created_at) },
    { accessorKey: "product", header: "Barang", cell: ({ row }) => { const p = row.original.product as any; return p ? `${p.code} - ${p.name}` : "-"; } },
    { accessorKey: "type", header: "Tipe", cell: ({ row }) => <Badge variant={row.original.type === "in" ? "default" : row.original.type === "out" ? "destructive" : "secondary"}>{row.original.type === "in" ? "Masuk" : row.original.type === "out" ? "Keluar" : "Penyesuaian"}</Badge> },
    { accessorKey: "qty", header: "Qty", cell: ({ row }) => <span className={row.original.qty > 0 ? "text-green-600" : "text-red-600"}>{row.original.qty > 0 ? "+" : ""}{formatNumber(row.original.qty)}</span> },
    { accessorKey: "reference", header: "Referensi", cell: ({ row }) => row.original.reference || "-" },
  ];

  return (
    <div>
      <Toast open={toast.open} title={toast.title} description={toast.description} variant={toast.variant} onClose={dismiss} />
      <Header title="Persediaan" />
      <div className="p-6">
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Stok Barang</TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="mt-4">
            <div className="flex gap-2 mb-4">
              <Button size="sm" onClick={() => openStockDialog("in")}><Plus className="h-4 w-4 mr-2" /> Barang Masuk</Button>
              <Button size="sm" variant="destructive" onClick={() => openStockDialog("out")}><Minus className="h-4 w-4 mr-2" /> Barang Keluar</Button>
              <Button size="sm" variant="outline" onClick={() => openStockDialog("adjustment")}><ArrowUpDown className="h-4 w-4 mr-2" /> Penyesuaian</Button>
            </div>
            {loading ? <Loading /> : <DataTable columns={productColumns} data={products} searchKey="name" searchPlaceholder="Cari barang..." />}
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            {loading ? <Loading /> : <DataTable columns={movementColumns} data={movements} searchKey="reference" searchPlaceholder="Cari riwayat..." />}
          </TabsContent>
        </Tabs>
      </div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={dialogType === "in" ? "Barang Masuk" : dialogType === "out" ? "Barang Keluar" : "Penyesuaian Stok"} onSubmit={handleSave} loading={saving}>
        <div className="space-y-2">
          <Label>Barang *</Label>
          <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Pilih barang</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name} (Stok: {formatNumber(p.stock)})</option>)}
          </select>
        </div>
        {dialogType === "adjustment" && (
          <div className="space-y-2">
            <Label>Tipe Penyesuaian</Label>
            <div className="flex gap-2">
              <Button type="button" variant={formData.adjustment_type === "add" ? "default" : "outline"} size="sm" onClick={() => setFormData({ ...formData, adjustment_type: "add" })}>Tambah Stok</Button>
              <Button type="button" variant={formData.adjustment_type === "subtract" ? "destructive" : "outline"} size="sm" onClick={() => setFormData({ ...formData, adjustment_type: "subtract" })}>Kurang Stok</Button>
            </div>
          </div>
        )}
        <div className="space-y-2"><Label htmlFor="qty">Jumlah *</Label><Input id="qty" type="number" min="1" value={formData.qty || ""} onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })} placeholder="0" /></div>
        <div className="space-y-2"><Label htmlFor="notes">Catatan</Label><Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Catatan (opsional)" /></div>
      </FormDialog>
    </div>
  );
}
