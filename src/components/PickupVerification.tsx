import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, QrCode, X } from 'lucide-react';
import { verifyStorePickupToken } from '../lib/supabaseAdminOrders';

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new () => BarcodeDetectorLike;

type BarcodeWindow = Window & { BarcodeDetector?: BarcodeDetectorConstructor };

interface PickupVerificationProps {
  onVerified: () => void;
}

export const PickupVerification: React.FC<PickupVerificationProps> = ({ onVerified }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  const stopScanner = () => {
    if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => stopScanner, []);

  const startScanner = async () => {
    const BarcodeDetector = (window as BarcodeWindow).BarcodeDetector;
    if (!BarcodeDetector) {
      setMessage('Camera QR scanning is not supported here. Enter the pickup token manually.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsScanning(true);
      const detector = new BarcodeDetector();
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current as unknown as ImageBitmapSource);
          const value = results.find((result) => result.rawValue)?.rawValue;
          if (value) {
            setToken(value);
            setMessage('QR token captured. Verify it to record pickup and complete the order.');
            stopScanner();
            return;
          }
        } catch {
          // Continue scanning while the camera is active.
        }
        scanFrameRef.current = requestAnimationFrame(() => { void scan(); });
      };
      void scan();
    } catch {
      setMessage('Unable to access the camera. Enter the pickup token manually.');
      stopScanner();
    }
  };

  const verify = async () => {
    if (!token.trim()) {
      setMessage('Scan the customer QR code or enter the pickup token.');
      return;
    }
    setIsBusy(true);
    setMessage('Verifying pickup token…');
    try {
      const result = await verifyStorePickupToken(token);
      if (result.error) {
        setMessage(result.error.message || 'Pickup token could not be verified.');
        return;
      }
      setMessage(`Order #${result.data?.order_number || ''} completed after verified pickup.`);
      setToken('');
      onVerified();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pickup token could not be verified.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => { setIsOpen(true); setMessage(''); }} className="banner-cta-shine group/cta inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-105 hover:shadow-md active:scale-95">
        <QrCode className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:scale-105" /> Scan pickup QR
      </button>
      {isOpen && <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-0 sm:items-center sm:p-4">
        <div className="max-h-[92dvh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1"><h3 className="text-sm font-black sm:text-base">Verify store pickup</h3><p className="mt-0.5 text-[11px] text-slate-500">A valid one-time QR records pickup and completes the order.</p></div>
            <button type="button" onClick={() => { stopScanner(); setIsOpen(false); }} aria-label="Close pickup verification" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl bg-slate-950">
            <video ref={videoRef} muted playsInline className={`aspect-video w-full object-cover ${isScanning ? 'block' : 'hidden'}`} />
            {!isScanning && <div className="flex aspect-video items-center justify-center px-3 text-center text-xs font-semibold text-slate-400"><Camera className="mr-2 h-4 w-4 shrink-0" />Camera preview starts when you scan</div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void startScanner()} disabled={isScanning || isBusy} className="min-h-9 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><Camera className="mr-1 inline h-3.5 w-3.5" />{isScanning ? 'Scanning…' : 'Scan QR'}</button>
            {isScanning && <button type="button" onClick={stopScanner} className="min-h-9 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600">Stop</button>}
          </div>
          <label className="mt-3 block text-[11px] font-bold text-slate-600">Pickup token<input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste or type the customer pickup token" className="mt-1 min-h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-xs outline-none focus:border-[#D9232D]" /></label>
          <button type="button" onClick={() => void verify()} disabled={isBusy || !token.trim()} className="banner-cta-shine mt-2.5 min-h-9 w-full rounded-xl bg-slate-900 py-2 text-xs font-black text-white hover:bg-black active:scale-[0.98] disabled:opacity-50">{isBusy ? 'Verifying…' : 'Verify & Complete Order'}</button>
          {message && <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 break-words"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{message}</p>}
        </div>
      </div>}
    </>
  );
};
