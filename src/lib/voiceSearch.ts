import type { PreferredLanguage } from './customerPreferences';

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstance;

interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}

export const RECENT_SEARCHES_KEY = 'rofik_godi_recent_searches';
export const VOICE_HINT_DISMISSED_KEY = 'rofik_godi_voice_hint_dismissed';
export const VOICE_HINT_DISMISSED_EVENT = 'rofik-godi:voice-hint-dismissed';

export function mapLanguageToSpeechLocale(language?: PreferredLanguage | string): string {
  if (language === 'bn') return 'bn-IN';
  if (language === 'hi') return 'hi-IN';
  return 'en-IN';
}

export function cleanVoiceSearchTranscript(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?;:।۔]+$/g, '')
    .trim();
}

const VOICE_COMMAND_PREFIX_RE =
  /^(?:please\s+)?(?:show\s+me|find\s+me|find|search\s+for|search|look\s+for|looking\s+for|i\s+want|i\s+need|give\s+me|get\s+me)\s+/i;

export function extractVoiceSearchQuery(raw: string): string {
  const cleaned = cleanVoiceSearchTranscript(raw);
  if (!cleaned) return '';
  const stripped = cleaned.replace(VOICE_COMMAND_PREFIX_RE, '').trim();
  return stripped || cleaned;
}

export function getVoiceSearchErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Allow mic access in browser settings and try again.';
    case 'audio-capture':
      return 'No microphone was detected on this device.';
    case 'no-speech':
      return 'No speech detected. Tap the mic and speak clearly.';
    case 'network':
      return 'Voice recognition needs an active internet connection.';
    case 'unsupported':
      return 'Voice search is not supported in this browser.';
    case 'aborted':
      return '';
    default:
      return 'Could not recognize your voice. Please try again.';
  }
}

export function getSpeechRecognitionConstructor(
  win: unknown = typeof window !== 'undefined' ? window : undefined,
): SpeechRecognitionConstructorLike | null {
  if (!win || typeof win !== 'object') return null;
  const candidate = win as WindowWithSpeechRecognition;
  if (typeof candidate.SpeechRecognition === 'function') {
    return candidate.SpeechRecognition;
  }
  if (typeof candidate.webkitSpeechRecognition === 'function') {
    return candidate.webkitSpeechRecognition;
  }
  return null;
}

export function isVoiceSearchSupported(
  win: unknown = typeof window !== 'undefined' ? window : undefined,
): boolean {
  return getSpeechRecognitionConstructor(win) !== null;
}

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function isVoiceSearchHintDismissed(): boolean {
  if (!canUseLocalStorage()) return false;
  try {
    return window.localStorage.getItem(VOICE_HINT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissVoiceSearchHint(): void {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(VOICE_HINT_DISMISSED_KEY, '1');
    window.dispatchEvent(new CustomEvent(VOICE_HINT_DISMISSED_EVENT));
  } catch {
    // Non-fatal in private browsing or restricted storage.
  }
}

export function readRecentSearchTerms(fallback: string[] = []): string[] {
  if (!canUseLocalStorage()) return fallback;
  try {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        if (clean.length > 0) return clean;
      }
    }
  } catch {
    // Ignore malformed storage values and fall back cleanly.
  }
  return fallback;
}

export function persistRecentSearchTerms(terms: string[]): void {
  if (!canUseLocalStorage()) return;
  try {
    if (terms.length === 0) {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } else {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
    }
  } catch {
    // Storage quota or privacy mode errors are non-fatal.
  }
}

export function saveRecentSearchTerm(term: string, fallback: string[] = []): string[] {
  const clean = term.trim();
  const current = readRecentSearchTerms(fallback);
  if (!clean || clean.length < 2) return current;

  const filtered = current.filter((item) => item.toLowerCase() !== clean.toLowerCase());
  const updated = [clean, ...filtered].slice(0, 8);
  persistRecentSearchTerms(updated);
  return updated;
}
