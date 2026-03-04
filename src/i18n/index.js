import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './/locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import hr from './locales/hr.json';
import cs from './locales/cs.json';
import da from './locales/da.json';
import nl from './locales/nl.json';
import fi from './locales/fi.json';
import de from './locales/de.json';
import el from './locales/el.json';
import hi from './locales/hi.json';
import hu from './locales/hu.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ms from './locales/ms.json';
import no from './locales/no.json';
import fa from './locales/fa.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import sk from './locales/sk.json';
import sv from './locales/sv.json';
import tl from './locales/tl.json';
import th from './locales/th.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import vi from './locales/vi.json';

const SUPPORTED_LANGUAGES = [
  'ar',
  'zh-CN',
  'zh-TW',
  'hr',
  'cs',
  'da',
  'nl',
  'en',
  'fi',
  'fr',
  'de',
  'el',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'no',
  'fa',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'es',
  'sv',
  'tl',
  'th',
  'tr',
  'uk',
  'vi',
];

const LANGUAGE_ALIASES = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-hans-cn': 'zh-CN',
  'zh-sg': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hant': 'zh-TW',
  'zh-hant-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-mo': 'zh-TW',
};

const normalizeLanguageCode = (language) => {
  if (!language || typeof language !== 'string') {
    return 'en';
  }

  const trimmed = language.trim();
  if (!trimmed) {
    return 'en';
  }

  const canonical = trimmed.replace(/_/g, '-');
  const lower = canonical.toLowerCase();

  if (lower.startsWith('zh-hans') || lower.startsWith('zh-cn') || lower.startsWith('zh-sg')) {
    return 'zh-CN';
  }
  if (lower.startsWith('zh-hant') || lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo')) {
    return 'zh-TW';
  }

  const aliased = LANGUAGE_ALIASES[lower];
  if (aliased) {
    return aliased;
  }

  if (SUPPORTED_LANGUAGES.includes(canonical)) {
    return canonical;
  }

  const baseLanguage = canonical.split('-')[0];
  if (SUPPORTED_LANGUAGES.includes(baseLanguage)) {
    return baseLanguage;
  }

  return canonical;
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        callback(normalizeLanguageCode(savedLanguage));
      } else {
        callback('en'); // Default to English
      }
    } catch (error) {
      console.log('Error reading language from storage:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('user-language', normalizeLanguageCode(language));
    } catch (error) {
      console.log('Error saving language to storage:', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      ar: { translation: ar },
      zh: { translation: zhCN },
      'zh-Hans': { translation: zhCN },
      'zh-Hant': { translation: zhTW },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      hr: { translation: hr },
      cs: { translation: cs },
      da: { translation: da },
      nl: { translation: nl },
      en: { translation: en },
      fi: { translation: fi },
      de: { translation: de },
      el: { translation: el },
      hi: { translation: hi },
      hu: { translation: hu },
      id: { translation: id },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      ms: { translation: ms },
      no: { translation: no },
      fa: { translation: fa },
      pl: { translation: pl },
      pt: { translation: pt },
      ro: { translation: ro },
      ru: { translation: ru },
      sk: { translation: sk },
      es: { translation: es },
      sv: { translation: sv },
      tl: { translation: tl },
      th: { translation: th },
      tr: { translation: tr },
      uk: { translation: uk },
      vi: { translation: vi },
      fr: { translation: fr },
    },
    supportedLngs: SUPPORTED_LANGUAGES,
    // Keep region-specific locales (e.g. zh-CN / zh-TW) explicit.
    // nonExplicitSupportedLngs causes i18next to resolve to base "zh",
    // which is not defined in resources and falls back to English.
    nonExplicitSupportedLngs: false,
    // Resolve only to the active locale key (prevents parent fallback like "zh").
    load: 'currentOnly',
    cleanCode: false,
    lowerCaseLng: false,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
