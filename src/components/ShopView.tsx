import React, { useState } from 'react';
import { ArrowLeft, Search, ShoppingCart, SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ShopViewProps {
  products: Product[];
  wishlist: Product[];
  cartCount: number;
  onBack: () => void;
  onSearch: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, event: React.MouseEvent) => void;
  onToggleWishlist: (product: Product, event: React.MouseEvent) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ products, wishlist, cartCount, onBack, onSearch, onSelectProduct, onQuickAdd, onToggleWishlist }) => {
  const [category, setCategory] = useState('All');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const categories = ['All', 'Bike', 'Toto', 'Cushion', 'Accessories'];
  const visibleProducts = category === 'All' ? products : products.filter((product) => product.category.toLowerCase().includes(category.toLowerCase()) || product.title.toLowerCase().includes(category.toLowerCase()));

  return (
    <main className="min-h-screen bg-[#f8f9fc] text-slate-800">
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3.5"><button onClick={onBack} aria-label="Go back" className="p-1"><ArrowLeft className="h-6 w-6" /></button><div><h1 className="text-xl font-bold leading-none">Shop</h1><p className="mt-1 text-[11px] font-medium text-slate-400">Home / Shop</p></div></div>
        <div className="flex items-center gap-3"><button onClick={() => onSearch('')} aria-label="Search"><Search className="h-5 w-5" /></button><button aria-label="Cart" className="relative"><ShoppingCart className="h-6 w-6" /><span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#e61e25] text-[10px] font-bold text-white">{cartCount}</span></button></div>
      </header>
      <div className="px-5 mt-2"><div className="flex items-center rounded-full border border-slate-200/60 bg-[#f1f3f7] px-4 py-2.5"><Search className="h-5 w-5 text-slate-400" /><input aria-label="Search seat covers" onChange={(event) => onSearch(event.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400" placeholder="Search seat covers, cushions..." /></div></div>
      <nav aria-label="Product categories" className="no-scrollbar mt-3.5 flex gap-2 overflow-x-auto px-5">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold ${category === item ? 'bg-[#e61e25] text-white' : 'bg-[#eceef3] text-slate-700'}`}>{item}</button>)}</nav>
      <div className="mt-4 flex items-center justify-between px-5"><div className="flex gap-2"><button className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"><ArrowUpDown className="h-3.5 w-3.5" /> Sort</button><button className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"><SlidersHorizontal className="h-3.5 w-3.5" /> Filter</button></div><div className="flex gap-1"><button onClick={() => setLayout('grid')} className={`rounded-lg p-1.5 ${layout === 'grid' ? 'bg-[#e61e25] text-white' : 'text-slate-500'}`}><LayoutGrid className="h-4 w-4" /></button><button onClick={() => setLayout('list')} className={`rounded-lg p-1.5 ${layout === 'list' ? 'bg-[#e61e25] text-white' : 'text-slate-500'}`}><List className="h-4 w-4" /></button></div></div>
      <p className="mt-3 px-5 text-xs font-medium text-slate-500">{visibleProducts.length || 128} products found</p>
      <section aria-label="Products Catalog" className={`px-4 py-2 ${layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>{visibleProducts.map((product) => <ProductCard key={product.id} product={product} layoutMode={layout} onSelectProduct={onSelectProduct} onQuickAddToCart={onQuickAdd} isWishlisted={wishlist.some((item) => item.id === product.id)} onToggleWishlist={onToggleWishlist} />)}</section>
    </main>
  );
};
