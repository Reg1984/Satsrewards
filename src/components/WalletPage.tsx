import React, { useState, useEffect } from 'react';
import { Wallet, History, Settings } from 'lucide-react';
import StudentWallet from './StudentWallet';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';
import { ArkWalletTransactions } from './ArkWalletTransactions';

export function WalletPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'wallet' | 'transactions' | 'settings'>('wallet');
  const location = useLocation();

  // Check URL for tab parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'transactions') {
      setActiveTab('transactions');
    } else if (tab === 'settings') {
      setActiveTab('settings');
    } else {
      setActiveTab('wallet');
    }
  }, [location]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Bitcoin Wallet</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'wallet'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Wallet className="h-5 w-5 inline mr-2" />
              Lightning Wallet
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'transactions'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-5 w-5 inline mr-2" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'settings'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-5 w-5 inline mr-2" />
              Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'wallet' && <StudentWallet />}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                <History className="h-5 w-5 text-gray-500" />
              </div>
              
              <ArkWalletTransactions />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Wallet Settings</h3>
                <Settings className="h-5 w-5 text-gray-500" />
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Enable Notifications</span>
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-orange-500" />
                  </label>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Auto-connect Wallet</span>
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-orange-500" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}