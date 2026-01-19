// ============================================================================
// STRIPE SERVICE MODULE
// ============================================================================
// 
// Handles all payment processing via Stripe for both entities (WSIC and LKN)
// Includes customer management, payment methods, invoicing, and webhooks
//
// ============================================================================

const Stripe = require('stripe');

// Initialize Stripe clients for each entity
const stripeClients = {
  wsic: new Stripe(process.env.STRIPE_WSIC_SECRET_KEY || process.env.STRIPE_WSIC_TEST_KEY),
  lkn: new Stripe(process.env.STRIPE_LKN_SECRET_KEY || process.env.STRIPE_LKN_TEST_KEY),
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const STRIPE_CONFIG = {
  // Credit card processing fee passed to customer
  ccFeePercentage: 0.035, // 3.5%
  
  // Entity configurations
  entities: {
    wsic: {
      code: 'wsic',
      name: 'Real Talk Studios, LLC',
      dba: 'WSIC',
      statementDescriptor: 'WSIC ADVERTISING',
      currency: 'usd',
    },
    lkn: {
      code: 'lkn',
      name: 'Real Talk Publications, LLC',
      dba: 'Lake Norman Woman',
      statementDescriptor: 'LKN WOMAN ADS',
      currency: 'usd',
    },
  },
  
  // Payment method types
  paymentMethods: {
    card: {
      type: 'card',
      label: 'Credit Card',
      fee: 0.035, // 3.5% passed to customer
    },
    ach: {
      type: 'us_bank_account',
      label: 'Bank Account (ACH)',
      fee: 0, // No fee passed to customer
    },
  },
};

// ============================================================================
// STRIPE SERVICE CLASS
// ============================================================================

class StripeService {
  constructor() {
    this.clients = stripeClients;
    this.config = STRIPE_CONFIG;
  }

  /**
   * Get the appropriate Stripe client for an entity
   */
  getClient(entityCode) {
    const client = this.clients[entityCode];
    if (!client) {
      throw new Error(`Unknown entity: ${entityCode}`);
    }
    return client;
  }

  /**
   * Get entity configuration
   */
  getEntityConfig(entityCode) {
    return this.config.entities[entityCode];
  }

  /**
   * Calculate processing fee for credit card payments
   */
  calculateProcessingFee(amount) {
    return Math.round(amount * this.config.ccFeePercentage * 100) / 100;
  }

  // ==========================================================================
  // CUSTOMER MANAGEMENT
  // ==========================================================================

  /**
   * Create a new Stripe customer
   */
  async createCustomer(entityCode, customerData) {
    const stripe = this.getClient(entityCode);
    const entityConfig = this.getEntityConfig(entityCode);

    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.businessName,
      phone: customerData.phone,
      metadata: {
        clientId: customerData.clientId,
        entityCode: entityCode,
        businessName: customerData.businessName,
      },
      address: customerData.address ? {
        line1: customerData.address.street1,
        line2: customerData.address.street2,
        city: customerData.address.city,
        state: customerData.address.state,
        postal_code: customerData.address.zip,
        country: 'US',
      } : undefined,
    });

    console.log(`[STRIPE] Created customer ${customer.id} for ${customerData.businessName} (${entityCode})`);
    return customer;
  }

  /**
   * Get or create a Stripe customer
   */
  async getOrCreateCustomer(entityCode, customerData) {
    const stripe = this.getClient(entityCode);

    // Check if customer already exists by email
    const existingCustomers = await stripe.customers.list({
      email: customerData.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      console.log(`[STRIPE] Found existing customer ${existingCustomers.data[0].id}`);
      return existingCustomers.data[0];
    }

    // Create new customer
    return this.createCustomer(entityCode, customerData);
  }

  /**
   * Update a Stripe customer
   */
  async updateCustomer(entityCode, customerId, updateData) {
    const stripe = this.getClient(entityCode);

    const customer = await stripe.customers.update(customerId, {
      email: updateData.email,
      name: updateData.businessName,
      phone: updateData.phone,
      metadata: updateData.metadata,
    });

    console.log(`[STRIPE] Updated customer ${customerId}`);
    return customer;
  }

  // ==========================================================================
  // PAYMENT METHODS
  // ==========================================================================

  /**
   * Create a SetupIntent for collecting payment method
   */
  async createSetupIntent(entityCode, customerId, paymentMethodTypes = ['card', 'us_bank_account']) {
    const stripe = this.getClient(entityCode);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: paymentMethodTypes,
      usage: 'off_session', // For recurring/future payments
      metadata: {
        entityCode: entityCode,
      },
    });

    console.log(`[STRIPE] Created SetupIntent ${setupIntent.id} for customer ${customerId}`);
    return setupIntent;
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(entityCode, paymentMethodId, customerId) {
    const stripe = this.getClient(entityCode);

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    console.log(`[STRIPE] Attached payment method ${paymentMethodId} to customer ${customerId}`);
    return paymentMethod;
  }

  /**
   * Set default payment method for a customer
   */
  async setDefaultPaymentMethod(entityCode, customerId, paymentMethodId) {
    const stripe = this.getClient(entityCode);

    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    console.log(`[STRIPE] Set default payment method ${paymentMethodId} for customer ${customerId}`);
    return customer;
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(entityCode, customerId, type = 'card') {
    const stripe = this.getClient(entityCode);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: type,
    });

    return paymentMethods.data;
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(entityCode, paymentMethodId) {
    const stripe = this.getClient(entityCode);
    return stripe.paymentMethods.retrieve(paymentMethodId);
  }

  /**
   * Detach (remove) a payment method
   */
  async detachPaymentMethod(entityCode, paymentMethodId) {
    const stripe = this.getClient(entityCode);

    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    console.log(`[STRIPE] Detached payment method ${paymentMethodId}`);
    return paymentMethod;
  }

  // ==========================================================================
  // INVOICING
  // ==========================================================================

  /**
   * Create an invoice
   */
  async createInvoice(entityCode, invoiceData) {
    const stripe = this.getClient(entityCode);
    const entityConfig = this.getEntityConfig(entityCode);

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: invoiceData.stripeCustomerId,
      auto_advance: false, // Don't auto-finalize, we'll do it manually
      collection_method: invoiceData.autoCharge ? 'charge_automatically' : 'send_invoice',
      days_until_due: invoiceData.daysUntilDue || 30,
      metadata: {
        entityCode: entityCode,
        invoiceId: invoiceData.invoiceId,
        orderId: invoiceData.orderId,
      },
      statement_descriptor: entityConfig.statementDescriptor,
    });

    // Add line items
    for (const item of invoiceData.lineItems) {
      await stripe.invoiceItems.create({
        customer: invoiceData.stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(item.amount * 100), // Convert to cents
        currency: entityConfig.currency,
        description: item.description,
        metadata: {
          orderItemId: item.orderItemId,
        },
      });
    }

    // Add processing fee if paying by card and fee should be passed
    if (invoiceData.addProcessingFee && invoiceData.processingFee > 0) {
      await stripe.invoiceItems.create({
        customer: invoiceData.stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(invoiceData.processingFee * 100),
        currency: entityConfig.currency,
        description: 'Credit Card Processing Fee (3.5%)',
      });
    }

    console.log(`[STRIPE] Created invoice ${invoice.id} for $${invoiceData.totalAmount} (${entityCode})`);
    return invoice;
  }

  /**
   * Finalize and optionally send an invoice
   */
  async finalizeInvoice(entityCode, invoiceId, sendEmail = true) {
    const stripe = this.getClient(entityCode);

    const invoice = await stripe.invoices.finalizeInvoice(invoiceId);
    
    if (sendEmail && invoice.collection_method === 'send_invoice') {
      await stripe.invoices.sendInvoice(invoiceId);
      console.log(`[STRIPE] Sent invoice ${invoiceId} to customer`);
    }

    console.log(`[STRIPE] Finalized invoice ${invoiceId}`);
    return invoice;
  }

  /**
   * Pay an invoice immediately (for auto-charge)
   */
  async payInvoice(entityCode, invoiceId, paymentMethodId = null) {
    const stripe = this.getClient(entityCode);

    const payOptions = {};
    if (paymentMethodId) {
      payOptions.payment_method = paymentMethodId;
    }

    const invoice = await stripe.invoices.pay(invoiceId, payOptions);
    console.log(`[STRIPE] Paid invoice ${invoiceId}, status: ${invoice.status}`);
    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(entityCode, invoiceId) {
    const stripe = this.getClient(entityCode);
    return stripe.invoices.retrieve(invoiceId);
  }

  /**
   * Void an invoice
   */
  async voidInvoice(entityCode, invoiceId) {
    const stripe = this.getClient(entityCode);
    const invoice = await stripe.invoices.voidInvoice(invoiceId);
    console.log(`[STRIPE] Voided invoice ${invoiceId}`);
    return invoice;
  }

  /**
   * Get hosted invoice URL for customer payment
   */
  async getInvoicePaymentUrl(entityCode, invoiceId) {
    const stripe = this.getClient(entityCode);
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice.hosted_invoice_url;
  }

  // ==========================================================================
  // DIRECT CHARGES (One-time payments)
  // ==========================================================================

  /**
   * Create a payment intent for a one-time charge
   */
  async createPaymentIntent(entityCode, paymentData) {
    const stripe = this.getClient(entityCode);
    const entityConfig = this.getEntityConfig(entityCode);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Convert to cents
      currency: entityConfig.currency,
      customer: paymentData.stripeCustomerId,
      payment_method: paymentData.paymentMethodId,
      off_session: paymentData.offSession || false,
      confirm: paymentData.confirm || false,
      metadata: {
        entityCode: entityCode,
        invoiceId: paymentData.invoiceId,
        description: paymentData.description,
      },
      statement_descriptor: entityConfig.statementDescriptor,
    });

    console.log(`[STRIPE] Created PaymentIntent ${paymentIntent.id} for $${paymentData.amount}`);
    return paymentIntent;
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(entityCode, paymentIntentId, paymentMethodId = null) {
    const stripe = this.getClient(entityCode);

    const confirmOptions = {};
    if (paymentMethodId) {
      confirmOptions.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmOptions);
    console.log(`[STRIPE] Confirmed PaymentIntent ${paymentIntentId}, status: ${paymentIntent.status}`);
    return paymentIntent;
  }

  /**
   * Charge a customer's saved payment method (for recurring/backup charges)
   */
  async chargeCustomer(entityCode, chargeData) {
    const stripe = this.getClient(entityCode);
    const entityConfig = this.getEntityConfig(entityCode);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(chargeData.amount * 100),
        currency: entityConfig.currency,
        customer: chargeData.stripeCustomerId,
        payment_method: chargeData.paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          entityCode: entityCode,
          invoiceId: chargeData.invoiceId,
          type: chargeData.type || 'recurring',
          description: chargeData.description,
        },
        statement_descriptor: entityConfig.statementDescriptor,
      });

      console.log(`[STRIPE] Charged customer ${chargeData.stripeCustomerId} for $${chargeData.amount}`);
      return {
        success: true,
        paymentIntent: paymentIntent,
      };
    } catch (error) {
      console.error(`[STRIPE] Charge failed for customer ${chargeData.stripeCustomerId}:`, error.message);
      return {
        success: false,
        error: error,
        code: error.code,
        message: error.message,
      };
    }
  }

  // ==========================================================================
  // REFUNDS
  // ==========================================================================

  /**
   * Create a refund
   */
  async createRefund(entityCode, refundData) {
    const stripe = this.getClient(entityCode);

    const refund = await stripe.refunds.create({
      payment_intent: refundData.paymentIntentId,
      amount: refundData.amount ? Math.round(refundData.amount * 100) : undefined, // Full refund if no amount
      reason: refundData.reason || 'requested_by_customer',
      metadata: {
        refundedBy: refundData.refundedBy,
        notes: refundData.notes,
      },
    });

    console.log(`[STRIPE] Created refund ${refund.id} for PaymentIntent ${refundData.paymentIntentId}`);
    return refund;
  }

  // ==========================================================================
  // WEBHOOK HANDLING
  // ==========================================================================

  /**
   * Construct webhook event from raw body
   */
  constructWebhookEvent(entityCode, rawBody, signature, webhookSecret) {
    const stripe = this.getClient(entityCode);
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(entityCode, event) {
    const eventType = event.type;
    const eventData = event.data.object;

    console.log(`[STRIPE WEBHOOK] Processing ${eventType} for ${entityCode}`);

    switch (eventType) {
      case 'payment_intent.succeeded':
        return this.handlePaymentSucceeded(entityCode, eventData);

      case 'payment_intent.payment_failed':
        return this.handlePaymentFailed(entityCode, eventData);

      case 'invoice.paid':
        return this.handleInvoicePaid(entityCode, eventData);

      case 'invoice.payment_failed':
        return this.handleInvoicePaymentFailed(entityCode, eventData);

      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdated(entityCode, eventData);

      case 'setup_intent.succeeded':
        return this.handleSetupIntentSucceeded(entityCode, eventData);

      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event type: ${eventType}`);
        return { handled: false };
    }
  }

  // Webhook handlers (to be implemented based on your business logic)
  async handlePaymentSucceeded(entityCode, paymentIntent) {
    console.log(`[STRIPE] Payment succeeded: ${paymentIntent.id}`);
    // TODO: Update invoice status, send receipt, etc.
    return { handled: true, action: 'payment_succeeded' };
  }

  async handlePaymentFailed(entityCode, paymentIntent) {
    console.log(`[STRIPE] Payment failed: ${paymentIntent.id}`);
    // TODO: Send payment failed email, schedule retry, etc.
    return { handled: true, action: 'payment_failed' };
  }

  async handleInvoicePaid(entityCode, invoice) {
    console.log(`[STRIPE] Invoice paid: ${invoice.id}`);
    // TODO: Update invoice status, sync to QuickBooks, etc.
    return { handled: true, action: 'invoice_paid' };
  }

  async handleInvoicePaymentFailed(entityCode, invoice) {
    console.log(`[STRIPE] Invoice payment failed: ${invoice.id}`);
    // TODO: Send notification, schedule backup charge, etc.
    return { handled: true, action: 'invoice_payment_failed' };
  }

  async handleSubscriptionUpdated(entityCode, subscription) {
    console.log(`[STRIPE] Subscription updated: ${subscription.id}`);
    return { handled: true, action: 'subscription_updated' };
  }

  async handleSetupIntentSucceeded(entityCode, setupIntent) {
    console.log(`[STRIPE] SetupIntent succeeded: ${setupIntent.id}`);
    // Payment method is now attached to customer
    return { handled: true, action: 'setup_intent_succeeded' };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Format payment method for display
   */
  formatPaymentMethod(paymentMethod) {
    if (paymentMethod.type === 'card') {
      return {
        type: 'card',
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        displayName: `${paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1)} ****${paymentMethod.card.last4}`,
      };
    } else if (paymentMethod.type === 'us_bank_account') {
      return {
        type: 'ach',
        bankName: paymentMethod.us_bank_account.bank_name,
        last4: paymentMethod.us_bank_account.last4,
        accountType: paymentMethod.us_bank_account.account_type,
        displayName: `${paymentMethod.us_bank_account.bank_name} ****${paymentMethod.us_bank_account.last4}`,
      };
    }
    return {
      type: paymentMethod.type,
      displayName: paymentMethod.type,
    };
  }

  /**
   * Check if test mode
   */
  isTestMode(entityCode) {
    const stripe = this.getClient(entityCode);
    // Test keys start with sk_test_
    return stripe._api && stripe._api.key && stripe._api.key.startsWith('sk_test_');
  }
}

// ============================================================================
// EXPORT
// ============================================================================

const stripeService = new StripeService();

module.exports = {
  stripeService,
  StripeService,
  STRIPE_CONFIG,
};
