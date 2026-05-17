import React, { useState } from 'react';
import { Wallet as WalletIcon, Award, Gift, History, Banknote, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { WithdrawModal } from './WithdrawModal';
import { ArkWalletTransactions } from './ArkWalletTransactions';
import { StudentZapHistory } from './StudentZapHistory';
import { motion, AnimatePresence } from 'framer-motion';

export function Wallet() {
  const { user } = useAuthStore();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'transactions' | 'zaps'>('balance');

  const { data: transactions = [] } = useQuery({
    queryKey: ['sats-transactions', user?.id],
    queryFn: async () => {  
      const { data, error } = await supabase
        .from('awards')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: lightningTxs = [] } = useQuery({
    queryKey: ['lightning-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lightning_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lightning transactions:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch zaps data
  const { data: zaps = [] } = useQuery({
    queryKey: ['student-zaps', user?.id],
    queryFn: async () => {
      // Fetch sent zaps
      const { data: sentZaps, error: sentError } = await supabase
        .from('student_zaps')
        .select(`
          *,
          receiver:receiver_id (name, image_url)
        `)
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error fetching sent zaps:', sentError);
        return [];
      }

      // Fetch received zaps
      const { data: receivedZaps, error: receivedError } = await supabase
        .from('student_zaps')
        .select(`
          *,
          sender:sender_id (name, image_url)
        `)
        .eq('receiver_id', user?.id)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error fetching received zaps:', receivedError);
        return [];
      }
      
      // Combine and sort
      return [
        ...(sentZaps || []).map(zap => ({ ...zap, direction: 'sent' })),
        ...(receivedZaps || []).map(zap => ({ ...zap, direction: 'received' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id,
  });

  const totalSats = transactions?.reduce((sum, t) => sum + t.sats, 0) || 0;
  const withdrawnSats = lightningTxs?.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount_sats : 0), 0) || 0;
  
  // Calculate zap balance
  const zapsSent = zaps
    .filter(z => z.direction === 'sent' && z.approved)
    .reduce((sum, z) => sum + z.amount_sats, 0);
  
  const zapsReceived = zaps
    .filter(z => z.direction === 'received')
    .reduce((sum, z) => sum + z.amount_sats, 0);
  
  const zapBalance = zapsReceived - zapsSent;
  
  // Total available balance
  const availableSats = totalSats - withdrawnSats + zapBalance;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <>
      <motion.div 
        className="card-neu"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">SATs Wallet</h2>
          <WalletIcon className="h-6 w-6 text-orange-500" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <motion.button
            onClick={() => setActiveTab('balance')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'balance'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            Balance
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'transactions'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            Transactions
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('zaps')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'zaps'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            Zaps
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'balance' && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Balance Card */}
              <motion.div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white mb-6"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <p className="text-sm opacity-90">Available Balance</p>
                <motion.p 
                  className="text-3xl font-bold"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {availableSats} sats
                </motion.p>
                <div className="mt-4">
                  <motion.button
                    onClick={() => setIsWithdrawOpen(true)}
                    className="bg-white text-orange-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send className="h-4 w-4 inline mr-2" />
                    Withdraw
                  </motion.button>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.button 
                  onClick={() => setIsWithdrawOpen(true)}
                  className="btn-neu flex flex-col items-center p-3"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Banknote className="h-6 w-6 text-orange-500 mb-1" />
                  <span className="text-sm text-gray-600">Withdraw</span>
                </motion.button>
                <motion.button 
                  className="btn-neu flex flex-col items-center p-3"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <History className="h-6 w-6 text-orange-500 mb-1" />
                  <span className="text-sm text-gray-600">History</span>
                </motion.button>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {transactions.length === 0 && lightningTxs.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No recent transactions</p>
                  )}
                  
                  <AnimatePresence>
                    {transactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-neu-base shadow-neu-inner rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, backgroundColor: "#E8EDF2" }}
                      >
                        <div>
                          <p className="font-medium text-gray-800">{transaction.reason}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <motion.p 
                          className="text-lg font-semibold text-orange-500"
                          whileHover={{ scale: 1.1 }}
                        >
                          +{transaction.sats}
                        </motion.p>
                      </motion.div>
                    ))}

                    {lightningTxs.map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-neu-base shadow-neu-inner rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: (transactions.length + index) * 0.1 }}
                        whileHover={{ scale: 1.02, backgroundColor: "#E8EDF2" }}
                      >
                        <div>
                          <p className="font-medium text-gray-800">Lightning Withdrawal</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(tx.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            Status: {tx.status}
                          </p>
                        </div>
                        <motion.p 
                          className="text-lg font-semibold text-red-500"
                          whileHover={{ scale: 1.1 }}
                        >
                          -{tx.amount_sats}
                        </motion.p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <ArkWalletTransactions />
            </motion.div>
          )}

          {activeTab === 'zaps' && (
            <motion.div
              key="zaps"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <StudentZapHistory />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        userId={user?.id || ''}
        maxAmount={availableSats}
      />
    </>
  );
}

// Add the missing Send component
function Send({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}