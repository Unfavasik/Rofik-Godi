import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, GripVertical, ImagePlus, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import type { Product, VehicleCategory } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { deleteSupabaseProduct, loadAdminProducts, reorderSupabaseProducts, uploadProductImage, upsertSupabaseProduct } from '../lib/supabaseProducts';
import { ConfirmDialog } from './ConfirmDialog';
import { sendAdminNotification, type AdminCustomer } from '../lib/supabaseAdmin';
import { NotificationAudiencePicker, type NotificationAudience } from './NotificationAudiencePicker';
import { AdminProductColorEditor } from './AdminProductColorEditor';
import { getColorBgClass, getColorNameFromHex, isValidProductColorValue } from '../lib/productColors';
import { recolorImage } from '../lib/recolorImage';
import { notifyCatalogChanged } from '../lib/localCache';
const clearCatalogCache = () => { localStorage.removeItem('rofik-godi:public-catalog:v2'); notifyCatalogChanged(); };
const ADMIN_DRAFT_KEY = 'rofik-godi:admin-product-draft:v1';
const stripTransientImages = (value: unknown): unknown => { if (typeof value === 'string') return /^(data:|blob:)/i.test(value) ? '' : value; if (Array.isArray(value)) return value.map(stripTransientImages); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripTransientImages(item)])); return value; };
const clearAdminDraft = () => { try { localStorage.removeItem(ADMIN_DRAFT_KEY); } catch { /* optional persistence */ } };

type ProductDraft = Omit<Product, 'id' | 'rating' | 'reviewCount'> & { id?: string; rating: number; reviewCount: number };

