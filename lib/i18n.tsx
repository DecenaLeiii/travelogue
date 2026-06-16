import React, { createContext, useContext, useEffect, useState } from 'react';

type Lang = 'en' | 'zh' | 'hi' | 'es' | 'ar';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    siteTitle: 'Philippines Travelogue',
    homeHeroTitle: 'Love the Philippines',
    homeHeroDesc: 'Explore beaches, mountains, history, and culture across 20 featured destinations.',
    learnMore: 'Learn more',
    home: 'Home',
    tourism: 'Tourism',
    destinations: 'Destinations',
    contact: 'Contact'
  },
  zh: {
    siteTitle: '菲律宾旅行手记',
    homeHeroTitle: '爱上菲律宾',
    homeHeroDesc: '探索海滩、山脉、历史与文化，涵盖 20 个精选目的地。',
    learnMore: '了解更多',
    home: '主页',
    tourism: '旅游',
    destinations: '目的地',
    contact: '联系'
  },
  hi: {
    siteTitle: 'फिलिपींस ट्रैवलॉग',
    homeHeroTitle: 'फिलिपींस से प्यार करें',
    homeHeroDesc: '20 प्रमुख गंतव्यों में समुद्र तट, पर्वत, इतिहास और संस्कृति का अन्वेषण करें।',
    learnMore: 'और जानें',
    home: 'होम',
    tourism: 'पर्यटन',
    destinations: 'गंतव्य',
    contact: 'संपर्क'
  },
  es: {
    siteTitle: 'Travelogue Filipinas',
    homeHeroTitle: 'Ama Filipinas',
    homeHeroDesc: 'Explora playas, montañas, historia y cultura en 20 destinos destacados.',
    learnMore: 'Aprende más',
    home: 'Inicio',
    tourism: 'Turismo',
    destinations: 'Destinos',
    contact: 'Contacto'
  },
  ar: {
    siteTitle: 'يوميات السفر الفلبين',
    homeHeroTitle: 'أحب الفلبين',
    homeHeroDesc: 'استكشف الشواطئ والجبال والتاريخ والثقافة عبر 20 وجهة مميزة.',
    learnMore: 'اعرف أكثر',
    home: 'الرئيسية',
    tourism: 'السياحة',
    destinations: 'الوجهات',
    contact: 'اتصال'
  }
};

const I18nContext = createContext({
  lang: 'en' as Lang,
  setLang: (l: Lang) => {},
  t: (k: string) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('travelogue_lang') : null;
    if (saved && ['en','zh','hi','es','ar'].includes(saved)) setLangState(saved as Lang);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('travelogue_lang', l);
  };

  const t = (k: string) => {
    return translations[lang][k] || translations['en'][k] || k;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
];

export default I18nContext;
