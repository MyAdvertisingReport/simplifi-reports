/**
 * ClientSigningPage.jsx
 * Public page for clients to review, provide payment, and sign their advertising agreement
 * Single page with 3 steps: Review Products → Payment Info → Sign
 * Uses Stripe Elements for PCI-compliant payment collection
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Icons
const Icons = {
  Check: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  AlertCircle: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Loader: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
  CheckCircle: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  CreditCard: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="22" height="16" x="1" y="4" rx="2"/><line x1="1" x2="23" y1="10" y2="10"/>
    </svg>
  ),
  FileText: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  PenTool: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>
    </svg>
  ),
  Lock: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
};

export default function ClientSigningPage() {
  const { token } = useParams();
  
  // Core states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  
  // Payment states
  const [billingPreference, setBillingPreference] = useState(null); // null = none selected
  const [backupPaymentMethod, setBackupPaymentMethod] = useState('card'); // For invoice option
  const [stripeReady, setStripeReady] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [cardMounted, setCardMounted] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const cardElementRef = useRef(null);
  
  // ACH states  
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankRoutingNumber, setBankRoutingNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountType, setBankAccountType] = useState('checking');
  const [achProcessing, setAchProcessing] = useState(false);
  
  // Signer states
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Contact editing state
  const [editingContact, setEditingContact] = useState(false);

  // Load Stripe.js
  useEffect(() => {
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => setStripeReady(true);
      document.body.appendChild(script);
    } else {
      setStripeReady(true);
    }
  }, []);

  useEffect(() => {
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/orders/sign/${token}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load contract');
      }
      
      const data = await response.json();
      const contractData = {
        ...data.order,
        contact: data.contact,
        setup_fees_total: data.order.items?.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0) || 0
      };
      setContract(contractData);
      
      if (data.contact) {
        setSignerName(`${data.contact.first_name || ''} ${data.contact.last_name || ''}`.trim());
        setSignerEmail(data.contact.email || '');
        setSignerTitle(data.contact.title || '');
        setSignerPhone(data.contact.phone || '');
        setBankAccountName(`${data.contact.first_name || ''} ${data.contact.last_name || ''}`.trim());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Stripe Elements when entering step 2
  const initializeStripe = async () => {
    if (!stripeReady || stripeInitialized) return;
    
    try {
      // Get setup intent from backend
      const response = await fetch(`${API_BASE}/api/orders/sign/${token}/setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_preference: billingPreference || 'card',
          signer_email: signerEmail,
          signer_name: signerName
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to initialize payment');
      }
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      
      // Initialize Stripe
      const stripeInstance = window.Stripe(data.publishableKey);
      setStripe(stripeInstance);
      
      // Create elements instance
      const elementsInstance = stripeInstance.elements();
      setElements(elementsInstance);
      
      setStripeInitialized(true);
      
    } catch (err) {
      setPaymentError(err.message);
    }
  };

  // Check if we need a card element based on current selections
  const needsCardElement = () => {
    return billingPreference === 'card' || 
           (billingPreference === 'invoice' && backupPaymentMethod === 'card');
  };

  // Mount card element - only called once when conditions are right
  const mountCardElement = () => {
    if (!elements || !cardElementRef.current || cardMounted) return;
    
    try {
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1e293b',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': { color: '#94a3b8' },
          },
          invalid: { color: '#dc2626' },
        },
      });
      card.mount(cardElementRef.current);
      setCardElement(card);
      setCardMounted(true);
    } catch (err) {
      console.error('Error mounting card element:', err);
    }
  };

  // Unmount card element
  const unmountCardElement = () => {
    if (cardElement && cardMounted) {
      try {
        cardElement.unmount();
        cardElement.destroy();
      } catch (e) {
        // Ignore
      }
      setCardElement(null);
      setCardMounted(false);
    }
  };

  // Effect to mount/unmount card based on need
  useEffect(() => {
    if (currentStep !== 2 || !elements) return;
    
    if (needsCardElement() && !cardMounted) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(mountCardElement, 100);
      return () => clearTimeout(timer);
    } else if (!needsCardElement() && cardMounted) {
      unmountCardElement();
    }
  }, [elements, currentStep, billingPreference, backupPaymentMethod, cardMounted]);

  const calculateAmounts = () => {
    if (!contract) return { contractTotal: 0, monthlyBase: 0, setupFees: 0, firstMonthBase: 0, monthlyWithFee: 0, firstMonthTotal: 0 };
    
    const monthlyBase = parseFloat(contract.monthly_total) || 0;
    const contractTotal = parseFloat(contract.contract_total) || 0;
    const setupFees = contract.setup_fees_total || 0;
    const firstMonthBase = monthlyBase + setupFees;
    
    const ccFeeRate = 0.035;
    const monthlyFee = billingPreference === 'card' ? monthlyBase * ccFeeRate : 0;
    const firstMonthFee = billingPreference === 'card' ? firstMonthBase * ccFeeRate : 0;
    
    return {
      contractTotal,
      monthlyBase,
      monthlyFee,
      monthlyWithFee: monthlyBase + monthlyFee,
      setupFees,
      firstMonthBase,
      firstMonthFee,
      firstMonthTotal: firstMonthBase + firstMonthFee
    };
  };

  const getBrandLogos = () => {
    if (!contract?.items) return [];
    const uniqueLogos = [];
    const seenLogos = new Set();
    contract.items.forEach(item => {
      if (item.entity_logo && !seenLogos.has(item.entity_logo)) {
        seenLogos.add(item.entity_logo);
        uniqueLogos.push({ url: item.entity_logo, name: item.entity_name });
      }
    });
    return uniqueLogos;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Step 1: Confirm products
  const handleConfirmProducts = () => {
    setStep1Complete(true);
    setCurrentStep(2);
    // Initialize Stripe when moving to step 2
    setTimeout(() => initializeStripe(), 200);
  };

  // Step 2: Confirm payment
  const handleConfirmPayment = async () => {
    setPaymentError(null);
    
    // Require a billing preference to be selected
    if (!billingPreference) {
      setPaymentError('Please select a payment method');
      return;
    }
    
    // For ACH (direct or as invoice backup), validate and save bank details
    if (billingPreference === 'ach' || (billingPreference === 'invoice' && backupPaymentMethod === 'ach')) {
      if (!bankAccountName.trim()) {
        setPaymentError('Please enter the account holder name');
        return;
      }
      if (!bankRoutingNumber || bankRoutingNumber.length !== 9) {
        setPaymentError('Please enter a valid 9-digit routing number');
        return;
      }
      if (!bankAccountNumber || bankAccountNumber.length < 4) {
        setPaymentError('Please enter a valid account number');
        return;
      }
      
      // Save ACH to Stripe now
      setAchProcessing(true);
      setSubmitting(true);
      try {
        // Use token-based endpoint (no auth required for client signing)
        const response = await fetch(`${API_BASE}/api/orders/sign/${token}/payment-method/ach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountHolderName: bankAccountName.trim(),
            routingNumber: bankRoutingNumber,
            accountNumber: bankAccountNumber,
            accountType: bankAccountType,
            signerEmail: signerEmail || contract.contact?.email,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to save bank account');
        }

        // Store the payment method ID for the final submission
        setPaymentMethodId(result.paymentMethodId);
        setStep2Complete(true);
        setCurrentStep(3);
      } catch (err) {
        setPaymentError(err.message);
      } finally {
        setAchProcessing(false);
        setSubmitting(false);
      }
      return;
    }
    
    // For card payments, confirm the SetupIntent now
    if (!stripe || !cardElement) {
      setPaymentError('Payment form not ready. Please wait a moment and try again.');
      return;
    }
    
    setSubmitting(true);
    try {
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: signerName,
            email: signerEmail,
          },
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Save the card payment method to the order (via token-based endpoint)
      const saveResponse = await fetch(`${API_BASE}/api/orders/sign/${token}/payment-method/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: setupIntent.payment_method,
          signerEmail: signerEmail,
        }),
      });
      
      if (!saveResponse.ok) {
        const saveErr = await saveResponse.json();
        console.warn('Failed to save card to order:', saveErr);
        // Continue anyway - the SetupIntent was successful
      }
      
      setPaymentMethodId(setupIntent.payment_method);
      setStep2Complete(true);
      setCurrentStep(3);
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Sign and complete
  const handleSubmitSignature = async () => {
    if (!signature.trim()) {
      alert('Please type your signature');
      return;
    }
    if (!agreedToTerms) {
      alert('Please agree to the terms');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/sign/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signature.trim(),
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim(),
          signer_title: signerTitle.trim(),
          agreed_to_terms: agreedToTerms,
          billing_preference: billingPreference,
          payment_method_id: paymentMethodId,
          // For ACH, we send bank info (will be tokenized on backend via Financial Connections)
          ach_account_name: billingPreference === 'ach' ? bankAccountName : null
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to complete signing');
      }

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    pageContainer: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' },
    header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '24px', color: 'white', textAlign: 'center' },
    container: { maxWidth: '800px', margin: '0 auto', padding: '24px' },
    card: { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '24px', overflow: 'hidden' },
    cardHeader: { padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' },
    cardTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    cardBody: { padding: '24px' },
    input: { width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151', fontSize: '14px' },
    button: { padding: '14px 28px', borderRadius: '10px', fontWeight: '600', fontSize: '16px', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    primaryButton: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' },
    secondaryButton: { background: '#f1f5f9', color: '#475569' },
    stepDot: (active, complete) => ({
      width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '600', fontSize: '16px', background: complete ? '#10b981' : active ? '#3b82f6' : '#e2e8f0',
      color: complete || active ? 'white' : '#64748b'
    }),
    stepLine: (complete) => ({ width: '60px', height: '4px', background: complete ? '#10b981' : '#e2e8f0', alignSelf: 'center', borderRadius: '2px' }),
    radioOption: (selected) => ({
      padding: '16px', border: selected ? '2px solid #3b82f6' : '2px solid #e2e8f0', borderRadius: '12px',
      background: selected ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px'
    }),
    radioDot: (selected) => ({ width: '20px', height: '20px', borderRadius: '50%', border: selected ? '6px solid #3b82f6' : '2px solid #d1d5db', flexShrink: 0, marginTop: '2px' }),
    stripeElement: { padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', background: 'white' },
  };

  const brandLogos = getBrandLogos();
  const amounts = calculateAmounts();

  // Loading state
  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ ...styles.container, textAlign: 'center', paddingTop: '100px' }}>
          <Icons.Loader size={48} color="#3b82f6" />
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading your agreement...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.header}><div style={{ fontSize: '24px', fontWeight: '700' }}>Unable to Load Agreement</div></div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.cardBody}>
              <div style={{ textAlign: 'center', color: '#dc2626' }}>
                <Icons.AlertCircle size={48} color="#dc2626" />
                <h2 style={{ marginTop: '16px' }}>Something went wrong</h2>
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    const needsAchSetup = billingPreference === 'ach' || (billingPreference === 'invoice' && backupPaymentMethod === 'ach');
    
    return (
      <div style={styles.pageContainer}>
        <div style={{ ...styles.header, background: needsAchSetup ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' }}>
          {brandLogos.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {brandLogos.map((logo, idx) => (
                <img key={idx} src={logo.url} alt={logo.name} style={{ height: '50px', background: 'white', padding: '8px 12px', borderRadius: '8px' }} />
              ))}
            </div>
          )}
          <div style={{ fontSize: '24px', fontWeight: '700' }}>
            {needsAchSetup ? '📧 Almost There!' : '🎉 You\'re All Set!'}
          </div>
          <div style={{ opacity: 0.9, marginTop: '8px' }}>
            {needsAchSetup ? 'One more step to complete' : 'Welcome Aboard!'}
          </div>
        </div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.cardBody}>
              <div style={{ textAlign: 'center' }}>
                {needsAchSetup ? (
                  <>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <span style={{ fontSize: '36px' }}>📬</span>
                    </div>
                    <h1 style={{ color: '#1e293b', marginBottom: '12px' }}>Check Your Email</h1>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>
                      Your agreement has been signed! To complete your setup, please connect your bank account.
                    </p>
                    
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '20px', maxWidth: '450px', margin: '0 auto 20px', textAlign: 'left' }}>
                      <h3 style={{ color: '#92400e', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span> Action Required
                      </h3>
                      <p style={{ color: '#a16207', margin: 0, lineHeight: '1.6' }}>
                        We've sent a secure link to <strong>{signerEmail}</strong> to connect your bank account via Stripe. 
                        Your agreement is <strong>not confirmed</strong> until you complete this step.
                      </p>
                    </div>
                    
                    <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                      <h3 style={{ color: '#166534', marginTop: 0, marginBottom: '12px' }}>After Bank Setup:</h3>
                      <ul style={{ color: '#15803d', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                        <li>Your Sales Associate will confirm receipt</li>
                        <li>We'll gather any creative assets needed</li>
                        <li>Your campaign launches on {formatDate(contract?.contract_start_date)}</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Icons.CheckCircle size={40} color="white" />
                    </div>
                    <h1 style={{ color: '#1e293b', marginBottom: '12px' }}>Thank You for Partnering With Us!</h1>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>Your agreement has been signed and payment information saved.</p>
                    
                    <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                      <h3 style={{ color: '#166534', marginTop: 0, marginBottom: '12px' }}>What's Next?</h3>
                      <ul style={{ color: '#15803d', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                        <li>Your Sales Associate will be in touch shortly</li>
                        <li>We'll gather any creative assets needed</li>
                        <li>Your campaign launches on {formatDate(contract?.contract_start_date)}</li>
                      </ul>
                    </div>
                  </>
                )}
                
                <p style={{ color: '#64748b', marginTop: '24px', fontSize: '14px' }}>
                  Confirmation email sent to <strong>{signerEmail}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main signing page
  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        {brandLogos.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {brandLogos.map((logo, idx) => (
              <img key={idx} src={logo.url} alt={logo.name} style={{ height: '50px', background: 'white', padding: '8px 12px', borderRadius: '8px' }} />
            ))}
          </div>
        )}
        <div style={{ fontSize: '24px', fontWeight: '700' }}>Your Advertising Agreement</div>
        <div style={{ opacity: 0.9, marginTop: '8px' }}>{contract?.client_name}</div>
      </div>

      <div style={styles.container}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={styles.stepDot(currentStep === 1, step1Complete)}>{step1Complete ? <Icons.Check size={20} /> : '1'}</div>
          <div style={styles.stepLine(step1Complete)} />
          <div style={styles.stepDot(currentStep === 2, step2Complete)}>{step2Complete ? <Icons.Check size={20} /> : '2'}</div>
          <div style={styles.stepLine(step2Complete)} />
          <div style={styles.stepDot(currentStep === 3, false)}>3</div>
        </div>

        {/* STEP 1: Products */}
        <div style={{ ...styles.card, opacity: currentStep === 1 ? 1 : 0.6 }}>
          <div style={styles.cardHeader}>
            <Icons.FileText size={24} color={step1Complete ? '#10b981' : '#3b82f6'} />
            <span style={styles.cardTitle}>Step 1: Review Products Included</span>
            {step1Complete && <Icons.CheckCircle size={20} color="#10b981" style={{ marginLeft: 'auto' }} />}
          </div>
          <div style={styles.cardBody}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: '#64748b', fontWeight: '500', fontSize: '13px' }}>PRODUCT</th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: '#64748b', fontWeight: '500', fontSize: '13px' }}>BRAND</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: '#64748b', fontWeight: '500', fontSize: '13px' }}>MONTHLY</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: '#64748b', fontWeight: '500', fontSize: '13px' }}>SETUP</th>
                </tr>
              </thead>
              <tbody>
                {contract?.items?.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 0', color: '#1e293b', fontWeight: '500' }}>{item.product_name}</td>
                    <td style={{ padding: '12px 0', color: '#64748b' }}>{item.entity_name}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: '#1e293b' }}>{formatCurrency(item.line_total)}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: parseFloat(item.setup_fee) > 0 ? '#1e293b' : '#94a3b8' }}>
                      {parseFloat(item.setup_fee) > 0 ? formatCurrency(item.setup_fee) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Contract Term</span>
                <span style={{ color: '#1e293b', fontWeight: '500' }}>{contract?.term_months} month{contract?.term_months !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Start Date</span>
                <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatDate(contract?.contract_start_date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Monthly Total</span>
                <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatCurrency(amounts.monthlyBase)}</span>
              </div>
              {amounts.setupFees > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>One-Time Setup Fees</span>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatCurrency(amounts.setupFees)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
                <span style={{ color: '#1e293b', fontWeight: '600' }}>Total Contract Value</span>
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '20px' }}>{formatCurrency(amounts.contractTotal)}</span>
              </div>
            </div>

            {/* Contact Card */}
            <div style={{ marginTop: '20px', background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingContact ? '16px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>👤</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>Contact Information</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setEditingContact(!editingContact)}
                  style={{ 
                    background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', 
                    fontSize: '13px', fontWeight: '500', padding: '4px 8px'
                  }}
                >
                  {editingContact ? 'Done' : 'Edit'}
                </button>
              </div>
              
              {editingContact ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Full Name</label>
                    <input 
                      type="text" 
                      value={signerName} 
                      onChange={e => setSignerName(e.target.value)}
                      style={{ ...styles.input, padding: '8px 12px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Title</label>
                    <input 
                      type="text" 
                      value={signerTitle} 
                      onChange={e => setSignerTitle(e.target.value)}
                      placeholder="Owner, Manager, etc."
                      style={{ ...styles.input, padding: '8px 12px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Email</label>
                    <input 
                      type="email" 
                      value={signerEmail} 
                      onChange={e => setSignerEmail(e.target.value)}
                      style={{ ...styles.input, padding: '8px 12px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Phone</label>
                    <input 
                      type="tel" 
                      value={signerPhone} 
                      onChange={e => setSignerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      style={{ ...styles.input, padding: '8px 12px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
                  <div style={{ minWidth: '140px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Name</div>
                    <div style={{ color: '#1e293b', fontWeight: '500' }}>{signerName || '-'}</div>
                  </div>
                  {signerTitle && (
                    <div style={{ minWidth: '100px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Title</div>
                      <div style={{ color: '#1e293b' }}>{signerTitle}</div>
                    </div>
                  )}
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Email</div>
                    <div style={{ color: '#1e293b' }}>{signerEmail || '-'}</div>
                  </div>
                  {signerPhone && (
                    <div style={{ minWidth: '120px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Phone</div>
                      <div style={{ color: '#1e293b' }}>{signerPhone}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentStep === 1 && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button onClick={handleConfirmProducts} style={{ ...styles.button, ...styles.primaryButton }}>
                  <Icons.Check size={20} /> Confirm Products
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: Payment */}
        <div style={{ ...styles.card, opacity: currentStep >= 2 ? 1 : 0.5, pointerEvents: currentStep === 2 ? 'auto' : 'none' }}>
          <div style={styles.cardHeader}>
            <Icons.CreditCard size={24} color={step2Complete ? '#10b981' : currentStep >= 2 ? '#3b82f6' : '#94a3b8'} />
            <span style={styles.cardTitle}>Step 2: Payment Information</span>
            {step2Complete && <Icons.CheckCircle size={20} color="#10b981" style={{ marginLeft: 'auto' }} />}
          </div>
          <div style={styles.cardBody}>
            <p style={{ color: '#64748b', marginTop: 0, marginBottom: '16px' }}>How would you like to handle payments?</p>
            
            <div style={styles.radioOption(billingPreference === 'card')} onClick={() => currentStep === 2 && setBillingPreference('card')}>
              <div style={styles.radioDot(billingPreference === 'card')} />
              <div>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>💳 Credit Card - Auto Pay</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Automatically charge my card • <span style={{ color: '#ef4444' }}>+3.5% fee</span></div>
              </div>
            </div>

            <div style={styles.radioOption(billingPreference === 'ach')} onClick={() => currentStep === 2 && setBillingPreference('ach')}>
              <div style={styles.radioDot(billingPreference === 'ach')} />
              <div>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>🏦 Bank Account (ACH) - Auto Pay</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Automatically debit my bank • <span style={{ color: '#10b981' }}>No fee</span></div>
              </div>
            </div>

            <div style={styles.radioOption(billingPreference === 'invoice')} onClick={() => currentStep === 2 && setBillingPreference('invoice')}>
              <div style={styles.radioDot(billingPreference === 'invoice')} />
              <div>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>📄 Invoice - Pay Manually</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Receive invoices via email • <span style={{ color: '#f59e0b' }}>Backup payment required</span></div>
              </div>
            </div>

            {/* Backup Payment Method Selection for Invoice */}
            {billingPreference === 'invoice' && currentStep === 2 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>
                  Select Backup Payment Method
                </div>
                <p style={{ fontSize: '13px', color: '#a16207', marginTop: 0, marginBottom: '12px' }}>
                  This will only be charged if invoices are not paid within 30 days of the due date.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setBackupPaymentMethod('card')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                      border: backupPaymentMethod === 'card' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      background: backupPaymentMethod === 'card' ? '#eff6ff' : 'white',
                      fontWeight: '500', color: '#1e293b'
                    }}
                  >
                    💳 Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupPaymentMethod('ach')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                      border: backupPaymentMethod === 'ach' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      background: backupPaymentMethod === 'ach' ? '#eff6ff' : 'white',
                      fontWeight: '500', color: '#1e293b'
                    }}
                  >
                    🏦 ACH
                  </button>
                </div>
              </div>
            )}

            {/* Amount Summary */}
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#166534' }}>Monthly Amount</span>
                <span style={{ color: '#166534', fontWeight: '500' }}>{formatCurrency(amounts.monthlyWithFee)}{billingPreference === 'card' && <span style={{ fontSize: '12px' }}> (incl. fee)</span>}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#166534', fontWeight: '600' }}>First Month{amounts.setupFees > 0 ? ' (incl. setup)' : ''}</span>
                <span style={{ color: '#166534', fontWeight: '700', fontSize: '18px' }}>{formatCurrency(amounts.firstMonthTotal)}</span>
              </div>
            </div>

            {/* Card Payment Form - Stripe Elements */}
            {(billingPreference === 'card' || (billingPreference === 'invoice' && backupPaymentMethod === 'card')) && currentStep === 2 && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
                  {billingPreference === 'invoice' ? '💳 Backup Card Details' : '💳 Card Details'}
                </div>
                {billingPreference === 'invoice' && (
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
                    This card will only be charged if invoices are not paid within 30 days.
                  </p>
                )}
                {/* Stripe Card Element Container */}
                <div ref={cardElementRef} style={styles.stripeElement}>
                  {!elements && <span style={{ color: '#94a3b8' }}>Loading secure payment form...</span>}
                </div>
              </div>
            )}

            {/* ACH Form - for direct ACH or as invoice backup */}
            {(billingPreference === 'ach' || (billingPreference === 'invoice' && backupPaymentMethod === 'ach')) && currentStep === 2 && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  {billingPreference === 'invoice' ? '🏦 Backup Bank Account' : '🏦 Bank Account Details'}
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
                  Enter your bank account information for ACH direct debit. Your information is securely stored with Stripe.
                </p>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Account Holder Name *</label>
                  <input 
                    type="text" 
                    value={bankAccountName} 
                    onChange={e => setBankAccountName(e.target.value)} 
                    placeholder="Business or Personal Name" 
                    style={styles.input} 
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={styles.label}>Routing Number *</label>
                    <input 
                      type="text" 
                      value={bankRoutingNumber} 
                      onChange={e => setBankRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))} 
                      placeholder="9 digits" 
                      style={styles.input}
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Account Number *</label>
                    <input 
                      type="text" 
                      value={bankAccountNumber} 
                      onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))} 
                      placeholder="Account number" 
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Account Type *</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setBankAccountType('checking')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: bankAccountType === 'checking' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                        background: bankAccountType === 'checking' ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        fontWeight: '500',
                        color: '#1e293b'
                      }}
                    >
                      Checking
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankAccountType('savings')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: bankAccountType === 'savings' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                        background: bankAccountType === 'savings' ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        fontWeight: '500',
                        color: '#1e293b'
                      }}
                    >
                      Savings
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#92400e' }}>
                  <strong>Note:</strong> By providing your bank account details, you authorize us to debit your account for the agreed amounts according to the billing schedule.
                </div>
              </div>
            )}

            {paymentError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '20px', color: '#dc2626' }}>
                <strong>Error:</strong> {paymentError}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              <Icons.Lock size={16} />
              <span>Your payment information is secured with 256-bit encryption via Stripe</span>
            </div>

            {currentStep === 2 && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => { setStep1Complete(false); setCurrentStep(1); }} style={{ ...styles.button, ...styles.secondaryButton }}>Back</button>
                <button 
                  onClick={handleConfirmPayment} 
                  disabled={submitting || achProcessing}
                  style={{ ...styles.button, ...styles.primaryButton, opacity: (submitting || achProcessing) ? 0.6 : 1 }}
                >
                  {(submitting || achProcessing) ? <><Icons.Loader size={20} /> {achProcessing ? 'Saving Bank Info...' : 'Processing...'}</> : <><Icons.Check size={20} /> Confirm Payment Info</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: Sign */}
        <div style={{ ...styles.card, opacity: currentStep === 3 ? 1 : 0.5, pointerEvents: currentStep === 3 ? 'auto' : 'none' }}>
          <div style={styles.cardHeader}>
            <Icons.PenTool size={24} color={currentStep === 3 ? '#3b82f6' : '#94a3b8'} />
            <span style={styles.cardTitle}>Step 3: Sign Agreement</span>
          </div>
          <div style={styles.cardBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={styles.label}>Full Name *</label>
                <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="John Smith" style={styles.input} disabled={currentStep !== 3} />
              </div>
              <div>
                <label style={styles.label}>Title</label>
                <input type="text" value={signerTitle} onChange={e => setSignerTitle(e.target.value)} placeholder="Owner, Manager, etc." style={styles.input} disabled={currentStep !== 3} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Email Address *</label>
              <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="john@company.com" style={styles.input} disabled={currentStep !== 3} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Type Your Signature *</label>
              <input type="text" value={signature} onChange={e => setSignature(e.target.value)} placeholder="Type your full name"
                style={{ ...styles.input, fontFamily: "'Brush Script MT', cursive", fontSize: '24px', padding: '16px' }} disabled={currentStep !== 3} />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>By typing your name, you create a legally binding electronic signature.</p>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: currentStep === 3 ? 'pointer' : 'default', marginBottom: '24px' }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ width: '20px', height: '20px', marginTop: '2px' }} disabled={currentStep !== 3} />
              <span style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                I have reviewed the products and pricing, agree to the <a href="/terms" target="_blank" style={{ color: '#3b82f6' }}>Terms of Service</a>, 
                and authorize charges according to the billing schedule.
              </span>
            </label>

            {currentStep === 3 && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => { setStep2Complete(false); setCurrentStep(2); }} style={{ ...styles.button, ...styles.secondaryButton }}>Back</button>
                <button onClick={handleSubmitSignature} disabled={!agreedToTerms || !signature.trim() || submitting}
                  style={{ ...styles.button, ...styles.primaryButton, opacity: (!agreedToTerms || !signature.trim() || submitting) ? 0.6 : 1, cursor: (!agreedToTerms || !signature.trim() || submitting) ? 'not-allowed' : 'pointer' }}>
                  {submitting ? <><Icons.Loader size={20} /> Processing...</> : <><Icons.Check size={20} /> Sign & Complete</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '14px' }}>
          <p style={{ margin: 0 }}>Thank you for choosing us as your advertising partner!</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Questions? Please reach out to your Sales Associate directly.</p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