const categories: VehicleCategory[] = ['bike', 'scooter', 'toto', 'cushion', 'accessory'];
const categoryLabels: Record<VehicleCategory, string> = { bike: 'Bike', scooter: 'Scooter', toto: 'Toto / E-rickshaw', cushion: 'Cushion', accessory: 'Accessory' };
const blankDraft = (): ProductDraft => ({
  title: '', subtitle: '', slug: '', category: 'bike', categoryLabel: 'Bike Covers', price: 0, originalPrice: 0,
  image: '', additionalImages: [], description: '', features: [], isBestseller: false, isNew: true,
  isWaterproof: false, isCustomizable: false, inStock: true, materials: [], colors: [{ name: 'Black', hex: '#111827', bgClass: 'bg-[#111827]', images: [] }],
  stitchPatterns: [], compatibility: [], thicknessOptions: [{ label: 'Standard', extraPrice: 0 }], rating: 0, reviewCount: 0,
});

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, hint, children, className = '' }) => <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>{children}{hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}</label>;
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none transition focus:border-[#D9232D] focus:bg-white ${props.className || ''}`} />;
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none transition focus:border-[#D9232D] focus:bg-white ${props.className || ''}`} />;

export const AdminProductManager: React.FC<{ initialProducts?: Product[]; onProductsChange?: (products: Product[]) => void; notify: (message: string) => void; customers?: AdminCustomer[]; focusProductId?: string | null; onFocusHandled?: () => void }> = ({ initialProducts, onProductsChange, notify, customers = [], focusProductId, onFocusHandled }) => {
  const [products, setProducts] = useState<Product[]>(() => initialProducts ?? []);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | VehicleCategory>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const restoredDraftRef = useRef(false);
  const loadRequestRef = useRef(0);

  const loadProducts = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoadState('loading');
    try {
      const remote = await loadAdminProducts();
      if (requestId !== loadRequestRef.current) return;

      setProducts(remote);
      setLoadState('ready');
    } catch (cause) {
      if (requestId !== loadRequestRef.current) return;
      setProducts([]);
      setLoadState('error');
      notify(`Could not load products: ${cause instanceof Error ? cause.message : 'Unexpected network error'}`);
    }
  }, [notify]);
  useEffect(() => {
    void loadProducts();
    return () => { loadRequestRef.current += 1; };
  }, [loadProducts]);
  useEffect(() => { onProductsChange?.(products); }, [products, onProductsChange]);
  useEffect(() => { try { sessionStorage.setItem('rofik-godi:admin-product-filters:v1', JSON.stringify({ query, category })); } catch { /* optional persistence */ } }, [query, category]);
  useEffect(() => { if (loadState !== 'ready' || restoredDraftRef.current) return; restoredDraftRef.current = true; try { const saved = JSON.parse(localStorage.getItem(ADMIN_DRAFT_KEY) || 'null') as { draft?: ProductDraft; editorOpen?: boolean; savedAt?: number } | null; if (saved?.draft && saved.editorOpen && saved.savedAt && Date.now() - saved.savedAt < 48 * 60 * 60 * 1000) { setEditing(saved.draft); setEditorOpen(true); notify('Draft restored'); } } catch { /* malformed draft is ignored */ } }, [loadState, notify]);
  const filtered = useMemo(() => products.filter((product) => (category === 'all' || product.category === category) && `${product.title} ${product.categoryLabel} ${product.slug}`.toLowerCase().includes(query.toLowerCase())), [products, category, query]);
  const moveProduct = async (sourceId: string, targetId: string) => {
    if (savingOrder || sourceId === targetId) return;
    const fromIndex = products.findIndex((product) => product.id === sourceId);
    const toIndex = products.findIndex((product) => product.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const previous = products;
    const reordered = [...products];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const next = reordered.map((product, index) => ({ ...product, displayOrder: index }));
    setProducts(next);
    setSavingOrder(true);
    let orderError: { message: string } | null;
    try {
      const result = await reorderSupabaseProducts(next.map((product) => product.id));
      orderError = result.error;
    } catch (cause) {
      orderError = { message: cause instanceof Error ? cause.message : 'Unexpected network error' };
    } finally {
      setSavingOrder(false);
    }
    if (orderError) {
      setProducts(previous);
      notify(`Product order was not saved: ${orderError.message}`);
      clearCatalogCache();
      return;
    }
    clearCatalogCache();
    notify('Storefront product order saved');
  };
  const openNew = () => { setEditing(blankDraft()); setEditorOpen(true); };
  const openEdit = (product: Product) => { setEditing({ ...product, additionalImages: product.additionalImages || [], features: product.features || [], materials: product.materials || [], compatibility: product.compatibility || [], stitchPatterns: product.stitchPatterns || [], colors: product.colors?.length ? product.colors : blankDraft().colors }); setEditorOpen(true); };
  const handledFocusId = useRef<string | null>(null);
  useEffect(() => {
    if (!focusProductId || handledFocusId.current === focusProductId) return;
    const product = products.find((item) => item.id === focusProductId);
    if (!product) return;
    handledFocusId.current = focusProductId;
    setCategory('all');
    setQuery(product.title);
    openEdit(product);
    window.setTimeout(() => document.getElementById(`admin-product-${focusProductId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    onFocusHandled?.();
  }, [focusProductId, products, onFocusHandled]);
  const save = async (draft: ProductDraft, announcement: { audience: NotificationAudience; userIds: string[] }) => {
    let image = draft.image;
    let uploadedAsWebP = false;
    if (isSupabaseConfigured && image.startsWith('data:')) {
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const uploaded = await uploadProductImage(new File([blob], `${slugify(draft.title) || 'product'}.jpg`, { type: blob.type || 'image/jpeg' }));
        image = uploaded.url;
        uploadedAsWebP = uploaded.format === 'webp';
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Image upload failed; sign in as an admin to upload to Storage');
        return;
      }
    }
    if (!image.trim()) { notify('Upload the primary product image first'); return; }
    let colorsWithImages;
    try {
      colorsWithImages = await Promise.all((draft.colors || []).map(async (color) => {
        const baseColor = { ...color } as typeof color & { nameTouched?: boolean };
        delete baseColor.nameTouched;
        const hex = color.hex.trim();
        const images = (color.images || []).map((item) => item.trim()).filter(Boolean);
        if (images.length) return { ...baseColor, name: color.name.trim() || getColorNameFromHex(hex), hex, bgClass: getColorBgClass(hex), images };
        const blob = await recolorImage(image, hex);
        const uploaded = await uploadProductImage(new File([blob], `${slugify(draft.title) || 'product'}-${slugify(color.name || hex)}-auto.webp`, { type: 'image/webp' }));
        return { ...baseColor, name: color.name.trim() || getColorNameFromHex(hex), hex, bgClass: getColorBgClass(hex), images: [uploaded.url] };
      }));
    } catch (error) {
      notify(error instanceof Error ? error.message : "This image can't be recolored automatically. Upload the image file instead.");
      return;
    }
    const normalized: Product = { ...draft, image, id: draft.id || `rg-prod-${Date.now()}`, displayOrder: draft.id ? draft.displayOrder ?? 0 : products.reduce((max, product) => Math.max(max, product.displayOrder ?? -1), -1) + 1, slug: slugify(draft.slug || draft.title), categoryLabel: draft.categoryLabel || categoryLabels[draft.category], colors: colorsWithImages, additionalImages: (draft.additionalImages || []).filter(Boolean) };
    const synced = await upsertSupabaseProduct(normalized);
    if (synced.error) { notify(`Product was not saved: ${synced.error.message}`); return; }
    setProducts((current) => draft.id ? current.map((item) => item.id === draft.id ? synced.product : item) : [synced.product, ...current]);
    setLoadState('ready');
    setEditorOpen(false); setEditing(null);
    clearAdminDraft();
    const savedMessage = uploadedAsWebP ? 'Converted to WebP and saved to Supabase Storage' : (draft.id ? 'Product updated in Supabase' : 'Product added to Supabase');
    if (!draft.id && announcement.audience !== 'NONE') {
      try {
        const response = await sendAdminNotification({
          title: `New arrival: ${synced.product.title}`,
          body: synced.product.subtitle || `${synced.product.title} is now available at Rofik Godi Centre. Explore it in the shop.`,
          kind: 'product',
          actionUrl: '/shop',
          imageUrl: synced.product.image || null,
          userIds: announcement.audience === 'ALL' ? null : announcement.userIds,
        });
        notify(response.error
          ? `${savedMessage}. Product saved, but the announcement failed: ${response.error.message}`
          : `${savedMessage}. New-product notification sent to ${response.count} customer${response.count === 1 ? '' : 's'}.`);
      } catch (error) {
        notify(`${savedMessage}. Product saved, but the announcement failed: ${error instanceof Error ? error.message : 'Please try again from Notifications.'}`);
      }
      clearCatalogCache();
      return;
    }
    clearCatalogCache();
    notify(savedMessage);
  };
  const remove = (id: string) => setPendingDeleteId(id);
  const confirmRemove = async () => { const id = pendingDeleteId; setPendingDeleteId(null); if (!id) return; const product = products.find((item) => item.id === id); if (!product) return; const result = await deleteSupabaseProduct(product); if (result.error) { notify(`Product was not deleted: ${result.error.message}`); return; } setProducts((current) => current.filter((item) => item.id !== id)); clearCatalogCache(); notify('Product deleted'); };
  const duplicate = async (product: Product) => { const copy = { ...product, id: `rg-prod-${Date.now()}`, title: `${product.title} Copy`, slug: `${product.slug}-copy-${Date.now()}` }; const result = await upsertSupabaseProduct(copy); if (result.error) { notify(`Product was not duplicated: ${result.error.message}`); return; } setProducts((current) => [result.product, ...current]); clearCatalogCache(); notify('Product duplicated'); };
  const toggleStock = async (id: string) => { const previous = products; const product = previous.find((item) => item.id === id); if (!product) return; const next = { ...product, inStock: !product.inStock }; setProducts((current) => current.map((item) => item.id === id ? next : item)); const result = await upsertSupabaseProduct(next); if (result.error) { setProducts(previous); notify(`Inventory visibility was not saved: ${result.error.message}`); return; } setProducts((current) => current.map((item) => item.id === id ? result.product : item)); clearCatalogCache(); notify('Inventory visibility updated'); };

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">Catalog control</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Products</h2><p className="mt-1 text-xs text-slate-500">Manage product details, image galleries, price, stock and storefront visibility.</p></div><button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700"><Plus className="h-4 w-4" />Add product</button></div>
    <AdminConnectionPanel notify={notify} />
    {loadState === 'ready' && products.length > 1 && <ProductOrderList products={filtered} saving={savingOrder} onMove={moveProduct} />}
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Summary label="Total products" value={products.length.toString()} tone="text-slate-900" /><Summary label="Visible in store" value={products.filter((product) => product.inStock).length.toString()} tone="text-emerald-600" /><Summary label="Low / out of stock" value={products.filter((product) => !product.inStock).length.toString()} tone="text-red-600" /></div>
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"><div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name, category or slug..." className="w-full bg-transparent text-xs font-semibold outline-none" /></div><select value={category} onChange={(event) => setCategory(event.target.value as 'all' | VehicleCategory)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></div>
    {loadState === 'loading' && <p role="status" className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Loading products…</p>}
    {loadState === 'error' && <div role="alert" className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span>Could not load products from the server. Showing no data.</span><button type="button" onClick={() => void loadProducts()} className="self-start rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 sm:self-auto">Retry</button></div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Product</th><th className="py-3">Category</th><th className="py-3">Price</th><th className="py-3">Stock</th><th className="py-3">Status</th><th className="py-3 pr-5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((product) => <tr id={`admin-product-${product.id}`} key={product.id} className="text-xs hover:bg-slate-50/60"><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100"><img src={product.image} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div><div><p className="max-w-[240px] truncate font-black text-slate-800">{product.title}</p><p className="mt-1 max-w-[250px] truncate text-[10px] text-slate-400">/{product.slug}</p></div></div></td><td className="py-3 font-semibold text-slate-500">{product.categoryLabel}</td><td className="py-3"><p className="font-black">{money(product.price)}</p><p className="text-[10px] text-slate-400 line-through">{money(product.originalPrice)}</p></td><td className="py-3 font-semibold text-slate-600">{product.inStock ? 'Available' : 'Hidden'}</td><td className="py-3"><button onClick={() => toggleStock(product.id)} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{product.inStock ? 'Published' : 'Unpublished'}</button></td><td className="py-3 pr-5"><div className="flex justify-end gap-1"><button title="Edit product" onClick={() => openEdit(product)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-[#D9232D]"><Pencil className="h-4 w-4" /></button><button title="Duplicate product" onClick={() => duplicate(product)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Copy className="h-4 w-4" /></button><button title="Delete product" onClick={() => remove(product.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="py-14 text-center text-sm font-semibold text-slate-400">No products match your filters.</div>}</div>
    <ConfirmDialog open={Boolean(pendingDeleteId)} title="Delete product?" message="This permanently removes the product from the catalog and database." confirmLabel="Delete product" onCancel={() => setPendingDeleteId(null)} onConfirm={() => void confirmRemove()} />
    {editorOpen && editing && <ProductEditor draft={editing} saving={saving} setSaving={setSaving} onClose={() => { clearAdminDraft(); setEditorOpen(false); setEditing(null); }} onSave={save} customers={customers} />}
  </section>;
};

const ProductOrderList: React.FC<{ products: Product[]; saving: boolean; onMove: (sourceId: string, targetId: string) => Promise<void> }> = ({ products, saving, onMove }) => {
  const draggedProductId = useRef<string | null>(null);
  if (!products.length) return null;
  return <details open className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <summary className="cursor-pointer list-none text-sm font-black text-slate-900">Arrange storefront order <span className="ml-2 text-[10px] font-semibold text-slate-400">Drag products or use the arrows</span></summary>
    <p className="mt-1 text-[11px] text-slate-500">This sequence is the default order customers see in Home, Shop and Search.{saving && <span role="status" className="ml-2 font-bold text-[#D9232D]">Saving…</span>}</p>
    <div role="list" aria-label="Storefront product order" className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
      {products.map((product, index) => <div key={product.id} role="listitem" draggable={!saving} onDragStart={(event) => { draggedProductId.current = product.id; event.dataTransfer.setData('text/plain', product.id); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); const sourceId = draggedProductId.current || event.dataTransfer.getData('text/plain'); draggedProductId.current = null; if (sourceId) void onMove(sourceId, product.id); }} onDragEnd={() => { draggedProductId.current = null; }} className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-slate-50">
        <GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
        <span className="w-6 shrink-0 text-center font-black text-slate-400">{index + 1}</span>
        <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{product.title}<span className="ml-2 font-medium text-slate-400">{product.categoryLabel}</span></span>
        <button type="button" aria-label={`Move ${product.title} up`} title="Move up" disabled={saving || index === 0} onClick={() => void onMove(product.id, products[index - 1].id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-[#D9232D] disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" aria-label={`Move ${product.title} down`} title="Move down" disabled={saving || index === products.length - 1} onClick={() => void onMove(product.id, products[index + 1].id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-[#D9232D] disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
      </div>)}
    </div>
  </details>;
};

const Summary: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold text-slate-400">{label}</p><p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p></div>;

const AdminConnectionPanel: React.FC<{ notify: (message: string) => void }> = ({ notify }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user.email || null));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSessionEmail(next?.user.email || null));
    return () => data.subscription.unsubscribe();
  }, []);
  const client = supabase;
  if (!isSupabaseConfigured || !client) return null;
  const signIn = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); const { error } = await client.auth.signInWithPassword({ email, password }); setBusy(false); if (error) notify(error.message); else { setPassword(''); notify('Supabase session connected'); } };
  if (sessionEmail) return <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:flex-row sm:items-center"><p className="font-bold text-emerald-800">Supabase connected as {sessionEmail}<span className="ml-2 text-[10px] font-semibold text-emerald-600">RLS admin access depends on the admin_users row</span></p><button onClick={() => client.auth.signOut()} className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700">Sign out</button></div>;
  return <form onSubmit={signIn} className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-xs font-black text-blue-900">Connect admin account for shared sync</p><p className="mt-1 text-[10px] leading-relaxed text-blue-700">Sign in with a Supabase Auth user that has a matching row in <code>public.admin_users</code>. Without it, the UI stays in local fallback mode.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@email.com" className="bg-white" /><Input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="bg-white" /><button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-bold text-white disabled:opacity-60">{busy ? 'Connecting...' : 'Sign in'}</button></div></div></form>;
};

const ProductEditor: React.FC<{ draft: ProductDraft; saving: boolean; setSaving: (value: boolean) => void; onClose: () => void; onSave: (draft: ProductDraft, announcement: { audience: NotificationAudience; userIds: string[] }) => void | Promise<void>; customers: AdminCustomer[] }> = ({ draft, saving, setSaving, onClose, onSave, customers }) => {
  const [form, setForm] = useState<ProductDraft>(draft);
  const [urlInput, setUrlInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [announcementAudience, setAnnouncementAudience] = useState<NotificationAudience>('NONE');
  const [announcementUserIds, setAnnouncementUserIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const persistDraft = useCallback(() => { try { localStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify({ draft: stripTransientImages(form), editorOpen: true, savedAt: Date.now() })); } catch { /* optional persistence */ } }, [form]);
  useEffect(() => { const timer = window.setTimeout(persistDraft, 500); return () => window.clearTimeout(timer); }, [persistDraft]);
  useEffect(() => { const save = () => persistDraft(); const hidden = () => { if (document.visibilityState === 'hidden') save(); }; window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', hidden); return () => { window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); }; }, [persistDraft]);
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const upload = async (file?: File) => {
    if (!file) return;
    setValidationError('');
    if (!file.type.startsWith('image/')) { setValidationError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setValidationError('Image must be 5MB or smaller.'); return; }
    if (isSupabaseConfigured) {
      try { setSaving(true); const uploaded = await uploadProductImage(file); set('image', uploaded.url); }
      catch (error) { setValidationError(error instanceof Error ? error.message : 'Image upload failed. Check your admin session and try again.'); return; }
      finally { setSaving(false); }
    } else set('image', URL.createObjectURL(file));
  };
  const uploadGalleryFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setValidationError('');
    const selected = Array.from(files);
    const invalid = selected.find((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setValidationError(`${invalid.name}: choose an image file up to 5MB.`);
      return;
    }
    try {
      setSaving(true);
      const uploaded = isSupabaseConfigured
        ? await Promise.all(selected.map((file) => uploadProductImage(file)))
        : selected.map((file) => ({ url: URL.createObjectURL(file) }));
      set('additionalImages', [...(form.additionalImages || []), ...uploaded.map((item) => item.url)]);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Gallery upload failed. Check your admin session and try again.');
    } finally {
      setSaving(false);
      if (galleryFileRef.current) galleryFileRef.current.value = '';
    }
  };
  const uploadColorFiles = async (files: File[]) => {
    const invalid = files.find((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) throw new Error(`${invalid.name}: choose a JPG, PNG or WEBP image up to 5MB.`);
    try {
      setValidationError('');
      setSaving(true);
      const uploaded = isSupabaseConfigured
        ? await Promise.all(files.map((file) => uploadProductImage(file)))
        : files.map((file) => ({ url: URL.createObjectURL(file) }));
      return uploaded.map((item) => item.url);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Color image upload failed. Check your admin session and try again.');
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const addGalleryUrl = () => { const value = urlInput.trim(); if (!value) return; try { new URL(value); } catch { setValidationError('Please enter a valid image URL.'); return; } set('additionalImages', [...(form.additionalImages || []), value]); setUrlInput(''); setValidationError(''); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!form.title.trim() || !form.image.trim() || form.price <= 0) { setValidationError('Product name, primary image and a positive price are required.'); return; } const colorOptions = form.colors || []; if (!colorOptions.length || colorOptions.some((color) => !color.name.trim() || !isValidProductColorValue(color.hex))) { setValidationError('Every colour needs a name and a valid hex code or CSS color name.'); return; } if (!form.id && announcementAudience === 'SELECTED' && announcementUserIds.length === 0) { setValidationError('Select at least one customer for the product announcement.'); return; } setValidationError(''); setSaving(true); await onSave({ ...form, title: form.title.trim(), slug: slugify(form.slug || form.title), originalPrice: form.originalPrice || form.price, categoryLabel: categoryLabels[form.category] }, { audience: announcementAudience, userIds: announcementUserIds }); setSaving(false); };
  return <div role="dialog" aria-modal="true" aria-labelledby="product-editor-title" className="fixed inset-0 z-50 overflow-y-auto bg-white"><form onSubmit={submit} className="flex min-h-full flex-col bg-white"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7"><div><h3 id="product-editor-title" className="text-lg font-black">{form.id ? 'Edit product' : 'Add product'}</h3><p className="mt-1 text-[11px] text-slate-400">All fields marked with * are required for publishing.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{validationError && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-xs font-semibold text-red-700">{validationError}</p>}<div className="mx-auto grid w-full max-w-[1440px] flex-1 gap-6 p-5 sm:p-7 lg:grid-cols-[1.25fr_.85fr]"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Product name *" className="sm:col-span-2"><Input required value={form.title} onChange={(event) => { set('title', event.target.value); if (!form.id) set('slug', slugify(event.target.value)); }} placeholder="Premium Bike Seat Cover" /></Field><Field label="URL slug"><Input value={form.slug} onChange={(event) => set('slug', slugify(event.target.value))} placeholder="premium-bike-seat-cover" /></Field><Field label="Category *"><select value={form.category} onChange={(event) => set('category', event.target.value as VehicleCategory)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#D9232D]">{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></Field><Field label="Selling price (₹) *"><Input required type="number" min="1" value={form.price || ''} onChange={(event) => set('price', Number(event.target.value))} /></Field><Field label="Original / MRP (₹)"><Input type="number" min="0" value={form.originalPrice || ''} onChange={(event) => set('originalPrice', Number(event.target.value))} /></Field><Field label="Badge"><Input value={form.badge || ''} onChange={(event) => set('badge', event.target.value)} placeholder="Bestseller / New / Waterproof" /></Field></div><Field label="Description"><Textarea rows={4} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Explain the product, fit, materials and benefits..." /></Field><AdminProductColorEditor colors={form.colors || []} onChange={(colors) => set('colors', colors)} onUploadFiles={uploadColorFiles} mainImage={form.image} onGenerateImage={async (hex) => { const blob = await recolorImage(form.image, hex); const uploaded = await uploadProductImage(new File([blob], `${slugify(form.title) || 'product'}-color-auto.webp`, { type: 'image/webp' })); return uploaded.url; }} /><div className="flex flex-wrap gap-x-5 gap-y-3 rounded-xl bg-slate-50 p-4">{[['isBestseller', 'Bestseller'], ['isNew', 'New arrival'], ['isWaterproof', 'Waterproof'], ['isCustomizable', 'Customizable'], ['inStock', 'Visible in store']].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-[11px] font-bold text-slate-600"><input type="checkbox" checked={Boolean(form[key as keyof ProductDraft])} onChange={(event) => set(key as keyof ProductDraft, event.target.checked as never)} className="h-4 w-4 accent-[#D9232D]" />{label}</label>)}</div></div><div className="space-y-5"><div><p className="mb-1.5 text-[11px] font-bold text-slate-600">Primary product image *</p><div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">{form.image ? <div className="relative aspect-[4/3] bg-slate-100"><img src={form.image} alt="Product preview" className="h-full w-full object-cover" /><button type="button" onClick={() => set('image', '')} className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-2 text-white"><X className="h-4 w-4" /></button></div> : <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-slate-400 hover:bg-white"><ImagePlus className="h-8 w-8" /><span className="text-xs font-bold">Upload primary image</span><span className="text-[10px]">JPG, PNG, WEBP · max 5MB</span></button>}</div><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /><div className="mt-2 flex gap-2"><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" />Upload file</button><button type="button" onClick={() => { const value = urlInput.trim(); if (value) { set('image', value); setUrlInput(''); setValidationError(''); } else setValidationError('Type an image URL in the gallery URL field first.'); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Use image URL</button></div></div><div><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-bold text-slate-600">Additional gallery images</p><span className="text-[10px] text-slate-400">{form.additionalImages?.length || 0} added</span></div><input ref={galleryFileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => { void uploadGalleryFiles(event.target.files); }} /><div className="flex gap-2"><button type="button" onClick={() => galleryFileRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><ImagePlus className="h-4 w-4" />Upload multiple</button><Input value={urlInput} onChange={(event) => setUrlInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addGalleryUrl(); } }} placeholder="Paste image URL" /><button type="button" onClick={addGalleryUrl} className="rounded-xl bg-slate-900 px-3 text-white"><Plus className="h-4 w-4" /></button></div><p className="mt-1 text-[10px] text-slate-400">Select multiple JPG, PNG or WEBP files at once · max 5MB each</p><div className="mt-3 grid grid-cols-3 gap-2">{(form.additionalImages || []).map((url, index) => <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"><img src={url} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => set('additionalImages', (form.additionalImages || []).filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-slate-900/75 p-1 text-white opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button></div>)}</div></div><div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-800"><p className="font-black">Product rating</p><p className="mt-1">Average rating and review count are calculated from published customer reviews and cannot be edited here.</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-[11px] leading-relaxed text-blue-800"><p className="font-black">Image storage note</p><p className="mt-1">Every uploaded file is resized and converted to WebP in the browser, then saved to the Supabase product-images bucket. Image URLs remain external URLs and are not re-encoded.</p></div></div><div className="lg:col-span-2">{!form.id && <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4"><div className="mb-3"><p className="text-xs font-black text-slate-800">New product announcement</p><p className="mt-1 text-[10px] text-slate-500">Optional: after the product saves, send its image and shop link to your chosen audience.</p></div><NotificationAudiencePicker customers={customers} audience={announcementAudience} selectedUserIds={announcementUserIds} onAudienceChange={setAnnouncementAudience} onSelectedUserIdsChange={setAnnouncementUserIds} allowNone disabled={saving} /></div>}</div></div><div className="sticky bottom-0 z-20 flex justify-end gap-2 rounded-t-2xl border-t border-slate-200 bg-white/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#D9232D] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : <><Check className="h-4 w-4" />Save product</>}</button></div></form></div>;
};
