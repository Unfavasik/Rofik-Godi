import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownUp,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  FileText,
  IndianRupee,
  List,
  Mail,
  Package,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  ShoppingBag,
  Tag,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import type { AdminCustomer } from '../lib/supabaseAdmin';
import { addAdminCustomerNoteAndNotify, loadAdminJsonSetting, saveAdminJsonSetting } from '../lib/supabaseAdmin';
import { matchesAdminOrderToCustomer, type AdminOrderRecord } from '../lib/supabaseAdminOrders';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';

type CustomerProfileTab = 'orders' | 'details' | 'notes';
type CustomerNoteCategory = 'Important' | 'Delivery' | 'Payment' | 'Call' | 'General';
type CustomerNote = {
  id: string;
  category: CustomerNoteCategory;
  content: string;
  createdAt: string;
  author: string;
  customerNotifiedAt?: string;
};
type NotesByCustomer = Record<string, CustomerNote[]>;

const noteCategories: Array<{ label: CustomerNoteCategory; icon: LucideIcon }> = [
  { label: 'Important', icon: Crown },
  { label: 'Delivery', icon: Package },
  { label: 'Payment', icon: IndianRupee },
  { label: 'Call', icon: Phone },
  { label: 'General', icon: Tag },
];

const categoryClasses: Record<CustomerNoteCategory, string> = {
  Important: 'bg-rose-50 text-rose-700 ring-rose-100',
  Delivery: 'bg-blue-50 text-blue-700 ring-blue-100',
  Payment: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Call: 'bg-violet-50 text-violet-700 ring-violet-100',
  General: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function dateLabel(value: string | null, includeTime = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(
    'en-IN',
    includeTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' },
  );
}

function isNoteCategory(value: unknown): value is CustomerNoteCategory {
  return noteCategories.some((category) => category.label === value);
}

function isCustomerNote(value: unknown): value is CustomerNote {
  if (!value || typeof value !== 'object') return false;
  const note = value as Partial<CustomerNote>;
  return (
    typeof note.id === 'string' &&
    isNoteCategory(note.category) &&
    typeof note.content === 'string' &&
    typeof note.createdAt === 'string' &&
    typeof note.author === 'string' &&
    (note.customerNotifiedAt === undefined || typeof note.customerNotifiedAt === 'string')
  );
}

function normalizeNotes(value: unknown): NotesByCustomer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([customerId, entries]) => [
      customerId,
      Array.isArray(entries) ? entries.filter(isCustomerNote) : [],
    ]),
  );
}

function findProductImage(item: AdminOrderRecord['items'][number], products: Product[]) {
  const catalog = [...products, ...PRODUCTS];
  const byId = item.product_id
    ? catalog.find((product) => product.id === item.product_id)
    : undefined;
  const normalizedName = item.product_name?.trim().toLowerCase();
  const byName = normalizedName
    ? catalog.find((product) => product.title.trim().toLowerCase() === normalizedName)
    : undefined;
  return byId?.image || byName?.image || '';
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const style =
    normalized === 'COMPLETED' || normalized === 'PICKED_UP'
      ? 'bg-emerald-50 text-emerald-700'
      : normalized === 'CANCELLED'
        ? 'bg-rose-50 text-rose-700'
        : normalized === 'NEW'
          ? 'bg-blue-50 text-blue-700'
          : 'bg-amber-50 text-amber-700';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className={`min-w-0 rounded-xl p-3 text-center ${tone}`}>
      <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-white/75">
        <Icon className="h-4 w-4" />
      </span>
      <p
        className="mt-1.5 truncate text-sm font-black tracking-tight text-slate-900 sm:text-base"
        title={value}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-500">{label}</p>
    </article>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  accent = 'bg-blue-50 text-blue-600',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2.5 border-t border-slate-100 py-2.5 first:border-t-0 sm:grid sm:grid-cols-[34px_minmax(115px,.8fr)_minmax(0,1.3fr)] sm:items-center sm:gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${accent}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 pt-1 text-[11px] font-semibold text-slate-500 sm:pt-0 sm:text-xs">{label}</span>
      <span className="w-full min-w-0 break-words pl-[42px] text-xs font-semibold text-slate-800 sm:w-auto sm:pl-0 sm:text-[13px]">
        {value || 'Not available'}
      </span>
    </div>
  );
}

