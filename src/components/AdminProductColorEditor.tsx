import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { Product } from '../types';
import { autofillProductDetailsFromImage } from '../lib/productImageAutofill';
import {
  getColorBgClass,
  getColorNameFromHex,
  isValidProductColorValue,
  toColorPickerValue,
} from '../lib/productColors';
import { BottomSheet } from './BottomSheet';
import { DEFAULT_INSTALLATION } from '../lib/productColors';

type ProductColor = Product['colors'][number];
type LocalColor = ProductColor & { nameTouched?: boolean };
export type ProductDetailDefaults = {
  subtitle: string;
  features: string[];
  compatibility: string[];
  materials: string[];
  stitchPatterns: string[];
  packageIncludes: string[];
  installation: string;
};
type Props = {
  colors: Product['colors'];
  onChange: (colors: Product['colors']) => void;
  onUploadFiles?: (files: File[]) => Promise<string[]>;
  productDefaults: ProductDetailDefaults;
  notify: (message: string) => void;
};
const listValue = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
const listText = (value?: string[]) => (value || []).join('\n');

export const AdminProductColorEditor: React.FC<Props> = ({
  colors,
  onChange,
  onUploadFiles,
  productDefaults,
  notify,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [autoFillIndex, setAutoFillIndex] = useState<number | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<number, string>>({});
  const [detailsIndex, setDetailsIndex] = useState<number | null>(null);
  const [copyFrom, setCopyFrom] = useState('');
  const coverColorIndex = colors.findIndex((color) => (color.images || []).some(Boolean));
  const getLocal = (color: ProductColor): LocalColor => {
    const local = color as LocalColor;
    if (local.nameTouched !== undefined) return local;
    const autoName = getColorNameFromHex(color.hex);
    return { ...local, nameTouched: Boolean(color.name.trim() && color.name.trim() !== autoName) };
  };
  const updateColor = (index: number, patch: Partial<LocalColor>) =>
    onChange(
      colors.map((color, colorIndex) =>
        colorIndex === index ? ({ ...color, ...patch } as ProductColor) : color,
      ),
    );
  const updateImages = (index: number, images: string[]) =>
    updateColor(index, { images: images.filter(Boolean) });
  const setColorPrimary = (colorIndex: number, imageIndex: number) => {
    const images = colors[colorIndex]?.images || [];
    if (imageIndex <= 0 || imageIndex >= images.length) return;
    updateImages(colorIndex, [
      images[imageIndex],
      ...images.filter((_, index) => index !== imageIndex),
    ]);
  };
  const changeHex = (index: number, hex: string) => {
    const color = getLocal(colors[index]);
    updateColor(index, {
      hex,
      bgClass: getColorBgClass(hex),
      ...(color.nameTouched ? {} : { name: getColorNameFromHex(hex) }),
    });
  };
  const openFilePicker = (index: number) => {
    fileRef.current?.setAttribute('data-color-index', String(index));
    fileRef.current?.click();
  };
  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(event.currentTarget.getAttribute('data-color-index'));
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!Number.isInteger(index) || !files.length || !onUploadFiles) return;
    setUploadingIndex(index);
    try {
      updateImages(index, [...(colors[index]?.images || []), ...(await onUploadFiles(files))]);
    } finally {
      setUploadingIndex(null);
    }
  };
  const addUrl = (index: number) => {
    const value = (urlDrafts[index] || '').trim();
    if (!value) return;
    try {
      new URL(value);
    } catch {
      return;
    }
    updateImages(index, [...(colors[index]?.images || []), value]);
    setUrlDrafts((current) => ({ ...current, [index]: '' }));
  };
  const activeColor = detailsIndex === null ? null : colors[detailsIndex];
  const summary = (color: ProductColor) =>
    `${color.features?.length || 0} features · ${color.compatibility?.length || 0} vehicles · ${color.materials?.length || 0} materials · ${color.stitchPatterns?.length || 0} stitches · ${color.packageIncludes?.length || 0} in package`;
  const saveDetails = (patch: Partial<ProductColor>) => {
    if (detailsIndex !== null) updateColor(detailsIndex, patch);
    setDetailsIndex(null);
  };
  const autoFillDetails = async (index: number) => {
    const imageUrl = colors[index]?.images?.[0];
    if (!imageUrl) {
      notify('Upload a colour image first.');
      return;
    }
    setAutoFillIndex(index);
    try {
      const details = await autofillProductDetailsFromImage(imageUrl);
      updateColor(index, {
        subtitle: details.subtitle,
        features: details.features,
        materials: details.materials,
        stitchPatterns: details.stitch_patterns,
        packageIncludes: ['1 Seat Cover'],
        installation: 'Easy (DIY)',
      });
      notify('AI details added. Please check them before saving.');
    } catch (error) {
      notify(
        `Could not auto-fill details: ${error instanceof Error ? error.message : 'Please try again.'}`,
      );
    } finally {
      setAutoFillIndex(null);
    }
  };
  const copyDetails = () => {
    if (detailsIndex === null || !copyFrom) return;
    const source = colors[Number(copyFrom)];
    if (!source) return;
    saveDetails({
      subtitle: source.subtitle,
      features: source.features ? [...source.features] : undefined,
      compatibility: source.compatibility ? [...source.compatibility] : undefined,
      materials: source.materials ? [...source.materials] : undefined,
      stitchPatterns: source.stitchPatterns ? [...source.stitchPatterns] : undefined,
      packageIncludes: source.packageIncludes ? [...source.packageIncludes] : undefined,
      installation: source.installation,
    });
    setCopyFrom('');
  };
  return (
    <section
      aria-label="Product color options"
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-black text-slate-800">Product color options</h3>
          <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-500">
            Each colour holds its own photos. The first image of a colour is its main image, and the
            first colour with photos also becomes the product cover. Colours without photos reuse
            that default gallery.
          </p>
        </div>
        <button
          type="button"
          disabled={autoFillIndex !== null}
          onClick={() => {
            const hex = '#D9232D';
            // New colours carry no detail overrides, so they inherit the
            // product-level defaults until this colour edits its own values.
            onChange([
              ...colors,
              {
                name: getColorNameFromHex(hex),
                hex,
                bgClass: getColorBgClass(hex),
                images: [],
              },
            ]);
          }}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add color
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          void uploadFiles(event);
        }}
      />
      <div className="mt-3 space-y-2.5">
        {colors.map((color, index) => {
          const validColor = isValidProductColorValue(color.hex);
          const images = color.images || [];
          return (
            <div
              // A stable key is critical: keying by color.name remounts the card
              // on every keystroke and dismisses the mobile keyboard mid-edit.
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                  Color {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => onChange(colors.filter((_, colorIndex) => colorIndex !== index))}
                  disabled={colors.length <= 1 || autoFillIndex !== null}
                  aria-label={`Remove color ${color.name || index + 1}`}
                  className="rounded-lg p-1.5 text-slate-400 disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="min-w-0">
                  <span className="mb-1 block text-[10px] font-bold text-slate-500">
                    Display name
                  </span>
                  <input
                    value={color.name}
                    onChange={(event) =>
                      updateColor(index, { name: event.target.value, nameTouched: true })
                    }
                    placeholder="Crimson Red"
                    aria-label={`Color name ${index + 1}`}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-base sm:text-xs font-semibold"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-[10px] font-bold text-slate-500">
                    Hex code or CSS color name
                  </span>
                  <input
                    value={color.hex}
                    onChange={(event) => changeHex(index, event.target.value)}
                    placeholder="#D9232D or navy"
                    aria-label={`Color code or CSS name ${index + 1}`}
                    aria-invalid={!validColor}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-base sm:text-xs font-semibold"
                  />
                </label>
                <label className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border">
                  <input
                    type="color"
                    value={toColorPickerValue(color.hex)}
                    onChange={(event) => changeHex(index, event.target.value)}
                    aria-label={`Choose color ${index + 1}`}
                    className="h-14 w-14"
                  />
                </label>
              </div>
              {!validColor && (
                <p role="alert" className="mt-1.5 text-[10px] font-semibold text-rose-600">
                  Enter a valid color.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-600">Colour details</p>
                  <p className="break-words text-[10px] text-slate-400">
                    {color.subtitle || 'No subtitle'} · {summary(color)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCopyFrom('');
                    setDetailsIndex(index);
                  }}
                  className="min-h-10 shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white"
                >
                  Edit details
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openFilePicker(index)}
                  disabled={!onUploadFiles || uploadingIndex !== null}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold"
                >
                  {uploadingIndex === index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload images
                </button>
                <div className="flex min-w-0 flex-1 gap-1.5">
                  <input
                    value={urlDrafts[index] || ''}
                    onChange={(event) =>
                      setUrlDrafts((current) => ({ ...current, [index]: event.target.value }))
                    }
                    placeholder="Paste image URL"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border bg-slate-50 px-2.5 py-2 text-base sm:text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addUrl(index)}
                    aria-label="Add image URL"
                    className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg bg-slate-900 px-2.5 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void autoFillDetails(index)}
                  disabled={!images.length || autoFillIndex !== null || uploadingIndex !== null}
                  className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {autoFillIndex === index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {autoFillIndex === index ? 'Analyzing image…' : 'Auto-fill details from image'}
                </button>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                  AI-generated, please check before saving.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black text-slate-700">Photos · {images.length}</p>
                  {coverColorIndex === index && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">
                      Product cover
                    </span>
                  )}
                </div>
                {images.length > 0 && (
                  <span className="text-[9px] text-slate-400">First image = main</span>
                )}
              </div>
              {images.length === 0 && (
                <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[9px] leading-relaxed text-slate-500">
                  {coverColorIndex === index
                    ? 'No photos yet. Upload one to make this the product cover.'
                    : `Customers see the default gallery from ${coverColorIndex >= 0 ? colors[coverColorIndex]?.name : 'the first colour with photos'}.`}
                </p>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((image, imageIndex) => (
                  <div
                    key={`${image}-${imageIndex}`}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <div className="relative aspect-square">
                      <img
                        src={image}
                        alt={`${color.name} ${imageIndex + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateImages(
                            index,
                            images.filter((_, itemIndex) => itemIndex !== imageIndex),
                          )
                        }
                        aria-label={`Remove ${color.name} image ${imageIndex + 1}`}
                        className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-slate-900/80 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {imageIndex === 0 ? (
                      <div className="bg-slate-900 px-1 py-1.5 text-center text-[8px] font-black text-white">
                        Colour main
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setColorPrimary(index, imageIndex)}
                        className="w-full bg-white px-1 py-1.5 text-[8px] font-black text-[#D9232D]"
                      >
                        Set as main
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <BottomSheet
        open={activeColor !== null}
        title="Edit colour details"
        onClose={() => setDetailsIndex(null)}
      >
        <ColorDetailsForm
          color={activeColor || { name: '', hex: '', bgClass: '' }}
          colors={colors}
          productDefaults={productDefaults}
          copyFrom={copyFrom}
          setCopyFrom={setCopyFrom}
          onCopy={copyDetails}
          onSave={saveDetails}
          onCancel={() => setDetailsIndex(null)}
        />
      </BottomSheet>
    </section>
  );
};

const ColorDetailsForm: React.FC<{
  color: Product['colors'][number];
  colors: Product['colors'];
  productDefaults: ProductDetailDefaults;
  copyFrom: string;
  setCopyFrom: (value: string) => void;
  onCopy: () => void;
  onSave: (patch: Partial<Product['colors'][number]>) => void;
  onCancel: () => void;
}> = ({ color, colors, productDefaults, copyFrom, setCopyFrom, onCopy, onSave, onCancel }) => {
  const [subtitle, setSubtitle] = useState(color.subtitle || '');
  const [features, setFeatures] = useState(listText(color.features));
  const [compatibility, setCompatibility] = useState(listText(color.compatibility));
  const [materials, setMaterials] = useState(listText(color.materials));
  const [stitchPatterns, setStitchPatterns] = useState(listText(color.stitchPatterns));
  const [packageIncludes, setPackageIncludes] = useState(listText(color.packageIncludes));
  const [installation, setInstallation] = useState(color.installation || '');
  useEffect(() => {
    setSubtitle(color.subtitle || '');
    setFeatures(listText(color.features));
    setCompatibility(listText(color.compatibility));
    setMaterials(listText(color.materials));
    setStitchPatterns(listText(color.stitchPatterns));
    setPackageIncludes(listText(color.packageIncludes));
    setInstallation(color.installation || '');
  }, [color]);
  // An empty field means "inherit from the product", so the saved colour only
  // carries the values this colour actually overrides.
  const ownList = (value: string) => (listValue(value).length ? listValue(value) : undefined);
  const listFields = [
    ['Features', features, setFeatures, productDefaults.features],
    ['Suitable For (vehicle models)', compatibility, setCompatibility, productDefaults.compatibility],
    ['Materials', materials, setMaterials, productDefaults.materials],
    ['Stitch patterns', stitchPatterns, setStitchPatterns, productDefaults.stitchPatterns],
    ['Package Includes', packageIncludes, setPackageIncludes, productDefaults.packageIncludes],
  ] as const;
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-slate-500">
        Empty fields use the product default. Fill a field to give this colour its own value.
      </p>
      <label className="block text-xs font-bold">
        Copy details from another colour
        <select
          value={copyFrom}
          onChange={(event) => setCopyFrom(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border px-3 py-2.5 text-base sm:text-xs"
        >
          <option value="">Choose colour</option>
          {colors.map(
            (item, index) =>
              item !== color && (
                <option key={index} value={index}>
                  {item.name || `Colour ${index + 1}`}
                </option>
              ),
          )}
        </select>
      </label>
      <button
        type="button"
        onClick={onCopy}
        disabled={!copyFrom}
        className="min-h-11 rounded-lg border px-3.5 py-2 text-xs sm:text-[10px] font-bold disabled:opacity-40"
      >
        Apply copied details
      </button>
      <label className="block text-xs font-bold">
        Short subtitle
        <input
          value={subtitle}
          onChange={(event) => setSubtitle(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border px-3 py-2.5 text-base sm:text-xs"
          placeholder={productDefaults.subtitle || 'Product default subtitle'}
        />
      </label>
      {listFields.map(([label, value, setter, fallback]) => (
        <label key={label} className="block text-xs font-bold">
          {label}
          <textarea
            rows={4}
            value={value}
            onChange={(event) => setter(event.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-base sm:text-xs"
            placeholder={fallback.length ? fallback.join('\n') : 'One per line'}
          />
        </label>
      ))}
      <label className="block text-xs font-bold">
        Installation
        <input
          value={installation}
          onChange={(event) => setInstallation(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border px-3 py-2.5 text-base sm:text-xs"
          placeholder={productDefaults.installation || DEFAULT_INSTALLATION}
        />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border px-4 py-2.5 text-xs font-bold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              subtitle: subtitle.trim() || undefined,
              features: ownList(features),
              compatibility: ownList(compatibility),
              materials: ownList(materials),
              stitchPatterns: ownList(stitchPatterns),
              packageIncludes: ownList(packageIncludes),
              installation: installation.trim() || undefined,
            })
          }
          className="banner-cta-shine min-h-11 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#b91822] active:scale-[0.98]"
        >
          Save details
        </button>
      </div>
    </div>
  );
};
