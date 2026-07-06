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
import { Plus, Trash2, FileText, CheckCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { SalesOrder, Customer, Product } from "@/types";
import { formatCurrency, formatDate, generateNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

interface SOItem { product_id: string; qty: number; price: number; }

export default function SalesOrderPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ customer_id: "", date: new Date().toISOString().split("T")[0], items: [] as SOItem[] });
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [soRes, custRes, prodRes] = await Promise.all([
      supabase.from("sales_orders").select("*, customer:customers(name)").order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
    ]);
    setOrders(soRes.data || []);
    setCustomers(custRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  }

  function openCreateDialog() { setFormData({ customer_id: "", date: new Date().toISOString().split("T")[0], items: [{ product_id: "", qty: 1, price: 0 }] }); setDialogOpen(true); }
  function addItem() { setFormData({ ...formData, items: [...formData.items, { product_id: "", qty: 1, price: 0 }] }); }
  function removeItem(i: number) { setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i) }); }
  function updateItem(i: number, field: keyof SOItem, value: any) {
    const items = [...formData.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "product_id") { const p = products.find((p) => p.id === value); if (p) items[i].price = p.selling_price; }
    setFormData({ ...formData, items });
  }

  async function handleSave() {
    if (!formData.customer_id || formData.items.length === 0) return;
    const validItems = formData.items.filter((i) => i.product_id && i.qty > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      const number = generateNumber("SO", Date.now());
      const { data: so } = await supabase.from("sales_orders").insert({ number, customer_id: formData.customer_id, date: formData.date, status: "draft" }).select().single();
      if (so) { await supabase.from("sales_order_items").insert(validItems.map((item) => ({ sales_order_id: so.id, product_id: item.product_id, qty: item.qty, price: item.price }))); }
      toastFn({ title: "Berhasil", description: "Sales Order berhasil dibuat", variant: "success" });
      setDialogOpen(false);
    } catch { toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" }); }
    setSaving(false);
    fetchData();
  }

  async function confirmOrder(id: string) {
    try { await supabase.from("sales_orders").update({ status: "confirmed" }).eq("id", id); toastFn({ title: "Berhasil", description: "SO dikonfirmasi", variant: "success" }); }
    catch { toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" }); }
    fetchData();
  }

  async function createInvoice(order: SalesOrder) {
    try {
      const { data: items } = await supabase.from("sales_order_items").select("*, product:products(name)").eq("sales_order_id", order.id);
      if (!items || items.length === 0) return;
      const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
      const tax = subtotal * 0.11;
      const number = generateNumber("INV", Date.now());
      const { data: invoice } = await supabase.from("invoices").insert({ number, sales_order_id: order.id, customer_id: order.customer_id, subtotal, discount: 0, tax, total: subtotal + tax, status: "draft" }).select().single();
      if (invoice) { await supabase.from("invoice_items").insert(items.map((item) => ({ invoice_id: invoice.id, product_id: item.product_id, qty: item.qty, price: item.price }))); await supabase.from("sales_orders").update({ status: "invoiced" }).eq("id", order.id); }
      toastFn({ title: "Berhasil", description: "Invoice berhasil dibuat", variant: "success" });
    } catch { toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" }); }
    fetchData();
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "outline" }, confirmed: { label: "Dikonfirmasi", variant: "secondary" },
    invoiced: { label: "Di-Invoice", variant: "default" }, completed: { label: "Selesai", variant: "default" },
  };

  const columns: ColumnDef<SalesOrder, any>[] = [
    { accessorKey: "number", header: "Nomor SO" },
    { accessorKey: "customer_id", header: "Pelanggan", cell: ({ row }) => customers.find((c) => c.id === row.original.customer_id)?.name || "-" },
    { accessorKey: "date", header: "Tanggal", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => { const s = statusMap[row.original.status] || { label: row.original.status, variant: "outline" as const }; return <Badge variant={s.variant}>{s.label}</Badge>; } },
    { id: "actions", header: "Aksi", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.status === "draft" && <Button variant="ghost" size="sm" onClick={() => confirmOrder(row.original.id)}><CheckCircle className="h-4 w-4 text-green-600" /></Button>}
        {row.original.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => createInvoice(row.original)}><FileText className="h-4 w-4 text-blue-600" /></Button>}
      </div>
    )},
  ];

  return (
    <div>
      <Toast open={toast.open} title={toast.title} description={toast.description} variant={toast.variant} onClose={dismiss} />
      <Header title="Sales Order"><Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Buat SO</Button></Header>
      <div className="p-6">{loading ? <Loading /> : <DataTable columns={columns} data={orders} searchKey="number" searchPlaceholder="Cari nomor SO..." />}</div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Buat Sales Order" onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Pelanggan *</Label>
            <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Pilih pelanggan</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
