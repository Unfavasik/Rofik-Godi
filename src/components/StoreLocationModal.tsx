import React from 'react';
import { WORKSHOP_INFO } from '../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Phone, ShieldCheck, CheckCircle2, Heart, Share2, Copy, Star, Navigation, Car, Bike, Footprints, Mic, Volume2, ArrowUpRight } from 'lucide-react';

interface StoreLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreLocationModal: React.FC<StoreLocationModalProps> = ({ isOpen, onClose }) => {
  const [screen, setScreen] = React.useState<'detail' | 'directions' | 'navigation'>('detail');
  const [travelMode, setTravelMode] = React.useState<'drive' | 'bike' | 'walk'>('drive');

  const mapEmbedUrl = 'https://www.google.com/maps?q=Kadbeltala%2C%20Berhampore%2C%20Murshidabad%2C%20West%20Bengal%20742101&output=embed';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-white text-[#101828]">
        <div className="mx-auto min-h-screen w-full max-w-[460px] bg-white pb-8">
          <div className="relative h-[310px] overflow-hidden bg-slate-100">
            <iframe src={mapEmbedUrl} title="Map showing Rofik Godi Centre" className="absolute inset-0 h-full w-full border-0" loading="eager" referrerPolicy="no-referrer-when-downgrade" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10" />
            <div className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#ef233c] text-white shadow-xl"><MapPin className="size-7 fill-white" /></div>
            {screen === 'navigation' && <div className="pointer-events-none absolute left-[28%] top-[52%] h-24 w-3 rotate-[28deg] rounded-full bg-[#1769ff] shadow-[0_0_0_3px_white]" />}

            {screen === 'navigation' && <><div className="absolute left-4 right-4 top-5 rounded-3xl bg-[#111820] p-5 text-white shadow-2xl"><div className="flex items-start gap-4"><ArrowUpRight className="mt-1 size-12 rotate-45" /><div><p className="text-3xl font-extrabold">200 m</p><p className="text-base">Turn right onto</p><p className="text-lg font-bold">Kadbeltala Road</p></div><Mic className="ml-auto size-7 rounded-full bg-white/15 p-1" /></div></div><div className="absolute bottom-4 left-4 right-4 rounded-3xl bg-white p-5 text-center shadow-2xl"><p className="text-4xl font-extrabold text-emerald-600">6 min</p><p className="text-sm text-slate-500">1.8 km&nbsp; · &nbsp;9:47 AM</p><button type="button" onClick={() => setScreen('directions')} className="mt-3 text-sm font-bold text-slate-700">Exit navigation</button></div></>}
            <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
              <p className="text-sm font-extrabold text-[#101828]">Rofik Godi Centre</p>
              <p className="text-xs text-slate-500">Kadbeltala, Murshidabad</p>
            </div>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 pt-[calc(env(safe-area-inset-top,0px)+18px)]">
              <button onClick={onClose} aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-white/95 shadow-md"><X className="size-5" /></button>
              <div className="flex gap-2"><button aria-label="Favorite store" className="flex size-10 items-center justify-center rounded-full bg-white/95 text-[#ef233c] shadow-md"><Heart className="size-5 fill-[#ef233c]" /></button><button aria-label="Share store" className="flex size-10 items-center justify-center rounded-full bg-white/95 shadow-md"><Share2 className="size-5" /></button></div>
            </div>
          </div>
          {screen === 'detail' ? <div className="-mt-7 relative rounded-t-[30px] bg-white px-5 pt-5">
            <div className="flex items-center gap-1 text-sm text-amber-500"><Star className="size-5 fill-amber-400" /><strong className="text-lg text-[#101828]">4.8</strong><span className="text-slate-500">(128 reviews)</span></div>
            <h1 className="mt-2 text-[30px] font-extrabold tracking-tight">Rofik Godi Centre</h1>
            <p className="text-sm font-medium text-slate-500">BIKE · TOTO · SEAT COVERS</p>
            <div className="mt-5 grid grid-cols-4 gap-2">{['Premium Seat Covers','Professional Fitting','All Bike & Toto Models','Expert Support'].map((item) => <div key={item} className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-sm"><ShieldCheck className="mb-2 size-7 text-[#ef233c]" /><span className="text-[11px] font-semibold leading-tight text-slate-700">{item}</span></div>)}</div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="flex items-start gap-3 p-4"><MapPin className="mt-1 size-6 shrink-0 text-slate-900" /><div className="flex-1 text-sm font-medium leading-snug text-slate-700"><p>{WORKSHOP_INFO.address}</p></div><button aria-label="Copy address" className="text-slate-700"><Copy className="size-5" /></button></div><div className="border-t border-slate-100 px-4 py-3"><span className="font-bold text-emerald-600">Open Now</span><span className="ml-6 text-sm text-slate-500">{WORKSHOP_INFO.workingHours}</span></div></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setScreen('directions')} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#ef233c] text-base font-bold text-[#ef233c]"><Navigation className="size-5" />Get Directions</button><a href={`tel:${WORKSHOP_INFO.phone}`} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#ef233c] text-base font-bold text-white"><Phone className="size-5" />Call Now</a></div>
            <div className="mt-7"><h2 className="text-xl font-extrabold">Visit us for</h2><div className="mt-3 flex flex-col gap-2">{WORKSHOP_INFO.services.map((s) => <div key={s} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><CheckCircle2 className="size-4 text-emerald-600" />{s}</div>)}</div></div>
          </div> : <div className="relative -mt-7 min-h-[430px] rounded-t-[30px] bg-white px-5 pt-5 shadow-[0_-12px_28px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between"><button type="button" onClick={() => setScreen('detail')} aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-slate-100"><X className="size-5" /></button><h2 className="text-lg font-extrabold">Directions</h2><button type="button" onClick={() => setScreen('navigation')} aria-label="Start navigation" className="flex size-10 items-center justify-center rounded-full bg-slate-100"><ArrowUpRight className="size-5" /></button></div>
            <div className="mt-5 rounded-3xl border border-slate-100 p-4 shadow-sm"><div className="flex items-center gap-3"><div className="size-12 rounded-2xl bg-red-50 p-2"><MapPin className="size-8 text-[#ef233c]" /></div><div><p className="font-extrabold">Rofik Godi Centre</p><p className="text-xs text-slate-500">Kadbeltala, Murshidabad</p></div></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2">{([['drive', Car, '6 min', '1.8 km'], ['bike', Bike, '6 min', '1.8 km'], ['walk', Footprints, '24 min', '1.8 km']] as const).map(([mode, Icon, time, distance]) => <button key={mode} type="button" onClick={() => setTravelMode(mode)} className={`rounded-2xl border p-3 text-center ${travelMode === mode ? 'border-[#ef233c] bg-[#ef233c] text-white' : 'border-slate-100 bg-white text-slate-700'}`}><Icon className="mx-auto size-6" /><strong className="mt-1 block text-sm">{time}</strong><span className="text-xs opacity-80">{distance}</span></button>)}</div>
            <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setScreen('navigation')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#ef233c] text-sm font-bold text-white">Start route <ArrowUpRight className="size-5" /></button><a href={WORKSHOP_INFO.mapsUrl} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#ef233c] text-sm font-bold text-[#ef233c]">Open Maps <Navigation className="size-5" /></a></div>
          </div>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
