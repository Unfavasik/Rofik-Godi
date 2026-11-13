import { useMemo, useState } from 'react';
import type { AdminCustomer } from '../lib/supabaseAdmin';

export type NotificationAudience = 'NONE' | 'ALL' | 'SELECTED';

export function NotificationAudiencePicker({
  customers,
  audience,
  selectedUserIds,
  onAudienceChange,
  onSelectedUserIdsChange,
  allowNone = false,
  disabled = false,
}: {
  customers: AdminCustomer[];
  audience: NotificationAudience;
  selectedUserIds: string[];
  onAudienceChange: (audience: NotificationAudience) => void;
  onSelectedUserIdsChange: (ids: string[]) => void;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const visibleCustomers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search),
    );
  }, [customers, query]);

  const toggleCustomer = (id: string) => {
    onSelectedUserIdsChange(
      selectedUserIds.includes(id)
        ? selectedUserIds.filter((selectedId) => selectedId !== id)
        : [...selectedUserIds, id],
    );
  };

  const selectVisible = () => {
    const next = new Set(selectedUserIds);
    visibleCustomers.forEach((customer) => next.add(customer.id));
    onSelectedUserIdsChange([...next]);
  };

  return (
    <fieldset disabled={disabled} className="space-y-3 disabled:opacity-60">
      <legend className="text-xs font-black text-slate-800">Who should receive it?</legend>
      <div className={`grid grid-cols-1 gap-2 ${allowNone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {allowNone && (
          <AudienceOption
            checked={audience === 'NONE'}
            label="No announcement"
            detail="Save the product only"
            onClick={() => onAudienceChange('NONE')}
          />
        )}
        <AudienceOption
          checked={audience === 'ALL'}
          label="All customers"
          detail={`${customers.length} registered accounts at send time`}
          onClick={() => onAudienceChange('ALL')}
        />
        <AudienceOption
          checked={audience === 'SELECTED'}
          label="Selected customers"
          detail="Choose one or more accounts"
          onClick={() => onAudienceChange('SELECTED')}
        />
      </div>

      {audience === 'SELECTED' && (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email or phone"
              aria-label="Search customers"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-[#D9232D] sm:text-xs"
            />
            <button
              type="button"
              onClick={selectVisible}
              disabled={!visibleCustomers.length}
              className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40 sm:text-[10px]"
            >
              Select visible
            </button>
            <button
              type="button"
              onClick={() => onSelectedUserIdsChange([])}
              disabled={!selectedUserIds.length}
              className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40 sm:text-[10px]"
            >
              Clear
            </button>
          </div>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto overflow-x-hidden">
            {visibleCustomers.map((customer) => (
              <label
                key={customer.id}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(customer.id)}
                  onChange={() => toggleCustomer(customer.id)}
                  className="h-4 w-4 accent-[#D9232D]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-slate-800">
                    {customer.name || 'Customer'}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {customer.email || customer.phone || 'Contact not available'}
                  </span>
                </span>
              </label>
            ))}
            {!visibleCustomers.length && (
              <p className="px-2 py-5 text-center text-[11px] text-slate-400">
                {customers.length ? 'No customers match this search.' : 'Customer accounts are loading or unavailable.'}
              </p>
            )}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {selectedUserIds.length} selected
          </p>
        </div>
      )}
    </fieldset>
  );
}

function AudienceOption({
  checked,
  label,
  detail,
  onClick,
}: {
  checked: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${checked ? 'border-[#D9232D] bg-red-50 ring-2 ring-red-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <span className="block text-[11px] font-black text-slate-800">{label}</span>
      <span className="mt-1 block text-[10px] text-slate-500">{detail}</span>
    </button>
  );
}
