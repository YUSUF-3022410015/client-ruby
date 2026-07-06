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
import { Plus, Trash2, CheckCircle, Package } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { PurchaseOrder, Supplier, Product } from "@/types";
import { formatCurrency, formatDate, generateNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

interface POItem { product_id: string; qty: number; price: number; }

export default function PurchasePage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ supplier_id: "", date: new Date().toISOString().split("T")[0], items: [] as POItem[] });
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [poRes, suppRes, prodRes] = await Promise.all([
      supabase.from("purchase_orders").select("*, supplier:suppliers(name)").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
    ]);
    setOrders(poRes.data || []);
    setSuppliers(suppRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  }

  function openCreateDialog() { setFormData({ supplier_id: "", date: new Date().toISOString().split("T")[0], items: [{ product_id: "", qty: 1, price: 0 }] }); setDialogOpen(true); }
  function addItem() { setFormData({ ...formData, items: [...formData.items, { product_id: "", qty: 1, price: 0 }] }); }
  function removeItem(i: number) { setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i) }); }
  function updateItem(i: number, field: keyof POItem, value: any) {
    const items = [...formData.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "product_id") { const p = products.find((p) => p.id === value); if (p) items[i].price = p.purchase_price; }
    setFormData({ ...formData, items });
  }

  async function handleSave() {
    if (!formData.supplier_id || formData.items.length === 0) return;
    const validItems = formData.items.filter((i) => i.product_id && i.qty > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      const number = generateNumber("PO", Date.now());
      const total = validItems.reduce((sum, i) => sum + i.qty * i.price, 0);
      const { data: po } = await supabase.from("purchase_orders").insert({ number, supplier_id: formData.supplier_id, date: formData.date, total, status: "draft" }).select().single();
      if (po) { await supabase.from("purchase_order_items").insert(validItems.map((item) => ({ purchase_order_id: po.id, product_id: item.product_id, qty: item.qty, price: item.price }))); }
      toastFn({ title: "Berhasil", description: "Purchase Order berhasil dibuat", variant: "success" });
      setDialogOpen(false);
    } catch { toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" }); }
    setSaving(false);
    fetchData();
  }

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    try {
      if (status === "received") {
        const { data: items } = await supabase.from("purchase_order_items").select("product_id, qty").eq("purchase_order_id", id);
        if (items) {
          for (const item of items) {
            const { data: product } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
            if (product) {
              await supabase.from("products").update({ stock: product.stock + item.qty, updated_at: new Date().toISOString() }).eq("id", item.product_id);
              await supabase.from("stock_movements").insert({ product_id: item.product_id, type: "in", qty: item.qty, reference: `PO ${id.slice(0, 8)}`, notes: "Pembelian diterima" });
            }
          }
        }
      }
      await supabase.from("purchase_orders").update({ status }).eq("id", id);
      toastFn({ title: "Berhasil", description: "Status PO diperbarui", variant: "success" });
    } catch { toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" }); }
    setSaving(false);
    fetchData();
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "outline" }, approved: { label: "Disetujui", variant: "secondary" },
    received: { label: "Diterima", variant: "default" }, completed: { label: "Selesai", variant: "default" },
  };

  const columns: ColumnDef<PurchaseOrder, any>[] = [
    { accessorKey: "number", header: "Nomor PO" },
    { accessorKey: "supplier_id", header: "Supplier", cell: ({ row }) => suppliers.find((s) => s.id === row.original.supplier_id)?.name || "-" },
    { accessorKey: "date", header: "Tanggal", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrency(row.original.total) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => { const s = statusMap[row.original.status] || { label: row.original.status, variant: "outline" as const }; return <Badge variant={s.variant}>{s.label}</Badge>; } },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.status === "draft" && <Button variant="ghost" size="sm" onClick={() => updateStatus(row.original.id, "approved")}><CheckCircle className="h-4 w-4 text-blue-600" /></Button>}
        {row.original.status === "approved" && <Button variant="ghost" size="sm" onClick={() => updateStatus(row.original.id, "received")}><Package className="h-4 w-4 text-green-600" /></Button>}
        {row.original.status === "received" && <Button variant="ghost" size="sm" onClick={() => updateStatus(row.original.id, "completed")}><CheckCircle className="h-4 w-4 text-green-600" /></Button>}
      </div>
    )},
  ];

  return (
    <div>
      <Toast open={toast.open} title={toast.title} description={toast.description} variant={toast.variant} onClose={dismiss} />
      <Header title="Pembelian"><Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Buat PO</Button></Header>
      <div className="p-6">{loading ? <Loading /> : <DataTable columns={columns} data={orders} searchKey="number" searchPlaceholder="Cari nomor PO..." />}</div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Buat Purchase Order" onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Supplier *</Label>
            <select value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Pilih supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label>Tanggal *</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Item</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Tambah</Button></div>
          {formData.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
              <select value={item.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Pilih barang</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input type="number" min="1" value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} placeholder="Qty" />
              <Input type="number" value={item.price} onChange={(e) => updateItem(idx, "price", Number(e.target.value))} placeholder="Harga" />
              {formData.items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          ))}
        </div>
        <div className="text-right text-sm font-medium">Total: {formatCurrency(formData.items.reduce((sum, i) => sum + i.qty * i.price, 0))}</div>
      </FormDialog>
    </div>
  );
}
