import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanVoiceSearchTranscript,
  extractVoiceSearchQuery,
  getSpeechRecognitionConstructor,
  getVoiceSearchErrorMessage,
  isVoiceSearchSupported,
  mapLanguageToSpeechLocale,
  type SpeechRecognitionInstance,
} from './voiceSearch';

test('mapLanguageToSpeechLocale maps app languages to Indian speech locales', () => {
  assert.equal(mapLanguageToSpeechLocale('en'), 'en-IN');
  assert.equal(mapLanguageToSpeechLocale('bn'), 'bn-IN');
  assert.equal(mapLanguageToSpeechLocale('hi'), 'hi-IN');
  assert.equal(mapLanguageToSpeechLocale(undefined), 'en-IN');
  assert.equal(mapLanguageToSpeechLocale('unknown'), 'en-IN');
});

test('cleanVoiceSearchTranscript trims extra whitespace and trailing punctuation', () => {
  assert.equal(cleanVoiceSearchTranscript('  Splendor   seat cover.  '), 'Splendor seat cover');
  assert.equal(cleanVoiceSearchTranscript('Activa 6G cover?'), 'Activa 6G cover');
  assert.equal(cleanVoiceSearchTranscript('টোটো সিট কভার।'), 'টোটো সিট কভার');
  assert.equal(cleanVoiceSearchTranscript('   '), '');
});

test('extractVoiceSearchQuery strips spoken command prefixes like "Show me" cleanly', () => {
  assert.equal(extractVoiceSearchQuery('Show me bike covers.'), 'bike covers');
  assert.equal(extractVoiceSearchQuery('Please find Activa seat cover'), 'Activa seat cover');
  assert.equal(extractVoiceSearchQuery('Search for waterproof toto cushion'), 'waterproof toto cushion');
  assert.equal(extractVoiceSearchQuery('Show me'), 'Show me');
});

test('getVoiceSearchErrorMessage maps Web Speech error codes to readable user messages', () => {
  assert.match(getVoiceSearchErrorMessage('not-allowed'), /permission denied/i);
  assert.match(getVoiceSearchErrorMessage('service-not-allowed'), /permission denied/i);
  assert.match(getVoiceSearchErrorMessage('audio-capture'), /microphone/i);
  assert.match(getVoiceSearchErrorMessage('no-speech'), /no speech/i);
  assert.match(getVoiceSearchErrorMessage('network'), /internet/i);
  assert.match(getVoiceSearchErrorMessage('unsupported'), /not supported/i);
  assert.equal(getVoiceSearchErrorMessage('aborted'), '');
  assert.match(getVoiceSearchErrorMessage('unknown-code'), /try again/i);
});

test('getSpeechRecognitionConstructor and isVoiceSearchSupported handle SSR and prefixed constructors', () => {
  assert.equal(isVoiceSearchSupported(undefined), false);
  assert.equal(getSpeechRecognitionConstructor(null), null);
  assert.equal(isVoiceSearchSupported({}), false);

  class MockRecognition implements SpeechRecognitionInstance {
    lang = '';
    interimResults = false;
    continuous = false;
    maxAlternatives = 1;
    onstart = null;
    onresult = null;
    onerror = null;
    onend = null;
    start() {}
    stop() {}
    abort() {}
  }

  assert.equal(getSpeechRecognitionConstructor({ SpeechRecognition: MockRecognition }), MockRecognition);
  assert.equal(isVoiceSearchSupported({ webkitSpeechRecognition: MockRecognition }), true);
});