export interface AdminCustomerProfileProps {
  customer: AdminCustomer | null;
  customerId: string;
  avatarUrl: string | null;
  orders: AdminOrderRecord[];
  products: Product[];
  isLoading: boolean;
  onBack: () => void;
  onOpenOrder: (order: AdminOrderRecord) => void;
}

export const AdminCustomerProfile: React.FC<AdminCustomerProfileProps> = ({
  customer,
  customerId,
  avatarUrl,
  orders,
  products,
  isLoading,
  onBack,
  onOpenOrder,
}) => {
  const [activeTab, setActiveTab] = useState<CustomerProfileTab>('orders');
  const [notesByCustomer, setNotesByCustomer] = useState<NotesByCustomer>({});
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<CustomerNoteCategory>('Important');
  const [noteSort, setNoteSort] = useState<'newest' | 'oldest'>('newest');
  const [editNoticeOpen, setEditNoticeOpen] = useState(false);
  const pendingNoteRef = useRef<{
    customerId: string;
    noteId: string;
    category: CustomerNoteCategory;
    content: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setNotesLoading(true);
    setNotesError('');
    void loadAdminJsonSetting<unknown>('admin_customer_notes', {})
      .then(({ data, error }) => {
        if (!active) return;
        setNotesByCustomer(normalizeNotes(data));
        setNotesError(error?.message || '');
        setNotesLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setNotesError(
          error instanceof Error ? error.message : 'Customer notes could not be loaded.',
        );
        setNotesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  const history = useMemo(
    () =>
      customer
        ? orders
            .filter((order) => matchesAdminOrderToCustomer(order, customer))
            .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        : [],
    [customer, orders],
  );
  const customerNotes = useMemo(
    () => notesByCustomer[customerId] || [],
    [customerId, notesByCustomer],
  );
  const sortedNotes = useMemo(
    () =>
      [...customerNotes].sort((left, right) => {
        const difference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
        return noteSort === 'newest' ? -difference : difference;
      }),
    [customerNotes, noteSort],
  );

  const saveNotes = async (nextNotesByCustomer: NotesByCustomer) => {
    setNotesSaving(true);
    setNotesError('');
    try {
      const { error } = await saveAdminJsonSetting('admin_customer_notes', nextNotesByCustomer);
      if (error) {
        setNotesError(error.message);
        return false;
      }
      setNotesByCustomer(nextNotesByCustomer);
      return true;
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : 'Customer notes could not be saved.');
      return false;
    } finally {
      setNotesSaving(false);
    }
  };

  const addNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = noteText.trim();
    if (!content || !customer) return;
    const pending = pendingNoteRef.current;
    const noteId =
      pending &&
      pending.customerId === customer.id &&
      pending.category === noteCategory &&
      pending.content === content
        ? pending.noteId
        : typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    pendingNoteRef.current = {
      customerId: customer.id,
      noteId,
      category: noteCategory,
      content,
    };
    setNotesSaving(true);
    setNotesError('');
    try {
      const { data, error } = await addAdminCustomerNoteAndNotify({
        customerId: customer.id,
        noteId,
        category: noteCategory,
        content,
      });
      if (error) {
        setNotesError(`Note could not be saved and delivered: ${error.message}`);
        return;
      }
      if (!isCustomerNote(data)) {
        setNotesError('The server did not confirm note delivery. Please retry.');
        return;
      }
      setNotesByCustomer((current) => ({
        ...current,
        [customer.id]: [data, ...(current[customer.id] || [])],
      }));
      setNoteText('');
      pendingNoteRef.current = null;
    } catch (error) {
      setNotesError(
        error instanceof Error
          ? `Note could not be saved and delivered: ${error.message}`
          : 'Note could not be saved and delivered. Please retry.',
      );
    } finally {
      setNotesSaving(false);
    }
  };

  const removeNote = async (noteId: string) => {
    const next = {
      ...notesByCustomer,
      [customerId]: customerNotes.filter((note) => note.id !== noteId),
    };
    await saveNotes(next);
  };

  if (!customer) {
    return (
      <section className="mx-auto max-w-4xl" aria-labelledby="customer-profile-title">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </button>
        <div
          className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
          role={isLoading ? 'status' : 'alert'}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 id="customer-profile-title" className="mt-4 text-lg font-black text-slate-900">
            {isLoading ? 'Loading customer profile' : 'Customer not found'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
            {isLoading
              ? 'Loading this customer’s account and order history from the store.'
              : `No customer record is available for ${customerId}. Return to the customer list and try again.`}
          </p>
        </div>
      </section>
    );
  }

  const initials = customer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const completedOrders = history.filter(
    (order) => order.status === 'COMPLETED' || order.status === 'PICKED_UP',
  ).length;
  const newOrders = history.filter((order) => order.status === 'NEW').length;
  const averageOrderValue = customer.orderCount > 0 ? customer.totalSpent / customer.orderCount : 0;
  const tabs: Array<{ id: CustomerProfileTab; label: string; icon: LucideIcon }> = [
    { id: 'orders', label: 'Order history', icon: List },
    { id: 'details', label: 'Details', icon: UserRound },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <section className="mx-auto w-full max-w-[960px] overflow-x-hidden pb-6" aria-labelledby="customer-profile-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <h2
          id="customer-profile-title"
          className="text-lg font-black tracking-tight text-slate-900 sm:text-xl"
        >
          Customer profile
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="min-h-9 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          All customers
        </button>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-[#f1f8ff] to-blue-50 p-3.5 shadow-[0_10px_30px_rgba(36,99,160,.06)] sm:p-4">
        <div className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-white/70 blur-2xl" />
        <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-center">
          <div className="relative mx-auto grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 text-xl font-black text-white shadow-[0_8px_20px_rgba(37,99,235,.22)] sm:mx-0 sm:h-20 sm:w-20 sm:text-2xl">
            <span aria-hidden="true">{initials || 'C'}</span>
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={`${customer.name} profile photo`}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h3 className="max-w-full truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                {customer.name}
              </h3>
            </div>
            <div className="mt-2 flex flex-col items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:items-start">
              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{customer.email || 'Email not available'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span>{customer.phone || 'Phone not available'}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditNoticeOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white sm:self-start"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <SummaryTile
          icon={ShoppingBag}
          label="Total orders"
          value={Number(customer.orderCount || 0).toLocaleString('en-IN')}
          tone="bg-blue-50"
        />
        <SummaryTile
          icon={IndianRupee}
          label="Total spending"
          value={money(customer.totalSpent)}
          tone="bg-emerald-50"
        />
        <SummaryTile
          icon={CalendarDays}
          label="Customer since"
          value={dateLabel(customer.createdAt, false)}
          tone="bg-violet-50"
        />
        <SummaryTile
          icon={RefreshCw}
          label="Status"
          value={customer.status || 'New'}
          tone="bg-orange-50"
        />
      </div>

      <div
        className="mt-3 rounded-full bg-slate-100 p-1"
        role="tablist"
        aria-label="Customer profile sections"
      >
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`customer-profile-tab-${id}`}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`customer-profile-panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-bold transition sm:gap-1.5 sm:px-3 sm:text-xs ${activeTab === id ? 'bg-[#101f3d] text-white shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        id="customer-profile-panel-orders"
        role="tabpanel"
        aria-labelledby="customer-profile-tab-orders"
        hidden={activeTab !== 'orders'}
        className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_20px_rgba(15,23,42,.035)] sm:p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              Recent order history
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              Latest orders placed by this customer, with saved product details.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            {history.length} {history.length === 1 ? 'order' : 'orders'} loaded
          </span>
        </div>
        <div className="mt-2.5 space-y-2.5">
          {history.map((order) => {
            const firstItem = order.items[0];
            const firstImage = firstItem ? findProductImage(firstItem, products) : '';
            const visibleItems = order.items.slice(0, 3);
            return (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order)}
                    aria-label={`Open order ${order.orderNumber}`}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-300 sm:h-14 sm:w-14">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={firstItem?.product_name || 'Order product'}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-black text-slate-900">
                        {order.id}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500 sm:text-[11px]">
                        {dateLabel(order.createdAt)}
                      </span>
                      <span className="mt-1.5 block">
                        <StatusPill status={order.status} />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-black text-slate-900 sm:text-sm">
                      {money(order.amount)}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                </div>
                {order.items.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    {visibleItems.map((item, index) => {
                      const image = findProductImage(item, products);
                      return (
                        <span
                          key={`${order.id}-${item.product_id || item.product_name}-${index}`}
                          title={item.product_name || 'Product'}
                          className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-300 ring-1 ring-slate-200"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={item.product_name || 'Order item'}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-3.5 w-3.5" />
                          )}
                        </span>
                      );
                    })}
                    {order.items.length > visibleItems.length && (
                      <span className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-bold text-slate-500">
                        +{order.items.length - visibleItems.length} more
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-slate-500">
                      {order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)}{' '}
                      {order.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
          {!history.length && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-300 shadow-sm">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-xs font-bold text-slate-700">No matching order records</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Orders for this customer will appear here when available.
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        id="customer-profile-panel-details"
        role="tabpanel"
        aria-labelledby="customer-profile-tab-details"
        hidden={activeTab !== 'details'}
        className="mt-3 space-y-3"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_20px_rgba(15,23,42,.035)] sm:p-4">
          <div className="mb-2.5">
            <h3 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              Customer details
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Basic information associated with this customer account.
            </p>
          </div>
          <DetailRow icon={UserRound} label="Full name" value={customer.name} />
          <DetailRow icon={Mail} label="Email address" value={customer.email} />
          <DetailRow icon={Phone} label="Phone number" value={customer.phone} />
          <DetailRow
            icon={UsersRound}
            label="Customer type"
            value={`${customer.status || 'New'} customer`}
          />
          <DetailRow
            icon={CalendarDays}
            label="Customer since"
            value={dateLabel(customer.createdAt, false)}
          />
          <DetailRow icon={ShoppingBag} label="Last order" value={dateLabel(customer.lastOrder)} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_20px_rgba(15,23,42,.035)] sm:p-4">
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              Order insights
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              A quick summary of this customer’s order activity.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryTile
              icon={ShoppingBag}
              label="Total orders"
              value={Number(customer.orderCount || 0).toLocaleString('en-IN')}
              tone="bg-blue-50"
            />
            <SummaryTile
              icon={CheckCircle2}
              label="Completed in history"
              value={completedOrders.toLocaleString('en-IN')}
              tone="bg-emerald-50"
            />
            <SummaryTile
              icon={Clock3}
              label="New in history"
              value={newOrders.toLocaleString('en-IN')}
              tone="bg-violet-50"
            />
            <SummaryTile
              icon={BarChart3}
              label="Average order value"
              value={money(averageOrderValue)}
              tone="bg-orange-50"
            />
          </div>
          <p className="mt-2.5 text-[10px] text-slate-400">
            Order-status insights use the latest orders loaded by the admin workspace.
          </p>
        </section>
      </div>

      <div
        id="customer-profile-panel-notes"
        role="tabpanel"
        aria-labelledby="customer-profile-tab-notes"
        hidden={activeTab !== 'notes'}
        className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_20px_rgba(15,23,42,.035)] sm:p-4"
      >
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
            Customer notes
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            New notes are sent to this customer as in-app notifications. Existing team-only notes are not sent retroactively.
          </p>
        </div>
        <form onSubmit={(event) => void addNote(event)} className="mt-3">
          <label htmlFor="customer-note-content" className="sr-only">
            Write a note to this customer
          </label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea
              id="customer-note-content"
              value={noteText}
              maxLength={500}
              onChange={(event) => setNoteText(event.target.value)}
              rows={2}
              placeholder="Write a note to share with this customer…"
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 py-2.5 pl-9 pr-4 text-base leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 sm:text-xs"
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400">
              {noteText.length}/500
            </span>
          </div>
          <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5" aria-label="Note category">
              {noteCategories.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={noteCategory === label}
                  onClick={() => setNoteCategory(label)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition sm:text-[10px] ${noteCategory === label ? categoryClasses[label] : 'bg-white text-slate-400 ring-slate-200 hover:text-slate-700'}`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!noteText.trim() || notesSaving}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#101f3d] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 sm:text-[11px]"
            >
              <Send className="h-3.5 w-3.5" />
              {notesSaving ? 'Saving & notifying…' : 'Save & notify'}
            </button>
          </div>
        </form>
        {notesError && (
          <div
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800"
            role="status"
          >
            Note update was not confirmed: {notesError}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
          <h4 className="text-xs font-black text-slate-900 sm:text-sm">Notes ({customerNotes.length})</h4>
          <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold text-slate-600 sm:text-[11px]">
            <ArrowDownUp className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">Sort notes</span>
            <select
              aria-label="Sort notes"
              value={noteSort}
              onChange={(event) => setNoteSort(event.target.value as 'newest' | 'oldest')}
              className="bg-transparent outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
        <div className="mt-2.5 space-y-2">
          {notesLoading ? (
            <p
              className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400"
              role="status"
            >
              Loading customer notes…
            </p>
          ) : sortedNotes.length ? (
            sortedNotes.map((note) => {
              const Icon =
                noteCategories.find((category) => category.label === note.category)?.icon || Tag;
              return (
                <article
                  key={note.id}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${categoryClasses[note.category].split(' ').slice(0, 2).join(' ')}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ${categoryClasses[note.category]}`}
                      >
                        {note.category}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${note.customerNotifiedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {note.customerNotifiedAt ? 'Sent to customer' : 'Team-only'}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                      {note.content}
                    </p>
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      Added by {note.author || 'Admin'} <span className="px-1">·</span>{' '}
                      {dateLabel(note.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeNote(note.id)}
                    disabled={notesSaving}
                    aria-label={`Remove ${note.category.toLowerCase()} note`}
                    title={note.customerNotifiedAt ? 'Remove from admin notes only; the customer notification cannot be recalled.' : 'Remove note'}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
              <FileText className="mx-auto h-5 w-5 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-600">No notes yet</p>
              <p className="mt-1 text-[10px] text-slate-400">
                Add a note to keep helpful context with this customer profile.
              </p>
            </div>
          )}
        </div>
      </div>

      {editNoticeOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden bg-slate-950/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditNoticeOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-edit-notice-title"
            className="max-h-[92dvh] w-full max-w-full overflow-y-auto overflow-x-hidden rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
                  Customer account
                </p>
                <h3
                  id="customer-edit-notice-title"
                  className="mt-1 text-base font-black text-slate-900"
                >
                  Profile details are read-only
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditNoticeOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2.5 text-xs leading-5 text-slate-600">
              Name, email and phone are managed through the customer’s account. This admin workspace
              does not have permission to change those fields.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditNoticeOpen(false);
                setActiveTab('details');
              }}
              className="mt-4 min-h-9 w-full rounded-xl bg-[#101f3d] px-4 py-2 text-xs font-bold text-white"
            >
              View customer details
            </button>
          </section>
        </div>
      )}
    </section>
  );
};
