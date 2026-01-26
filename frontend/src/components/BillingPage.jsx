/**
 * BillingPage.jsx
 * Invoice and Billing Management Dashboard
 * 
 * Features:
 * - Invoice list with filters
 * - Aging report with buckets
 * - Invoice approval workflow
 * - Send invoices & reminders
 * - Record manual payments
 * - Auto-charge capability
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, FileText, Clock, AlertCircle, CheckCircle, XCircle,
  Send, CreditCard, Search, Filter, ChevronRight, ChevronDown,
  Plus, Eye, Calendar, Building2, Mail, RefreshCw, MoreVertical,
  ArrowUpRight, ArrowDownRight, TrendingUp, Download, AlertTriangle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Auth helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Spinner
const Loader2 = ({ size = 24, style = {} }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ ...style, animation: 'spin 1s linear infinite' }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

// Banknote icon
const Banknote = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
  </svg>
);

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    approved: { bg: '#dbeafe', color: '#1e40af', label: 'Approved' },
    sent: { bg: '#fef3c7', color: '#92400e', label: 'Sent' },
    paid: { bg: '#dcfce7', color: '#166534', label: 'Paid' },
    overdue: { bg: '#fee2e2', color: '#991b1b', label: 'Overdue' },
    partial: { bg: '#fef9c3', color: '#854d0e', label: 'Partial' },
    void: { bg: '#f1f5f9', color: '#64748b', label: 'Void' }
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: config.bg,
      color: config.color
    }}>
      {config.label}
    </span>
  );
};

export default function BillingPage() {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [agingReport, setAgingReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [reminderType, setReminderType] = useState('friendly');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [invoicesRes, statsRes, agingRes] = await Promise.all([
        fetch(`${API_BASE}/api/billing/invoices${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, {
          headers: getAuthHeaders()
        }),
        fetch(`${API_BASE}/api/billing/stats`, {
          headers: getAuthHeaders()
        }),
        fetch(`${API_BASE}/api/billing/aging-report`, {
          headers: getAuthHeaders()
        })
      ]);

      if (!invoicesRes.ok || !statsRes.ok || !agingRes.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const [invoicesData, statsData, agingData] = await Promise.all([
        invoicesRes.json(),
        statsRes.json(),
        agingRes.json()
      ]);

      setInvoices(invoicesData.invoices || []);
      setStats(statsData);
      setAgingReport(agingData);
    } catch (err) {
      console.error('Error loading billing data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.client_name?.toLowerCase().includes(query)
    );
  });

  // Actions
  const handleApprove = async (invoice) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to approve invoice');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!selectedInvoice) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${selectedInvoice.id}/send`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to send invoice');
      setShowSendModal(false);
      setSelectedInvoice(null);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${selectedInvoice.id}/record-payment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      });
      if (!res.ok) throw new Error('Failed to record payment');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      setPaymentMethod('check');
      setPaymentNotes('');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCharge = async () => {
    if (!selectedInvoice) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${selectedInvoice.id}/charge`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process payment');
      setShowChargeModal(false);
      setSelectedInvoice(null);
      await loadData();
      alert('Payment processed successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedInvoice) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/send-reminder/${selectedInvoice.id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reminder_type: reminderType })
      });
      if (!res.ok) throw new Error('Failed to send reminder');
      setShowReminderModal(false);
      setSelectedInvoice(null);
      setReminderType('friendly');
      alert('Reminder sent successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleVoid = async () => {
    if (!selectedInvoice || !voidReason) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${selectedInvoice.id}/void`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: voidReason })
      });
      if (!res.ok) throw new Error('Failed to void invoice');
      setShowVoidModal(false);
      setSelectedInvoice(null);
      setVoidReason('');
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Styles
  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    statLabel: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '4px',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1e293b',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 20px',
    },
    tab: {
      padding: '16px 20px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#64748b',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      marginBottom: '-1px',
    },
    tabActive: {
      color: '#1e3a8a',
      borderBottom: '2px solid #1e3a8a',
    },
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      gap: '16px',
      flexWrap: 'wrap'
    },
    searchInput: {
      padding: '10px 12px 10px 36px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      width: '240px',
      outline: 'none',
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      padding: '12px 20px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#64748b',
      background: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
    },
    td: {
      padding: '16px 20px',
      fontSize: '14px',
      color: '#374151',
      borderBottom: '1px solid #f1f5f9',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.15s',
    },
    buttonPrimary: {
      background: '#1e3a8a',
      color: 'white',
    },
    buttonSecondary: {
      background: '#f1f5f9',
      color: '#374151',
    },
    buttonSuccess: {
      background: '#059669',
      color: 'white',
    },
    buttonDanger: {
      background: '#dc2626',
      color: 'white',
    },
    emptyState: {
      padding: '60px 20px',
      textAlign: 'center',
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      background: 'white',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '480px',
      maxHeight: '90vh',
      overflow: 'auto',
      margin: '20px',
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    modalBody: {
      padding: '24px',
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '6px',
    },
  };

  // Loading state
  if (loading && !invoices.length) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
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
        <button 
          onClick={() => navigate('/billing/new')}
          style={{ ...styles.button, ...styles.buttonPrimary }}
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Outstanding</div>
            <div style={{ ...styles.statValue, color: '#f59e0b' }}>
              {formatCurrency(stats.outstanding_total)}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {stats.outstanding_count} invoices
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Overdue</div>
            <div style={{ ...styles.statValue, color: '#dc2626' }}>
              {formatCurrency(stats.overdue_total)}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {stats.overdue_count} invoices
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Paid This Month</div>
            <div style={{ ...styles.statValue, color: '#059669' }}>
              {formatCurrency(stats.paid_this_month_total)}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {stats.paid_this_month_count} invoices
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Pending Approval</div>
            <div style={styles.statValue}>
              {(stats.draft_count || 0) + (stats.approved_count || 0)}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {stats.draft_count} draft, {stats.approved_count} approved
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div style={styles.card}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <div 
            style={{ ...styles.tab, ...(activeTab === 'invoices' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </div>
          <div 
            style={{ ...styles.tab, ...(activeTab === 'aging' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('aging')}
          >
            Aging Report
          </div>
        </div>

        {/* Toolbar */}
        {activeTab === 'invoices' && (
          <div style={styles.toolbar}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="void">Void</option>
              </select>
            </div>
            
            <button 
              onClick={loadData}
              style={{ ...styles.button, ...styles.buttonSecondary }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <>
            {filteredInvoices.length === 0 ? (
              <div style={styles.emptyState}>
                <FileText size={48} color="#cbd5e1" />
                <h3 style={{ color: '#64748b', marginTop: '16px' }}>No invoices found</h3>
                <p style={{ color: '#94a3b8', marginTop: '8px' }}>
                  {statusFilter !== 'all' ? 'Try changing the status filter' : 'Create your first invoice to get started'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Invoice</th>
                      <th style={styles.th}>Client</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Due Date</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {invoice.invoice_number}
                          </div>
                          {invoice.order_number && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Order: {invoice.order_number}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '500' }}>{invoice.client_name}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {formatCurrency(invoice.total)}
                          </div>
                          {parseFloat(invoice.balance_due) > 0 && parseFloat(invoice.balance_due) !== parseFloat(invoice.total) && (
                            <div style={{ fontSize: '12px', color: '#dc2626' }}>
                              Due: {formatCurrency(invoice.balance_due)}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <StatusBadge status={
                            invoice.status === 'sent' && invoice.days_overdue > 0 ? 'overdue' : invoice.status
                          } />
                          {invoice.days_overdue > 0 && invoice.status === 'sent' && (
                            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                              {invoice.days_overdue} days overdue
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          {formatDate(invoice.due_date)}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Draft actions */}
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => handleApprove(invoice)}
                                style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 10px' }}
                                disabled={processing}
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                            )}
                            
                            {/* Approved actions */}
                            {invoice.status === 'approved' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowSendModal(true);
                                }}
                                style={{ ...styles.button, ...styles.buttonPrimary, padding: '6px 10px' }}
                              >
                                <Send size={14} />
                                Send
                              </button>
                            )}
                            
                            {/* Sent actions */}
                            {(invoice.status === 'sent' || invoice.status === 'partial') && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setPaymentAmount(invoice.balance_due?.toString() || '');
                                    setShowPaymentModal(true);
                                  }}
                                  style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 10px' }}
                                >
                                  <Banknote size={14} />
                                  Payment
                                </button>
                                
                                {invoice.payment_method_id && (
                                  <button
                                    onClick={() => {
                                      setSelectedInvoice(invoice);
                                      setShowChargeModal(true);
                                    }}
                                    style={{ ...styles.button, ...styles.buttonPrimary, padding: '6px 10px' }}
                                  >
                                    <CreditCard size={14} />
                                    Charge
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowReminderModal(true);
                                  }}
                                  style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 10px' }}
                                >
                                  <Mail size={14} />
                                </button>
                              </>
                            )}
                            
                            {/* Void option for non-paid invoices */}
                            {!['paid', 'void'].includes(invoice.status) && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowVoidModal(true);
                                }}
                                style={{ ...styles.button, padding: '6px 10px', background: '#fef2f2', color: '#dc2626' }}
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Aging Report Tab */}
        {activeTab === 'aging' && agingReport && (
          <div style={{ padding: '20px' }}>
            {/* Aging Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '12px', 
              marginBottom: '24px' 
            }}>
              {[
                { label: 'Current', value: agingReport.totals?.current || 0, color: '#059669' },
                { label: '1-30 Days', value: agingReport.totals?.['1-30'] || 0, color: '#f59e0b' },
                { label: '31-60 Days', value: agingReport.totals?.['31-60'] || 0, color: '#ea580c' },
                { label: '61-90 Days', value: agingReport.totals?.['61-90'] || 0, color: '#dc2626' },
                { label: '90+ Days', value: agingReport.totals?.['over-90'] || 0, color: '#991b1b' },
              ].map(bucket => (
                <div key={bucket.label} style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${bucket.color}`
                }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    {bucket.label}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: bucket.color }}>
                    {formatCurrency(bucket.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed aging list */}
            {agingReport.invoices?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Invoice</th>
                      <th style={styles.th}>Client</th>
                      <th style={styles.th}>Due Date</th>
                      <th style={styles.th}>Days Overdue</th>
                      <th style={styles.th}>Balance</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingReport.invoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600' }}>{invoice.invoice_number}</div>
                        </td>
                        <td style={styles.td}>{invoice.client_name}</td>
                        <td style={styles.td}>{formatDate(invoice.due_date)}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: invoice.days_overdue > 60 ? '#fee2e2' : invoice.days_overdue > 30 ? '#fef3c7' : '#f1f5f9',
                            color: invoice.days_overdue > 60 ? '#991b1b' : invoice.days_overdue > 30 ? '#92400e' : '#374151'
                          }}>
                            {invoice.days_overdue > 0 ? `${invoice.days_overdue} days` : 'Current'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontWeight: '600', color: '#dc2626' }}>
                            {formatCurrency(invoice.balance_due)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {invoice.payment_method_id && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowChargeModal(true);
                                }}
                                style={{ ...styles.button, ...styles.buttonPrimary, padding: '6px 10px' }}
                              >
                                <CreditCard size={14} />
                                Charge
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowReminderModal(true);
                              }}
                              style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 10px' }}
                            >
                              <Mail size={14} />
                              Remind
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <CheckCircle size={48} color="#10b981" />
                <h3 style={{ color: '#059669', marginTop: '16px' }}>All caught up!</h3>
                <p style={{ color: '#64748b', marginTop: '8px' }}>
                  No outstanding invoices to worry about.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Invoice Modal */}
      {showSendModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowSendModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <Send size={24} color="#1e3a8a" />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Send Invoice</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '16px' }}>
                Send invoice <strong>{selectedInvoice.invoice_number}</strong> to{' '}
                <strong>{selectedInvoice.client_name}</strong>?
              </p>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Amount: <strong>{formatCurrency(selectedInvoice.total)}</strong>
                <br />
                Due: <strong>{formatDate(selectedInvoice.due_date)}</strong>
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{ ...styles.button, ...styles.buttonSecondary }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                style={{ ...styles.button, ...styles.buttonPrimary }}
                disabled={processing}
              >
                {processing ? <Loader2 size={16} /> : <Send size={16} />}
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <Banknote size={24} />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Record Payment</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '20px' }}>
                Recording payment for <strong>{selectedInvoice.invoice_number}</strong>
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Amount *</label>
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
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ ...styles.input, cursor: 'pointer' }}
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label style={styles.label}>Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  style={styles.input}
                  placeholder="Check #, reference, etc."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ ...styles.button, ...styles.buttonSecondary }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                style={{ ...styles.button, ...styles.buttonSuccess }}
                disabled={processing || !paymentAmount}
              >
                {processing ? <Loader2 size={16} /> : <CheckCircle size={16} />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charge Modal */}
      {showChargeModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowChargeModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <CreditCard size={24} color="#1e3a8a" />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Charge Payment Method</span>
            </div>
            <div style={styles.modalBody}>
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #fcd34d',
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '20px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertTriangle size={20} color="#92400e" style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                      Confirm Charge
                    </div>
                    <div style={{ fontSize: '14px', color: '#a16207' }}>
                      This will charge the customer's saved payment method.
                    </div>
                  </div>
                </div>
              </div>
              
              <p style={{ marginBottom: '16px' }}>
                Charge <strong>{formatCurrency(selectedInvoice.balance_due)}</strong> to{' '}
                <strong>{selectedInvoice.client_name}</strong>'s payment method on file?
              </p>
              
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Invoice: {selectedInvoice.invoice_number}
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowChargeModal(false)}
                style={{ ...styles.button, ...styles.buttonSecondary }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleCharge}
                style={{ ...styles.button, ...styles.buttonPrimary }}
                disabled={processing}
              >
                {processing ? <Loader2 size={16} /> : <CreditCard size={16} />}
                Charge {formatCurrency(selectedInvoice.balance_due)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Reminder Modal */}
      {showReminderModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowReminderModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <Mail size={24} color="#f59e0b" />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Send Payment Reminder</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '20px' }}>
                Send reminder for <strong>{selectedInvoice.invoice_number}</strong>
              </p>
              
              <div>
                <label style={styles.label}>Reminder Type</label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  style={{ ...styles.input, cursor: 'pointer' }}
                >
                  <option value="friendly">Friendly Reminder</option>
                  <option value="15_day">15-Day Notice (Warning)</option>
                  <option value="25_day">25-Day Notice (Urgent)</option>
                  <option value="30_day">30-Day Notice (Final)</option>
                </select>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowReminderModal(false)}
                style={{ ...styles.button, ...styles.buttonSecondary }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                style={{ ...styles.button, background: '#f59e0b', color: 'white' }}
                disabled={processing}
              >
                {processing ? <Loader2 size={16} /> : <Send size={16} />}
                Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && selectedInvoice && (
        <div style={styles.modalOverlay} onClick={() => setShowVoidModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <XCircle size={24} color="#dc2626" />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Void Invoice</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '20px' }}>
                Void invoice <strong>{selectedInvoice.invoice_number}</strong>?
                <br />
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  This action cannot be undone.
                </span>
              </p>
              
              <div>
                <label style={styles.label}>Reason *</label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={styles.input}
                  placeholder="Enter reason for voiding..."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowVoidModal(false)}
                style={{ ...styles.button, ...styles.buttonSecondary }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                style={{ ...styles.button, ...styles.buttonDanger }}
                disabled={processing || !voidReason}
              >
                {processing ? <Loader2 size={16} /> : <XCircle size={16} />}
                Void Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
