import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, CircleCheck, Gift, Package, Settings, ShieldCheck, Star, Tag, Truck } from 'lucide-react';

type NotificationItem = { title: string; body: React.ReactNode; time: string; tone: string; icon: React.ReactNode; unread?: boolean };

export function NotificationsView({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState('All');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const items = useMemo<NotificationItem[]>(() => [
    { title: 'Order Shipped', body: <>Your order <b className="text-slate-700">#RGD5821</b> has been shipped and is on the way.</>, time: '2 min ago', tone: 'bg-red-50 text-red-500', icon: <Truck className="h-6 w-6 fill-current" />, unread: true },
    { title: 'Special Offer', body: <>Flat 30% OFF on all Bike Seat Covers. Limited time offer!</>, time: '1 hour ago', tone: 'bg-red-50 text-red-500', icon: <Tag className="h-6 w-6 fill-current" />, unread: true },
    { title: 'Order Confirmed', body: <>Your order <b className="text-slate-700">#RGD5820</b> has been confirmed. We will notify you soon.</>, time: '3 hours ago', tone: 'bg-emerald-50 text-emerald-500', icon: <CircleCheck className="h-6 w-6" /> },
    { title: 'New Arrivals', body: <>Check out our new premium seat covers collection.</>, time: '1 day ago', tone: 'bg-purple-50 text-purple-600', icon: <Package className="h-6 w-6 fill-current" /> },
    { title: 'Delivery Update', body: <>Your order <b className="text-slate-700">#RGD5819</b> is out for delivery.</>, time: '2 days ago', tone: 'bg-blue-50 text-blue-500', icon: <Truck className="h-6 w-6 fill-current" /> },
    { title: 'Exclusive Coupon', body: <>Use code <b className="text-slate-700">RGD50</b> and get ₹50 OFF on your next order.</>, time: '3 days ago', tone: 'bg-rose-50 text-rose-500', icon: <Gift className="h-6 w-6 fill-current" /> },
    { title: 'Review Reminder', body: <>How was your purchase? Share your review and help others.</>, time: '4 days ago', tone: 'bg-amber-50 text-amber-500', icon: <Star className="h-6 w-6 fill-current" /> },
    { title: 'Account Update', body: <>Your profile information has been updated successfully.</>, time: '5 days ago', tone: 'bg-sky-50 text-sky-500', icon: <Bell className="h-6 w-6 fill-current" /> },
  ], []);
  const visible = filter === 'All' ? items : items.filter((item) => filter === 'Orders' ? item.title.includes('Order') || item.title.includes('Delivery') : filter === 'Offers' ? item.title.includes('Offer') || item.title.includes('Coupon') : !item.title.includes('Order') && !item.title.includes('Offer') && !item.title.includes('Coupon') && !item.title.includes('Delivery'));

  if (selectedNotification) {
    return <main className="min-h-screen w-full bg-white text-slate-800 font-sans">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <button onClick={() => setSelectedNotification(null)} aria-label="Back to notifications" className="rounded-full p-1"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-[22px] font-extrabold tracking-tight">Notification Details</h1>
      </header>
      <div className="px-4 py-4">
        <section className="rounded-3xl bg-gradient-to-br from-red-50 to-pink-50 p-5">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${selectedNotification.tone}`}>{selectedNotification.icon}</div>
          <p className="mb-2 text-xs font-bold text-[#E51E2B]">{selectedNotification.time}</p>
          <h2 className="text-[24px] font-extrabold leading-tight text-slate-900">{selectedNotification.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{selectedNotification.body}</p>
        </section>
        <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Order Summary</h2>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3"><div className="h-14 w-14 rounded-xl bg-slate-100" /><div><p className="font-bold">Premium Bike Seat Cover</p><p className="text-sm text-slate-500">Black Red · Qty: 1</p><p className="font-extrabold">₹499</p></div></div>
        </section>
        <section className="mt-4 rounded-2xl border border-slate-100 p-4">
          <h2 className="text-lg font-extrabold">Tracking Information</h2>
          {['Order Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'].map((step, index) => <div key={step} className="flex items-center gap-3 py-2"><span className={`h-4 w-4 rounded-full border-2 ${index < 3 ? 'border-[#E51E2B] bg-[#E51E2B]' : 'border-slate-300'}`} /><span className={`text-sm font-semibold ${index === 2 ? 'text-[#E51E2B]' : 'text-slate-500'}`}>{step}</span></div>)}
        </section>
        <button className="mt-5 w-full rounded-2xl bg-[#E51E2B] py-4 text-base font-extrabold text-white">Track Order <ChevronRight className="ml-2 inline h-5 w-5" /></button>
      </div>
    </main>;
  }

  return <main className="min-h-screen w-full overflow-x-hidden bg-white text-slate-800 font-sans">
    <header className="px-5 pt-4 pb-3 flex items-start justify-between">
      <button onClick={onBack} aria-label="Go back" className="p-1 -ml-1 mt-1"><ArrowLeft className="h-6 w-6" /></button>
      <div className="flex-1 px-4"><h1 className="text-[25px] font-extrabold tracking-tight leading-snug">Notifications</h1><p className="text-xs text-slate-500 font-medium mt-0.5">Stay updated with your orders, offers and more</p></div>
      <button aria-label="Notification settings" className="p-1 mt-1"><Settings className="h-6 w-6" /></button>
    </header>
    <nav className="flex gap-2.5 px-5 py-2.5 overflow-x-auto no-scrollbar">
      {['All', 'Orders', 'Offers', 'Updates'].map((name) => <button key={name} onClick={() => setFilter(name)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${filter === name ? 'bg-[#E51E2B] text-white shadow-sm' : 'bg-gray-100 text-slate-700'}`}>{name} ({name === 'All' ? 12 : name === 'Orders' ? 4 : name === 'Offers' ? 4 : 3})</button>)}
    </nav>
    <section className="mt-1 divide-y divide-gray-100">
      {visible.map((item) => <article key={item.title} onClick={() => setSelectedNotification(item)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedNotification(item); }} className="flex items-start px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
        <div className={`h-12 w-12 shrink-0 mr-3.5 rounded-2xl flex items-center justify-center shadow-sm ${item.tone}`}>{item.icon}</div>
        <div className="flex-1 pr-2"><div className="flex items-center"><h2 className="text-sm font-bold tracking-tight text-gray-900">{item.title}</h2>{item.unread && <span className="ml-2 h-2 w-2 rounded-full bg-[#E51E2B]" />}</div><p className="mt-1 text-xs leading-relaxed text-gray-500">{item.body}</p></div>
        <div className="self-stretch shrink-0 flex flex-col items-end justify-between pt-0.5"><span className="text-[11px] font-medium text-gray-400">{item.time}</span><ChevronRight className="h-4 w-4 text-gray-400" /></div>
      </article>)}
    </section>
  </main>;
}
