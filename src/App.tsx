/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PRODUCTS, WORKSHOP_INFO } from './data/products';
import { Product, CartItem, VehicleCategory, UserProfile } from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategorySection } from './components/CategorySection';
import { VehicleFinder } from './components/VehicleFinder';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CustomSeatBuilder } from './components/CustomSeatBuilder';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { WishlistModal } from './components/WishlistModal';
import { StoreLocationModal } from './components/StoreLocationModal';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsConditionsView } from './components/TermsConditionsView';
import { CustomerReviews } from './components/CustomerReviews';
import { AccountView } from './components/AccountView';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import RofikOnboarding from './components/RofikOnboarding';
import { AuthScreen } from './components/AuthScreen';
import { LoginRequiredModal } from './components/LoginRequiredModal';
import { SearchView } from './components/SearchView';
import { NotificationsView } from './components/NotificationsView';
import { ShopView } from './components/ShopView';
import {
  FilterSortModal,
  FilterState,
  INITIAL_FILTERS,
  SortOption,
  SORT_LABELS,
} from './components/FilterSortModal';
import {
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  List,
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  Wrench,
  Flame,
  ArrowRight,
  ArrowUpDown,
  Droplets,
  Star,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  // App Phase State: Onboarding -> Splash -> Main
  const [appPhase, setAppPhase] = useState<'onboarding' | 'splash' | 'auth' | 'main'>('onboarding');
  const [authInitialMode, setAuthInitialMode] = useState<'signup' | 'login' | 'phone_otp'>('signup');

  // User Authentication State (Default: Guest User)
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'guest-user',
    name: 'Guest Rider',
    email: '',
    phone: '',
    isGuest: true,
  });

  // Login Required Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalReason, setLoginModalReason] = useState('Please login to place your order.');
  const [pendingCheckoutAfterLogin, setPendingCheckoutAfterLogin] = useState(false);

  // Navigation & View State
  type RouteTab = 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart' | 'notifications';
  const routeToTab = (pathname: string): RouteTab => {
    const normalizedPath = pathname.replace(/\/$/, '') || '/home';
    const route = normalizedPath === '/example/shop' ? '/home' : normalizedPath.replace(/^\/example(?=\/|$)/, '') || '/home';
    if (route === '/notifications' || route === '/notification') return 'notifications';
    if (route === '/profile' || route === '/account') return 'account';
    if (route === '/shop' || route === '/search' || route === '/custom' || route === '/wishlist' || route === '/cart' || route === '/notifications') return route.slice(1) as RouteTab;
    return 'home';
  };
  const tabToRoute = (tab: RouteTab) => tab === 'account' ? '/profile' : `/${tab}`;
  const [activeTab, setActiveTab] = useState<RouteTab>(() => routeToTab(window.location.pathname));
  const isPopState = useRef(false);
  useEffect(() => {
    const handlePopState = () => {
      isPopState.current = true;
      setActiveTab(routeToTab(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const nextPath = tabToRoute(activeTab);
    if (window.location.pathname !== nextPath) {
      if (isPopState.current) {
        isPopState.current = false;
        return;
      }
      window.history.pushState({ tab: activeTab }, '', nextPath);
    } else {
      isPopState.current = false;
    }

    if (activeTab === 'shop') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  const [shopLayoutMode, setShopLayoutMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFrameMode, setIsMobileFrameMode] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | 'all'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [homeFilters, setHomeFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isHomeSortOpen, setIsHomeSortOpen] = useState(false);
  const [isHomeFilterOpen, setIsHomeFilterOpen] = useState(false);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsConditionsOpen, setIsTermsConditionsOpen] = useState(false);

  // Cart & Wishlist State
  const [cart, setCart] = useState<CartItem[]>([
    {
      cartItemId: 'init-1',
      product: PRODUCTS[0],
      quantity: 1,
      selectedColor: PRODUCTS[0].colors[0],
      selectedStitch: 'Quilted Diamond',
      selectedThickness: PRODUCTS[0].thicknessOptions[0],
      unitPrice: PRODUCTS[0].price,
    },
    {
      cartItemId: 'init-2',
      product: PRODUCTS[1],
      quantity: 1,
      selectedColor: PRODUCTS[1].colors[0],
      selectedStitch: 'Single Border Stitched',
      selectedThickness: PRODUCTS[1].thicknessOptions[0],
      unitPrice: PRODUCTS[1].price,
    },
    {
      cartItemId: 'init-3',
      product: PRODUCTS[4],
      quantity: 1,
      selectedColor: PRODUCTS[4].colors[0],
      selectedStitch: 'Honeycomb Grid Pattern',
      selectedThickness: PRODUCTS[4].thicknessOptions[0],
      unitPrice: PRODUCTS[4].price,
    },
  ]);

  const [wishlist, setWishlist] = useState<Product[]>([PRODUCTS[0], PRODUCTS[2]]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutCoupon, setCheckoutCoupon] = useState('');

  // Active home filters count
  const activeHomeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all' || homeFilters.category !== 'all') count += 1;
    if (vehicleFilter || homeFilters.vehicleBrand !== 'all') count += 1;
    if (homeFilters.priceRange !== 'all' || homeFilters.maxPrice < 2000) count += 1;
    if (homeFilters.waterproofOnly) count += 1;
    if (homeFilters.bestsellerOnly) count += 1;
    if (homeFilters.inStockOnly) count += 1;
    if (homeFilters.customizableOnly) count += 1;
    if (homeFilters.minRating > 0) count += 1;
    return count;
  }, [selectedCategory, vehicleFilter, homeFilters]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      // Category check (sync selectedCategory with homeFilters)
      const effectiveCategory = homeFilters.category !== 'all' ? homeFilters.category : selectedCategory;
      if (effectiveCategory !== 'all' && p.category !== effectiveCategory) {
        return false;
      }

      // Vehicle filter
      if (vehicleFilter) {
        const matchesCompat = p.compatibility.some((comp) =>
          comp.toLowerCase().includes(vehicleFilter.toLowerCase())
        );
        const matchesTitle = p.title.toLowerCase().includes(vehicleFilter.toLowerCase());
        if (!matchesCompat && !matchesTitle) return false;
      }

      if (homeFilters.vehicleBrand !== 'all') {
        const b = homeFilters.vehicleBrand.toLowerCase();
        const matchesBrand =
          p.compatibility.some((c) => c.toLowerCase().includes(b)) ||
          p.title.toLowerCase().includes(b) ||
          p.category.toLowerCase().includes(b);
        if (!matchesBrand) return false;
      }

      // Price filter
      if (homeFilters.priceRange === 'under_300' && p.price >= 300) return false;
      if (homeFilters.priceRange === '300_600' && (p.price < 300 || p.price > 600)) return false;
      if (homeFilters.priceRange === '600_1000' && (p.price < 600 || p.price > 1000)) return false;
      if (homeFilters.priceRange === 'above_1000' && p.price <= 1000) return false;
      if (p.price > homeFilters.maxPrice) return false;

      // Feature toggles
      if (homeFilters.waterproofOnly && !p.isWaterproof) return false;
      if (homeFilters.bestsellerOnly && !p.isBestseller && p.badge !== 'Bestseller') return false;
      if (homeFilters.inStockOnly && !p.inStock) return false;
      if (homeFilters.customizableOnly && !p.isCustomizable) return false;
      if (homeFilters.minRating > 0 && p.rating < homeFilters.minRating) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesCat = p.categoryLabel.toLowerCase().includes(q);
        const matchesCompat = p.compatibility.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesCat && !matchesCompat) return false;
      }
      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case 'newest':
          return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        case 'discount': {
          const discA = ((a.originalPrice - a.price) / a.originalPrice) * 100;
          const discB = ((b.originalPrice - b.price) / b.originalPrice) * 100;
          return discB - discA;
        }
        case 'popular':
        default:
          return (
            (b.isBestseller ? 2 : 0) +
            b.rating -
            ((a.isBestseller ? 2 : 0) + a.rating)
          );
      }
    });
  }, [selectedCategory, vehicleFilter, searchQuery, sortBy, homeFilters]);

  // Quick Cart Add
  const handleQuickAddToCart = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const existingIndex = cart.findIndex((item) => item.product.id === p.id);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        cartItemId: `${p.id}-${Date.now()}`,
        product: p,
        quantity: 1,
        selectedColor: p.colors[0],
        selectedStitch: p.stitchPatterns[0] || undefined,
        selectedThickness: p.thicknessOptions[0],
        unitPrice: p.price,
      };
      setCart([...cart, newItem]);
    }

    setJustAddedId(p.id);
    setTimeout(() => setJustAddedId(null), 1200);
  };

  // Detailed Modal Add To Cart
  const handleDetailAddToCart = (
    product: Product,
    selectedColor: { name: string; hex: string },
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    customEmbroideryText?: string,
    quantity = 1
  ) => {
    const unitPrice =
      product.price +
      selectedThickness.extraPrice +
      (customEmbroideryText ? 150 : 0);

    const newItem: CartItem = {
      cartItemId: `${product.id}-${selectedColor.name}-${selectedStitch}-${Date.now()}`,
      product,
      quantity,
      selectedColor,
      selectedStitch,
      selectedThickness,
      customEmbroideryText,
      unitPrice,
    };

    setCart([...cart, newItem]);
  };

  // Wishlist toggle
  const handleToggleWishlist = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (wishlist.some((item) => item.id === p.id)) {
      setWishlist(wishlist.filter((item) => item.id !== p.id));
    } else {
      setWishlist([...wishlist, p]);
    }
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.cartItemId !== cartItemId));
    } else {
      setCart(
        cart.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: newQty } : i))
      );
    }
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart(cart.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleProceedToCheckout = (discount: number, coupon: string) => {
    setCheckoutDiscount(discount);
    setCheckoutCoupon(coupon);

    // 🔐 GUEST USER CHECK: If guest, trigger Login Required modal
    if (currentUser.isGuest) {
      setIsCartOpen(false);
      setLoginModalReason('Please login to place your order.');
      setPendingCheckoutAfterLogin(true);
      setIsLoginModalOpen(true);
      return;
    }

    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    if (appPhase === 'auth') {
      setAppPhase('main');
    }
    if (pendingCheckoutAfterLogin) {
      setPendingCheckoutAfterLogin(false);
      setIsCheckoutOpen(true);
    }
  };

  const handleContinueGuest = () => {
    setCurrentUser({
      id: `guest-${Date.now()}`,
      name: 'Guest Rider',
      email: '',
      phone: '',
      isGuest: true,
    });
    setAppPhase('main');
  };

  const handleOpenAuth = (mode: 'signup' | 'login' | 'phone_otp' = 'signup') => {
    setAuthInitialMode(mode);
    setAppPhase('auth');
  };

  const scrollToShop = () => {
    const el = document.getElementById('shop-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Phase 1: Onboarding
  if (appPhase === 'onboarding') {
    return <RofikOnboarding onFinish={() => setAppPhase('splash')} />;
  }

  // Phase 2: Splash Screen
  if (appPhase === 'splash') {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
        <SplashScreen
          onFinish={() => setAppPhase('main')}
        />
      </div>
    );
  }

  // Phase 3: Login / Signup Screen
  if (appPhase === 'auth') {
    return (
      <div className="min-h-screen bg-[#f7d9de] flex justify-center selection:bg-[#e0182d] selection:text-white font-sans antialiased text-[#0f1a3a]">
        <AuthScreen
          initialMode={authInitialMode}
          onSuccess={handleLoginSuccess}
          onBack={handleContinueGuest}
          onOpenTerms={() => setIsTermsConditionsOpen(true)}
          onOpenPrivacy={() => setIsPrivacyPolicyOpen(true)}
        />
      </div>
    );
  }

  // Phase 4: Main Application (Home / Shop / Account / Cart / Guest Mode)
  const isNotificationPage = activeTab === 'notifications';
  const isShopPage = activeTab === 'shop';

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex justify-center selection:bg-[#D9232D] selection:text-white font-sans antialiased text-[#1E232A]">
      {/* App Container (Mobile Frame or Full Width based on toggle) */}
      <div
        className={`w-full bg-[#FDFDFD] min-h-screen flex flex-col relative shadow-2xl transition-all duration-300 ${
          isNotificationPage || isShopPage ? '' : 'pb-28'
        } ${isMobileFrameMode ? 'max-w-[440px]' : 'max-w-4xl'}`}
      >
        {/* Main Header */}
        {!isNotificationPage && !isShopPage && activeTab !== 'search' && activeTab !== 'account' && <Header
          cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
          wishlistCount={wishlist.length}
          currentUser={currentUser}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenWishlist={() => setIsWishlistOpen(true)}
          onOpenStoreInfo={() => setIsStoreInfoOpen(true)}
  onOpenAccount={() => setActiveTab('account')}
  onOpenNotifications={() => {
    setActiveTab('notifications');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}
  onOpenSearch={() => {
            setActiveTab('search');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (q.trim()) {
              setActiveTab('search');
            }
          }}
          hideSearchInput={false}
          isMobileFrameMode={isMobileFrameMode}
          setIsMobileFrameMode={setIsMobileFrameMode}
        />}

        {/* View Switcher: Search View / Account View / Home & Shop Experience */}
        {activeTab === 'notifications' ? (
          <NotificationsView onBack={() => setActiveTab('home')} />
        ) : activeTab === 'shop' ? (
          <ShopView products={filteredProducts} wishlist={wishlist} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onBack={() => setActiveTab('home')} onSearch={(value) => { setSearchQuery(value); setActiveTab('search'); }} onSelectProduct={setSelectedProduct} onQuickAdd={handleQuickAddToCart} onToggleWishlist={handleToggleWishlist} />
        ) : activeTab === 'search' ? (
          <main className="flex-1 flex flex-col">
            <SearchView
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
              wishlist={wishlist}
              onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
              justAddedId={justAddedId}
              onBackToHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </main>
        ) : activeTab === 'account' ? (
          <main className="flex-1 flex flex-col">
            <AccountView
              currentUser={currentUser}
              onOpenLogin={() => {
                setLoginModalReason('Please login to access all garage features.');
                setIsLoginModalOpen(true);
              }}
              onLogout={() => {
                setCurrentUser({
                  id: `guest-${Date.now()}`,
                  name: 'Guest Rider',
                  email: '',
                  phone: '',
                  isGuest: true,
                });
                setAppPhase('main');
              }}
              onBackToHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onOpenStoreInfo={() => setIsStoreInfoOpen(true)}
              onOpenCustomBuilder={() => setIsCustomBuilderOpen(true)}
      onOpenShop={() => {
        setActiveTab('shop');
      }}
            />
          </main>
        ) : (
          <main className="flex-1 flex flex-col">
            {/* Hero Section Banner */}
            <HeroBanner
              onExploreClick={scrollToShop}
              onCustomClick={() => setIsCustomBuilderOpen(true)}
            />

            {/* Categories Section */}
            <CategorySection
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                if (cat !== 'all') scrollToShop();
              }}
            />

            {/* Vehicle Compatibility Filter Tool */}
            <VehicleFinder
              onFilterVehicle={(model) => {
                setVehicleFilter(model);
                if (model) scrollToShop();
              }}
              activeVehicleFilter={vehicleFilter}
            />

            {/* Popular Picks Horizontal Scroll (from user image) */}
            {selectedCategory === 'all' && !searchQuery && !vehicleFilter && (
              <section className="px-5 mb-6" data-purpose="popular-picks">
                <div className="flex justify-between items-baseline mb-3">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#D9232D]" />
                    <div>
                      <h3 className="text-[17px] font-black text-gray-900 tracking-tight">
                        Popular picks
                      </h3>
                      <p className="text-[11.5px] text-gray-400 font-medium">
                        Customer favourites this week
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={scrollToShop}
                    className="text-[12px] font-bold text-[#D9232D] hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>See all</span>
                    <span className="text-xs">→</span>
                  </button>
                </div>

                {/* Horizontal scrolling shelf */}
                <div className="flex space-x-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-5 px-5">
                  {PRODUCTS.slice(0, 4).map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="shelf"
                      onSelectProduct={(p) => setSelectedProduct(p)}
                      onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
                      isAddedJustNow={justAddedId === prod.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Workshop Promotion Banner */}
            <section className="px-5 mb-6">
              <div className="bg-gradient-to-r from-red-600 via-[#D9232D] to-red-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between">
                <div className="relative z-10 max-w-[240px]">
                  <span className="text-[9.5px] font-black tracking-widest uppercase bg-white/20 text-white px-2 py-0.5 rounded-full">
                    ON-SPOT SERVICE
                  </span>
                  <h4 className="text-[15px] font-black mt-1 leading-tight">
                    Need Custom Foam Cutting & Fitting?
                  </h4>
                  <p className="text-[11px] text-red-100 mt-1">
                    Visit Rofik Godi workshop for 15-minute express seat fitting.
                  </p>
                </div>

                <button
                  onClick={() => setIsCustomBuilderOpen(true)}
                  className="relative z-10 bg-white text-[#D9232D] hover:bg-gray-100 text-[11.5px] font-black px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex-shrink-0 cursor-pointer"
                >
                  Custom Fit
                </button>
              </div>
            </section>

            {/* Full Shop / Product Catalog Section */}
            <section id="shop-section" className="px-5 mb-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-[17px] font-black text-gray-900 tracking-tight">
                    {selectedCategory === 'all'
                      ? 'All Seat Covers & Essentials'
                      : `${selectedCategory.toUpperCase()} COLLECTION`}
                  </h3>
                  <p className="text-[11.5px] text-gray-400 font-medium">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} available
                  </p>
                </div>

                {/* Sort & Filter Action Bar */}
                <div className="flex items-center gap-2">
                  {/* Sort Trigger Button */}
                  <button
                    onClick={() => setIsHomeSortOpen(true)}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold text-gray-700 transition-all active:scale-95 cursor-pointer border border-gray-200/60"
                    title="Change sorting order"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                    <span>{SORT_LABELS[sortBy]?.label ? SORT_LABELS[sortBy].label.split(' ')[0] : 'Sort'}</span>
                  </button>

                  {/* Filter Trigger Button with badge */}
                  <button
                    onClick={() => setIsHomeFilterOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold transition-all active:scale-95 cursor-pointer border ${
                      activeHomeFiltersCount > 0
                        ? 'bg-[#D9232D] text-white border-[#D9232D] shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 border-gray-200/60'
                    }`}
                    title="Open Filters"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeHomeFiltersCount > 0 && (
                      <span className="bg-white text-[#D9232D] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {activeHomeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Grid / List Switcher */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/60">
                    <button
                      onClick={() => setShopLayoutMode('grid')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        shopLayoutMode === 'grid'
                          ? 'bg-white text-[#D9232D] shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                      title="2-Column Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShopLayoutMode('list')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        shopLayoutMode === 'list'
                          ? 'bg-white text-[#D9232D] shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(selectedCategory !== 'all' ||
                vehicleFilter ||
                searchQuery ||
                activeHomeFiltersCount > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[10.5px] font-semibold text-gray-400">Active filters:</span>

                  {(selectedCategory !== 'all' || homeFilters.category !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setHomeFilters((prev) => ({ ...prev, category: 'all' }));
                      }}
                      className="bg-red-50 text-[#D9232D] border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Category: {homeFilters.category !== 'all' ? homeFilters.category : selectedCategory}</span>
                      <span>✕</span>
                    </button>
                  )}

                  {(vehicleFilter || homeFilters.vehicleBrand !== 'all') && (
                    <button
                      onClick={() => {
                        setVehicleFilter(null);
                        setHomeFilters((prev) => ({ ...prev, vehicleBrand: 'all' }));
                      }}
                      className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Vehicle: {vehicleFilter || homeFilters.vehicleBrand}</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.priceRange !== 'all' && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, priceRange: 'all' }))}
                      className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        {homeFilters.priceRange === 'under_300' && 'Under ৳300'}
                        {homeFilters.priceRange === '300_600' && '৳300 - ৳600'}
                        {homeFilters.priceRange === '600_1000' && '৳600 - ৳1000'}
                        {homeFilters.priceRange === 'above_1000' && 'Above ৳1000'}
                      </span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.maxPrice < 2000 && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, maxPrice: 2000 }))}
                      className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Max ৳{homeFilters.maxPrice}</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.waterproofOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, waterproofOnly: false }))}
                      className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Waterproof</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.bestsellerOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, bestsellerOnly: false }))}
                      className="bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Bestseller</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.inStockOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, inStockOnly: false }))}
                      className="bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>In Stock</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.customizableOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, customizableOnly: false }))}
                      className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Custom Fit</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.minRating > 0 && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, minRating: 0 }))}
                      className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>{homeFilters.minRating}+ Stars</span>
                      <span>✕</span>
                    </button>
                  )}

                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Search: "{searchQuery}"</span>
                      <span>✕</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setVehicleFilter(null);
                      setSearchQuery('');
                      setHomeFilters(INITIAL_FILTERS);
                    }}
                    className="text-[10px] font-bold text-gray-500 hover:text-[#D9232D] underline ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Product Grid / List Display */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs">
                  <p className="text-gray-500 text-sm font-semibold mb-2">
                    No seat covers found matching your filter.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setVehicleFilter(null);
                      setSearchQuery('');
                    }}
                    className="bg-[#D9232D] text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : shopLayoutMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="grid"
                      onSelectProduct={(p) => setSelectedProduct(p)}
                      onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
                      isAddedJustNow={justAddedId === prod.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="list"
                      onSelectProduct={(p) => setSelectedProduct(p)}
                      onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
                      isAddedJustNow={justAddedId === prod.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Customer Reviews */}
            <CustomerReviews />

            {/* Footer Brand Info */}
            <footer className="px-5 pt-6 pb-4 bg-gray-900 text-gray-300 rounded-t-[32px] mt-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center">
                      <span>ROFIK</span>
                      <span className="text-[#D9232D] ml-1.5">GODI</span>
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase">
                      CENTRE · LOCAL RIDE ESSENTIALS
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`tel:${WORKSHOP_INFO.phone}`}
                      className="w-8 h-8 rounded-full bg-gray-800 text-white hover:bg-[#D9232D] flex items-center justify-center transition-colors"
                      title="Call Us"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/919832145678`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <p className="text-[11.5px] text-gray-400 leading-relaxed">
                  Leading seat cover manufacturer for bikes, toto e-rickshaws, and scooters. Handcrafted with Japanese stitching cords, anti-fatigue memory foam, and weather-proof rexine.
                </p>

                <div className="border-t border-gray-800 pt-3 flex flex-wrap justify-between items-center text-[10.5px] text-gray-500 gap-2">
                  <span>© 2026 ROFIK GODI CENTRE</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPrivacyPolicyOpen(true)}
                      className="hover:text-white transition-colors underline-offset-2 hover:underline"
                    >
                      Privacy Policy
                    </button>
                    <span className="text-gray-700">·</span>
                    <button
                      type="button"
                      onClick={() => setIsTermsConditionsOpen(true)}
                      className="hover:text-white transition-colors underline-offset-2 hover:underline"
                    >
                      Terms & Conditions
                    </button>
                  </div>
                  <span>100% Genuine Stitched</span>
                </div>
              </div>
            </footer>
          </main>
        )}

  {/* Bottom Tab Bar Navigation */}
  {!isNotificationPage && !isShopPage && activeTab !== 'search' && <BottomNav
          activeTab={activeTab as 'home' | 'shop' | 'custom' | 'wishlist' | 'account' | 'cart'}
          setActiveTab={(tab) => setActiveTab(tab as RouteTab)}
          cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
          wishlistCount={wishlist.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenWishlist={() => setIsWishlistOpen(true)}
          onOpenCustomBuilder={() => setIsCustomBuilderOpen(true)}
          onOpenShop={() => {
            setActiveTab('shop');
            scrollToShop();
          }}
          onOpenSearch={() => {
            setActiveTab('search');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenAccount={() => {
            setActiveTab('account');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />}

        {/* Modals & Slide-overs */}
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleDetailAddToCart}
          isWishlisted={selectedProduct ? wishlist.some((w) => w.id === selectedProduct.id) : false}
          onToggleWishlist={(p) => handleToggleWishlist(p)}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          onOpenCart={() => {
            setSelectedProduct(null);
            setIsCartOpen(true);
          }}
          onOpenSearch={() => {
            setSelectedProduct(null);
            setActiveTab('search');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBuyNow={() => setIsCartOpen(true)}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onQuickAdd={(p) => handleDetailAddToCart(p, p.colors[0], p.stitchPatterns[0] || '', p.thicknessOptions[0])}
        />

        <CustomSeatBuilder
          isOpen={isCustomBuilderOpen}
          onClose={() => setIsCustomBuilderOpen(false)}
          onAddCustomSeatToCart={(p, col, stitch, thick, emb) => {
            handleDetailAddToCart(p, col, stitch, thick, emb);
            setIsCartOpen(true);
          }}
        />

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveCartItem}
          onProceedToCheckout={handleProceedToCheckout}
        />

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cart}
          discount={checkoutDiscount}
          couponCode={checkoutCoupon}
          onClearCart={() => setCart([])}
        />

        <WishlistModal
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          wishlist={wishlist}
          onRemoveWishlist={(p) => handleToggleWishlist(p)}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onAddToCart={(p) => {
            handleDetailAddToCart(p, p.colors[0], p.stitchPatterns[0] || '', p.thicknessOptions[0]);
          }}
        />

        <StoreLocationModal
          isOpen={isStoreInfoOpen}
          onClose={() => setIsStoreInfoOpen(false)}
        />

        {/* 📜 Privacy Policy Modal / Slide-over */}
        {isPrivacyPolicyOpen && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <PrivacyPolicyView
              onBack={() => setIsPrivacyPolicyOpen(false)}
              onOpenStoreInfo={() => {
                setIsPrivacyPolicyOpen(false);
                setIsStoreInfoOpen(true);
              }}
            />
          </div>
        )}

        {/* ⚖️ Terms & Conditions Modal / Slide-over */}
        {isTermsConditionsOpen && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <TermsConditionsView
              onBack={() => setIsTermsConditionsOpen(false)}
              onOpenStoreInfo={() => {
                setIsTermsConditionsOpen(false);
                setIsStoreInfoOpen(true);
              }}
            />
          </div>
        )}

        {/* 🎛️ Filter & Sort Modal for Home Catalog */}
        <FilterSortModal
          isFilterOpen={isHomeFilterOpen}
          isSortOpen={isHomeSortOpen}
          onCloseFilter={() => setIsHomeFilterOpen(false)}
          onCloseSort={() => setIsHomeSortOpen(false)}
          currentSort={sortBy}
          onSelectSort={(newSort: SortOption) => setSortBy(newSort)}
          filters={homeFilters}
          onUpdateFilters={(newFilters: FilterState) => {
            setHomeFilters(newFilters);
            if (newFilters.category !== 'all') {
              setSelectedCategory(newFilters.category);
            }
          }}
          onResetFilters={() => {
            setHomeFilters(INITIAL_FILTERS);
            setSelectedCategory('all');
            setVehicleFilter(null);
          }}
          matchingCount={filteredProducts.length}
        />

        {/* 🔐 Login Required Modal (Triggered on Guest Checkout / Account Access) */}
        <LoginRequiredModal
          isOpen={isLoginModalOpen}
          onClose={() => {
            setIsLoginModalOpen(false);
            setPendingCheckoutAfterLogin(false);
          }}
          reason={loginModalReason}
          onOpenAuth={(mode) => {
            setAuthInitialMode(mode || 'signup');
            setAppPhase('auth');
          }}
          onFastLogin={handleLoginSuccess}
        />
      </div>
    </div>
  );
}
