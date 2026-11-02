import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Ellipsis,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { Product } from '../types';
import {
  createCategory,
  deleteCategory,
  loadStorefrontCategories,
  slugifyCategoryKey,
  updateCategory,
  uploadCategoryImage,
  type StorefrontCategory,
} from '../lib/supabaseCategories';

type Props = {
  products: Product[];
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
};

function isMissingTableError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '42P01',
  );
}

export function AdminCategoriesManager({ products, notify }: Props) {
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const createImageInputRef = useRef<HTMLInputElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    const result = await loadStorefrontCategories({ includeHidden: true });
    if (result.error) {
      setTableMissing(isMissingTableError(result.error));
      if (!isMissingTableError(result.error)) notify(`Could not load categories: ${result.error.message}`, 'error');
    } else {
      setTableMissing(false);
    }
    setCategories(result.data);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const addCategory = async () => {
    const cleanName = name.trim();
    if (!cleanName) return notify('Category name is required', 'error');
    if (imageFile && imageFile.size > 5 * 1024 * 1024) return notify('Choose an image smaller than 5MB', 'error');
    if (imageFile && !['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type)) return notify('Choose a JPG, PNG or WEBP image', 'error');
    setCreating(true);
    let created: StorefrontCategory | null = null;
    try {
      const sortOrder = categories.length + 1;
      created = await createCategory({ key: slugifyCategoryKey(cleanName), name: cleanName, description, sortOrder });
      setName(''); setDescription(''); setImageFile(null);
      if (imageFile) await uploadCategoryImage(created.id, imageFile);
      await refresh();
      notify('Category added to Supabase', 'success');
    } catch (error) {
      await refresh();
      notify(error instanceof Error ? (created ? `Category added, but image upload failed: ${error.message}` : error.message) : 'Could not add category', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (category: StorefrontCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description);
  };

  const saveEdit = async (category: StorefrontCategory) => {
    if (!editName.trim()) return notify('Category name is required', 'error');
    setSavingId(category.id);
    try {
      await updateCategory(category.id, { name: editName.trim(), description: editDescription });
      setEditingId(null);
      await refresh();
      notify('Category changes saved', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save category', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const toggleCategory = async (category: StorefrontCategory) => {
    try {
      await updateCategory(category.id, { isActive: !category.isActive });
      await refresh();
      notify(category.isActive ? 'Category hidden from customers' : 'Category visible to customers', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update visibility', 'error');
    }
  };

  const replaceImage = async (event: React.ChangeEvent<HTMLInputElement>, category: StorefrontCategory) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notify('Choose an image smaller than 5MB', 'error');
    setUploadingId(category.id);
    try {
      const result = await uploadCategoryImage(category.id, file);
      await refresh();
      notify(`Image saved as WebP (${Math.round(result.bytes / 1024)} KB)`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not upload category image', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const removeCategory = async (category: StorefrontCategory) => {
    const productCount = products.filter((product) => product.category === category.key).length;
    const warning = productCount > 0 ? ` ${productCount} ${productCount === 1 ? 'product uses' : 'products use'} this category and will stay in the catalog.` : '';
    if (!window.confirm(`Delete ${category.name} from the storefront?${warning}`)) return;
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      await refresh();
      notify('Category deleted', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete category', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[480px] space-y-4 bg-[#F8FAFC] p-4 sm:p-4">
      {tableMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] font-medium leading-relaxed text-amber-800">
          <b className="font-extrabold">Categories table is not set up yet.</b> Run migration{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">20261102190000_storefront_categories.sql</code>{' '}
          in the Supabase SQL editor, then reload this page.
        </div>
      )}

      <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e5252a] text-white"><Plus className="h-5 w-5" /></span>
          <div>
            <h3 className="text-[16px] font-extrabold leading-tight text-[#10213f]">Add a New Category</h3>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">Create a storefront category with name and image.</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-slate-800">Category Name <b className="text-[#D9232D]">*</b></span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" maxLength={80} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-1 focus:ring-[#D9232D]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-slate-800">Description <span className="font-normal text-slate-400">(Optional)</span></span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" maxLength={140} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-1 focus:ring-[#D9232D]" />
          </label>
          <div>
            <p className="mb-1.5 text-[12px] font-bold text-slate-800">Category Image <span className="font-normal text-slate-400">(Optional)</span></p>
            <button type="button" onClick={() => createImageInputRef.current?.click()} className="flex min-h-[70px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-[#FBFBFC] px-2 py-3 text-center transition hover:bg-red-50/40">
              <ImagePlus className="h-6 w-6 text-[#D71920]" />
              <span className="mt-1 text-[12px] font-semibold text-slate-700">{imageFile?.name || 'Tap to upload image'}</span>
              <span className="text-[10px] font-medium text-slate-400">JPG, PNG or WEBP (Max 5MB)</span>
            </button>
            <input ref={createImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setImageFile(event.target.files?.[0] || null); event.target.value = ''; }} className="hidden" aria-label="Choose category image" />
          </div>
          <button type="button" onClick={() => void addCategory()} disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d71920] py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#bf1f29] disabled:cursor-wait disabled:opacity-60">
            {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? 'Adding category…' : 'Add Category'}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-[#0B1528]">Categories <span className="text-[12px] font-medium text-slate-400">({categories.length} total)</span></p>
          <span className="text-[10px] font-medium text-slate-400">Tap a category to manage</span>
        </div>
        {loading ? (
          <p className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-500">Loading categories…</p>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-2 py-10 text-center shadow-sm">
            <p className="text-sm font-bold text-slate-700">No categories yet</p>
            <p className="mt-1 text-xs text-slate-400">Add your first category with the form above.</p>
          </div>
        ) : (
          <div className="flex flex-col overflow-visible rounded-2xl border border-slate-100 bg-white px-3 shadow-sm">
            {categories.map((category) => {
              const productCount = products.filter((product) => product.category === category.key).length;
              const editing = editingId === category.id;
              return (
                <div key={category.id} className={`border-b border-slate-100 py-3 last:border-0 ${category.isActive ? '' : 'bg-rose-50/50'}`}>
                  {editing ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FCEBEB] text-[#db1a24]"><Pencil className="h-4 w-4" /></span>
                        <p className="flex-1 text-[13px] font-extrabold text-slate-900">Edit Category</p>
                        <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel editing" className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                      </div>
                      <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} aria-label="Category name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-800 outline-none focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24]" />
                      <input value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={140} placeholder="Short description (optional)" aria-label="Category description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24]" />
                      <div className="flex items-center gap-2.5">
                        <button type="button" onClick={() => editImageInputRef.current?.click()} disabled={uploadingId === category.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#FCEBEB] px-3 py-2 text-[11px] font-extrabold text-[#db1a24] transition hover:bg-red-100 disabled:opacity-60">
                          <ImagePlus className="h-3.5 w-3.5" />{uploadingId === category.id ? 'Uploading…' : 'Replace Image'}
                        </button>
                        <button type="button" onClick={() => void saveEdit(category)} disabled={savingId === category.id} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#db1a24] py-2.5 text-[13px] font-extrabold text-white transition hover:bg-[#c4151e] disabled:opacity-60">
                          {savingId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{savingId === category.id ? 'Saving…' : 'Save Changes'}
                        </button>
                      </div>
                      <input ref={editImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void replaceImage(event, category)} className="hidden" aria-label="Replace category image" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2.5">
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="h-14 w-20 shrink-0 rounded-xl bg-slate-50 object-cover" />
                      ) : (
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Tag className="h-6 w-6" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-extrabold leading-snug text-slate-900">{category.name}</p>
                        {category.description && <p className="truncate text-[10px] font-medium text-slate-400">{category.description}</p>}
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {category.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{category.isActive ? 'Visible' : 'Hidden'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{productCount} {productCount === 1 ? 'product' : 'products'}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => startEdit(category)} aria-label={`Edit ${category.name}`} className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Pencil className="h-4 w-4" /></button>
                        <details className="relative">
                          <summary aria-label={`More actions for ${category.name}`} className="grid size-9 cursor-pointer list-none place-items-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"><Ellipsis className="h-5 w-5" /></summary>
                          <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                            <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void toggleCategory(category); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              {category.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{category.isActive ? 'Hide category' : 'Show category'}
                            </button>
                            <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void removeCategory(category); }} disabled={deletingId === category.id} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                              <Trash2 className="h-3.5 w-3.5" />{deletingId === category.id ? 'Deleting…' : 'Delete category'}
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
