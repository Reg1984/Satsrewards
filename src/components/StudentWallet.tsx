import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp } from 'lucide-react';
import { WithdrawModal } from './WithdrawModal';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function StudentWallet() {
  const [balance, setBalance] = useState(1250.75);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    // Mock transaction data
    setTransactions([
      {
        id: '1',
        type: 'deposit',
        amount: 500.00,
        description: 'Financial Aid Disbursement',
        date: '2024-01-15T10:30:00Z',
        status: 'completed'
      },
      {
        id: '2',
        type: 'payment',
        amount: -45.25,
        description: 'Cafeteria - Lunch',
        date: '2024-01-14T12:15:00Z',
        status: 'completed'
      },
      {
        id: '3',
        type: 'payment',
        amount: -120.00,
        description: 'Bookstore - Textbooks',
        date: '2024-01-13T14:20:00Z',
        status: 'completed'
      },
      {
        id: '4',
        type: 'deposit',
        amount: 1000.00,
        description: 'Parent Transfer',
        date: '2024-01-10T09:00:00Z',
        status: 'completed'
      },
      {
        id: '5',
        type: 'payment',
        amount: -25.50,
        description: 'Library - Late Fees',
        date: '2024-01-09T16:45:00Z',
        status: 'completed'
      }
    ]);
  }, []);

  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
  };

  const handleWithdrawSuccess = (withdrawnAmount: number) => {
    setBalance(prev => prev - withdrawnAmount);
    setShowWithdrawModal(false);
    
    // Add transaction to history
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'withdrawal',
      amount: withdrawnAmount,
      description: 'Withdrawal',
      date: new Date().toISOString(),
      status: 'completed'
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'payment':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Available Balance</p>
            <p className="text-3xl font-bold">${balance.toFixed(2)}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-full">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button 
            onClick={handleWithdrawClick}
            className="bg-white text-orange-600 px-4 py-2 rounded-md font-medium hover:bg-orange-50 transition-colors"
          >
            Withdraw
          </button>
          <button className="bg-orange-700 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-800 transition-colors">
            Add Funds
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-xl font-semibold text-green-600">+$1,500.00</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spent Today</p>
              <p className="text-xl font-semibold text-red-600">-$45.25</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-xl font-semibold text-gray-900">{transactions.length}</p>
            </div>
            <DollarSign className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>
        
        <div className="divide-y">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'deposit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 capitalize">{transaction.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        balance={balance}
        onWithdrawSuccess={handleWithdrawSuccess}
      />
    </div>
  );
}