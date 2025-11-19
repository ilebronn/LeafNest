// firestoreService/payMongoService.js - SIMPLE REDIRECT FIX
import { Buffer } from 'buffer';
import axios from 'axios';
import { activatePremiumSubscription } from './subscriptionService';

const PAYMONGO_CONFIG = {
  SECRET_KEY: 'sk_test_JuRgzSeiDs1HY5C31M4mFvff',
  PUBLIC_KEY: 'pk_test_KCdAXfPtFpKYFiW9vghGgBr4',
  BASE_URL: 'https://api.paymongo.com/v1',
};

const SUBSCRIPTION_PRICE = 9900;

/**
 * Create authorization header for PayMongo
 */
const getAuthHeader = () => {
  const encoded = Buffer.from(PAYMONGO_CONFIG.SECRET_KEY + ':').toString('base64');
  return `Basic ${encoded}`;
};

/**
 * Create GCash payment source
 * Flow: Your App -> Checkout URL -> GCash App -> Payment -> Redirect URL
 */
export const createGCashPayment = async (userId, userEmail, userName) => {
  try {
    console.log('💳 Creating GCash payment via PayMongo...');

    const response = await axios.post(
      `${PAYMONGO_CONFIG.BASE_URL}/sources`,
      {
        data: {
          attributes: {
            type: 'gcash',
            amount: SUBSCRIPTION_PRICE,
            currency: 'PHP',
            redirect: {
              // ✅ Use placeholder HTTPS URLs (required by PayMongo)
              // User will be redirected here after GCash payment
              // Your app will handle payment via status polling instead
              success: 'https://paymongo.com/success',
              failed: 'https://paymongo.com/failed',
            },
            billing: {
              name: userName || 'LeafNest User',
              email: userEmail,
            },
            metadata: {
              userId: userId,
              subscriptionType: 'premium',
              duration: '30_days',
            },
          },
        },
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const source = response.data.data;

    console.log('✅ Payment source created:', source.id);
    console.log('🔗 Checkout URL:', source.attributes.redirect.checkout_url);

    return {
      success: true,
      checkoutUrl: source.attributes.redirect.checkout_url, // ⭐ Open this URL - it will open GCash app!
      sourceId: source.id,
      amount: SUBSCRIPTION_PRICE / 100,
      expiresAt: source.attributes.redirect.expires_at,
    };
  } catch (error) {
    console.error('❌ Error creating payment:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || 'Failed to create payment',
    };
  }
};

/**
 * Verify payment status
 */
export const verifyPaymentStatus = async (sourceId) => {
  try {
    console.log('🔍 Verifying payment status:', sourceId);

    const response = await axios.get(
      `${PAYMONGO_CONFIG.BASE_URL}/sources/${sourceId}`,
      {
        headers: {
          'Authorization': getAuthHeader(),
        },
        timeout: 10000,
      }
    );

    const source = response.data.data;
    const status = source.attributes.status;

    console.log(`💰 Payment status: ${status}`);

    return {
      success: true,
      status: status,
      amount: source.attributes.amount,
      metadata: source.attributes.metadata,
    };
  } catch (error) {
    console.error('❌ Error verifying payment:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Create payment (charge) from chargeable source
 */
export const createPaymentFromSource = async (sourceId, userId) => {
  try {
    console.log('💳 Creating payment from source...');

    const response = await axios.post(
      `${PAYMONGO_CONFIG.BASE_URL}/payments`,
      {
        data: {
          attributes: {
            amount: SUBSCRIPTION_PRICE,
            currency: 'PHP',
            source: {
              id: sourceId,
              type: 'source',
            },
            metadata: {
              userId: userId,
            },
          },
        },
      },
      {
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const payment = response.data.data;

    console.log('✅ Payment created:', payment.id);

    return {
      success: true,
      paymentId: payment.id,
      status: payment.attributes.status,
      amount: payment.attributes.amount / 100,
    };
  } catch (error) {
    console.error('❌ Error creating payment:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || 'Payment failed',
    };
  }
};

/**
 * Process successful payment
 */
export const processSuccessfulPayment = async (userId, sourceId) => {
  try {
    console.log('✅ Processing successful payment...');

    const verification = await verifyPaymentStatus(sourceId);
    
    if (!verification.success) {
      throw new Error('Failed to verify payment');
    }

    if (verification.status !== 'chargeable') {
      throw new Error(`Payment not ready. Status: ${verification.status}`);
    }

    const paymentResult = await createPaymentFromSource(sourceId, userId);

    if (!paymentResult.success) {
      throw new Error('Failed to create payment');
    }

    const activationResult = await activatePremiumSubscription(userId, {
      paymentMethod: 'gcash',
      transactionId: paymentResult.paymentId,
      amount: paymentResult.amount,
    });

    if (!activationResult.success) {
      throw new Error('Failed to activate subscription');
    }

    console.log('🎉 Premium activated!');

    return {
      success: true,
      message: 'Premium subscription activated!',
      expiryDate: activationResult.expiryDate,
      daysRemaining: 30,
    };
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Webhook handler (for Cloud Functions)
 */
export const handlePaymentWebhook = async (webhookData) => {
  try {
    const event = webhookData.data.attributes;
    const eventType = event.type;

    console.log('🔔 Webhook received:', eventType);

    if (eventType === 'source.chargeable') {
      const source = event.data;
      const userId = source.attributes.metadata?.userId;
      const sourceId = source.id;

      if (!userId) {
        throw new Error('Missing userId in webhook');
      }

      const result = await processSuccessfulPayment(userId, sourceId);
      
      return { 
        success: result.success, 
        message: result.success ? 'Subscription activated' : result.error 
      };
    }

    return { success: true, message: 'Webhook processed' };
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createGCashPayment,
  verifyPaymentStatus,
  processSuccessfulPayment,
  handlePaymentWebhook,
  SUBSCRIPTION_PRICE: SUBSCRIPTION_PRICE / 100,
};