import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Trophy, GraduationCap, Users, School, BookOpen, Wallet, MessageSquare, Download, Globe, Brain } from 'lucide-react';
import { Gamepad2 } from './Games';
import { RoleSwitcher } from './RoleSwitcher';
import { useAuthStore } from '../store/authStore';
import { BitcoinLogo } from './BitcoinLogo';
import { Footer } from './Footer';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';

export function Layout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  console.log('Layout: Current language is', language);
  
  const t = translations[language];
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    console.log('Layout useEffect: language changed to', language);
  }, [language]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/app" className="flex items-center">
                <BitcoinLogo className="mr-2" /><span className="ml-2 text-xl font-bold text-gray-800">SatsRewards</span></Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Role Switcher - always visible */}
              <div className="mr-4">
                <RoleSwitcher />
              </div>              
              {user && (
                <>
                  <Link
                    to="/app"
                    className={`px-3 py-2 rounded-md ${
                      isActive('/app') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Trophy className="h-5 w-5 inline mr-1" />
                    {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                  </Link>

                  {user.role === 'student' && (
                    <>
                      <Link
                        to="/app/wallet"
                        className={`px-3 py-2 rounded-md ${
                          isActive('/app/wallet') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Wallet className="h-5 w-5 inline mr-1" />
                        {language === 'ar' ? 'المحفظة' : 'Wallet'}
                      </Link>
                      <Link
                        to="/app/games"
                        className={`px-3 py-2 rounded-md ${
                          isActive('/app/games') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Gamepad2 className="h-5 w-5 inline mr-1" />
                        {language === 'ar' ? 'ألعاب' : 'Games'}
                      </Link>
                    </>
                  )}

                  {user.role === 'admin' && (
                    <Link
                      to="/app/school-setup"
                      className={`px-3 py-2 rounded-md ${
                        isActive('/app/school-setup') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <School className="h-5 w-5 inline mr-1" />
                      {language === 'ar' ? 'إعداد المدرسة' : 'School Setup'}
                    </Link>
                  )}

                  {(user.role === 'teacher' || user.role === 'admin') && (
                    <Link
                      to="/app/funding"
                      className={`px-3 py-2 rounded-md ${
                        isActive('/app/funding') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Download className="h-5 w-5 inline mr-1" />
                      {language === 'ar' ? 'التمويل' : 'Funding'}
                    </Link>
                  )}

                  <Link
                    to="/app/learn"
                    className={`px-3 py-2 rounded-md ${
                      isActive('/app/learn') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="h-5 w-5 inline mr-1" />
                    {language === 'ar' ? 'تعلم' : 'Learn'}
                  </Link>

                  <Link
                    to="/app/messages"
                    className={`px-3 py-2 rounded-md ${
                      isActive('/app/messages') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <MessageSquare className="h-5 w-5 inline mr-1" />
                    {language === 'ar' ? 'رسائل' : 'Messages'}
                  </Link>

                  <Link
                    to="/app/ai-assistant"
                    className={`px-3 py-2 rounded-md ${
                      isActive('/app/ai-assistant') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Brain className="h-5 w-5 inline mr-1" />
                    {language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
                  </Link>

                  <div className="ml-4">
                    <LanguageSwitcher />
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-orange-500 hover:bg-gray-100 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {/* Icon when menu is closed */}
                <svg
                  className={`${menuOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                {/* Icon when menu is open */}
                <svg
                  className={`${menuOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        <div className={`${menuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {/* Role Switcher - always visible */}<div className="px-3 py-2"><RoleSwitcher /></div>
            
            {user && (
              <>
                <Link
                  to="/app"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/app') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <Trophy className="h-5 w-5 inline mr-2" />
                  {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </Link>

                {user.role === 'student' && (
                  <>
                    <Link
                      to="/app/wallet"
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        isActive('/app/wallet') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Wallet className="h-5 w-5 inline mr-2" />
                      {language === 'ar' ? 'المحفظة' : 'Wallet'}
                    </Link>
                    <Link
                      to="/app/games"
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        isActive('/app/games') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Gamepad2 className="h-5 w-5 inline mr-2" />
                      {language === 'ar' ? 'ألعاب' : 'Games'}
                    </Link>
                  </>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/app/school-setup"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/app/school-setup') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <School className="h-5 w-5 inline mr-2" />
                    {language === 'ar' ? 'إعداد المدرسة' : 'School Setup'}
                  </Link>
                )}

                {(user.role === 'teacher' || user.role === 'admin') && (
                  <Link
                    to="/app/funding"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive('/app/funding') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Download className="h-5 w-5 inline mr-2" />
                    {language === 'ar' ? 'التمويل' : 'Funding'}
                  </Link>
                )}

                <Link
                  to="/app/learn"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/app/learn') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <BookOpen className="h-5 w-5 inline mr-2" />
                  {language === 'ar' ? 'تعلم' : 'Learn'}
                </Link>

                <Link
                  to="/app/messages"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/app/messages') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <MessageSquare className="h-5 w-5 inline mr-2" />
                  {language === 'ar' ? 'رسائل' : 'Messages'}
                </Link>

                <Link
                  to="/app/ai-assistant"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/app/ai-assistant') ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <Brain className="h-5 w-5 inline mr-2" />
                  {language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
                </Link>

                <div className="pt-4 pb-2">
                  <div className="flex items-center px-3">
                    <Globe className="h-5 w-5 text-gray-500" />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {language === 'ar' ? 'اللغة' : 'Language'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={() => { setLanguage('en'); setMenuOpen(false); }}
                      className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                        language === 'en' ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => { setLanguage('es'); setMenuOpen(false); }}
                      className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                        language === 'es' ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Español
                    </button>
                    <button
                      onClick={() => { setLanguage('fr'); setMenuOpen(false); }}
                      className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                        language === 'fr' ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Français
                    </button>
                    <button
                      onClick={() => { setLanguage('ar'); setMenuOpen(false); }}
                      className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                        language === 'ar' ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      العربية
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="w-full flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}