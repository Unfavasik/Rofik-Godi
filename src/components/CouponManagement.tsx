import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Edit3,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Tag,
  TicketPercent,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  disableAdminCoupon,
  deleteUnusedAdminCoupon,
  loadAdminCoupons,
  loadCouponProducts,
  loadCouponUsages,
  saveAdminCoupon,
  getCouponStatus,
  type CouponApplyTo,
  type CouponEligibility,
  type CouponPayload,
  type CouponProductChoice,
  type CouponRecord,
  type CouponStatus,
  type CouponAnalyticsSummary,
  type DiscountType,
  type CouponUsageRecord,
} from '../lib/supabaseCoupons';

const IST = 'Asia/Kolkata';
const categories = [
  { id: 'bike', label: 'Bike Covers' },
  { id: 'scooter', label: 'Scooter Covers' },
  { id: 'toto', label: 'Toto Covers' },
  { id: 'cushion', label: 'Cushions' },
  { id: 'accessory', label: 'Accessories' },
];
const filters: Array<'All' | CouponStatus> = ['All', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED', 'USAGE_LIMIT_REACHED'];
const statusLabels: Record<CouponStatus, string> = {
  ACTIVE: 'Active', SCHEDULED: 'Scheduled', EXPIRED: 'Expired', DISABLED: 'Disabled', USAGE_LIMIT_REACHED: 'Usage limit reached',
};
const badgeClass: Record<CouponStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-200',
  EXPIRED: 'bg-slate-100 text-slate-600 ring-slate-200',
  DISABLED: 'bg-rose-50 text-rose-700 ring-rose-200',
  USAGE_LIMIT_REACHED: 'bg-amber-50 text-amber-800 ring-amber-200',
};
const money = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatIST = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: IST,
}).format(new Date(value));
const inputIST = (value: string) => {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).reduce<Record<string, string>>((result, item) => ({ ...result, [item.type]: item.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const asTimestamp = (value: string) => `${value}:00+05:30`;
const istDateInput = (day: number, hour: number, minute: number) => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`.replace(/-\d{2}T/, `-${String(day).padStart(2, '0')}T`);
};

interface CouponFormState {
  id?: string;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  max_discount: string;
  minimum_order_value: string;
  starts_at: string;
  expires_at: string;
  usage_limit: string;
  per_customer_limit: string;
  eligibility: CouponEligibility;
  apply_to: CouponApplyTo;
  product_ids: string[];
  category_keys: string[];
  description: string;
  is_enabled: boolean;
}

const freshForm = (): CouponFormState => ({
  code: 'WELCOME10',
  discount_type: 'PERCENTAGE',
  discount_value: '10',
  max_discount: '1000',
  minimum_order_value: '3000',
  starts_at: istDateInput(3, 10, 0),
  expires_at: istDateInput(31, 23, 59),
  usage_limit: '100',
  per_customer_limit: '1',
  eligibility: 'FIRST_ORDER',
  apply_to: 'ALL_PRODUCTS',
  product_ids: [],
  category_keys: [],
  description: 'October first-order promotional campaign.',
  is_enabled: true,
});

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#D9232D] focus:ring-4 focus:ring-red-50';
const labelClass = 'block text-xs font-bold text-slate-600';

export const CouponManagement: React.FC<{ notify: (message: string) => void }> = ({ notify }) => {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [products, setProducts] = useState<CouponProductChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | CouponStatus>('All');
  const [form, setForm] = useState<CouponFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [details, setDetails] = useState<CouponRecord | null>(null);
  const [usageRows, setUsageRows] = useState<CouponUsageRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<CouponAnalyticsSummary>({ total_uses: 0, remaining_uses: 0, total_discount_given: 0 });
  const [detailsLoading, setDetailsLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [couponResponse, productResponse] = await Promise.all([loadAdminCoupons(), loadCouponProducts()]);
    setLoading(false);
    if (couponResponse.error) {
      setError(couponResponse.error);
      setCoupons([]);
      return;
    }
    setError('');
    setCoupons(couponResponse.data);
    if (!productResponse.error) setProducts(productResponse.data);
  };

  useEffect(() => { void refresh(); }, []);

  const counts = useMemo(() => {
    const now = Date.now();
    return coupons.reduce<Record<string, number>>((acc, coupon) => {
      const status = getCouponStatus(coupon, now);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [coupons]);

  const visibleCoupons = useMemo(() => coupons.filter((coupon) => {
    const matchesText = `${coupon.code} ${coupon.description || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'All' || getCouponStatus(coupon) === filter;
    return matchesText && matchesFilter;
  }), [coupons, filter, query]);

  const openCreate = () => { setForm(freshForm()); setProductSearch(''); };
  const openEdit = (coupon: CouponRecord) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_discount: coupon.max_discount === null ? '' : String(coupon.max_discount),
      minimum_order_value: String(coupon.minimum_order_value),
      starts_at: inputIST(coupon.starts_at),
      expires_at: inputIST(coupon.expires_at),
      usage_limit: coupon.usage_limit === null ? '' : String(coupon.usage_limit),
      per_customer_limit: coupon.per_customer_limit === null ? '' : String(coupon.per_customer_limit),
      eligibility: coupon.eligibility,
      apply_to: coupon.apply_to,
      product_ids: (coupon.coupon_products || []).map((item) => item.product_id),
      category_keys: (coupon.coupon_categories || []).map((item) => item.category_key),
      description: coupon.description || '',
      is_enabled: coupon.is_enabled,
    });
    setProductSearch('');
  };

  const showDetails = async (coupon: CouponRecord) => {
    setDetails(coupon);
    setDetailsLoading(true);
    const response = await loadCouponUsages(coupon.id);
    setUsageRows(response.data);
    setUsageSummary(response.summary);
    setDetailsLoading(false);
    if (response.error) notify(response.error);
  };

  const handleDisable = async (coupon: CouponRecord) => {
    if (!window.confirm(`Disable ${coupon.code}? Customers will no longer be able to use it.`)) return;
    const response = await disableAdminCoupon(coupon.id);
    if (response.error) { notify(response.error); return; }
    notify(`${coupon.code} disabled`);
    await refresh();
  };

  const handleDelete = async (coupon: CouponRecord) => {
    if (!window.confirm(`Delete unused coupon ${coupon.code}? This cannot be undone.`)) return;
    const response = await deleteUnusedAdminCoupon(coupon.id);
    if (response.error) { notify(response.error); return; }
    notify(`${coupon.code} deleted`);
    await refresh();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const code = form.code.toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) { notify('Use 3–40 letters, numbers, underscores or hyphens for the code.'); return; }
    const value = Number(form.discount_value);
    if (!Number.isFinite(value) || value <= 0 || (form.discount_type === 'PERCENTAGE' && value > 100)) { notify('Enter a valid discount value.'); return; }
    if (!form.starts_at || !form.expires_at || new Date(asTimestamp(form.expires_at)) <= new Date(asTimestamp(form.starts_at))) { notify('Expiry must be after the start time.'); return; }
    if (form.apply_to === 'SELECTED_PRODUCTS' && form.product_ids.length === 0) { notify('Select at least one product.'); return; }
    if (form.apply_to === 'SELECTED_CATEGORIES' && form.category_keys.length === 0) { notify('Select at least one category.'); return; }
    const payload: CouponPayload = {
      ...(form.id ? { id: form.id } : {}),
      code,
      discount_type: form.discount_type,
      discount_value: value,
      max_discount: form.discount_type === 'PERCENTAGE' && form.max_discount.trim() ? Number(form.max_discount) : null,
      minimum_order_value: Number(form.minimum_order_value || 0),
      starts_at: asTimestamp(form.starts_at),
      expires_at: asTimestamp(form.expires_at),
      usage_limit: form.usage_limit.trim() ? Number(form.usage_limit) : null,
      per_customer_limit: form.per_customer_limit.trim() ? Number(form.per_customer_limit) : null,
      eligibility: form.eligibility,
      apply_to: form.apply_to,
      product_ids: form.apply_to === 'SELECTED_PRODUCTS' ? form.product_ids : [],
      category_keys: form.apply_to === 'SELECTED_CATEGORIES' ? form.category_keys : [],
      description: form.description.trim() || null,
      is_enabled: form.is_enabled,
    };
    setSaving(true);
    const response = await saveAdminCoupon(payload);
    setSaving(false);
    if (response.error) { notify(response.error); return; }
    notify(`Coupon ${code} ${form.id ? 'updated' : 'created'} successfully.`);
    setForm(null);
    await refresh();
  };

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(productSearch.toLowerCase()));

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">Dashboard / Marketing</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Coupons</h2><p className="mt-1 text-sm text-slate-500">Create and manage promotional coupons for Rofik Godi Centre customers.</p></div>
      <button onClick={openCreate} disabled={Boolean(error)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-3 text-xs font-black text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Create Coupon</button>
    </div>

    {error && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Coupon management is protected</p><p className="mt-1 text-xs leading-relaxed">{error}</p><button onClick={() => void refresh()} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-amber-200">Retry connection</button></div></div>}

    {!error && <>
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Total coupons" value={String(coupons.length)} icon={<TicketPercent className="h-4 w-4" />} tone="bg-red-50 text-[#D9232D]" /><Metric label="Currently active" value={String(counts.ACTIVE || 0)} icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-emerald-50 text-emerald-700" /><Metric label="Total redemptions" value={coupons.reduce((sum, coupon) => sum + coupon.used_count, 0).toLocaleString('en-IN')} icon={<BarChart3 className="h-4 w-4" />} tone="bg-blue-50 text-blue-700" /></div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by coupon code" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-semibold outline-none focus:border-[#D9232D]" /></div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><Filter className="h-4 w-4 shrink-0 text-slate-400" />{filters.map((value) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full px-3 py-2 text-[10px] font-black transition ${filter === value ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'}`}>{value === 'All' ? `All (${coupons.length})` : `${statusLabels[value]} (${counts[value] || 0})`}</button>)}</div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading coupons…</div> : visibleCoupons.length === 0 ? <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#D9232D]"><Tag className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-black text-slate-800">{coupons.length ? 'No coupons match this view' : 'No coupons yet'}</h3><p className="mt-1 text-xs text-slate-500">Create a coupon to start a campaign; usage limits are enforced by the database.</p>{!coupons.length && <button onClick={openCreate} className="mt-4 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-black text-white"><Plus className="mr-1 inline h-4 w-4" />Create your first coupon</button>}</div> : <div className="divide-y divide-slate-100">{visibleCoupons.map((coupon) => <CouponRow key={coupon.id} coupon={coupon} onEdit={() => openEdit(coupon)} onDetails={() => void showDetails(coupon)} onDisable={() => void handleDisable(coupon)} onDelete={() => void handleDelete(coupon)} notify={notify} />)}</div>}
      </div>
      <p className="flex items-center gap-2 text-[11px] font-medium text-slate-400"><ShieldGlyph />Coupon checks and final order totals are calculated by secure Supabase functions, not by this page.</p>
    </>}

    {form && <CouponFormModal form={form} setForm={setForm} saving={saving} products={filteredProducts} productSearch={productSearch} setProductSearch={setProductSearch} onClose={() => setForm(null)} onSubmit={handleSubmit} />}
    {details && <CouponDetailsModal coupon={details} usageRows={usageRows} summary={usageSummary} loading={detailsLoading} onClose={() => setDetails(null)} />}
  </div>;
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span><p className="mt-4 text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-xl font-black text-slate-900">{value}</p></div>;

const CouponRow: React.FC<{ coupon: CouponRecord; onEdit: () => void; onDetails: () => void; onDisable: () => void; onDelete: () => void; notify: (message: string) => void }> = ({ coupon, onEdit, onDetails, onDisable, onDelete, notify }) => {
  const status = getCouponStatus(coupon);
  const description = coupon.discount_type === 'PERCENTAGE' ? `${Number(coupon.discount_value)}% OFF${coupon.max_discount ? ` · max ${money(coupon.max_discount)}` : ''}` : `${money(coupon.discount_value)} OFF`;
  return <div className="grid gap-4 px-4 py-5 md:grid-cols-[minmax(230px,1.4fr)_minmax(190px,1fr)_minmax(180px,1fr)_auto] md:items-center md:px-5">
    <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#D9232D]"><Tag className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate font-mono text-sm font-black tracking-wide text-slate-900">{coupon.code}</p><p className="mt-0.5 text-[11px] font-semibold text-slate-500">{description}</p><p className="mt-1 text-[10px] text-slate-400">Min order: {money(coupon.minimum_order_value)}</p></div></div>
    <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Validity · IST</p><p className="mt-1 text-[11px] font-bold text-slate-700">{formatIST(coupon.starts_at)}</p><p className="mt-0.5 text-[11px] text-slate-500">until {formatIST(coupon.expires_at)}</p></div>
    <div className="flex items-center gap-5"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usage</p><p className="mt-1 text-xs font-black text-slate-800">{coupon.used_count} / {coupon.usage_limit ?? '∞'}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Per customer</p><p className="mt-1 text-xs font-black text-slate-800">{coupon.per_customer_limit ?? '∞'}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black ring-1 ${badgeClass[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabels[status]}</span></div>
    <div className="flex flex-wrap gap-1.5 md:justify-end"><button onClick={onDetails} title="View analytics" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><Eye className="h-4 w-4" /></button><button onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50"><Edit3 className="h-3.5 w-3.5" />Edit</button>{coupon.is_enabled && <button onClick={onDisable} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-black text-rose-700 hover:bg-rose-50">Disable</button>}{coupon.used_count === 0 && <button onClick={onDelete} title="Delete unused coupon" className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50"><Trash2 className="h-4 w-4" /></button>}</div>
  </div>;
};

const CouponFormModal: React.FC<{
  form: CouponFormState;
  setForm: React.Dispatch<React.SetStateAction<CouponFormState | null>>;
  saving: boolean;
  products: CouponProductChoice[];
  productSearch: string;
  setProductSearch: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}> = ({ form, setForm, saving, products, productSearch, setProductSearch, onClose, onSubmit }) => {
  const update = <K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const toggle = (key: 'product_ids' | 'category_keys', id: string) => {
    const current = form[key] as string[];
    update(key, (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) as CouponFormState[typeof key]);
  };
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"><form onSubmit={onSubmit} className="my-2 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:my-8">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Marketing · Coupon setup</p><h3 className="mt-1 text-lg font-black text-slate-900">{form.id ? 'Edit coupon' : 'Create coupon'}</h3></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
    <div className="max-h-[calc(100vh-190px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
      <FormSection number="01" title="Basic details" subtitle="Choose a short, memorable code customers can enter at checkout."><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Coupon code<input required maxLength={40} value={form.code} onChange={(event) => update('code', event.target.value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9_-]/g, ''))} placeholder="WELCOME10" className={`${inputClass} font-mono uppercase tracking-wider`} /><span className="mt-1 block text-[10px] font-medium text-slate-400">3–40 characters · letters, numbers, _ and -</span></label><label className={labelClass}>Internal description <span className="font-normal text-slate-400">(optional)</span><input maxLength={500} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="October first-order campaign" className={inputClass} /></label></div></FormSection>
      <FormSection number="02" title="Discount" subtitle="The database calculates the exact discount from catalog prices."><div className="grid gap-4 sm:grid-cols-3"><label className={labelClass}>Discount type<select value={form.discount_type} onChange={(event) => update('discount_type', event.target.value as DiscountType)} className={inputClass}><option value="PERCENTAGE">Percentage (%)</option><option value="FIXED">Fixed amount (₹)</option></select></label><label className={labelClass}>{form.discount_type === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}<input required type="number" min="0.01" max={form.discount_type === 'PERCENTAGE' ? 100 : undefined} step="0.01" value={form.discount_value} onChange={(event) => update('discount_value', event.target.value)} className={inputClass} /></label><label className={labelClass}>Maximum discount (₹)<input type="number" min="0.01" step="0.01" disabled={form.discount_type === 'FIXED'} value={form.discount_type === 'FIXED' ? '' : form.max_discount} onChange={(event) => update('max_discount', event.target.value)} placeholder="Optional cap" className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} /></label></div></FormSection>
      <FormSection number="03" title="Conditions" subtitle="Set the minimum basket value and eligible customer group."><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Minimum order value (₹)<input type="number" min="0" step="1" value={form.minimum_order_value} onChange={(event) => update('minimum_order_value', event.target.value)} className={inputClass} /></label><label className={labelClass}>Customer eligibility<select value={form.eligibility} onChange={(event) => update('eligibility', event.target.value as CouponEligibility)} className={inputClass}><option value="EVERYONE">Everyone</option><option value="FIRST_ORDER">First order only</option><option value="EXISTING_CUSTOMERS">Existing customers</option></select></label></div></FormSection>
      <FormSection number="04" title="Validity" subtitle="All start and expiry times are stored and checked as Asia/Kolkata timestamps."><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Start date & time <span className="font-normal text-slate-400">IST</span><input required type="datetime-local" value={form.starts_at} onChange={(event) => update('starts_at', event.target.value)} className={inputClass} /></label><label className={labelClass}>Expiry date & time <span className="font-normal text-slate-400">IST</span><input required type="datetime-local" value={form.expires_at} onChange={(event) => update('expires_at', event.target.value)} className={inputClass} /></label></div></FormSection>
      <FormSection number="05" title="Usage limits" subtitle="Leave blank for unlimited uses. Limits are checked inside the locked order transaction."><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Total usage limit<input type="number" min="1" step="1" value={form.usage_limit} onChange={(event) => update('usage_limit', event.target.value)} placeholder="Unlimited" className={inputClass} /></label><label className={labelClass}>Limit per customer<input type="number" min="1" step="1" value={form.per_customer_limit} onChange={(event) => update('per_customer_limit', event.target.value)} placeholder="Unlimited" className={inputClass} /></label></div></FormSection>
      <FormSection number="06" title="Product applicability" subtitle="Choose all products, selected products or product categories."><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Apply to<select value={form.apply_to} onChange={(event) => update('apply_to', event.target.value as CouponApplyTo)} className={inputClass}><option value="ALL_PRODUCTS">All products</option><option value="SELECTED_PRODUCTS">Selected products</option><option value="SELECTED_CATEGORIES">Selected categories</option></select></label><div className="flex items-end text-[11px] text-slate-400">For selective campaigns, discounts apply only to eligible item subtotals.</div></div>{form.apply_to === 'SELECTED_PRODUCTS' && <div className="mt-4 rounded-2xl border border-slate-200 p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search active products" className="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none" /></div><div className="mt-2 max-h-44 space-y-1 overflow-y-auto">{products.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-slate-50"><input type="checkbox" checked={form.product_ids.includes(product.id)} onChange={() => toggle('product_ids', product.id)} className="accent-[#D9232D]" /><span className="min-w-0 flex-1 truncate">{product.name}</span><span className="text-[10px] text-slate-400">{product.category_key || '—'}</span></label>)}{products.length === 0 && <p className="px-2 py-3 text-xs text-slate-400">No matching active products loaded.</p>}</div></div>}{form.apply_to === 'SELECTED_CATEGORIES' && <div className="mt-4 grid gap-2 sm:grid-cols-2">{categories.map((category) => <label key={category.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={form.category_keys.includes(category.id)} onChange={() => toggle('category_keys', category.id)} className="accent-[#D9232D]" />{category.label}</label>)}</div>}</FormSection>
      <FormSection number="07" title="Status & review" subtitle="The current status is calculated from enabled state, dates and usage limits."><label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 p-4"><span><span className="block text-xs font-black text-slate-800">Enable coupon</span><span className="mt-1 block text-[10px] text-slate-500">Disabled coupons cannot be applied by customers.</span></span><button type="button" role="switch" aria-checked={form.is_enabled} onClick={() => update('is_enabled', !form.is_enabled)} className={`relative h-6 w-11 rounded-full transition ${form.is_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${form.is_enabled ? 'left-6' : 'left-1'}`} /></button></label><div className="mt-3 rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Review</p><p className="mt-1 font-mono text-sm font-black text-slate-900">{form.code || 'COUPON'} · {form.discount_type === 'PERCENTAGE' ? `${form.discount_value || '0'}%` : money(Number(form.discount_value || 0))} off</p><p className="mt-1 text-[11px] text-slate-500">Min {money(Number(form.minimum_order_value || 0))} · {form.usage_limit || 'Unlimited'} uses · {form.per_customer_limit || 'Unlimited'} per customer</p><p className="mt-1 text-[10px] text-slate-400">{form.starts_at || 'Start date'} → {form.expires_at || 'Expiry date'} IST · {form.eligibility.replaceAll('_', ' ').toLowerCase()}</p></div></FormSection>
    </div>
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600">Cancel</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#D9232D] px-5 py-3 text-xs font-black text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Saving…' : form.id ? 'Save changes' : 'Create Coupon'}</button></div>
  </form></div>;
};

const FormSection: React.FC<{ number: string; title: string; subtitle: string; children: React.ReactNode }> = ({ number, title, subtitle, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-4 flex gap-3"><span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[10px] font-black text-[#D9232D]">{number}</span><div><h4 className="text-sm font-black text-slate-900">{title}</h4><p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p></div></div>{children}</section>;

const CouponDetailsModal: React.FC<{ coupon: CouponRecord; usageRows: CouponUsageRecord[]; summary: CouponAnalyticsSummary; loading: boolean; onClose: () => void }> = ({ coupon, usageRows, summary, loading, onClose }) => {
  const status = getCouponStatus(coupon);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">Coupon analytics</p><h3 className="mt-1 font-mono text-2xl font-black">{coupon.code}</h3><p className="mt-1 text-xs text-slate-500">{coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% off` : `${money(coupon.discount_value)} off`} · Valid until {formatIST(coupon.expires_at)}</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Total uses" value={String(summary.total_uses)} icon={<Users className="h-4 w-4" />} tone="bg-blue-50 text-blue-700" /><Metric label="Remaining uses" value={summary.remaining_uses === null ? 'Unlimited' : String(summary.remaining_uses)} icon={<Clock3 className="h-4 w-4" />} tone="bg-amber-50 text-amber-700" /><Metric label="Total discount given" value={money(summary.total_discount_given)} icon={<BarChart3 className="h-4 w-4" />} tone="bg-emerald-50 text-emerald-700" /></div><div className="mt-4 flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ring-1 ${badgeClass[status]}`}>{statusLabels[status]}</span><span className="text-[10px] text-slate-400">Only the latest 100 usage entries are shown; customer IDs are masked.</span></div><div className="mt-6"><h4 className="text-sm font-black">Recent usage</h4><div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Order ID</th><th className="px-3 py-3">Discount</th><th className="px-3 py-3">Date · IST</th></tr></thead><tbody className="divide-y divide-slate-100">{usageRows.map((row) => <tr key={`${row.order_id}-${row.customer_id}`}><td className="px-3 py-3 font-mono font-bold">{row.customer_id.slice(0, 8)}…</td><td className="px-3 py-3 font-mono">{row.order_id.slice(0, 8)}…</td><td className="px-3 py-3 font-bold">{money(Number(row.discount_amount))}</td><td className="px-3 py-3 text-slate-500">{formatIST(row.created_at)}</td></tr>)}</tbody></table>{loading ? <div className="flex items-center justify-center gap-2 p-6 text-xs font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading usage…</div> : usageRows.length === 0 && <p className="p-8 text-center text-xs text-slate-400">No successful redemptions yet.</p>}</div></div><button onClick={onClose} className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-xs font-black text-white">Close analytics</button></div></div>;
};

const ShieldGlyph = () => <CalendarClock className="h-4 w-4 text-emerald-600" />;
