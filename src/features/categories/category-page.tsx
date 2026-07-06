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
import { Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const { toast, toastFn, dismiss } = useToast();
  const supabase = createClient();

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
    setLoading(false);
  }

  function openCreateDialog() {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
    setDialogOpen(true);
  }

  function openDeleteDialog(category: Category) {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await supabase.from("categories").update({ name: formData.name, description: formData.description }).eq("id", editingCategory.id);
        toastFn({ title: "Berhasil", description: "Kategori berhasil diperbarui", variant: "success" });
      } else {
        await supabase.from("categories").insert({ name: formData.name, description: formData.description });
        toastFn({ title: "Berhasil", description: "Kategori berhasil ditambahkan", variant: "success" });
      }
      setDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan data", variant: "error" });
    }
    setSaving(false);
    fetchCategories();
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    setSaving(true);
    try {
      await supabase.from("categories").delete().eq("id", deletingCategory.id);
      toastFn({ title: "Berhasil", description: "Kategori berhasil dihapus", variant: "success" });
      setDeleteDialogOpen(false);
    } catch {
      toastFn({ title: "Gagal", description: "Terjadi kesalahan saat menghapus data", variant: "error" });
    }
    setSaving(false);
    fetchCategories();
  }

  const columns: ColumnDef<Category, any>[] = [
    { accessorKey: "name", header: "Nama Kategori" },
    { accessorKey: "description", header: "Deskripsi", cell: ({ row }) => row.original.description || "-" },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditDialog(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(row.original)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Toast open={toast.open} title={toast.title} description={toast.description} variant={toast.variant} onClose={dismiss} />
      <Header title="Kategori">
        <Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Tambah Kategori</Button>
      </Header>
      <div className="p-6">
        {loading ? <Loading /> : <DataTable columns={columns} data={categories} searchKey="name" searchPlaceholder="Cari kategori..." />}
      </div>
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingCategory ? "Edit Kategori" : "Tambah Kategori"} onSubmit={handleSave} loading={saving}>
        <div className="space-y-2">
          <Label htmlFor="name">Nama Kategori *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Masukkan nama kategori" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Deskripsi kategori (opsional)" />
        </div>
      </FormDialog>
      <DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Hapus Kategori" description={`Hapus "${deletingCategory?.name}"?`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}
