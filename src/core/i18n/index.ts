import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { kv, kvKeys } from '@/core/storage/kv';

import en from './locales/en';
import vi from './locales/vi';

export type Language = 'vi' | 'en';

export const languages: Language[] = ['vi', 'en'];

function storedLanguage(): Language {
  const value = kv.getString(kvKeys.language);
  return value === 'en' ? 'en' : 'vi';
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: storedLanguage(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(language: Language) {
  kv.set(kvKeys.language, language);
  void i18n.changeLanguage(language);
}

export function currentLanguage(): Language {
  return i18n.language === 'en' ? 'en' : 'vi';
}

export default i18n;
