import { useCallback, useEffect, useRef, useState } from 'react';
import type { PreferredLanguage } from '../lib/customerPreferences';
import {
  cleanVoiceSearchTranscript,
  dismissVoiceSearchHint,
  extractVoiceSearchQuery,
  getSpeechRecognitionConstructor,
  getVoiceSearchErrorMessage,
  isVoiceSearchHintDismissed,
  isVoiceSearchSupported,
  mapLanguageToSpeechLocale,
  VOICE_HINT_DISMISSED_EVENT,
  type SpeechRecognitionInstance,
} from '../lib/voiceSearch';

interface UseVoiceSearchOptions {
  language?: PreferredLanguage;
  onResult: (transcript: string) => void;
}

export interface UseVoiceSearchResult {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  locale: string;
  isHintDismissed: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearError: () => void;
  dismissHint: () => void;
}

export function useVoiceSearch({
  language = 'en',
  onResult,
}: UseVoiceSearchOptions): UseVoiceSearchResult {
  const [isSupported, setIsSupported] = useState<boolean>(() => isVoiceSearchSupported());
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isHintDismissed, setIsHintDismissed] = useState<boolean>(() => isVoiceSearchHintDismissed());

  const locale = mapLanguageToSpeechLocale(language);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  const hasSubmittedFinalRef = useRef(false);
  const latestInterimRef = useRef('');
  const hadErrorRef = useRef(false);

  onResultRef.current = onResult;

  useEffect(() => {
    setIsSupported(isVoiceSearchSupported());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncHintState = () => setIsHintDismissed(isVoiceSearchHintDismissed());
    window.addEventListener(VOICE_HINT_DISMISSED_EVENT, syncHintState);
    return () => window.removeEventListener(VOICE_HINT_DISMISSED_EVENT, syncHintState);
  }, []);

  const dismissHint = useCallback(() => {
    setIsHintDismissed(true);
    dismissVoiceSearchHint();
  }, []);

  const submitVoiceQuery = useCallback((rawText: string) => {
    const query = extractVoiceSearchQuery(rawText);
    if (!query) return false;
    hasSubmittedFinalRef.current = true;
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
    setError(null);
    setIsHintDismissed(true);
    dismissVoiceSearchHint();
    onResultRef.current(query);
    return true;
  }, []);

  const stopListening = useCallback(() => {
    const active = recognitionRef.current;
    recognitionRef.current = null;
    if (active) {
      try {
        active.stop();
      } catch {
        try {
          active.abort();
        } catch {
          // Ignore teardown errors on stopped recognition instances.
        }
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setIsSupported(false);
      setIsListening(false);
      setError(getVoiceSearchErrorMessage('unsupported'));
      return;
    }

    setIsSupported(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore stale abort error before starting a fresh session.
      }
      recognitionRef.current = null;
    }

    hasSubmittedFinalRef.current = false;
    latestInterimRef.current = '';
    hadErrorRef.current = false;
    setError(null);
    setInterimTranscript('');

    try {
      const recognition = new RecognitionCtor();
      recognition.lang = locale;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalRaw = '';
        let interimRaw = '';

        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = result?.[0]?.transcript ?? '';
          if (!text) continue;
          if (result.isFinal) {
            finalRaw += ` ${text}`;
          } else {
            interimRaw += ` ${text}`;
          }
        }

        const cleanedInterim = cleanVoiceSearchTranscript(interimRaw || finalRaw);
        latestInterimRef.current = cleanedInterim;
        setInterimTranscript(cleanedInterim);

        if (finalRaw.trim() && !hasSubmittedFinalRef.current) {
          submitVoiceQuery(finalRaw);
        }
      };

      recognition.onerror = (event) => {
        hadErrorRef.current = true;
        recognitionRef.current = null;
        setIsListening(false);
        setInterimTranscript('');

        if (event.error === 'aborted') {
          return;
        }
        setError(getVoiceSearchErrorMessage(event.error));
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);

        if (!hasSubmittedFinalRef.current && !hadErrorRef.current && latestInterimRef.current) {
          if (submitVoiceQuery(latestInterimRef.current)) {
            return;
          }
        }

        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript('');
      setError(getVoiceSearchErrorMessage('unknown'));
    }
  }, [locale, submitVoiceQuery]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      const active = recognitionRef.current;
      recognitionRef.current = null;
      if (active) {
        try {
          active.abort();
        } catch {
          // Ignore abort failures during unmount.
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    locale,
    isHintDismissed,
    startListening,
    stopListening,
    toggleListening,
    clearError,
    dismissHint,
  };
}
