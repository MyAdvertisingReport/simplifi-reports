/**
 * ClientSigningPage.jsx
 * Public page for clients to view and sign their advertising agreement
 * No authentication required - uses secure signing token
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Simple Icons (no auth needed so we inline them)
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
  FileText: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Loader: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
  Calendar: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  DollarSign: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  CheckCircle: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  PenTool: ({ size = 24, color = 'currentColor' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>
    </svg>
  ),
};

export default function ClientSigningPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const [step, setStep] = useState('review'); // 'review', 'sign', 'success'
  
  // Form states
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      
      // Flatten the response - merge order data with contact at top level
      const contractData = {
        ...data.order,
        contact: data.contact,
        // Calculate setup fees total from items
        setup_fees_total: data.order.items?.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0) || 0
      };
      setContract(contractData);
      
      // Pre-fill contact info if available
      if (data.contact) {
        setSignerName(`${data.contact.first_name || ''} ${data.contact.last_name || ''}`.trim());
        setSignerEmail(data.contact.email || '');
        setSignerTitle(data.contact.title || '');
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (e) => {
    e.preventDefault();
    
    if (!signature.trim()) {
      alert('Please type your signature to proceed');
      return;
    }
    
    if (!agreedToTerms) {
      alert('Please agree to the terms of service');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signature.trim(),
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim(),
          signer_title: signerTitle.trim(),
          agreed_to_terms: agreedToTerms
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to sign contract');
      }
      
      const result = await response.json();
      setStep('success');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Styles
  const styles = {
    pageContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    },
    header: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      padding: '24px',
      color: 'white',
      textAlign: 'center',
    },
    logo: {
      fontSize: '24px',
      fontWeight: '700',
      marginBottom: '8px',
    },
    headerSubtext: {
      fontSize: '14px',
      opacity: 0.9,
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px',
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      marginBottom: '24px',
    },
    cardHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
    },
    cardBody: {
      padding: '24px',
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    summaryItem: {
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '12px',
    },
    summaryLabel: {
      fontSize: '12px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '4px',
    },
    summaryValue: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1e293b',
    },
    itemsTable: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeader: {
      background: '#f8fafc',
      textAlign: 'left',
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '1px solid #e2e8f0',
    },
    tableCell: {
      padding: '14px 16px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '14px',
      color: '#374151',
    },
    totalRow: {
      background: '#f8fafc',
      fontWeight: '600',
    },
    salesRepSection: {
      marginTop: '24px',
      padding: '20px',
      background: '#f0f9ff',
      borderRadius: '12px',
      border: '1px solid #bae6fd',
    },
    signatureDisplay: {
      fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
      fontSize: '28px',
      color: '#1e3a8a',
      marginTop: '8px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
    },
    input: {
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.15s',
      outline: 'none',
    },
    signatureInput: {
      padding: '16px',
      border: '2px dashed #d1d5db',
      borderRadius: '8px',
      fontSize: '24px',
      fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
      textAlign: 'center',
      background: '#fafafa',
    },
    checkbox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '8px',
      cursor: 'pointer',
    },
    checkboxInput: {
      width: '20px',
      height: '20px',
      marginTop: '2px',
      cursor: 'pointer',
    },
    checkboxLabel: {
      fontSize: '14px',
      color: '#374151',
      lineHeight: '1.5',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '14px 28px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.15s',
    },
    primaryButton: {
      background: '#10b981',
      color: 'white',
    },
    secondaryButton: {
      background: 'white',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 24px',
    },
    errorIcon: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#fef2f2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
    },
    errorTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '12px',
    },
    errorText: {
      fontSize: '16px',
      color: '#64748b',
      maxWidth: '400px',
      margin: '0 auto',
    },
    successContainer: {
      textAlign: 'center',
      padding: '60px 24px',
    },
    successIcon: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)',
    },
    successTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '12px',
    },
    successText: {
      fontSize: '16px',
      color: '#64748b',
      maxWidth: '500px',
      margin: '0 auto 24px',
      lineHeight: '1.6',
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
    },
    termsSection: {
      marginTop: '24px',
      padding: '20px',
      background: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    },
    termsTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '12px',
    },
    termsText: {
      fontSize: '13px',
      color: '#64748b',
      lineHeight: '1.7',
    },
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <div style={styles.logo}>WSIC Advertising</div>
          <div style={styles.headerSubtext}>Loading your agreement...</div>
        </div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.loadingContainer}>
              <Icons.Loader size={48} color="#3b82f6" />
              <p style={{ marginTop: '16px', color: '#64748b' }}>Loading contract details...</p>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <div style={styles.logo}>WSIC Advertising</div>
        </div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>
                <Icons.AlertCircle size={40} color="#dc2626" />
              </div>
              <h1 style={styles.errorTitle}>Unable to Load Contract</h1>
              <p style={styles.errorText}>{error}</p>
              <p style={{ ...styles.errorText, marginTop: '16px', fontSize: '14px' }}>
                If you believe this is an error, please contact your sales representative.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div style={styles.pageContainer}>
        <div style={{ ...styles.header, background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' }}>
          <div style={styles.logo}>🎉 Contract Signed!</div>
        </div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                <Icons.CheckCircle size={50} color="white" />
              </div>
              <h1 style={styles.successTitle}>Welcome to WSIC!</h1>
              <p style={styles.successText}>
                Your advertising agreement has been signed successfully. 
                You'll receive a confirmation email shortly with a copy of your signed agreement.
              </p>
              <div style={{ ...styles.card, textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                <div style={styles.cardBody}>
                  <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>What's Next?</h3>
                  <ul style={{ paddingLeft: '20px', color: '#374151', lineHeight: '2' }}>
                    <li>Our team will reach out within 1-2 business days</li>
                    <li>We'll collect any creative assets needed</li>
                    <li>Your campaign launches on {formatDate(contract?.contract_start_date)}</li>
                    <li>Access your performance reports anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sign step
  if (step === 'sign') {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <div style={styles.logo}>WSIC Advertising</div>
          <div style={styles.headerSubtext}>Sign Your Agreement</div>
        </div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Icons.PenTool size={24} color="#3b82f6" />
              <span style={styles.cardTitle}>Complete Your Signature</span>
            </div>
            <div style={styles.cardBody}>
              <form onSubmit={handleSign} style={styles.form}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)}
                      style={styles.input}
                      required
                      placeholder="John Smith"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Title</label>
                    <input
                      type="text"
                      value={signerTitle}
                      onChange={e => setSignerTitle(e.target.value)}
                      style={styles.input}
                      placeholder="Owner, Marketing Director, etc."
                    />
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    value={signerEmail}
                    onChange={e => setSignerEmail(e.target.value)}
                    style={styles.input}
                    required
                    placeholder="john@company.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Type Your Signature *</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    style={styles.signatureInput}
                    placeholder="Type your full name"
                    required
                  />
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    By typing your name above, you are creating a legally binding electronic signature.
                  </p>
                </div>

                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    style={styles.checkboxInput}
                  />
                  <span style={styles.checkboxLabel}>
                    I have read and agree to the <a href="/terms" target="_blank" style={{ color: '#3b82f6' }}>Terms of Service</a> and 
                    authorize WSIC to charge the agreed-upon amounts according to the billing schedule. 
                    I understand this creates a binding agreement for the services described above.
                  </span>
                </label>

                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    onClick={() => setStep('review')}
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    disabled={submitting}
                  >
                    Back to Review
                  </button>
                  <button
                    type="submit"
                    style={{ 
                      ...styles.button, 
                      ...styles.primaryButton,
                      flex: 1,
                      opacity: (!agreedToTerms || !signature.trim() || submitting) ? 0.6 : 1
                    }}
                    disabled={!agreedToTerms || !signature.trim() || submitting}
                  >
                    {submitting ? (
                      <>
                        <Icons.Loader size={20} />
                        Signing...
                      </>
                    ) : (
                      <>
                        <Icons.Check size={20} />
                        Sign Agreement
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Review step (default)
  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.logo}>WSIC Advertising</div>
        <div style={styles.headerSubtext}>Let's Grow Your Business Together</div>
      </div>
      
      <div style={styles.container}>
        {/* Agreement Header */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Icons.FileText size={24} color="#3b82f6" />
            <span style={styles.cardTitle}>Your Advertising Agreement</span>
          </div>
          <div style={styles.cardBody}>
            <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '8px' }}>
              {contract.client_name}
            </h2>
            <p style={{ color: '#64748b' }}>
              We're excited to partner with you! Please review the details below and sign to get started on this exciting opportunity.
            </p>

            {/* Summary Grid */}
            <div style={{ ...styles.summaryGrid, marginTop: '24px' }}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Start Date</div>
                <div style={styles.summaryValue}>
                  {new Date(contract.contract_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Contract Term</div>
                <div style={styles.summaryValue}>
                  {contract.term_months === 1 ? 'One-Time' : `${contract.term_months} Months`}
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Monthly Investment</div>
                <div style={styles.summaryValue}>{formatCurrency(contract.monthly_total)}</div>
              </div>
              <div style={{ ...styles.summaryItem, background: '#f0fdf4' }}>
                <div style={styles.summaryLabel}>Total Agreement Value</div>
                <div style={{ ...styles.summaryValue, color: '#10b981' }}>
                  {formatCurrency(contract.contract_total)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Icons.DollarSign size={24} color="#3b82f6" />
            <span style={styles.cardTitle}>Services Included</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Product</th>
                  <th style={styles.tableHeader}>Category</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Monthly</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Setup</th>
                </tr>
              </thead>
              <tbody>
                {contract.items?.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.tableCell}>
                      <div style={{ fontWeight: '500' }}>{item.product_name}</div>
                      {item.entity_name && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.entity_name}</div>
                      )}
                    </td>
                    <td style={styles.tableCell}>{item.product_category || '-'}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      {formatCurrency(item.line_total)}
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      {item.setup_fee > 0 ? formatCurrency(item.setup_fee) : '-'}
                    </td>
                  </tr>
                ))}
                <tr style={styles.totalRow}>
                  <td colSpan="2" style={{ ...styles.tableCell, fontWeight: '600' }}>
                    Total
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: '600' }}>
                    {formatCurrency(contract.monthly_total)}/mo
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: '600' }}>
                    {contract.setup_fees_total > 0 ? formatCurrency(contract.setup_fees_total) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Rep Signature */}
        {contract.sales_rep?.signature && (
          <div style={styles.card}>
            <div style={styles.cardBody}>
              <div style={styles.salesRepSection}>
                <div style={{ fontSize: '14px', color: '#0369a1', fontWeight: '500' }}>
                  Prepared by: {contract.sales_rep.name}
                </div>
                <div style={styles.signatureDisplay}>{contract.sales_rep.signature}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                  Signed on {formatDate(contract.sales_rep.signed_date)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terms Summary */}
        <div style={styles.card}>
          <div style={styles.cardBody}>
            <div style={styles.termsSection}>
              <h3 style={styles.termsTitle}>Terms Summary</h3>
              <div style={styles.termsText}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Billing:</strong> You will be billed {contract.billing_frequency === 'upfront' ? 'the full amount upfront' : 'monthly'} starting on your contract start date.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Cancellation:</strong> This agreement is for the full term of {contract.term_months} month{contract.term_months !== 1 ? 's' : ''}. 
                  Early cancellation may result in fees as outlined in our Terms of Service.
                </p>
                <p>
                  <strong>Questions?</strong> Please reach out to your Sales Associate directly if you have any questions about the billing of your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '40px' }}>
          <button
            onClick={() => setStep('sign')}
            style={{ 
              ...styles.button, 
              ...styles.primaryButton,
              padding: '16px 48px',
              fontSize: '18px'
            }}
          >
            <Icons.PenTool size={20} />
            Proceed to Sign
          </button>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
            By signing, you agree to our Terms of Service
          </p>
        </div>

        {/* Thank You Message */}
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '14px' }}>
          <p>Thank you for choosing us as your advertising partner. We're grateful for the opportunity to help grow your business!</p>
        </div>
      </div>
    </div>
  );
}
