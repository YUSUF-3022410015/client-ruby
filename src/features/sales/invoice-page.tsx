"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, CreditCard } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Invoice, InvoiceItem, Payment, Customer } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [invRes, custRes] = await Promise.all([
      supabase.from("invoices").select("*, customer:customers(name)").order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("name"),
    ]);
    setInvoices(invRes.data || []);
    setCustomers(custRes.data || []);
    setLoading(false);
  }

  async function viewDetail(invoice: Invoice) {
    setSelectedInvoice(invoice);
    const [itemsRes, payRes] = await Promise.all([
      supabase.from("invoice_items").select("*, product:products(name, code)").eq("invoice_id", invoice.id),
      supabase.from("payments").select("*").eq("invoice_id", invoice.id).order("created_at"),
    ]);
    setInvoiceItems(itemsRes.data || []);
    setPayments(payRes.data || []);
    setDetailOpen(true);
  }

  function openPaymentDialog(invoice: Invoice) {
    setSelectedInvoice(invoice);
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = invoice.total - paid;
    setPaymentAmount(remaining > 0 ? remaining : 0);
    setPaymentMethod("cash");
    setPaymentOpen(true);
  }

  async function handlePayment() {
    if (!selectedInvoice || paymentAmount <= 0) return;
    setSaving(true);

    await supabase.from("payments").insert({
      invoice_id: selectedInvoice.id,
      amount: paymentAmount,
      payment_method: paymentMethod,
    });

    const { data: allPayments } = await supabase.from("payments").select("amount").eq("invoice_id", selectedInvoice.id);
    const totalPaid = (allPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

    let newStatus = "draft";
    if (totalPaid >= selectedInvoice.total) newStatus = "paid";
    else if (totalPaid > 0) newStatus = "partial";

    await supabase.from("invoices").update({ status: newStatus }).eq("id", selectedInvoice.id);

    if (newStatus === "paid") {
      const { data: items } = await supabase.from("invoice_items").select("product_id, qty").eq("invoice_id", selectedInvoice.id);
      if (items) {
        for (const item of items) {
          const { data: product } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
          if (product) {
            await supabase.from("products").update({ stock: product.stock - item.qty, updated_at: new Date().toISOString() }).eq("id", item.product_id);
            await supabase.from("stock_movements").insert({
              product_id: item.product_id,
              type: "out",
              qty: -item.qty,
              reference: `Invoice ${selectedInvoice.number}`,
              notes: "Penjualan lunas",
            });
          }
        }
      }
    }

    setPaymentOpen(false);
    setSaving(false);
    fetchData();
    if (detailOpen) viewDetail({ ...selectedInvoice, status: newStatus });
  }

  function getCustomerName(id: string) {
    return customers.find((c) => c.id === id)?.name || "-";
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Belum Bayar", variant: "outline" },
    partial: { label: "DP", variant: "secondary" },
    paid: { label: "Lunas", variant: "default" },
    cancelled: { label: "Dibatalkan", variant: "destructive" },
  };

  const columns: ColumnDef<Invoice, any>[] = [
    { accessorKey: "number", header: "Nomor Invoice" },
    {
      accessorKey: "customer_id",
      header: "Pelanggan",
      cell: ({ row }) => getCustomerName(row.original.customer_id),
    },
    {
      accessorKey: "date",
      header: "Tanggal",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = statusMap[row.original.status] || { label: row.original.status, variant: "outline" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewDetail(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status !== "paid" && row.original.status !== "cancelled" && (
            <Button variant="ghost" size="sm" onClick={() => openPaymentDialog(row.original)}>
              <CreditCard className="h-4 w-4 text-green-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Invoice" />
      <div className="p-6">
        <DataTable columns={columns} data={invoices} searchKey="number" searchPlaceholder="Cari nomor invoice..." />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 text-sm">
              <div>Pelanggan: {getCustomerName(selectedInvoice?.customer_id || "")}</div>
              <div>Tanggal: {selectedInvoice ? formatDate(selectedInvoice.date) : ""}</div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Barang</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Harga</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{(item.product as any)?.name || "-"}</td>
                    <td className="text-right py-2">{item.qty}</td>
                    <td className="text-right py-2">{formatCurrency(item.price)}</td>
                    <td className="text-right py-2">{formatCurrency(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right space-y-1 text-sm">
              <div>Subtotal: {formatCurrency(selectedInvoice?.subtotal || 0)}</div>
              <div>PPN (11%): {formatCurrency(selectedInvoice?.tax || 0)}</div>
              <div className="font-bold">Grand Total: {formatCurrency(selectedInvoice?.total || 0)}</div>
            </div>
            {payments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Riwayat Pembayaran</h4>
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm py-1 border-b">
                    <span>{formatDate(p.date)} - {p.payment_method}</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              Invoice: {selectedInvoice?.number} | Total: {formatCurrency(selectedInvoice?.total || 0)}
            </div>
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="credit_card">Kartu Kredit</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nominal</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </div>
            <Button onClick={handlePayment} disabled={saving} className="w-full">
              {saving ? "Menyimpan..." : "Bayar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
