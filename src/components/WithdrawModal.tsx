import React, { useState } from 'react';
import { X, Loader2, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { withdrawSats } from '../lib/lightning';
import * as QRCode from 'qrcode';
import { toast } from 'sonner';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  maxAmount: number;
}

export function WithdrawModal({ isOpen, onClose, userId, maxAmount }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      
      const satsAmount = parseInt(amount);
      if (isNaN(satsAmount) || satsAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      if (satsAmount > maxAmount) {
        throw new Error('Insufficient balance');
      }

      const transaction = await withdrawSats(userId, satsAmount);
      const invoice = transaction.lightning_invoice;
      setInvoice(invoice);

      // Generate QR code
      const qr = await QRCode.toDataURL(invoice);
      setQrCode(qr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create withdrawal');
      toast.error(err instanceof Error ? err.message : 'Failed to create withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast.success('Invoice copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            className="card-neu w-full max-w-md"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Withdraw SATs</h3>
              <motion.button 
                onClick={onClose} 
                className="btn-neu p-2"
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-5 w-5 text-gray-500" />
              </motion.button>
            </div>

            <div className="space-y-6">
              {!invoice ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (SATs)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input-neu w-full"
                      placeholder="Enter amount..."
                      max={maxAmount}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Available: {maxAmount} SATs
                    </p>
                  </div>

                  {error && (
                    <motion.p 
                      className="text-red-500 text-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    onClick={handleWithdraw}
                    disabled={loading}
                    className="btn-neu w-full text-orange-600"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      'Generate Invoice'
                    )}
                  </motion.button>
                </>
              ) : (
                <div className="space-y-4">
                  <motion.div 
                    className="flex justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <img src={qrCode} alt="Lightning Invoice QR Code" className="w-48 h-48" />
                  </motion.div>
                  
                  <motion.div 
                    className="bg-neu-base shadow-neu-inner p-3 rounded-lg break-all"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ backgroundColor: "#E8EDF2" }}
                  >
                    <p className="text-sm font-mono">{invoice}</p>
                  </motion.div>

                  <motion.div 
                    className="text-center text-sm text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p>Scan the QR code or copy the invoice to your Lightning wallet</p>
                    <p className="mt-1">The withdrawal will be processed automatically</p>
                  </motion.div>

                  <motion.button
                    onClick={copyToClipboard}
                    className="btn-neu w-full flex items-center justify-center"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Invoice'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}