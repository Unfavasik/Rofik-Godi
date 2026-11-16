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
    <section className="rounded-[22px] border border-[#E6CE73] bg-white p-4 shadow-[0_4px_18px_rgba(43,22,17,0.04)] sm:p-5" aria-label="Pickup QR code">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF8D6] text-[#6B352A]"><QrCode className="h-4 w-4" /></span>
        <div>
          <p className="text-xs font-black text-[#2B1611]">Pickup QR code</p>
          <p className="mt-0.5 text-[10px] text-[#6B4C44]">Show this code to the admin when your order is ready.</p>
        </div>
      </div>
      {loading ? (
        <div className="grid min-h-36 place-items-center rounded-xl bg-[#FAF4EA] text-[11px] font-semibold text-[#6B4C44]">Loading your secure QR…</div>
      ) : token ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-[#FFF8D6]/80 p-4">
          <div className="rounded-xl border border-[#E8D8C4] bg-white p-3 shadow-sm">
            <QRCodeSVG value={token} size={160} level="M" title={`Pickup QR for order ${order.order_number}`} />
          </div>
          <p className="text-center text-[10px] leading-relaxed text-[#6B4C44]">This one-time QR disappears after pickup or order completion.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E6CE73] bg-[#FFF8D6] p-3 text-center">
          <p className="text-[10px] leading-relaxed text-[#6B352A]">{error || 'Pickup QR is temporarily unavailable.'}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 rounded-lg bg-[#6B352A] px-3 py-1.5 text-[10px] font-extrabold text-[#FFF1A6] hover:bg-[#53271E]">Try again</button>
        </div>
      )}
    </section>
  );
}
