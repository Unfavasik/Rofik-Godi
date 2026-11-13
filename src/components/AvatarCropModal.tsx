import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCw, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const VIEW = 288; // square viewport size in CSS px — keep in sync with the h-72 w-72 frame
const OUTPUT = 512; // exported square image size in px

interface AvatarCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

interface Offset {
  x: number;
  y: number;
}

export function AvatarCropModal({ file, onCancel, onConfirm }: AvatarCropModalProps) {
  const { t } = useI18n();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number; cover: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragState = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const pinchState = useRef<{ dist: number; scale: number; cx: number; cy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setObjectUrl(url);
    const img = new Image();
    img.onload = () => {
      const cover = Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
      setImage(img);
      setDims({ w: img.naturalWidth, h: img.naturalHeight, cover });
      setScale(cover);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => setFailed(true);
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const clampScale = useCallback((value: number) => {
    if (!dims) return value;
    return Math.min(dims.cover * 5, Math.max(dims.cover, value));
  }, [dims]);

  // Keep the image covering the circular frame: the offset may not push a gap into view.
  const clampOffset = useCallback((s: number, o: Offset): Offset => {
    if (!dims) return o;
    const maxX = Math.max(0, (dims.w * s - VIEW) / 2);
    const maxY = Math.max(0, (dims.h * s - VIEW) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) };
  }, [dims]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const zoomAround = useCallback((next: number, cx: number, cy: number) => {
    const k = next / scale;
    setScale(next);
    setOffset((o) => clampOffset(next, { x: cx * (1 - k) + o.x * k, y: cy * (1 - k) + o.y * k }));
  }, [scale, clampOffset]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic/inactive pointers (e.g. automation) cannot be captured; dragging still works while the pointer stays over the frame.
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      dragState.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchState.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        ox: offset.x,
        oy: offset.y,
      };
      dragState.current = null;
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1 && dragState.current) {
      const d = dragState.current;
      setOffset(clampOffset(scale, { x: d.ox + (event.clientX - d.px), y: d.oy + (event.clientY - d.py) }));
    } else if (pointers.current.size === 2 && pinchState.current && viewportRef.current) {
      const [a, b] = [...pointers.current.values()];
      const p = pinchState.current;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (p.dist === 0) return;
      const next = clampScale(p.scale * (dist / p.dist));
      const rect = viewportRef.current.getBoundingClientRect();
      zoomAround(next, p.cx - rect.left - VIEW / 2, p.cy - rect.top - VIEW / 2);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    if (pointers.current.size === 1) {
      const [p] = pointers.current.values();
      dragState.current = { px: p.x, py: p.y, ox: offset.x, oy: offset.y };
    } else if (pointers.current.size === 0) {
      dragState.current = null;
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!dims || !viewportRef.current) return;
    const next = clampScale(scale * Math.exp(-event.deltaY * 0.0015));
    if (next === scale) return;
    const rect = viewportRef.current.getBoundingClientRect();
    zoomAround(next, event.clientX - rect.left - VIEW / 2, event.clientY - rect.top - VIEW / 2);
  };

  const onSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!dims) return;
    const next = clampScale(Number(event.target.value));
    const k = next / scale;
    setScale(next);
    setOffset((o) => clampOffset(next, { x: o.x * k, y: o.y * k }));
  };

  const rotate = () => {
    if (!image || !dims) return;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalHeight;
    canvas.height = image.naturalWidth;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    canvas.toBlob((blob) => {
      if (!blob) {
        setFailed(true);
        return;
      }
      const url = URL.createObjectURL(blob);
      const rotated = new Image();
      rotated.onload = () => {
        const cover = Math.max(VIEW / rotated.naturalWidth, VIEW / rotated.naturalHeight);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setImage(rotated);
        setDims({ w: rotated.naturalWidth, h: rotated.naturalHeight, cover });
        setScale(cover);
        setOffset({ x: 0, y: 0 });
      };
      rotated.onerror = () => {
        URL.revokeObjectURL(url);
        setFailed(true);
      };
      rotated.src = url;
    }, 'image/png');
  };

  const confirm = () => {
    if (!image || !dims || exporting) return;
    setExporting(true);
    const cropSize = VIEW / scale;
    const sx = dims.w / 2 - offset.x / scale - cropSize / 2;
    const sy = dims.h / 2 - offset.y / scale - cropSize / 2;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setExporting(false);
      setFailed(true);
      return;
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => {
      setExporting(false);
      if (!blob) {
        setFailed(true);
        return;
      }
      const extension = blob.type === 'image/webp' ? 'webp' : 'png';
      onConfirm(new File([blob], `avatar-${Date.now()}.${extension}`, { type: blob.type }));
    }, 'image/webp', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-x-hidden bg-black" role="dialog" aria-modal="true" aria-label={t('account.cropTitle')}>
      <div className="flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button type="button" aria-label={t('account.cropCancel')} onClick={onCancel} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="min-w-0 truncate text-[13px] font-bold text-white">{t('account.cropTitle')}</h2>
        <button type="button" onClick={confirm} disabled={!dims || exporting} className="min-h-11 shrink-0 rounded-full px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-40">
          {t('account.cropSave')}
        </button>
      </div>

      {failed ? (
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-xs font-semibold text-white/70">{t('account.cropFailed')}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              ref={viewportRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              className="relative h-72 w-72 touch-none select-none overflow-hidden rounded-full bg-zinc-900 ring-4 ring-white/10"
              style={{ cursor: dragState.current ? 'grabbing' : 'grab' }}
            >
              {objectUrl && (
                <img
                  src={objectUrl}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 will-change-transform"
                  style={{ width: dims?.w, height: dims?.h, maxWidth: 'none', transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                />
              )}
            </motion.div>
            <p className="mt-4 text-center text-[10px] font-medium text-white/40">{t('account.cropHint')}</p>
          </div>

          <div className="flex items-center gap-4 px-5 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-2">
            <button type="button" aria-label={t('account.cropRotate')} onClick={rotate} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95">
              <RotateCw className="h-5 w-5" aria-hidden="true" />
            </button>
            <input
              type="range"
              aria-label={t('account.cropZoom')}
              min={dims?.cover ?? 1}
              max={(dims?.cover ?? 1) * 5}
              step="any"
              value={scale}
              disabled={!dims}
              onChange={onSliderChange}
              className="h-1.5 w-full accent-white"
            />
          </div>
        </>
      )}
    </div>
  );
}
