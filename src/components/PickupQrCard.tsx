import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import type { CustomerOrderRecord } from '../types';
import { canShowPickupQr } from '../lib/orderPresentation';
import { issueMyStorePickupToken } from '../lib/supabaseOrders';

interface PickupQrCardProps {
  order: CustomerOrderRecord;
  onRefresh?: () => Promise<void> | void;
}

export function PickupQrCard({ order, onRefresh }: PickupQrCardProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!canShowPickupQr(order.status)) {
      setToken(null);
      setLoading(false);
      setError('');
      return;
    }

    let active = true;
    setToken(null);
    setError('');
    setLoading(true);
    void issueMyStorePickupToken(order.order_number)
      .then(({ data, error: tokenError }) => {
        if (!active) return;
        if (tokenError) {
          setError(tokenError.message || 'Pickup QR could not be loaded.');
        } else if (!data) {
          setError('This order is no longer waiting for pickup. Refresh your orders.');
          void onRefresh?.();
        } else {
          setToken(data);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Pickup QR could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [order.order_number, order.status, onRefresh, retry]);

  if (!canShowPickupQr(order.status)) return null;

  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.03)] sm:p-3" aria-label="Pickup QR code">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><QrCode className="h-3.5 w-3.5" /></span>
        <div>
          <p className="text-[11.5px] font-black text-slate-900">Pickup QR code</p>
          <p className="mt-0.5 text-[9.5px] text-slate-500">Show this code to the admin when your order is ready.</p>
        </div>
      </div>
      {loading ? (
        <div className="grid min-h-24 place-items-center rounded-lg bg-slate-50 text-[10.5px] font-semibold text-slate-500">Loading your secure QR…</div>
      ) : token ? (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-emerald-50/60 p-2.5">
          <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <QRCodeSVG value={token} size={104} level="M" title={`Pickup QR for order ${order.order_number}`} />
          </div>
          <p className="text-center text-[9.5px] leading-snug text-slate-500">This one-time QR disappears after pickup or order completion.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 p-2 text-center">
          <p className="text-[10px] leading-snug text-amber-800">{error || 'Pickup QR is temporarily unavailable.'}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-1.5 rounded-lg bg-white px-2.5 py-1 text-[9.5px] font-extrabold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">Try again</button>
        </div>
      )}
    </section>
  );
}
