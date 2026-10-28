import React, { useState } from 'react';
import { VEHICLE_BRANDS } from '../data/products';
import { VEHICLE_MODELS, type VehicleCatalogModel } from '../data/vehicleModels';
import { CheckCircle2, ChevronDown, RotateCcw, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface VehicleFinderProps {
  onFilterVehicle: (model: string | null) => void;
  activeVehicleFilter: string | null;
}

type FinderType = 'bike' | 'scooter' | 'toto';
interface FinderModel {
  brand: string;
  name: string;
  image?: string;
}

export const VehicleFinder: React.FC<VehicleFinderProps> = ({
  onFilterVehicle,
  activeVehicleFilter,
}) => {
  const [selectedType, setSelectedType] = useState<FinderType>('bike');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const currentBrands =
    selectedType === 'toto'
      ? VEHICLE_BRANDS.toto.map(({ brand }) => brand)
      : Array.from(new Set(VEHICLE_MODELS.filter((model) => model.type === selectedType).map((model) => model.brand))).sort(
          (a, b) => a.localeCompare(b),
        );
  const currentModels: FinderModel[] =
    selectedType === 'toto'
      ? (VEHICLE_BRANDS.toto.find((group) => group.brand === selectedBrand)?.models || []).map((name) => ({
          brand: selectedBrand,
          name,
        }))
      : VEHICLE_MODELS.filter(
          (model: VehicleCatalogModel) => model.type === selectedType && model.brand === selectedBrand,
        );
  const selectedVehicle = currentModels.find((model) => model.name === selectedModel);

  const handleTypeChange = (type: FinderType) => {
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
      <div className="relative overflow-hidden rounded-[24px] border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-[#1e232a] p-4 text-white shadow-lg">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[#D9232D]/15 blur-2xl" />

        <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D9232D] text-white">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-[13.5px] font-black tracking-tight text-white">
                <span>Vehicle Fitment Finder</span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                  100% Fit Guarantee
                </span>
              </h3>
              <p className="text-[10.5px] text-gray-400">Select your ride to see exact fitted seat covers</p>
            </div>
          </div>

          {activeVehicleFilter && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 rounded-full bg-gray-800/80 px-2 py-1 text-[11px] text-gray-400 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="relative z-10 mb-3 grid grid-cols-3 gap-1.5 rounded-xl bg-gray-800/70 p-1">
          {([
            { id: 'bike' as const, icon: '🏍️', label: 'Bike' },
            { id: 'scooter' as const, icon: '🛵', label: 'Scooty' },
            { id: 'toto' as const, icon: '🛺', label: 'Toto / Cab' },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selectedType === tab.id}
              onClick={() => handleTypeChange(tab.id)}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11.5px] font-bold transition-all ${
                selectedType === tab.id ? 'bg-[#D9232D] text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="relative z-10 mb-2.5 grid grid-cols-2 gap-2">
          <label className="relative block min-w-0">
            <span className="sr-only">Select company</span>
            <select
              aria-label="Select company"
              value={selectedBrand}
              onChange={(event) => {
                setSelectedBrand(event.target.value);
                setSelectedModel('');
              }}
              className="w-full cursor-pointer appearance-none rounded-xl border border-gray-700/80 bg-gray-800/90 py-2 pl-3 pr-8 text-[12px] font-semibold text-white focus:border-[#D9232D] focus:outline-none"
            >
              <option value="">Select Company</option>
              {currentBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </label>

          <label className="relative block min-w-0">
            <span className="sr-only">Select model</span>
            <select
              aria-label="Select model"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              disabled={!selectedBrand}
              className={`w-full appearance-none rounded-xl border border-gray-700/80 bg-gray-800/90 py-2 pl-3 pr-8 text-[12px] font-semibold text-white focus:border-[#D9232D] focus:outline-none ${
                !selectedBrand ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <option value="">{selectedBrand ? 'Select Model' : 'Pick Company First'}</option>
              {currentModels.map((model, index) => (
                <option key={`${model.name}-${index}`} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </label>
        </div>

        {selectedVehicle && (
          <div className="relative z-10 mb-2.5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
            {selectedVehicle.image ? (
              <div className="flex h-[68px] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                <img
                  src={selectedVehicle.image}
                  alt={`${selectedVehicle.name} vehicle`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-[68px] w-24 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-3xl">
                {selectedType === 'toto' ? '🛺' : '🏍️'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{selectedVehicle.brand}</p>
              <p className="mt-1 line-clamp-2 text-[12px] font-extrabold leading-snug text-white">{selectedVehicle.name}</p>
              <p className="mt-1 text-[9px] font-semibold text-emerald-400">Model selected</p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between gap-2">
          {activeVehicleFilter ? (
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Fitted for: <strong>{activeVehicleFilter}</strong></span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">
              {selectedModel ? `Ready to filter for ${selectedModel}` : 'Select your model above'}
            </span>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            disabled={!selectedBrand}
            onClick={handleApplyFilter}
            className={`shrink-0 rounded-xl px-4 py-1.5 text-[11.5px] font-bold shadow-sm transition-all ${
              selectedBrand
                ? 'cursor-pointer bg-[#D9232D] text-white hover:bg-[#c01d26]'
                : 'cursor-not-allowed bg-gray-800 text-gray-500'
            }`}
          >
            Find Covers
          </motion.button>
        </div>
      </div>
    </section>
  );
};
