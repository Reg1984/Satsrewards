import React, { useState, useEffect } from 'react';
import { Wallet, QrCode, Copy, Check, AlertTriangle, Loader2, Download, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { logError, logInfo } from '../lib/errorLogging';

export function SchoolWalletFunding() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed'>('pending');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch school balance
  const { data: schoolData, isLoading: isLoadingSchool, error: schoolError } = useQuery({
    queryKey: ['school-balance', user?.school_id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, school_balance')
          .eq('id', user?.school_id)
          .single();
        
        if (error) {
          logError(error, { 
            component: 'SchoolWalletFunding', 
            action: 'fetchSchoolBalance', 
            userId: user?.id,
            schoolId: user?.school_id
          });
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching school balance:', error);
        logError(error as Error, { 
          component: 'SchoolWalletFunding', 
          action: 'fetchSchoolBalance', 
          userId: user?.id,
          schoolId: user?.school_id
        });
        throw error;
      }
    },
    enabled: !!user?.school_id && (user?.role === 'teacher' || user?.role === 'admin'),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  // Fetch recent funding transactions
  const { data: recentTransactions, error: transactionsError } = useQuery({
    queryKey: ['school-funding-transactions', user?.school_id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('lightning_transactions')
          .select('*')
          .eq('school_id', user?.school_id)
          .eq('type', 'school_funding')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          logError(error, { 
            component: 'SchoolWalletFunding', 
            action: 'fetchTransactions', 
            userId: user?.id,
            schoolId: user?.school_id
          });
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        logError(error as Error, { 
          component: 'SchoolWalletFunding', 
          action: 'fetchTransactions', 
          userId: user?.id,
          schoolId: user?.school_id
        });
        throw error;
      }
    },
    enabled: !!user?.school_id && (user?.role === 'teacher' || user?.role === 'admin'),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const satsAmount = parseInt(amount);
      
      if (isNaN(satsAmount) || satsAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Call the lightning API to generate an invoice
      const { data, error } = await supabase.functions.invoke('school-funding', {
        body: { 
          amount: satsAmount, 
          school_id: user?.school_id,
          user_id: user?.id
        }
      });

      if (error) {
        logError(error, { 
          component: 'SchoolWalletFunding', 
          action: 'generateInvoice', 
          userId: user?.id,
          schoolId: user?.school_id,
          amount: satsAmount
        });
        throw error;
      }
      
      setInvoice(data.invoice);
      setTransactionId(data.transaction_id);
      setPaymentStatus('pending');

      // Generate QR code
      try {
        const qr = await QRCode.toDataURL(data.invoice);
        setQrCode(qr);
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        logError(qrError as Error, { 
          component: 'SchoolWalletFunding', 
          action: 'generateQRCode', 
          userId: user?.id
        });
        // Continue without QR code
      }

      // Start polling for payment status
      pollPaymentStatus(data.invoice);
      
      logInfo('Invoice generated successfully', { 
        userId: user?.id, 
        schoolId: user?.school_id,
        amount: satsAmount,
        transactionId: data.transaction_id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoice';
      console.error('Error generating invoice:', error);
      logError(error as Error, { 
        component: 'SchoolWalletFunding', 
        action: 'generateInvoice', 
        userId: user?.id,
        schoolId: user?.school_id,
        amount
      });
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (invoiceStr: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes
    const interval = 5000; // Check every 5 seconds

    const checkStatus = async () => {
      try {
        setCheckingPayment(true);
        
        const { data, error } = await supabase.functions.invoke('check-payment', {
          body: { invoice: invoiceStr }
        });

        setCheckingPayment(false);

        if (error) {
          console.error('Error checking payment status:', error);
          logError(error, { 
            component: 'SchoolWalletFunding', 
            action: 'checkPaymentStatus', 
            userId: user?.id,
            transactionId
          });
          // Continue polling despite errors
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, interval);
          }
          return;
        }

        if (data.status === 'completed') {
          setPaymentStatus('completed');
          queryClient.invalidateQueries({ queryKey: ['school-balance'] });
          queryClient.invalidateQueries({ queryKey: ['school-funding-transactions'] });
          toast.success('Payment received successfully!');
          logInfo('Payment received successfully', { 
            userId: user?.id, 
            schoolId: user?.school_id,
            transactionId
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, interval);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        logError(error as Error, { 
          component: 'SchoolWalletFunding', 
          action: 'pollPaymentStatus', 
          userId: user?.id,
          transactionId
        });
        setCheckingPayment(false);
        
        // Continue polling despite errors
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, interval);
        }
      }
    };

    checkStatus();
  };

  const checkPaymentStatusManually = async () => {
    try {
      setCheckingPayment(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('check-payment', {
        body: { invoice }
      });

      if (error) {
        console.error('Error checking payment status:', error);
        logError(error, { 
          component: 'SchoolWalletFunding', 
          action: 'checkPaymentStatusManually', 
          userId: user?.id,
          transactionId
        });
        toast.error('Failed to check payment status');
        setError('Failed to check payment status. Please try again.');
        return;
      }

      if (data.status === 'completed') {
        setPaymentStatus('completed');
        queryClient.invalidateQueries({ queryKey: ['school-balance'] });
        queryClient.invalidateQueries({ queryKey: ['school-funding-transactions'] });
        toast.success('Payment received successfully!');
        logInfo('Payment received successfully', { 
          userId: user?.id, 
          schoolId: user?.school_id,
          transactionId
        });
      } else {
        toast.info('Payment not yet received. Please try again in a moment.');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      logError(error as Error, { 
        component: 'SchoolWalletFunding', 
        action: 'checkPaymentStatusManually', 
        userId: user?.id,
        transactionId
      });
      toast.error('Failed to check payment status');
      setError('Failed to check payment status. Please try again.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const copyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Invoice copied to clipboard');
    } catch (error) {
      console.error('Failed to copy invoice:', error);
      logError(error as Error, { 
        component: 'SchoolWalletFunding', 
        action: 'copyInvoice', 
        userId: user?.id
      });
      toast.error('Failed to copy invoice');
    }
  };

  const resetForm = () => {
    setInvoice('');
    setQrCode('');
    setAmount('');
    setPaymentStatus('pending');
    setTransactionId(null);
    setError(null);
  };

  // Mutation to update school balance manually (for testing)
  const updateBalanceMutation = useMutation({
    mutationFn: async (newBalance: number) => {
      try {
        const { error } = await supabase
          .from('schools')
          .update({ school_balance: newBalance })
          .eq('id', user?.school_id);
        
        if (error) {
          logError(error, { 
            component: 'SchoolWalletFunding', 
            action: 'updateBalanceManually', 
            userId: user?.id,
            schoolId: user?.school_id,
            newBalance
          });
          throw error;
        }
      } catch (error) {
        console.error('Error updating school balance:', error);
        logError(error as Error, { 
          component: 'SchoolWalletFunding', 
          action: 'updateBalanceManually', 
          userId: user?.id,
          schoolId: user?.school_id,
          newBalance
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-balance'] });
      toast.success('School balance updated successfully');
      logInfo('School balance updated manually', { 
        userId: user?.id, 
        schoolId: user?.school_id,
        newBalance: parseInt(amount)
      });
    },
    onError: (error) => {
      toast.error('Failed to update school balance');
      console.error('Update balance mutation error:', error);
    }
  });

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="bg-red-50 p-6 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
          <p className="text-red-700">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (schoolError || transactionsError) {
    return (
      <div className="bg-red-50 p-6 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-2 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error loading data</p>
            <p className="text-red-600 mt-1">
              {schoolError instanceof Error 
                ? schoolError.message 
                : transactionsError instanceof Error 
                  ? transactionsError.message 
                  : 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">School Wallet Funding</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="bg-orange-50 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">Important Information</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Funds added to the school wallet can be distributed to students as rewards. 
                  Only teachers and administrators can fund the school wallet.
                </p>
              </div>
            </div>
          </div>

          {/* School Balance */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">School Balance</p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoadingSchool ? (
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  ) : (
                    `${schoolData?.school_balance || 0} SATs`
                  )}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Wallet className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!invoice ? (
              <motion.div
                key="invoice-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (sats)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter amount in sats"
                    min="1"
                  />
                </div>

                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading || !amount}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Generate Invoice
                    </>
                  )}
                </button>

                {/* For testing purposes - only in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-8 p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Development Testing</h3>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Test balance"
                        className="flex-1 px-3 py-2 border rounded-lg"
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <button
                        onClick={() => updateBalanceMutation.mutate(parseInt(amount))}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Set Balance
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="invoice-display"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {paymentStatus === 'completed' ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-green-900">Payment Received!</h3>
                    <p className="text-sm text-green-600 mt-1">The school wallet has been funded successfully.</p>
                    <button
                      onClick={resetForm}
                      className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Fund More SATs
                    </button>
                  </div>
                ) : (
                  <>
                    {qrCode && (
                      <div className="flex justify-center">
                        <img src={qrCode} alt="Lightning Invoice QR Code" className="w-48 h-48" />
                      </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-mono break-all">{invoice}</p>
                        <button
                          onClick={copyInvoice}
                          className="ml-2 p-2 text-gray-500 hover:text-gray-700 rounded-lg"
                        >
                          {copied ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm text-blue-700">
                            Pay this invoice using Wallet of Satoshi or any Lightning wallet to fund the school wallet.
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            The invoice will expire in 1 hour.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={resetForm}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={checkPaymentStatusManually}
                        disabled={checkingPayment}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                      >
                        {checkingPayment ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Check Status
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Funding</h3>
          
          <div className="space-y-4">
            {recentTransactions?.map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{tx.amount_sats} SATs</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    tx.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : tx.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}

            {(!recentTransactions || recentTransactions.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No funding transactions found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}