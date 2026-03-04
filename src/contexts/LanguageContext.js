import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  const normalizeLanguageCode = (languageCode) => {
    if (!languageCode || typeof languageCode !== 'string') {
      return 'en';
    }

    const trimmed = languageCode.trim();
    if (!trimmed) {
      return 'en';
    }

    const canonical = trimmed.replace(/_/g, '-');
    const lower = canonical.toLowerCase();

    if (
      lower === 'zh' ||
      lower.startsWith('zh-cn') ||
      lower.startsWith('zh-hans') ||
      lower.startsWith('zh-sg')
    ) {
      return 'zh-CN';
    }
    if (
      lower.startsWith('zh-tw') ||
      lower.startsWith('zh-hant') ||
      lower.startsWith('zh-hk') ||
      lower.startsWith('zh-mo')
    ) {
      return 'zh-TW';
    }

    return canonical;
  };

  const languages = [
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
    { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'tl', name: 'Tagalog', nativeName: 'Filipino' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  ];

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language');
      const normalized = normalizeLanguageCode(savedLanguage);
      if (normalized && languages.find(lang => lang.code === normalized)) {
        setCurrentLanguage(normalized);
        await i18n.changeLanguage(normalized);
      }
    } catch (error) {
      console.log('Error loading saved language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      const normalized = normalizeLanguageCode(languageCode);
      await i18n.changeLanguage(normalized);
      await AsyncStorage.setItem('user-language', normalized);
      setCurrentLanguage(normalized);
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  const getCurrentLanguageName = () => {
    const language = languages.find(lang => lang.code === currentLanguage);
    return language ? language.nativeName : 'English';
  };

  const value = {
    currentLanguage,
    languages,
    changeLanguage,
    getCurrentLanguageName,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
