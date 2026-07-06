"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/loading";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

const emptyCustomer = { name: "", phone: "", email: "", address: "" };

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyCustomer);
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("name");
    setCustomers(data || []);
    setLoading(false);
  }

  function openCreateDialog() { setEditingCustomer(null); setFormData(emptyCustomer); setDialogOpen(true); }
  function openEditDialog(c: Customer) { setEditingCustomer(c); setFormData({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" }); setDialogOpen(true); }
  function openDeleteDialog(c: Customer) { setDeletingCustomer(c); setDeleteDialogOpen(true); }

  async function handleSave() {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: formData.name, phone: formData.phone, email: formData.email || null, address: formData.address || null };
      if (editingCustomer) {
        await supabase.from("customers").update(payload).eq("id", editingCustomer.id);
        toastFn({ title: "Berhasil", description: "Pelanggan berhasil diperbarui", variant: "success" });
      } else {
        await supabase.from("customers").insert(payload);
        toastFn({ title: "Berhasil", description: "Pelanggan berhasil ditambahkan", variant: "success" });
      }
      setDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchCustomers();
  }

  async function handleDelete() {
    if (!deletingCustomer) return;
    setSaving(true);
    try {
      await supabase.from("customers").delete().eq("id", deletingCustomer.id);
      toastFn({ title: "Berhasil", description: "Pelanggan berhasil dihapus", variant: "success" });
      setDeleteDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchCustomers();
  }

  const columns: ColumnDef<Customer, any>[] = [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "phone", header: "Telepon", cell: ({ row }) => row.original.phone || "-" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
    { accessorKey: "address", header: "Alamat", cell: ({ row }) => row.original.address || "-" },
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
      <Header title="Pelanggan"><Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Tambah Pelanggan</Button></Header>
      <div className="p-6">
        {loading ? <Loading /> : <DataTable columns={columns} data={customers} searchKey="name" searchPlaceholder="Cari pelanggan..." />}
      </div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan"} onSubmit={handleSave} loading={saving}>
        <div className="space-y-2"><Label htmlFor="name">Nama *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama pelanggan" /></div>
        <div className="space-y-2"><Label htmlFor="phone">Telepon</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="08123456789" /></div>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" /></div>
        <div className="space-y-2"><Label htmlFor="address">Alamat</Label><Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat lengkap" /></div>
      </FormDialog>
      <DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Hapus Pelanggan" description={`Hapus "${deletingCustomer?.name}"?`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}
