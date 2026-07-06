"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Product, Category } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";
import { useRole } from "@/lib/role-context";

const emptyProduct = { code: "", name: "", category_id: "", unit: "pcs", purchase_price: 0, selling_price: 0, stock: 0, warehouse: "" };

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyProduct);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();
  const { hasRole } = useRole();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("*, category:categories(name)").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts(productsRes.data || []);
    setCategories(categoriesRes.data || []);
    setLoading(false);
  }

  function openCreateDialog() { setEditingProduct(null); setFormData(emptyProduct); setDialogOpen(true); }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormData({ code: product.code, name: product.name, category_id: product.category_id || "", unit: product.unit, purchase_price: product.purchase_price, selling_price: product.selling_price, stock: product.stock, warehouse: product.warehouse || "" });
    setDialogOpen(true);
  }

  function openDeleteDialog(product: Product) { setDeletingProduct(product); setDeleteDialogOpen(true); }

  async function handleSave() {
    if (!formData.name.trim() || !formData.code.trim()) return;
    setSaving(true);
    try {
      const payload = { code: formData.code, name: formData.name, category_id: formData.category_id || null, unit: formData.unit, purchase_price: formData.purchase_price, selling_price: formData.selling_price, stock: formData.stock, warehouse: formData.warehouse };
      if (editingProduct) {
        await supabase.from("products").update(payload).eq("id", editingProduct.id);
        toastFn({ title: "Berhasil", description: "Barang berhasil diperbarui", variant: "success" });
      } else {
        await supabase.from("products").insert(payload);
        toastFn({ title: "Berhasil", description: "Barang berhasil ditambahkan", variant: "success" });
      }
      setDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchData();
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    setSaving(true);
    try {
      await supabase.from("products").delete().eq("id", deletingProduct.id);
      toastFn({ title: "Berhasil", description: "Barang berhasil dihapus", variant: "success" });
      setDeleteDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchData();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toastFn({ title: "Gagal", description: "File CSV kosong atau tidak valid", variant: "error" });
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const data = lines.slice(1).map((line) => {
        const values = line.split(",");
        const row: any = {};
        headers.forEach((h, i) => { row[h] = values[i]?.trim() || ""; });
        return row;
      });
      setImportData(data);
      setImportDialogOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImport() {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const row of importData) {
      const code = row.code || row.kode || "";
      const name = row.name || row.nama || "";
      if (!code || !name) { errorCount++; continue; }
      const { error } = await supabase.from("products").insert({
        code,
        name,
        category_id: null,
        unit: row.unit || row.satuan || "pcs",
        purchase_price: Number(row.purchase_price || row.harga_beli || 0),
        selling_price: Number(row.selling_price || row.harga_jual || 0),
        stock: Number(row.stock || row.stok || 0),
        warehouse: row.warehouse || row.gudang || "",
      });
      if (error) errorCount++; else successCount++;
    }
    toastFn({ title: "Import Selesai", description: `${successCount} berhasil, ${errorCount} gagal`, variant: successCount > 0 ? "success" : "error" });
    setImportDialogOpen(false);
    setImportData([]);
    setImporting(false);
    fetchData();
  }

  function exportCSV() {
    const headers = ["code", "name", "unit", "purchase_price", "selling_price", "stock", "warehouse"];
    const rows = products.map((p) => headers.map((h) => (p as any)[h] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data-barang.csv";
    link.click();
  }

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "-";

  const columns: ColumnDef<Product, any>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "name", header: "Nama Barang" },
    { accessorKey: "category_id", header: "Kategori", cell: ({ row }) => getCategoryName(row.original.category_id) },
    { accessorKey: "unit", header: "Satuan" },
    { accessorKey: "purchase_price", header: "Harga Beli", cell: ({ row }) => formatCurrency(row.original.purchase_price) },
    { accessorKey: "selling_price", header: "Harga Jual", cell: ({ row }) => formatCurrency(row.original.selling_price) },
    { accessorKey: "stock", header: "Stok", cell: ({ row }) => <Badge variant={row.original.stock <= 5 ? "destructive" : "secondary"}>{formatNumber(row.original.stock)}</Badge> },
    { accessorKey: "warehouse", header: "Lokasi", cell: ({ row }) => row.original.warehouse || "-" },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => openEditDialog(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(row.original)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <Toast open={toast.open} title={toast.title} description={toast.description} variant={toast.variant} onClose={dismiss} />
      <Header title="Barang">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Import CSV</Button>
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          {hasRole("admin", "owner", "sales") && <Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Tambah Barang</Button>}
        </div>
      </Header>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      <div className="p-6">
        {loading ? <Loading /> : <DataTable columns={columns} data={products} searchKey="name" searchPlaceholder="Cari barang..." />}
      </div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingProduct ? "Edit Barang" : "Tambah Barang"} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="code">Kode Barang *</Label><Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="BRG-001" /></div>
          <div className="space-y-2"><Label htmlFor="name">Nama Barang *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama barang" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="category">Kategori</Label>
            <select id="category" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Pilih kategori</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label htmlFor="unit">Satuan</Label><Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="pcs, kg, box" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="purchase_price">Harga Beli</Label><Input id="purchase_price" type="number" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label htmlFor="selling_price">Harga Jual</Label><Input id="selling_price" type="number" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="stock">Stok</Label><Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label htmlFor="warehouse">Lokasi Gudang</Label><Input id="warehouse" value={formData.warehouse} onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })} placeholder="Gudang A" /></div>
        </div>
      </FormDialog>
      <DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Hapus Barang" description={`Hapus "${deletingProduct?.name}"?`} onConfirm={handleDelete} loading={saving} />
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import CSV ({importData.length} data)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Format CSV: code, name, unit, purchase_price, selling_price, stock, warehouse</p>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 text-sm">
              {importData.slice(0, 10).map((row, i) => (
                <div key={i} className="py-1 border-b last:border-0">{row.code || row.kode || "-"} - {row.name || row.nama || "-"}</div>
              ))}
              {importData.length > 10 && <div className="py-1 text-muted-foreground">...dan {importData.length - 10} lagi</div>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Batal</Button>
              <Button onClick={handleImport} disabled={importing}>{importing ? "Mengimport..." : "Import"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
