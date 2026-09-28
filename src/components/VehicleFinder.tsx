import React, { useState } from 'react';
import { VEHICLE_BRANDS } from '../data/products';
import { CheckCircle2, ChevronDown, RotateCcw, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface VehicleFinderProps {
  onFilterVehicle: (model: string | null) => void;
  activeVehicleFilter: string | null;
}

export const VehicleFinder: React.FC<VehicleFinderProps> = ({
  onFilterVehicle,
  activeVehicleFilter,
}) => {
  const [selectedType, setSelectedType] = useState<'bike' | 'scooter' | 'toto'>('bike');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const currentBrands = VEHICLE_BRANDS[selectedType] || [];
  const currentModels = currentBrands.find((b) => b.brand === selectedBrand)?.models || [];

  const handleTypeChange = (type: 'bike' | 'scooter' | 'toto') => {
    setSelectedType(type);
    setSelectedBrand('');
    setSelectedModel('');
  };

  const handleApplyFilter = () => {
    if (selectedModel) {
      onFilterVehicle(selectedModel);
    } else if (selectedBrand) {
      onFilterVehicle(selectedBrand);
    }
  };

  const handleClear = () => {
    setSelectedBrand('');
    setSelectedModel('');
    onFilterVehicle(null);
  };

  return (
    <section className="px-5 mb-6" data-purpose="vehicle-fitment-finder">
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-[#1e232a] rounded-[24px] p-4 text-white shadow-lg border border-gray-800 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D9232D]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#D9232D] flex items-center justify-center text-white">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-[13.5px] font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Vehicle Fitment Finder</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                  100% Fit Guarantee
                </span>
              </h3>
              <p className="text-[10.5px] text-gray-400">Select your ride to see exact fitted seat covers</p>
            </div>
          </div>

          {activeVehicleFilter && (
            <button
              onClick={handleClear}
              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-full"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Vehicle Type Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-gray-800/70 p-1 rounded-xl mb-3 relative z-10">
          <button
            onClick={() => handleTypeChange('bike')}
            className={`py-1.5 text-[11.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              selectedType === 'bike' ? 'bg-[#D9232D] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🏍️</span>
            <span>Bike</span>
          </button>
          <button
            onClick={() => handleTypeChange('scooter')}
            className={`py-1.5 text-[11.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              selectedType === 'scooter' ? 'bg-[#D9232D] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🛵</span>
            <span>Scooty</span>
          </button>
          <button
            onClick={() => handleTypeChange('toto')}
            className={`py-1.5 text-[11.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              selectedType === 'toto' ? 'bg-[#D9232D] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🛺</span>
            <span>Toto / Cab</span>
          </button>
        </div>

        {/* Selection Dropdowns & Apply Button */}
        <div className="grid grid-cols-2 gap-2 mb-2.5 relative z-10">
          {/* Brand Select */}
          <div className="relative">
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setSelectedModel('');
              }}
              className="w-full bg-gray-800/90 text-white text-[12px] font-semibold rounded-xl px-3 py-2 border border-gray-700/80 focus:border-[#D9232D] focus:outline-none appearance-none cursor-pointer pr-8"
            >
              <option value="">Select Brand</option>
              {currentBrands.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Model Select */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedBrand}
              className={`w-full bg-gray-800/90 text-white text-[12px] font-semibold rounded-xl px-3 py-2 border border-gray-700/80 focus:border-[#D9232D] focus:outline-none appearance-none cursor-pointer pr-8 ${
                !selectedBrand ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="">{selectedBrand ? 'Select Model' : 'Pick Brand First'}</option>
              {currentModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Apply button & Active fitment badge */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          {activeVehicleFilter ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fitted for: <strong>{activeVehicleFilter}</strong></span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">
              {selectedModel ? `Ready to filter for ${selectedModel}` : 'Select your model above'}
            </span>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={!selectedBrand}
            onClick={handleApplyFilter}
            className={`px-4 py-1.5 rounded-xl text-[11.5px] font-bold transition-all shadow-sm ${
              selectedBrand
                ? 'bg-[#D9232D] hover:bg-[#c01d26] text-white cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            Find Covers
          </motion.button>
        </div>
      </div>
    </section>
  );
};
