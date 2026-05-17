import { Link } from 'react-router-dom';
import { BitcoinLogo } from './BitcoinLogo';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center">
              <BitcoinLogo size="lg" />
              <span className="ml-2 text-xl font-bold text-gray-800">SatsRewards</span>
            </div>
            <p className="mt-4 text-gray-600 max-w-md">
              A product of SatsStrategy Education Ltd. Registered in England and Wales (Company No. 16348591).
              Empowering students through Bitcoin education and rewards.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Registered Office: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Products</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/" className="text-base text-gray-600 hover:text-gray-900">
                  SatsRewards
                </Link>
              </li>
              <li>
                <a href="https://bitedu.co.uk" className="text-base text-gray-600 hover:text-gray-900">
                  Bitedu
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/privacy" className="text-base text-gray-600 hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-base text-gray-600 hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/gdpr" className="text-base text-gray-600 hover:text-gray-900">
                  GDPR
                </Link>
              </li>
              <li>
                <Link to="/company" className="text-base text-gray-600 hover:text-gray-900">
                  Company Information
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400">
            © {currentYear} SatsStrategy Education Ltd. All rights reserved. Registered in England and Wales (Company No. 16348591). Registered Office: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ.
          </p>
        </div>
      </div>
    </footer>
  );
}