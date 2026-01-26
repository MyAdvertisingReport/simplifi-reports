/**
 * BillingPage.jsx
 * Invoice and Billing Management Dashboard
 * 
 * Redesigned with:
 * - Expandable invoice rows with full details
 * - Single "Approve & Send" button workflow
 * - Auto-charge warning in emails
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, FileText, Clock, AlertCircle, CheckCircle, XCircle,
  Send, CreditCard, Search, ChevronRight, ChevronDown,
  Plus, Calendar, Building2, Mail, RefreshCw,
  AlertTriangle, Package, User, Phone, Banknote
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const Loader2 = ({ size = 24, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ ...style, animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
  const config = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    approved: { bg: '#dbeafe', color: '#1e40af', label: 'Approved' },
    sent: { bg: '#fef3c7', color: '#92400e', label: 'Sent' },
    paid: { bg: '#dcfce7', color: '#166534', label: 'Paid' },
    overdue: { bg: '#fee2e2', color: '#991b1b', label: 'Overdue' },
    partial: { bg: '#fef9c3', color: '#854d0e', label: 'Partial' },
    void: { bg: '#f1f5f9', color: '#64748b', label: 'Void' }
  }[status] || { bg: '#f1f5f9', color: '#475569', label: status };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', backgroundColor: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
};

export default function BillingPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState({});
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agingReport, setAgingReport] = useState(null);
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/billing/invoices`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/billing/stats`, { headers: getAuthHeaders() })
      ]);
      
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.invoices || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAgingReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/billing/aging-report`, { headers: getAuthHeaders() });
      if (res.ok) setAgingReport(await res.json());
    } catch (err) {
      console.error('Error loading aging report:', err);
    }
  };

  const loadInvoiceDetails = async (invoiceId) => {
    if (invoiceDetails[invoiceId]) return;
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${invoiceId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvoiceDetails(prev => ({ ...prev, [invoiceId]: data }));
      }
    } catch (err) {
      console.error('Error loading invoice details:', err);
    }
  };

  const toggleExpand = async (invoiceId) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
    } else {
      setExpandedInvoice(invoiceId);
      await loadInvoiceDetails(invoiceId);
    }
  };

  // Combined Approve & Send
  const handleApproveAndSend = async (invoice) => {
    if (!confirm(`📧 Ready to send invoice to ${invoice.client_name}?\n\n✅ Invoice: ${invoice.invoice_number}\n💰 Amount: ${formatCurrency(invoice.total)}\n📅 Due: ${formatDate(invoice.due_date)}\n\nThe client will receive a professional invoice email with a secure payment link. Click OK to approve and send!`)) {
      return;
    }
    
    setProcessing(invoice.id);
    try {
      // First approve
      const approveRes = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (!approveRes.ok) {
        const err = await approveRes.json();
        throw new Error(err.error || 'Failed to approve');
      }
      
      // Then send
      const sendRes = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!sendRes.ok) {
        const err = await sendRes.json();
        throw new Error(err.error || 'Failed to send');
      }
      
      alert(`Invoice ${invoice.invoice_number} approved and sent to client!`);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // Record manual payment
  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    
    setProcessing(selectedInvoice.id);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${selectedInvoice.id}/record-payment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          reference: paymentReference
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }
      
      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      setPaymentReference('');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // Charge card on file
  const handleChargeCard = async (invoice) => {
    if (!confirm(`Charge ${formatCurrency(invoice.balance_due)} to the card on file for ${invoice.client_name}?`)) {
      return;
    }
    
    setProcessing(invoice.id);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/charge`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to charge card');
      }
      
      alert('Payment processed successfully!');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // Void invoice
  const handleVoid = async (invoice) => {
    if (!confirm(`Void invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    
    setProcessing(invoice.id);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/void`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Failed to void');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  // Send reminder
  const handleSendReminder = async (invoice) => {
    setProcessing(invoice.id);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/send-reminder`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Failed to send reminder');
      alert('Reminder sent!');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchQuery || 
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const styles = {
    container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' },
    button: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
    buttonPrimary: { background: '#1e3a8a', color: 'white' },
    buttonSuccess: { background: '#059669', color: 'white' },
    buttonDanger: { background: '#dc2626', color: 'white' },
    buttonSecondary: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
    buttonWarning: { background: '#f59e0b', color: 'white' },
    card: { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    statLabel: { fontSize: '14px', color: '#64748b', marginBottom: '8px' },
    statValue: { fontSize: '28px', fontWeight: '700' },
    tabs: { display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 20px' },
    tab: { padding: '16px 20px', cursor: 'pointer', color: '#64748b', borderBottom: '2px solid transparent', marginBottom: '-1px', fontWeight: '500' },
    tabActive: { color: '#1e3a8a', borderBottomColor: '#1e3a8a' },
    filterBar: { display: 'flex', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', alignItems: 'center' },
    searchInput: { flex: 1, maxWidth: '300px', padding: '10px 16px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer' },
    invoiceRow: { borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.15s' },
    invoiceRowExpanded: { background: '#f8fafc' },
    invoiceHeader: { display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 120px 200px', alignItems: 'center', padding: '16px 20px', gap: '12px' },
    invoiceDetails: { padding: '0 20px 20px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' },
    detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '20px' },
    detailSection: { background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' },
    detailTitle: { fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    lineItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: 'white', borderRadius: '12px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '20px', borderBottom: '1px solid #e2e8f0' },
    modalBody: { padding: '20px' },
    modalFooter: { padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Loader2 size={32} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <DollarSign size={28} color="#1e3a8a" />
          Billing & Invoices
        </h1>
        <button onClick={() => navigate('/billing/new')} style={{ ...styles.button, ...styles.buttonPrimary }}>
          <Plus size={18} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Outstanding</div>
          <div style={{ ...styles.statValue, color: '#ea580c' }}>{formatCurrency(stats.outstanding_total)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{parseInt(stats.outstanding_count || 0)} invoices</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Overdue</div>
          <div style={{ ...styles.statValue, color: '#dc2626' }}>{formatCurrency(stats.overdue_total)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{parseInt(stats.overdue_count || 0)} invoices</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Paid This Month</div>
          <div style={{ ...styles.statValue, color: '#059669' }}>{formatCurrency(stats.paid_this_month_total)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{parseInt(stats.paid_this_month_count || 0)} invoices</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Approval</div>
          <div style={styles.statValue}>{parseInt(stats.draft_count || 0) + parseInt(stats.approved_count || 0)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            {parseInt(stats.draft_count || 0)} draft, {parseInt(stats.approved_count || 0)} approved
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div style={styles.card}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <div style={{ ...styles.tab, ...(activeTab === 'invoices' ? styles.tabActive : {}) }} onClick={() => setActiveTab('invoices')}>
            Invoices
          </div>
          <div style={{ ...styles.tab, ...(activeTab === 'aging' ? styles.tabActive : {}) }} onClick={() => { setActiveTab('aging'); loadAgingReport(); }}>
            Aging Report
          </div>
        </div>

        {activeTab === 'invoices' && (
          <>
            {/* Filters */}
            <div style={styles.filterBar}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </select>
              <button onClick={loadData} style={{ ...styles.button, ...styles.buttonSecondary }}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {/* Invoice List Header */}
            <div style={{ ...styles.invoiceHeader, background: '#f8fafc', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <div>Invoice</div>
              <div>Client</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Due Date</div>
              <div>Actions</div>
            </div>

            {/* Invoice Rows */}
            {filteredInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <FileText size={48} color="#cbd5e1" />
                <h3 style={{ color: '#64748b', marginTop: '16px' }}>No invoices found</h3>
                <p style={{ color: '#94a3b8' }}>Create your first invoice to get started</p>
              </div>
            ) : (
              filteredInvoices.map(invoice => {
                const isExpanded = expandedInvoice === invoice.id;
                const details = invoiceDetails[invoice.id];
                const isProcessing = processing === invoice.id;
                const isOverdue = invoice.status === 'sent' && invoice.days_overdue > 0;

                return (
                  <div key={invoice.id} style={{ ...styles.invoiceRow, ...(isExpanded ? styles.invoiceRowExpanded : {}) }}>
                    {/* Row Header */}
                    <div style={styles.invoiceHeader} onClick={() => toggleExpand(invoice.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isExpanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{invoice.invoice_number}</div>
                          {invoice.order_number && <div style={{ fontSize: '12px', color: '#64748b' }}>Order: {invoice.order_number}</div>}
                        </div>
                      </div>
                      <div style={{ fontWeight: '500' }}>{invoice.client_name}</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{formatCurrency(invoice.total)}</div>
                      <div>
                        <StatusBadge status={isOverdue ? 'overdue' : invoice.status} />
                        {isOverdue && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>{invoice.days_overdue}d overdue</div>}
                      </div>
                      <div>{formatDate(invoice.due_date)}</div>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        {/* Draft: Approve & Send */}
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleApproveAndSend(invoice)}
                            style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 12px', fontSize: '13px' }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 size={14} /> : <><Send size={14} /> Approve & Send</>}
                          </button>
                        )}
                        
                        {/* Approved: Just Send */}
                        {invoice.status === 'approved' && (
                          <button
                            onClick={() => handleApproveAndSend(invoice)}
                            style={{ ...styles.button, ...styles.buttonPrimary, padding: '6px 12px', fontSize: '13px' }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 size={14} /> : <><Send size={14} /> Send</>}
                          </button>
                        )}

                        {/* Sent: Payment options */}
                        {(invoice.status === 'sent' || invoice.status === 'partial') && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentAmount(invoice.balance_due?.toString() || '');
                                setShowPaymentModal(true);
                              }}
                              style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 12px', fontSize: '13px' }}
                            >
                              <Banknote size={14} /> Record Payment
                            </button>
                            {invoice.payment_method_id && (
                              <button
                                onClick={() => handleChargeCard(invoice)}
                                style={{ ...styles.button, ...styles.buttonWarning, padding: '6px 12px', fontSize: '13px' }}
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 size={14} /> : <><CreditCard size={14} /> Charge</>}
                              </button>
                            )}
                            {isOverdue && (
                              <button
                                onClick={() => handleSendReminder(invoice)}
                                style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 12px', fontSize: '13px' }}
                                disabled={isProcessing}
                              >
                                <Mail size={14} /> Remind
                              </button>
                            )}
                          </>
                        )}

                        {/* Void button for non-paid */}
                        {invoice.status !== 'paid' && invoice.status !== 'void' && (
                          <button
                            onClick={() => handleVoid(invoice)}
                            style={{ padding: '6px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Void Invoice"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={styles.invoiceDetails}>
                        {!details ? (
                          <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={24} /></div>
                        ) : (
                          <>
                            <div style={styles.detailsGrid}>
                              {/* Client Info */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailTitle}><Building2 size={14} style={{ display: 'inline', marginRight: '6px' }} />Client</div>
                                <div style={{ fontWeight: '600', marginBottom: '8px' }}>{details.client_name}</div>
                                {details.order_number && (
                                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                    Order: {details.order_number}
                                  </div>
                                )}
                              </div>

                              {/* Invoice Info */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailTitle}><FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />Invoice Details</div>
                                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Invoice #:</span>
                                    <span style={{ fontWeight: '600' }}>{details.invoice_number}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Issue Date:</span>
                                    <span>{formatDate(details.issue_date)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Due Date:</span>
                                    <span style={{ fontWeight: '600', color: isOverdue ? '#dc2626' : '#1e293b' }}>{formatDate(details.due_date)}</span>
                                  </div>
                                  {details.billing_period_start && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>Period:</span>
                                      <span>{formatDate(details.billing_period_start)} - {formatDate(details.billing_period_end)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Payment Info */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailTitle}><CreditCard size={14} style={{ display: 'inline', marginRight: '6px' }} />Payment</div>
                                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Method:</span>
                                    <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{details.billing_preference || 'Invoice'}</span>
                                  </div>
                                  {details.payment_method_id && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>Backup Payment:</span>
                                      <span style={{ fontWeight: '500' }}>•••• on file</span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Auto-charge:</span>
                                    <span style={{ fontWeight: '500', color: '#f59e0b' }}>Day 30 if unpaid</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Line Items */}
                            <div style={{ ...styles.detailSection, marginTop: '0' }}>
                              <div style={styles.detailTitle}><Package size={14} style={{ display: 'inline', marginRight: '6px' }} />Line Items</div>
                              {details.items?.map((item, idx) => (
                                <div key={idx} style={styles.lineItem}>
                                  <div>
                                    <div style={{ fontWeight: '500' }}>{item.description}</div>
                                    {item.quantity > 1 && <div style={{ fontSize: '12px', color: '#64748b' }}>Qty: {item.quantity}</div>}
                                  </div>
                                  <div style={{ fontWeight: '600' }}>{formatCurrency(item.amount)}</div>
                                </div>
                              ))}
                              <div style={{ ...styles.lineItem, borderBottom: 'none', paddingTop: '16px' }}>
                                <div style={{ fontWeight: '600' }}>Subtotal</div>
                                <div style={{ fontWeight: '600' }}>{formatCurrency(details.subtotal)}</div>
                              </div>
                              {parseFloat(details.processing_fee) > 0 && (
                                <div style={{ ...styles.lineItem, borderBottom: 'none', paddingTop: '4px' }}>
                                  <div style={{ color: '#64748b' }}>Processing Fee (3.5%)</div>
                                  <div>{formatCurrency(details.processing_fee)}</div>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #e2e8f0', marginTop: '8px' }}>
                                <div style={{ fontSize: '18px', fontWeight: '700' }}>Total</div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a' }}>{formatCurrency(details.total)}</div>
                              </div>
                              {parseFloat(details.amount_paid) > 0 && (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                                    <div style={{ color: '#059669' }}>Amount Paid</div>
                                    <div style={{ color: '#059669' }}>-{formatCurrency(details.amount_paid)}</div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', fontWeight: '600' }}>
                                    <div>Balance Due</div>
                                    <div style={{ color: '#dc2626' }}>{formatCurrency(details.balance_due)}</div>
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* Aging Report Tab */}
        {activeTab === 'aging' && (
          <div style={{ padding: '20px' }}>
            {!agingReport ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} /></div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Current', value: agingReport.totals?.current, color: '#059669' },
                    { label: '1-30 Days', value: agingReport.totals?.['1-30'], color: '#f59e0b' },
                    { label: '31-60 Days', value: agingReport.totals?.['31-60'], color: '#ea580c' },
                    { label: '61-90 Days', value: agingReport.totals?.['61-90'], color: '#dc2626' },
                    { label: 'Over 90', value: agingReport.totals?.['over-90'], color: '#7f1d1d' },
                  ].map(bucket => (
                    <div key={bucket.label} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{bucket.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: bucket.color }}>{formatCurrency(bucket.value)}</div>
                    </div>
                  ))}
                </div>
                
                {agingReport.invoices?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Invoice</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Client</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Balance</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Days Overdue</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Aging</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingReport.invoices.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px', fontWeight: '500' }}>{inv.invoice_number}</td>
                          <td style={{ padding: '12px' }}>{inv.client_name}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(inv.balance_due)}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#dc2626' }}>{inv.days_overdue}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                              background: inv.aging_bucket === 'current' ? '#dcfce7' : inv.aging_bucket === '1-30' ? '#fef3c7' : '#fee2e2',
                              color: inv.aging_bucket === 'current' ? '#166534' : inv.aging_bucket === '1-30' ? '#92400e' : '#991b1b'
                            }}>
                              {inv.aging_bucket}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <CheckCircle size={48} color="#059669" style={{ marginBottom: '16px' }} />
                    <h3>All Caught Up!</h3>
                    <p>No outstanding invoices</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div style={styles.modal} onClick={() => setShowPaymentModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Record Payment</h3>
              <div style={{ fontSize: '14px', color: '#64748b' }}>{selectedInvoice.invoice_number}</div>
            </div>
            <div style={styles.modalBody}>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={styles.input}
                  placeholder="0.00"
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Balance due: {formatCurrency(selectedInvoice.balance_due)}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ ...styles.input, cursor: 'pointer' }}>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="ach">ACH Transfer</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Reference / Check #</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  style={styles.input}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowPaymentModal(false)} style={{ ...styles.button, ...styles.buttonSecondary }}>
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                style={{ ...styles.button, ...styles.buttonSuccess }}
                disabled={!paymentAmount || processing}
              >
                {processing ? <Loader2 size={16} /> : <><CheckCircle size={16} /> Record Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
