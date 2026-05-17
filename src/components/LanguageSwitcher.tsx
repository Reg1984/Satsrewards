import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  console.log('LanguageSwitcher: Current language is', language);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectLanguage = (lang: 'en' | 'es' | 'fr' | 'ar') => {
    console.log('LanguageSwitcher: Selecting language', lang);
    setLanguage(lang);
    setIsOpen(false);
    console.log('LanguageSwitcher: After setLanguage, language is still', language);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          id="language-menu"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={toggleDropdown}
        >
          <Globe className="h-4 w-4 mr-2" />
          {language === 'en' && 'English'}
          {language === 'es' && 'Español'}
          {language === 'fr' && 'Français'}
          {language === 'ar' && 'العربية'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu"
        >
          <div className="py-1" role="none">
            <button
              onClick={() => selectLanguage('en')}
              className={`${
                language === 'en' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
              role="menuitem"
            >
              English
            </button>
            <button
              onClick={() => selectLanguage('es')}
              className={`${
                language === 'es' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
              role="menuitem"
            >
              Español
            </button>
            <button
              onClick={() => selectLanguage('fr')}
              className={`${
                language === 'fr' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
              role="menuitem"
            >
              Français
            </button>
            <button
              onClick={() => selectLanguage('ar')}
              className={`${
                language === 'ar' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
              role="menuitem"
            >
              العربية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}