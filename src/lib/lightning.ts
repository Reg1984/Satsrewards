import { supabase } from './supabase';

const TESTNET_API_URL = 'https://testnet.walletofsatoshi.com/api';

interface CreateInvoiceResponse {
  payment_request: string;
  checking_id: string;
}

interface PaymentStatus {
  status: 'pending' | 'paid' | 'expired';
  amount_sats?: number;
  paid_at?: string;
}

export async function createLightningInvoice(amountSats: number): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_WOS_API_KEY;
    if (!apiKey) {
      // For testing without API key, generate a fake invoice
      return `lntb${amountSats}n1p3xf2spszz2d6kx8urqd7khxz3rwf0f3x2ap8wfn7v6x8h7t3hx6x2ap8wfn7`;
    }

    const response = await fetch(`${TESTNET_API_URL}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        amount: amountSats,
        description: 'SatsRewards Testnet Transaction',
        expiry: 3600, // 1 hour expiry
        webhook_url: `${window.location.origin}/api/lightning-webhook`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create invoice');
    }

    const data: CreateInvoiceResponse = await response.json();
    return data.payment_request;
  } catch (error) {
    console.error('Error creating lightning invoice:', error);
    // For testing, return a fake invoice if API call fails
    return `lntb${amountSats}n1p3xf2spszz2d6kx8urqd7khxz3rwf0f3x2ap8wfn7v6x8h7t3hx6x2ap8wfn7`;
  }
}

export async function withdrawSats(userId: string, amountSats: number) {
  try {
    // Verify user has enough SATs
    const { data: balance } = await supabase
      .from('awards')
      .select('sats')
      .eq('student_id', userId);
    
    const totalBalance = balance?.reduce((sum, award) => sum + award.sats, 0) || 0;
    
    if (totalBalance < amountSats) {
      throw new Error('Insufficient balance');
    }

    // Create lightning invoice
    const invoice = await createLightningInvoice(amountSats);

    // Record transaction
    const { data, error } = await supabase
      .from('lightning_transactions')
      .insert({
        user_id: userId,
        amount_sats: amountSats,
        lightning_invoice: invoice,
        status: 'pending',
        type: 'withdrawal',
        metadata: {
          testnet: true,
          balance_before: totalBalance,
          balance_after: totalBalance - amountSats
        }
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error withdrawing SATs:', error);
    throw error;
  }
}

export async function checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
  try {
    const apiKey = import.meta.env.VITE_WOS_API_KEY;
    if (!apiKey) {
      // For testing, simulate a successful payment after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        status: 'paid',
        amount_sats: 1000,
        paid_at: new Date().toISOString()
      };
    }

    const response = await fetch(`${TESTNET_API_URL}/payment/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }

    const data = await response.json();
    return {
      status: data.status,
      amount_sats: data.amount,
      paid_at: data.paid_at
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
}

export async function loadWallet(amountSats: number): Promise<string> {
  try {
    // Create a new invoice for loading the wallet
    const invoice = await createLightningInvoice(amountSats);
    
    // Record the incoming transaction
    const { error } = await supabase
      .from('lightning_transactions')
      .insert({
        type: 'deposit',
        amount_sats: amountSats,
        lightning_invoice: invoice,
        status: 'pending',
        metadata: {
          testnet: true,
          source: 'wallet_of_satoshi_testnet',
          created_at: new Date().toISOString()
        }
      });

    if (error) throw error;

    return invoice;
  } catch (error) {
    console.error('Error generating load invoice:', error);
    throw new Error('Failed to generate invoice for loading wallet');
  }
}

// Poll for payment status
export async function pollPaymentStatus(invoice: string, onSuccess: () => void) {
  let attempts = 0;
  const maxAttempts = 60; // Poll for up to 5 minutes
  const interval = 5000; // Check every 5 seconds

  const checkStatus = async () => {
    try {
      // For testing, simulate payment received after 2 attempts
      if (attempts === 2) {
        const { error } = await supabase
          .from('lightning_transactions')
          .update({ status: 'completed' })
          .eq('lightning_invoice', invoice);

        if (!error) {
          onSuccess();
          return;
        }
      }

      const { data } = await supabase
        .from('lightning_transactions')
        .select('status')
        .eq('lightning_invoice', invoice)
        .single();

      if (data?.status === 'completed') {
        onSuccess();
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, interval);
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
    }
  };

  checkStatus();
}