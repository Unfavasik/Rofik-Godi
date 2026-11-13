import React, { useCallback, useEffect, useRef, useState } from 'react';
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

  const refresh = useCallback(async () => {
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
  }, [notify]);

  useEffect(() => { void refresh(); }, [refresh]);

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
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/85 bg-gradient-to-br from-white via-white to-rose-50/35 p-5 shadow-[0_10px_32px_-18px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/70 bg-red-50/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
              Catalog structure
            </span>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Categories
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Create, organize, and customize storefront product categories and thumbnails.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-2xs tabular-nums">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Refresh categories"
              className="grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-red-200 hover:bg-red-50/40 hover:text-[#D9232D]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#D9232D]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {tableMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] font-medium leading-relaxed text-amber-800">
          <b className="font-extrabold">Categories table is not set up yet.</b> Run migration{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">20261102190000_storefront_categories.sql</code>{' '}
          in the Supabase SQL editor, then reload this page.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="min-w-0 rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#D9232D] to-[#991B1B] text-white shadow-sm shadow-red-500/20">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold leading-tight text-slate-900">
                Add a New Category
              </h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Create a storefront category with name and image.
              </p>
            </div>
          </div>
          <div className="space-y-3.5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-800">
                Category Name <b className="text-[#D9232D]">*</b>
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Category name"
                maxLength={80}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-red-100 sm:text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-800">
                Description <span className="font-normal text-slate-400">(Optional)</span>
              </span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description"
                maxLength={140}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-red-100 sm:text-xs"
              />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-bold text-slate-800">
                Category Image <span className="font-normal text-slate-400">(Optional)</span>
              </p>
              <button
                type="button"
                onClick={() => createImageInputRef.current?.click()}
                className="flex min-h-[84px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/20 px-3 py-3.5 text-center transition hover:border-[#D9232D] hover:bg-red-50/50"
              >
                <ImagePlus className="h-6 w-6 text-[#D9232D]" />
                <span className="mt-1.5 text-xs font-bold text-slate-700">
                  {imageFile?.name || 'Tap to upload image'}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  JPG, PNG or WEBP (Max 5MB)
                </span>
              </button>
              <input
                ref={createImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] || null);
                  event.target.value = '';
                }}
                className="hidden"
                aria-label="Choose category image"
              />
            </div>
            <button
              type="button"
              onClick={() => void addCategory()}
              disabled={creating}
              className="banner-cta-shine group/cta inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#D9232D] py-3 text-xs font-extrabold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-110" />}
              {creating ? 'Adding category…' : 'Add Category'}
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-sm font-black text-slate-900">
              Categories{' '}
              <span className="text-xs font-semibold text-slate-400 tabular-nums">
                ({categories.length} total)
              </span>
            </p>
            <span className="text-[11px] font-medium text-slate-400">
              Manage visibility, thumbnails &amp; labels
            </span>
          </div>
          {loading ? (
            <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <p className="sr-only">Loading categories…</p>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2">
                  <div className="h-14 w-20 shrink-0 rounded-2xl animate-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded-lg animate-shimmer" />
                    <div className="h-3 w-56 rounded-lg animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center shadow-2xs">
              <p className="text-sm font-extrabold text-slate-700">No categories yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Add your first category with the form on the left.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-visible rounded-3xl border border-slate-200/85 bg-white px-4 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)] sm:px-5">
              {categories.map((category) => {
                const productCount = products.filter((product) => product.category === category.key).length;
                const editing = editingId === category.id;
                return (
                  <div
                    key={category.id}
                    className={`py-4 transition-colors ${category.isActive ? '' : 'bg-rose-50/40'}`}
                  >
                    {editing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-[#D9232D]">
                            <Pencil className="h-4 w-4" />
                          </span>
                          <p className="flex-1 text-xs font-extrabold text-slate-900">Edit Category</p>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel editing"
                            className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          maxLength={80}
                          aria-label="Category name"
                          className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-base font-semibold text-slate-800 outline-none focus:border-[#D9232D] focus:ring-2 focus:ring-red-100 sm:text-xs"
                        />
                        <input
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          maxLength={140}
                          placeholder="Short description (optional)"
                          aria-label="Category description"
                          className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-base font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-2 focus:ring-red-100 sm:text-xs"
                        />
                        <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={() => editImageInputRef.current?.click()}
                            disabled={uploadingId === category.id}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-extrabold text-[#D9232D] transition hover:bg-red-100 disabled:opacity-60"
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                            {uploadingId === category.id ? 'Uploading…' : 'Replace Image'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEdit(category)}
                            disabled={savingId === category.id}
                            className="banner-cta-shine inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D9232D] px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
                          >
                            {savingId === category.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            {savingId === category.id ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                        <input
                          ref={editImageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => void replaceImage(event, category)}
                          className="hidden"
                          aria-label="Replace category image"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="h-14 w-16 shrink-0 rounded-2xl bg-slate-50 object-cover shadow-2xs ring-1 ring-slate-200/70 sm:w-20"
                          />
                        ) : (
                          <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/70 sm:w-20">
                            <Tag className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold leading-snug text-slate-900">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                              {category.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                category.isActive
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {category.isActive ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                              {category.isActive ? 'Visible' : 'Hidden'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
                              {productCount} {productCount === 1 ? 'product' : 'products'}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            aria-label={`Edit ${category.name}`}
                            className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <details className="relative">
                            <summary
                              aria-label={`More actions for ${category.name}`}
                              className="grid size-11 cursor-pointer list-none place-items-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
                            >
                              <Ellipsis className="h-5 w-5" />
                            </summary>
                            <div className="absolute right-0 top-12 z-20 w-44 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  void toggleCategory(category);
                                }}
                                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                {category.isActive ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                                {category.isActive ? 'Hide category' : 'Show category'}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  void removeCategory(category);
                                }}
                                disabled={deletingId === category.id}
                                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === category.id ? 'Deleting…' : 'Delete category'}
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
      </div>
    </section>
  );
}
