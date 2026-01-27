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
  AlertTriangle, Package, User, Phone, Banknote, Zap, X
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
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [paymentReference, setPaymentReference] = useState('');

  // Generate Invoices Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth());
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [billableOrders, setBillableOrders] = useState([]);
  const [skippedOrders, setSkippedOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [loadingBillable, setLoadingBillable] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
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
    // Check if this is an auto-bill client (card or ACH)
    const isAutoBill = invoice.billing_preference === 'card' || invoice.billing_preference === 'ach';
    const billingMethod = invoice.billing_preference === 'card' ? 'credit card' : invoice.billing_preference === 'ach' ? 'ACH' : 'invoice';
    
    const message = isAutoBill
      ? `📧 Ready to send invoice to ${invoice.client_name}?\n\n👤 ${invoice.client_name}\n💰 Amount: ${formatCurrency(invoice.total)}\n📅 Due: ${formatDate(invoice.due_date)}\n💳 Payment: Auto-bill via ${billingMethod}\n\nWhen you click 'OK' the client will be automatically billed and when payment is confirmed they will receive an email with a PAID receipt.`
      : `📧 Ready to send invoice to ${invoice.client_name}?\n\n👤 ${invoice.client_name}\n💰 Amount: ${formatCurrency(invoice.total)}\n📅 Due: ${formatDate(invoice.due_date)}\n\nWhen you click 'OK' the client will receive an email with a link to pay the invoice via Stripe.`;
    
    if (!confirm(message)) {
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
      
      // Custom success message based on billing type
      const isAutoBill = invoice.billing_preference === 'card' || invoice.billing_preference === 'ach';
      const successMessage = isAutoBill 
        ? 'The system is now processing the invoice and will notify the client after it is paid!'
        : 'The invoice has been sent to the client for payment!';
      
      alert(`✅ ${successMessage}`);
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

  // ========== Generate Invoices Functions ==========
  const openGenerateModal = () => {
    setShowGenerateModal(true);
    setGenerateResult(null);
    loadBillableOrders(generateMonth, generateYear);
  };

  const loadBillableOrders = async (month, year) => {
    setLoadingBillable(true);
    setBillableOrders([]);
    setSkippedOrders([]);
    setSelectedOrders(new Set());
    
    try {
      const res = await fetch(
        `${API_BASE}/api/billing/billable-orders?billing_month=${month}&billing_year=${year}`,
        { headers: getAuthHeaders() }
      );
      
      if (res.ok) {
        const data = await res.json();
        setBillableOrders(data.billable_orders || []);
        setSkippedOrders(data.skipped_orders || []);
        // Select all by default
        setSelectedOrders(new Set(data.billable_orders.map(o => o.id)));
      }
    } catch (err) {
      console.error('Error loading billable orders:', err);
    } finally {
      setLoadingBillable(false);
    }
  };

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-').map(Number);
    setGenerateMonth(month);
    setGenerateYear(year);
    loadBillableOrders(month, year);
  };

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === billableOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(billableOrders.map(o => o.id)));
    }
  };

  const handleGenerateInvoices = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order');
      return;
    }

    const selectedCount = selectedOrders.size;
    const selectedTotal = billableOrders
      .filter(o => selectedOrders.has(o.id))
      .reduce((sum, o) => sum + o.total, 0);

    if (!confirm(`Generate ${selectedCount} invoice${selectedCount > 1 ? 's' : ''} totaling ${formatCurrency(selectedTotal)}?`)) {
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/generate-monthly`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          billing_month: generateMonth,
          billing_year: generateYear,
          order_ids: Array.from(selectedOrders)
        })
      });

      if (res.ok) {
        const result = await res.json();
        setGenerateResult(result);
        loadData(); // Refresh main invoice list
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Error generating invoices:', err);
      alert('Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -2; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return options;
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
    invoiceHeader: { display: 'grid', gridTemplateColumns: '1.5fr 100px 110px 140px 100px 200px', alignItems: 'center', padding: '16px 20px', gap: '12px' },
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={openGenerateModal} style={{ ...styles.button, ...styles.buttonSuccess }}>
            <Zap size={18} /> Generate Invoices
          </button>
          <button onClick={() => navigate('/billing/new')} style={{ ...styles.button, ...styles.buttonPrimary }}>
            <Plus size={18} /> New Invoice
          </button>
        </div>
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
          <div style={{ ...styles.tab, ...(activeTab === 'dashboard' ? styles.tabActive : {}) }} onClick={() => setActiveTab('dashboard')}>
            Financial Dashboard
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
              <div>Client</div>
              <div>Amount</div>
              <div>Due Date</div>
              <div>Sales Associate</div>
              <div>Status</div>
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
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{invoice.client_name}</div>
                      </div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{formatCurrency(invoice.total)}</div>
                      <div>{formatDate(invoice.due_date)}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{invoice.sales_rep_name || '-'}</div>
                      <div>
                        <StatusBadge status={isOverdue ? 'overdue' : invoice.status} />
                        {isOverdue && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>{invoice.days_overdue}d overdue</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        {/* Draft: Edit & Approve & Send */}
                        {invoice.status === 'draft' && (
                          <>
                            <button
                              onClick={() => navigate(`/billing/edit/${invoice.id}`)}
                              style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 12px', fontSize: '13px' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleApproveAndSend(invoice)}
                              style={{ ...styles.button, ...styles.buttonSuccess, padding: '6px 12px', fontSize: '13px' }}
                              disabled={isProcessing}
                            >
                              {isProcessing ? <Loader2 size={14} /> : <><Send size={14} /> Approve & Send</>}
                            </button>
                          </>
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
                              {/* Client Info with Contact */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailTitle}><Building2 size={14} style={{ display: 'inline', marginRight: '6px' }} />Client</div>
                                <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '15px' }}>{details.client_name}</div>
                                {details.contact_name && details.contact_name.trim() !== '' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                                    <User size={14} /> {details.contact_name}
                                  </div>
                                )}
                                {details.contact_email && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                                    <Mail size={14} /> {details.contact_email}
                                  </div>
                                )}
                                {details.contact_phone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                                    <Phone size={14} /> {details.contact_phone}
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

                              {/* Payment Info with last 4 */}
                              <div style={styles.detailSection}>
                                <div style={styles.detailTitle}><CreditCard size={14} style={{ display: 'inline', marginRight: '6px' }} />Payment</div>
                                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                                  {(() => {
                                    const pref = details.billing_preference || details.order_billing_preference || 'invoice';
                                    const paymentType = details.payment_type;
                                    const cardLast4 = details.card_last4;
                                    const bankLast4 = details.bank_last4;
                                    const bankName = details.bank_name;
                                    
                                    // Determine primary method display
                                    let primaryMethod = 'Invoice';
                                    let backupMethod = null;
                                    
                                    if (pref === 'card') {
                                      primaryMethod = cardLast4 ? `Credit Card ••••${cardLast4}` : 'Credit Card';
                                    } else if (pref === 'ach') {
                                      primaryMethod = bankLast4 ? `${bankName || 'Bank'} ••••${bankLast4}` : 'ACH Bank Transfer';
                                    } else {
                                      // Invoice - show backup
                                      primaryMethod = 'Invoice';
                                      if (paymentType === 'card' && cardLast4) {
                                        backupMethod = `Card ••••${cardLast4}`;
                                      } else if ((paymentType === 'ach' || paymentType === 'us_bank_account') && bankLast4) {
                                        backupMethod = `${bankName || 'Bank'} ••••${bankLast4}`;
                                      } else if (details.payment_method_id || details.order_payment_method_id) {
                                        backupMethod = 'Payment on file';
                                      }
                                    }
                                    
                                    return (
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#64748b' }}>Method:</span>
                                          <span style={{ fontWeight: '500' }}>{primaryMethod}</span>
                                        </div>
                                        {backupMethod && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Backup:</span>
                                            <span style={{ fontWeight: '500' }}>{backupMethod}</span>
                                          </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#64748b' }}>Auto-charge:</span>
                                          <span style={{ fontWeight: '500', color: '#f59e0b' }}>Day 30 if unpaid</span>
                                        </div>
                                      </>
                                    );
                                  })()}
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

        {/* Financial Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: '20px' }}>
            {/* Key Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
              {(() => {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const thisMonthInvoices = invoices.filter(inv => {
                  const d = new Date(inv.created_at);
                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const thisMonthTotal = thisMonthInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
                const paidInvoices = invoices.filter(inv => inv.status === 'paid');
                const paidTotal = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
                const collectionRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 0;
                const avgInvoice = invoices.length > 0 ? invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0) / invoices.length : 0;
                
                return (
                  <>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>This Month's Billing</div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(thisMonthTotal)}</div>
                      <div style={{ fontSize: '13px', marginTop: '8px', color: '#059669' }}>{thisMonthInvoices.length} invoices created</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Total Collected</div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669' }}>{formatCurrency(paidTotal)}</div>
                      <div style={{ fontSize: '13px', marginTop: '8px', color: '#64748b' }}>{paidInvoices.length} paid invoices</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Collection Rate</div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: collectionRate >= 80 ? '#059669' : collectionRate >= 60 ? '#f59e0b' : '#dc2626' }}>{collectionRate}%</div>
                      <div style={{ fontSize: '13px', marginTop: '8px', color: '#64748b' }}>{paidInvoices.length} of {invoices.length} invoices</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Avg Invoice Value</div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(avgInvoice)}</div>
                      <div style={{ fontSize: '13px', marginTop: '8px', color: '#64748b' }}>Across {invoices.length} invoices</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Aging Buckets */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> Accounts Receivable Aging
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                {(() => {
                  const sentInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'partial');
                  const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, 'over90': 0 };
                  sentInvoices.forEach(inv => {
                    const days = parseInt(inv.days_overdue) || 0;
                    const balance = parseFloat(inv.balance_due || inv.total) || 0;
                    if (days <= 0) buckets.current += balance;
                    else if (days <= 30) buckets['1-30'] += balance;
                    else if (days <= 60) buckets['31-60'] += balance;
                    else if (days <= 90) buckets['61-90'] += balance;
                    else buckets['over90'] += balance;
                  });
                  return [
                    { label: 'Current', value: buckets.current, color: '#059669', bg: '#dcfce7' },
                    { label: '1-30 Days', value: buckets['1-30'], color: '#f59e0b', bg: '#fef3c7' },
                    { label: '31-60 Days', value: buckets['31-60'], color: '#ea580c', bg: '#ffedd5' },
                    { label: '61-90 Days', value: buckets['61-90'], color: '#dc2626', bg: '#fee2e2' },
                    { label: 'Over 90', value: buckets['over90'], color: '#7f1d1d', bg: '#fecaca' },
                  ].map(bucket => (
                    <div key={bucket.label} style={{ background: bucket.bg, padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>{bucket.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: bucket.color }}>{formatCurrency(bucket.value)}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Top Clients */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Top Clients by Revenue</h3>
                {(() => {
                  const clientTotals = {};
                  invoices.forEach(inv => {
                    if (!clientTotals[inv.client_name]) clientTotals[inv.client_name] = 0;
                    clientTotals[inv.client_name] += parseFloat(inv.total || 0);
                  });
                  const sorted = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
                  if (sorted.length === 0) return <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No data yet</div>;
                  return sorted.map(([name, total], idx) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < sorted.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eff6ff', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>{idx + 1}</span>
                        <span style={{ fontWeight: '500' }}>{name}</span>
                      </div>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{formatCurrency(total)}</span>
                    </div>
                  ));
                })()}
              </div>

              {/* Invoice Status Breakdown */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Invoice Status Breakdown</h3>
                {(() => {
                  const statusCounts = {};
                  const statusTotals = {};
                  invoices.forEach(inv => {
                    const s = inv.status || 'draft';
                    statusCounts[s] = (statusCounts[s] || 0) + 1;
                    statusTotals[s] = (statusTotals[s] || 0) + parseFloat(inv.total || 0);
                  });
                  const statusConfig = {
                    paid: { label: 'Paid', color: '#059669' },
                    sent: { label: 'Sent', color: '#f59e0b' },
                    draft: { label: 'Draft', color: '#64748b' },
                    approved: { label: 'Approved', color: '#3b82f6' },
                    void: { label: 'Void', color: '#94a3b8' },
                  };
                  return Object.entries(statusConfig).map(([status, config]) => (
                    statusCounts[status] > 0 && (
                      <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: config.color }}></span>
                          <span style={{ color: '#374151' }}>{config.label}</span>
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>({statusCounts[status] || 0})</span>
                        </div>
                        <span style={{ fontWeight: '600', color: config.color }}>{formatCurrency(statusTotals[status])}</span>
                      </div>
                    )
                  ));
                })()}
              </div>
            </div>
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

      {/* Generate Invoices Modal */}
      {showGenerateModal && (
        <div style={styles.modal} onClick={() => !generating && setShowGenerateModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '900px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Generate Monthly Invoices</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
                  Create invoices for active orders
                </p>
              </div>
              <button 
                onClick={() => !generating && setShowGenerateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Month Selector */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ fontWeight: '500', color: '#374151' }}>Billing Period:</label>
                <select
                  value={`${generateYear}-${generateMonth}`}
                  onChange={handleMonthChange}
                  style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minWidth: '200px' }}
                  disabled={generating}
                >
                  {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Results after generation */}
              {generateResult && (
                <div style={{ 
                  background: '#dcfce7', 
                  border: '1px solid #86efac', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  marginBottom: '20px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle size={20} color="#166534" />
                    <span style={{ fontWeight: '600', color: '#166534' }}>
                      {generateResult.summary.created_count} invoice{generateResult.summary.created_count !== 1 ? 's' : ''} created!
                    </span>
                  </div>
                  <div style={{ color: '#166534', fontSize: '14px' }}>
                    Total: {formatCurrency(generateResult.summary.total_amount)}
                  </div>
                  {generateResult.errors?.length > 0 && (
                    <div style={{ marginTop: '12px', color: '#92400e', fontSize: '13px' }}>
                      {generateResult.errors.length} order(s) skipped due to errors
                    </div>
                  )}
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '12px' }}
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Loading state */}
              {loadingBillable && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 size={32} style={{ color: '#1e3a8a' }} />
                  <p style={{ color: '#64748b', marginTop: '12px' }}>Loading billable orders...</p>
                </div>
              )}

              {/* Orders list */}
              {!loadingBillable && !generateResult && (
                <>
                  {billableOrders.length === 0 && skippedOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <FileText size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                      <p>No active orders found for this billing period</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '16px', 
                        marginBottom: '20px' 
                      }}>
                        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>{billableOrders.length}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>Orders to Invoice</div>
                        </div>
                        <div style={{ background: '#dcfce7', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>
                            {formatCurrency(billableOrders.filter(o => selectedOrders.has(o.id)).reduce((sum, o) => sum + o.total, 0))}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>Selected Total</div>
                        </div>
                        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>{skippedOrders.length}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>Already Invoiced</div>
                        </div>
                      </div>

                      {/* Billable Orders Table */}
                      {billableOrders.length > 0 && (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '40px 2fr 1fr 1fr 100px', 
                            gap: '12px', 
                            padding: '12px 16px', 
                            background: '#f8fafc', 
                            fontWeight: '600', 
                            fontSize: '12px', 
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            <div>
                              <input
                                type="checkbox"
                                checked={selectedOrders.size === billableOrders.length}
                                onChange={toggleSelectAll}
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                            <div>Client / Order</div>
                            <div>Billing Period</div>
                            <div>Due Date</div>
                            <div style={{ textAlign: 'right' }}>Amount</div>
                          </div>
                          
                          {billableOrders.map(order => (
                            <div 
                              key={order.id}
                              style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '40px 2fr 1fr 1fr 100px', 
                                gap: '12px', 
                                padding: '12px 16px', 
                                borderTop: '1px solid #e2e8f0',
                                background: selectedOrders.has(order.id) ? '#f0fdf4' : 'white',
                                cursor: 'pointer'
                              }}
                              onClick={() => toggleOrderSelection(order.id)}
                            >
                              <div onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.has(order.id)}
                                  onChange={() => toggleOrderSelection(order.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{order.client_name}</div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                  {order.order_number}
                                  {order.is_mixed && (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      background: '#fef3c7', 
                                      color: '#92400e', 
                                      padding: '2px 6px', 
                                      borderRadius: '4px', 
                                      fontSize: '11px' 
                                    }}>
                                      Mixed Products
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', color: '#64748b' }}>
                                {order.billing_period?.start && formatDate(order.billing_period.start)} - {order.billing_period?.end && formatDate(order.billing_period.end)}
                              </div>
                              <div style={{ fontSize: '13px' }}>
                                {order.due_date && formatDate(order.due_date)}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{formatCurrency(order.total)}</div>
                                {order.processing_fee > 0 && (
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    +{formatCurrency(order.processing_fee)} fee
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skipped Orders */}
                      {skippedOrders.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#64748b', 
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <AlertCircle size={16} />
                            Already Invoiced ({skippedOrders.length})
                          </div>
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                            {skippedOrders.slice(0, 5).map(o => o.client_name).join(', ')}
                            {skippedOrders.length > 5 && ` and ${skippedOrders.length - 5} more...`}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!generateResult && billableOrders.length > 0 && (
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoices}
                  style={{ ...styles.button, ...styles.buttonSuccess }}
                  disabled={generating || selectedOrders.size === 0}
                >
                  {generating ? (
                    <><Loader2 size={16} /> Generating...</>
                  ) : (
                    <><Zap size={16} /> Generate {selectedOrders.size} Invoice{selectedOrders.size !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
