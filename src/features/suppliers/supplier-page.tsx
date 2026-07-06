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
import { Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

const emptySupplier = { name: "", phone: "", email: "", address: "", contact_person: "" };

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptySupplier);
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchSuppliers(); }, []);

  async function fetchSuppliers() {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
    setLoading(false);
  }

  function openCreateDialog() { setEditingSupplier(null); setFormData(emptySupplier); setDialogOpen(true); }
  function openEditDialog(s: Supplier) { setEditingSupplier(s); setFormData({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", contact_person: s.contact_person || "" }); setDialogOpen(true); }
  function openDeleteDialog(s: Supplier) { setDeletingSupplier(s); setDeleteDialogOpen(true); }

  async function handleSave() {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: formData.name, phone: formData.phone, email: formData.email || null, address: formData.address || null, contact_person: formData.contact_person || null };
      if (editingSupplier) {
        await supabase.from("suppliers").update(payload).eq("id", editingSupplier.id);
        toastFn({ title: "Berhasil", description: "Supplier berhasil diperbarui", variant: "success" });
      } else {
        await supabase.from("suppliers").insert(payload);
        toastFn({ title: "Berhasil", description: "Supplier berhasil ditambahkan", variant: "success" });
      }
      setDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchSuppliers();
  }

  async function handleDelete() {
    if (!deletingSupplier) return;
    setSaving(true);
    try {
      await supabase.from("suppliers").delete().eq("id", deletingSupplier.id);
      toastFn({ title: "Berhasil", description: "Supplier berhasil dihapus", variant: "success" });
      setDeleteDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan", variant: "error" });
    }
    setSaving(false);
    fetchSuppliers();
  }

  const columns: ColumnDef<Supplier, any>[] = [
    { accessorKey: "name", header: "Nama Supplier" },
    { accessorKey: "phone", header: "Telepon", cell: ({ row }) => row.original.phone || "-" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
    { accessorKey: "address", header: "Alamat", cell: ({ row }) => row.original.address || "-" },
    { accessorKey: "contact_person", header: "Contact Person", cell: ({ row }) => row.original.contact_person || "-" },
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
      <Header title="Supplier"><Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Tambah Supplier</Button></Header>
      <div className="p-6">
        {loading ? <Loading /> : <DataTable columns={columns} data={suppliers} searchKey="name" searchPlaceholder="Cari supplier..." />}
      </div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingSupplier ? "Edit Supplier" : "Tambah Supplier"} onSubmit={handleSave} loading={saving}>
        <div className="space-y-2"><Label htmlFor="name">Nama Supplier *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama supplier" /></div>
        <div className="space-y-2"><Label htmlFor="phone">Telepon</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="08123456789" /></div>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@supplier.com" /></div>
        <div className="space-y-2"><Label htmlFor="address">Alamat</Label><Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat supplier" /></div>
        <div className="space-y-2"><Label htmlFor="contact_person">Contact Person</Label><Input id="contact_person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="Nama kontak" /></div>
      </FormDialog>
      <DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Hapus Supplier" description={`Hapus "${deletingSupplier?.name}"?`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}
