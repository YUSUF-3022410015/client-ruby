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
import { Plus, CreditCard } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Payment, Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

export default function PaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ invoice_id: "", amount: 0, payment_method: "cash", notes: "" });
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [payRes, invRes] = await Promise.all([
      supabase.from("payments").select("*, invoice:invoices(number, total, status)").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").in("status", ["draft", "partial"]).order("created_at", { ascending: false }),
    ]);
    setPayments(payRes.data || []);
    setInvoices(invRes.data || []);
    setLoading(false);
  }

  function openCreateDialog() {
    setFormData({ invoice_id: "", amount: 0, payment_method: "cash", notes: "" });
    setDialogOpen(true);
  }

  function handleSelectInvoice(invoiceId: string) {
    const inv = invoices.find((i) => i.id === invoiceId);
    setFormData({ ...formData, invoice_id: invoiceId, amount: inv?.total || 0 });
  }

  async function handleSave() {
    if (!formData.invoice_id || formData.amount <= 0) return;
    setSaving(true);

    try {
      const invoice = invoices.find((i) => i.id === formData.invoice_id);
      if (!invoice) { setSaving(false); return; }

      await supabase.from("payments").insert({
        invoice_id: formData.invoice_id,
        amount: formData.amount,
        payment_method: formData.payment_method,
        notes: formData.notes || null,
      });

      const { data: allPayments } = await supabase.from("payments").select("amount").eq("invoice_id", formData.invoice_id);
      const totalPaid = (allPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

      let newStatus = "draft";
      if (totalPaid >= invoice.total) newStatus = "paid";
      else if (totalPaid > 0) newStatus = "partial";

      await supabase.from("invoices").update({ status: newStatus }).eq("id", formData.invoice_id);

      if (newStatus === "paid") {
        const { data: items } = await supabase.from("invoice_items").select("product_id, qty").eq("invoice_id", formData.invoice_id);
        if (items) {
          for (const item of items) {
            const { data: product } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
            if (product) {
              await supabase.from("products").update({ stock: product.stock - item.qty, updated_at: new Date().toISOString() }).eq("id", item.product_id);
              await supabase.from("stock_movements").insert({
                product_id: item.product_id,
                type: "out",
                qty: -item.qty,
                reference: `Invoice ${invoice.number}`,
                notes: "Pembayaran lunas",
              });
            }
          }
        }
      }

      toastFn({ title: "Berhasil", description: "Pembayaran berhasil dicatat", variant: "success" });
      setDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchData();
  }

  function getInvoiceNumber(id: string) {
    return invoices.find((i) => i.id === id)?.number || payments.find((p) => p.invoice_id === id)?.invoice ? (payments.find((p) => p.invoice_id === id)?.invoice as any)?.number : "-";
  }

  const methodLabels: Record<string, string> = {
    cash: "Tunai",
    transfer: "Transfer",
    credit_card: "Kartu Kredit",
  };

  const columns: ColumnDef<Payment, any>[] = [
    {
      accessorKey: "invoice",
      header: "Invoice",
      cell: ({ row }) => (row.original.invoice as any)?.number || "-",
    },
    {
      accessorKey: "amount",
      header: "Nominal",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "payment_method",
      header: "Metode",
      cell: ({ row }) => <Badge variant="outline">{methodLabels[row.original.payment_method] || row.original.payment_method}</Badge>,
    },
    {
      accessorKey: "date",
      header: "Tanggal",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "notes",
      header: "Catatan",
      cell: ({ row }) => row.original.notes || "-",
    },
  ];

  return (
    <div>
      <Toast open={toast.open} title={toast.title} description={toast.description} variant={toast.variant} onClose={dismiss} />
      <Header title="Pembayaran">
        <Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Tambah Pembayaran</Button>
      </Header>
      <div className="p-6">
        {loading ? <Loading /> : <DataTable columns={columns} data={payments} searchKey="invoice" searchPlaceholder="Cari invoice..." />}
      </div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Tambah Pembayaran" onSubmit={handleSave} loading={saving}>
        <div className="space-y-2">
          <Label>Invoice *</Label>
          <select value={formData.invoice_id} onChange={(e) => handleSelectInvoice(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Pilih invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.number} - {formatCurrency(inv.total)} ({inv.status === "draft" ? "Belum Bayar" : "DP"})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Metode Pembayaran *</Label>
          <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="cash">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="credit_card">Kartu Kredit</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Nominal *</Label>
          <Input type="number" min="1" value={formData.amount || ""} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>Catatan</Label>
          <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Catatan (opsional)" />
        </div>
      </FormDialog>
    </div>
  );
}
