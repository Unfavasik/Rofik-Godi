import React, { useRef, useState } from 'react';
import { Camera, ChevronLeft, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { saveMyProfile, uploadMyAvatar, deleteMyAvatar } from '../lib/supabaseCustomer';
import { validateProfileFields } from '../lib/profileValidation';
import signupAvatar from '../assets/onboarding/signup.webp';

interface SignupProfilePageProps {
  user: UserProfile;
  onComplete: (user: UserProfile) => void;
  onSkip: () => void;
}

export const SignupProfilePage: React.FC<SignupProfilePageProps> = ({ user, onComplete, onSkip }) => {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [vehicle, setVehicle] = useState(user.vehicle || 'Hero Splendor Plus & Toto');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar || null);
  const [errors, setErrors] = useState<{ full_name?: string; phone?: string; vehicle_model?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const previousAvatarRef = useRef<string | null>(user.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarPick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFormError('');
    const result = await uploadMyAvatar(file);
    if (result.error || !result.data) {
      setFormError(result.error?.message || 'Could not upload the photo. Please try again.');
    } else {
      setAvatarUrl(result.data.url);
      void deleteMyAvatar(previousAvatarRef.current);
      previousAvatarRef.current = result.data.url;
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const fieldErrors = validateProfileFields({
      full_name: name,
      phone,
      vehicle_model: vehicle,
      phoneCountry: 'IN',
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    setFormError('');
    const { error } = await saveMyProfile({
      full_name: name.trim(),
      phone: phone.trim(),
      avatar_url: avatarUrl,
      vehicle_model: vehicle.trim(),
    });
    if (error) {
      setFormError(error.message || 'Could not save your details. Please try again.');
      setSaving(false);
      return;
    }
    onComplete({
      ...user,
      name: name.trim(),
      phone: phone.trim(),
      vehicle: vehicle.trim(),
      avatar: avatarUrl || undefined,
    });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#fdeff1] font-sans antialiased text-[#0f1a3a]">
      {/* Header with illustration */}
      <div className="relative px-5 pt-[calc(env(safe-area-inset-top,0px)+18px)]">
        <button
          type="button"
          onClick={onSkip}
          aria-label="Go back"
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <img
          src={signupAvatar}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full object-cover object-[center_top] opacity-90"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-transparent via-[#fdeff1]/30 to-[#fdeff1]" />
        <h1 className="relative z-10 mt-6 max-w-[260px] text-[clamp(26px,7.5vw,32px)] font-bold leading-[1.1] tracking-tight">
          Tell us about <span className="text-[#e0182d]">yourself.</span>
        </h1>
        <p className="relative z-10 mt-2 max-w-[300px] text-[13px] leading-relaxed text-[#0f1a3a]/70">
          Add your personal details so orders, deliveries and support reach you faster.
        </p>
      </div>

      {/* Form card */}
      <div className="relative -mt-6 flex-1 rounded-t-[44px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6 shadow-[0_-6px_30px_rgba(224,24,45,0.08)]">
        {/* Avatar picker */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Choose profile photo"
            className="relative h-20 w-20 overflow-hidden rounded-full bg-[#fdeff1] ring-4 ring-white shadow-[0_4px_14px_rgba(224,24,45,0.15)] transition-transform active:scale-95"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Your profile photo" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-black text-[#e0182d]">
                {(name.trim()[0] || 'R').toLocaleUpperCase()}
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </span>
            )}
          </button>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#fdeff1] px-3 py-1 text-[11px] font-bold text-[#e0182d]">
            <Camera className="h-3.5 w-3.5" />
            {avatarUrl ? 'Change photo' : 'Add photo'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleAvatarPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>

        {/* Fields */}
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-xs font-bold text-[#0f1a3a]/80">
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Enter your full name"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-[#0f1a3a] outline-none transition-all placeholder:text-slate-400 focus:border-[#e0182d] focus:bg-white focus:ring-4 focus:ring-[#e0182d]/10"
            />
            {errors.full_name && <p className="mt-1 text-[11px] font-semibold text-[#e0182d]">{errors.full_name}</p>}
          </div>

          <div>
            <label htmlFor="signup-phone" className="mb-1.5 block text-xs font-bold text-[#0f1a3a]/80">
              Mobile number <span className="font-medium text-slate-400">(optional)</span>
            </label>
            <input
              id="signup-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              inputMode="tel"
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-[#0f1a3a] outline-none transition-all placeholder:text-slate-400 focus:border-[#e0182d] focus:bg-white focus:ring-4 focus:ring-[#e0182d]/10"
            />
            {errors.phone && <p className="mt-1 text-[11px] font-semibold text-[#e0182d]">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="signup-vehicle" className="mb-1.5 block text-xs font-bold text-[#0f1a3a]/80">
              Your vehicle model
            </label>
            <input
              id="signup-vehicle"
              type="text"
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
              placeholder="e.g. Hero Splendor Plus"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-[#0f1a3a] outline-none transition-all placeholder:text-slate-400 focus:border-[#e0182d] focus:bg-white focus:ring-4 focus:ring-[#e0182d]/10"
            />
            {errors.vehicle_model && <p className="mt-1 text-[11px] font-semibold text-[#e0182d]">{errors.vehicle_model}</p>}
          </div>
        </div>

        {formError && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-[#e0182d]">{formError}</p>
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || uploading}
          className="mt-6 flex min-h-13 w-full items-center justify-center rounded-full bg-[#e0182d] py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(224,24,45,0.3)] transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save & continue'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={saving || uploading}
          className="mt-3 w-full py-2 text-center text-[13px] font-bold text-[#0f1a3a]/60 transition-colors disabled:opacity-60"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default SignupProfilePage;
