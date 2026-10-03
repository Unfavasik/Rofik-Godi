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
            setMessage('QR token captured. Verify it to mark the order picked up.');
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
    const result = await verifyStorePickupToken(token);
    setIsBusy(false);
    if (result.error) {
      setMessage(result.error.message || 'Pickup token could not be verified.');
      return;
    }
    setMessage(`Order #${result.data?.order_number || ''} marked as picked up.`);
    setToken('');
    onVerified();
  };

  return (
    <>
      <button type="button" onClick={() => { setIsOpen(true); setMessage(''); }} className="inline-flex items-center gap-2 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700">
        <QrCode className="h-4 w-4" /> Scan pickup QR
      </button>
      {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div><h3 className="text-base font-black">Verify store pickup</h3><p className="mt-1 text-[11px] text-slate-500">Verify the one-time customer QR before handover.</p></div>
            <button type="button" onClick={() => { stopScanner(); setIsOpen(false); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl bg-slate-950">
            <video ref={videoRef} muted playsInline className={`aspect-video w-full object-cover ${isScanning ? 'block' : 'hidden'}`} />
            {!isScanning && <div className="flex aspect-video items-center justify-center text-center text-xs font-semibold text-slate-400"><Camera className="mr-2 h-5 w-5" />Camera preview starts when you scan</div>}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void startScanner()} disabled={isScanning || isBusy} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"><Camera className="mr-1 inline h-4 w-4" />{isScanning ? 'Scanning…' : 'Scan QR'}</button>
            {isScanning && <button type="button" onClick={stopScanner} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Stop</button>}
          </div>
          <label className="mt-4 block text-[11px] font-bold text-slate-600">Pickup token<input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste or type the customer pickup token" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" /></label>
          <button type="button" onClick={() => void verify()} disabled={isBusy || !token.trim()} className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-xs font-black text-white disabled:opacity-50">{isBusy ? 'Verifying…' : 'Verify & Mark Picked Up'}</button>
          {message && <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{message}</p>}
        </div>
      </div>}
    </>
  );
};
