import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Scissors, Layers, ShoppingBag } from 'lucide-react';
import { VEHICLE_BRANDS } from '../data/products';
import { Product } from '../types';

interface CustomSeatBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomSeatToCart: (customProduct: Product, color: { name: string; hex: string }, stitch: string, thickness: { label: string; extraPrice: number }, embroidery: string) => void;
}

export const CustomSeatBuilder: React.FC<CustomSeatBuilderProps> = ({
  isOpen,
  onClose,
  onAddCustomSeatToCart,
}) => {
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'toto'>('bike');
  const [brand, setBrand] = useState('Hero');
  const [model, setModel] = useState('Splendor Plus');
  const [foamDensity, setFoamDensity] = useState<'standard' | 'high_density' | 'gel_infused'>('high_density');
  const [material, setMaterial] = useState<'rexine' | 'carbon' | 'mesh' | 'leatherette'>('carbon');
  const [stitchPattern] = useState<'diamond' | 'ribbed' | 'racing' | 'plain'>('diamond');
  const [pipingColor, setPipingColor] = useState<{ name: string; hex: string }>({ name: 'Crimson Red', hex: '#D9232D' });
  const [embroideryText, setEmbroideryText] = useState('');

  if (!isOpen) return null;

  // Calculate dynamic price
  let basePrice = vehicleType === 'toto' ? 1499 : 899;
  if (foamDensity === 'high_density') basePrice += 150;
  if (foamDensity === 'gel_infused') basePrice += 350;
  if (material === 'carbon') basePrice += 120;
  if (material === 'mesh') basePrice += 80;
  if (embroideryText.trim()) basePrice += 150;

  const availableBrands = VEHICLE_BRANDS[vehicleType] || [];
  const availableModels = availableBrands.find((b) => b.brand === brand)?.models || [];

  const handleCreateOrder = () => {
    const customProduct: Product = {
      id: `custom-seat-${Date.now()}`,
      title: `Custom Handcrafted ${brand} ${model || vehicleType.toUpperCase()} Godi`,
      slug: `custom-${vehicleType}-${Date.now()}`,
      category: vehicleType === 'toto' ? 'toto' : 'bike',
      categoryLabel: 'Custom Workshop Craft',
      price: basePrice,
      originalPrice: basePrice + 350,
      rating: 5.0,
      reviewCount: 1,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAjFNhnvx67fMNCi-wjG2VkzCG3eepkjtic7Nj24eji8Rrrv0Rhnq4KFU9wJHdrwp7784pw1GNs5VE2iGlugNVQrtIGk6nwTTvowkjY8kHDM2zCE8YTqybFSfNuN2izIuwMxn4TtVGcqv_KUOPTwarQZiJ2iyHkDx3puw-I78co_S8s6ediLq7o6imwneOjXgAJewkt8GehwmI63owlK3TU42a6TYoxu5FsZF_ndPdymgD2dZEzyG4',
      description: `Bespoke tailored seat with ${foamDensity.replace('_', ' ')} cushioning, ${material} finish, and ${stitchPattern} stitching.`,
      features: [
        `Custom contoured to ${brand} ${model}`,
        `${foamDensity.toUpperCase().replace('_', ' ')} anti-fatigue padding`,
        `Reinforced ${pipingColor.name} piping border`,
        embroideryText.trim() ? `Computerized embroidery: "${embroideryText}"` : 'Clean seamless finish',
      ],
      inStock: true,
      materials: [material, foamDensity],
      colors: [{ name: pipingColor.name, hex: pipingColor.hex, bgClass: `bg-[${pipingColor.hex}]` }],
      stitchPatterns: [stitchPattern],
      compatibility: [`${brand} ${model}`],
      thicknessOptions: [{ label: foamDensity, extraPrice: 0 }],
    };

    onAddCustomSeatToCart(
      customProduct,
      pipingColor,
      stitchPattern,
      { label: foamDensity, extraPrice: 0 },
      embroideryText.trim()
    );
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="relative w-full max-w-[480px] max-h-[92vh] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-gray-900 to-black text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D9232D] flex items-center justify-center text-white">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-black tracking-tight leading-tight flex items-center gap-1.5">
                  <span>Custom Seat & Godi Studio</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-[10.5px] text-gray-400">Tailored by Master Craftsmen at Rofik Godi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Options Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-4 no-scrollbar pb-24 text-gray-800">
            {/* Step 1: Vehicle selection */}
            <div>
              <label className="text-[12px] font-black uppercase tracking-wider text-gray-900 block mb-2">
                1. Select Vehicle
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(['bike', 'scooter', 'toto'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setVehicleType(t);
                      const bList = VEHICLE_BRANDS[t] || [];
                      if (bList.length > 0) {
                        setBrand(bList[0].brand);
                        setModel(bList[0].models[0] || '');
                      }
                    }}
                    className={`py-2 rounded-xl text-[12px] font-bold border transition-all ${
                      vehicleType === t
                        ? 'border-[#D9232D] bg-[#FEECEC] text-[#D9232D] shadow-xs'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {t === 'bike' ? '🏍️ Bike' : t === 'scooter' ? '🛵 Scooty' : '🛺 Toto'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    const bObj = availableBrands.find((b) => b.brand === e.target.value);
                    if (bObj && bObj.models.length > 0) setModel(bObj.models[0]);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-[12px] font-semibold text-gray-800 focus:outline-none focus:border-[#D9232D]"
                >
                  {availableBrands.map((b) => (
                    <option key={b.brand} value={b.brand}>
                      {b.brand}
                    </option>
                  ))}
                </select>

                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-[12px] font-semibold text-gray-800 focus:outline-none focus:border-[#D9232D]"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Foam Density */}
            <div>
              <label className="text-[12px] font-black uppercase tracking-wider text-gray-900 block mb-2 flex items-center justify-between">
                <span>2. Foam Cushioning Core</span>
                <Layers className="w-3.5 h-3.5 text-gray-400" />
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'standard', title: 'Standard PU Foam (10mm)', desc: 'Daily short city commutes', price: 'Included' },
                  { id: 'high_density', title: 'High Density 32D Cushion (18mm)', desc: 'Pothole proof & tailbone support (+₹150)', price: '+₹150' },
                  { id: 'gel_infused', title: 'Touring Gel Matrix Core (25mm)', desc: 'Ladakh & 200km+ highway comfort (+₹350)', price: '+₹350' },
                ].map((f) => {
                  const isSel = foamDensity === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFoamDensity(f.id as any)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSel
                          ? 'border-[#D9232D] bg-[#FEECEC]/50 text-gray-900'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="text-[12px] font-bold">{f.title}</div>
                        <div className="text-[10.5px] text-gray-500">{f.desc}</div>
                      </div>
                      <span className="text-[11px] font-black text-[#D9232D]">{f.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Material Texture */}
            <div>
              <label className="text-[12px] font-black uppercase tracking-wider text-gray-900 block mb-2">
                3. Premium Outer Material
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'rexine', label: 'Classic Rexine', extra: 'Included' },
                  { id: 'carbon', label: 'Carbon Fiber Weave', extra: '+₹120' },
                  { id: 'mesh', label: '3D Air Mesh Layer', extra: '+₹80' },
                  { id: 'leatherette', label: 'Matte Nappa Leatherette', extra: '+₹100' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMaterial(m.id as any)}
                    className={`p-2 rounded-xl border text-[11.5px] font-bold text-left flex flex-col justify-between transition-all ${
                      material === m.id
                        ? 'border-[#D9232D] bg-[#FEECEC]/40 text-[#D9232D]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{m.extra}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Stitching & Piping Color */}
            <div>
              <label className="text-[12px] font-black uppercase tracking-wider text-gray-900 block mb-2">
                4. Piping Border Color Accent
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Crimson Red', hex: '#D9232D' },
                  { name: 'Stealth Black', hex: '#111827' },
                  { name: 'Royal Blue', hex: '#2563EB' },
                  { name: 'Golden Yellow', hex: '#EAB308' },
                  { name: 'Silver White', hex: '#E5E7EB' },
                  { name: 'Tan Brown', hex: '#8C5A3C' },
                ].map((col) => {
                  const isSel = pipingColor.name === col.name;
                  return (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setPipingColor(col)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                        isSel ? 'border-[#D9232D] bg-[#FEECEC] text-[#D9232D]' : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: col.hex }} />
                      <span>{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Custom Name Embroidery */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-[12px] font-black text-amber-950">
                  5. Personalized Name / Number Embroidery (+₹150)
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mb-2">
                Machine-stitched on the rear side of your custom seat.
              </p>
              <input
                type="text"
                maxLength={14}
                value={embroideryText}
                onChange={(e) => setEmbroideryText(e.target.value.toUpperCase())}
                placeholder="Type your name e.g. RIDER 07"
                className="w-full bg-white text-gray-900 text-[12.5px] font-black tracking-widest uppercase rounded-xl px-3 py-2 border border-amber-300 focus:outline-none focus:border-[#D9232D]"
              />
            </div>
          </div>

          {/* Bottom Total & Order Button */}
          <div className="sticky bottom-0 z-20 p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Estimated Total</span>
              <div className="text-2xl font-black text-[#D9232D]">₹{basePrice}</div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleCreateOrder}
              className="flex-1 py-3 px-4 bg-[#D9232D] hover:bg-[#c01d26] text-white rounded-xl text-[13px] font-black shadow-md flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add Custom Godi to Cart</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
