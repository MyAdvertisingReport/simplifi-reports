import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  AlertTriangle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  XCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
};

export default function KillOrderForm() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const [effectiveDate, setEffectiveDate] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [managementApproved, setManagementApproved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders?status=signed,active&limit=100`, {
        headers: getAuthHeaders()
      });
      if (response.ok) setOrders(await response.json());
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}`, { headers: getAuthHeaders() });
      if (response.ok) {
        const order = await response.json();
        setSelectedOrder(order);
        setEffectiveDate(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return orders.slice(0, 10);
    return orders.filter(o => 
      o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.client_name?.toLowerCase().includes(orderSearch.toLowerCase())
    ).slice(0, 10);
  }, [orders, orderSearch]);

  // Calculate remaining value
  const cancellationSummary = useMemo(() => {
    if (!selectedOrder || !effectiveDate) return null;
    
    const startDate = new Date(selectedOrder.contract_start_date);
    const endDate = new Date(selectedOrder.contract_end_date);
    const cancelDate = new Date(effectiveDate);
    
    const totalMonths = selectedOrder.term_months;
    const monthlyAmount = parseFloat(selectedOrder.monthly_total) || 0;
    
    // Calculate months elapsed
    const monthsElapsed = Math.max(0, Math.ceil((cancelDate - startDate) / (30 * 24 * 60 * 60 * 1000)));
    const monthsRemaining = Math.max(0, totalMonths - monthsElapsed);
    
    const valueReceived = monthlyAmount * monthsElapsed;
    const valueRemaining = monthlyAmount * monthsRemaining;
    
    return {
      totalMonths,
      monthsElapsed,
      monthsRemaining,
      monthlyAmount,
      valueReceived,
      valueRemaining,
      contractTotal: parseFloat(selectedOrder.contract_total) || 0,
    };
  }, [selectedOrder, effectiveDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const handleSubmit = () => {
    if (!managementApproved) {
      alert('Please confirm you have discussed this cancellation with management');
      return;
    }
    if (!confirmCancel) {
      alert('Please confirm you understand this action cannot be undone');
      return;
    }
    if (!effectiveDate) {
      alert('Please select an effective date for the cancellation');
      return;
    }
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for the cancellation');
      return;
    }
    setShowSignatureModal(true);
  };

  const handleSignatureSubmit = async () => {
    if (!signature.trim()) {
      alert('Please type your signature');
      return;
    }

    setSaving(true);
    try {
      const killOrderData = {
        parent_order_id: selectedOrder.id,
        order_type: 'kill',
        effective_date: effectiveDate,
        cancellation_reason: cancellationReason,
        management_approval_confirmed: managementApproved,
        signature: signature.trim(),
      };

      const response = await fetch(`${API_BASE}/api/orders/kill`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(killOrderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create kill order');
      }

      const result = await response.json();
      setSavedOrder(result);
      setShowSuccess(true);
      setShowSignatureModal(false);
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to create kill order: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (showSuccess && savedOrder) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={{ ...styles.successIcon, background: '#fee2e2', color: '#dc2626' }}>
            <Icons.XCircle />
          </div>
          <h1 style={styles.successTitle}>Kill Order Submitted</h1>
          <p style={styles.successSubtitle}>
            Kill order <strong>{savedOrder.order_number}</strong> has been created and sent to the client for signature.
          </p>
          
          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}>
              <span>Original Order</span>
              <span>{selectedOrder.order_number}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Client</span>
              <span>{selectedOrder.client_name}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Effective Date</span>
              <span>{new Date(effectiveDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div style={styles.successActions}>
            <button onClick={() => navigate('/orders')} style={styles.primaryButton}>View All Orders</button>
            <button onClick={() => window.location.reload()} style={styles.secondaryButton}>Submit Another</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/orders/new/select')} style={styles.backButton}>
          <Icons.ArrowLeft /><span>Back</span>
        </button>
        <div>
          <h1 style={styles.title}>Create Kill Order</h1>
          <p style={styles.subtitle}>Cancel an existing contract with electronic signature</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div style={styles.warningBanner}>
        <Icons.AlertTriangle />
        <div>
          <strong>This action cannot be undone</strong>
          <p style={{ margin: '4px 0 0 0' }}>
            A kill order will permanently cancel the selected contract. The client will need to sign 
            the cancellation agreement before it takes effect.
          </p>
        </div>
      </div>

      <div style={styles.formGrid}>
        <div style={styles.mainColumn}>
          {/* Step 1: Select Order */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>1</span>Select Order to Cancel</h2>
            
            <div style={styles.searchWrapper}>
              <Icons.Search />
              <input
                type="text"
                placeholder="Search by order number or client name..."
                value={orderSearch}
                onChange={(e) => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
                onFocus={() => setShowOrderDropdown(true)}
                style={styles.searchInput}
              />
              {showOrderDropdown && filteredOrders.length > 0 && (
                <div style={styles.dropdown}>
                  {filteredOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        loadOrderDetails(order.id);
                        setOrderSearch(order.order_number);
                        setShowOrderDropdown(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <div>
                        <span style={styles.orderNumber}>{order.order_number}</span>
                        <span style={styles.clientName}>{order.client_name}</span>
                      </div>
                      <span style={styles.orderAmount}>{formatCurrency(order.monthly_total)}/mo</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedOrder && (
              <div style={styles.selectedOrderCard}>
                <div style={styles.selectedOrderHeader}>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#ef4444' }}>{selectedOrder.order_number}</strong>
                    <span style={{ color: '#6b7280', marginLeft: '8px' }}>{selectedOrder.client_name}</span>
                  </div>
                  <button onClick={() => { setSelectedOrder(null); setOrderSearch(''); }} style={styles.changeButton}>Change</button>
                </div>
                
                <div style={styles.orderDetailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Monthly Amount</span>
                    <span style={styles.detailValue}>{formatCurrency(selectedOrder.monthly_total)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Contract Term</span>
                    <span style={styles.detailValue}>{selectedOrder.term_months} months</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Start Date</span>
                    <span style={styles.detailValue}>{new Date(selectedOrder.contract_start_date).toLocaleDateString()}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>End Date</span>
                    <span style={styles.detailValue}>{new Date(selectedOrder.contract_end_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Products to be cancelled */}
                <div style={styles.productsSection}>
                  <h4 style={styles.productsTitle}>Products Being Cancelled</h4>
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} style={styles.productRow}>
                      <span>{item.product_name}</span>
                      <span>{formatCurrency(item.line_total)}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Cancellation Details */}
          {selectedOrder && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>2</span>Cancellation Details</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Effective Date of Cancellation *</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={styles.input}
                />
                <p style={styles.helpText}>The date when the contract will officially be terminated</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason for Cancellation *</label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a detailed reason for cancelling this contract..."
                  style={styles.textarea}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmations */}
          {selectedOrder && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>3</span>Confirmations</h2>
              
              {/* Management Approval */}
              <div style={styles.approvalBox}>
                <label style={styles.approvalLabel}>
                  <input
                    type="checkbox"
                    checked={managementApproved}
                    onChange={(e) => setManagementApproved(e.target.checked)}
                    style={styles.approvalCheckbox}
                  />
                  <div>
                    <strong>I have discussed this kill order with Management and received approval to proceed.</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Management approval is required for all contract cancellations.
                    </p>
                  </div>
                </label>
              </div>

              {/* Final Confirmation */}
              <div style={{ ...styles.approvalBox, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                <label style={{ ...styles.approvalLabel, color: '#991b1b' }}>
                  <input
                    type="checkbox"
                    checked={confirmCancel}
                    onChange={(e) => setConfirmCancel(e.target.checked)}
                    style={styles.approvalCheckbox}
                  />
                  <div>
                    <strong>I understand that this action cannot be undone.</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Once signed by the client, this contract will be permanently cancelled.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Cancellation Impact</h3>
            
            {cancellationSummary ? (
              <>
                <div style={styles.impactSection}>
                  <div style={styles.impactRow}>
                    <span>Contract Term</span>
                    <span>{cancellationSummary.totalMonths} months</span>
                  </div>
                  <div style={styles.impactRow}>
                    <span>Months Elapsed</span>
                    <span>{cancellationSummary.monthsElapsed} months</span>
                  </div>
                  <div style={styles.impactRow}>
                    <span>Months Remaining</span>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>{cancellationSummary.monthsRemaining} months</span>
                  </div>
                </div>

                <div style={styles.divider} />

                <div style={styles.impactSection}>
                  <div style={styles.impactRow}>
                    <span>Monthly Amount</span>
                    <span>{formatCurrency(cancellationSummary.monthlyAmount)}</span>
                  </div>
                  <div style={styles.impactRow}>
                    <span>Value Received</span>
                    <span style={{ color: '#10b981' }}>{formatCurrency(cancellationSummary.valueReceived)}</span>
                  </div>
                </div>

                <div style={styles.lostRevenueBox}>
                  <span>Lost Revenue</span>
                  <span style={styles.lostRevenueAmount}>
                    -{formatCurrency(cancellationSummary.valueRemaining)}
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!managementApproved || !confirmCancel || !cancellationReason.trim()}
                  style={{
                    ...styles.submitButton,
                    opacity: (!managementApproved || !confirmCancel || !cancellationReason.trim()) ? 0.5 : 1,
                  }}
                >
                  Submit Kill Order
                </button>
              </>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Select an order to see cancellation impact</p>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.signatureModal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Sign Kill Order</h3>
              <button onClick={() => setShowSignatureModal(false)} style={styles.modalClose}><Icons.X /></button>
            </div>
            <div style={styles.signatureBody}>
              <div style={styles.finalWarning}>
                <Icons.AlertTriangle />
                <span>This will cancel order <strong>{selectedOrder.order_number}</strong> for {selectedOrder.client_name}</span>
              </div>
              
              <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                By signing below, you confirm that you have management approval and authorize 
                this kill order to be sent to the client for signature.
              </p>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Type your full name as signature *</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="John Smith"
                  style={{ ...styles.input, fontFamily: 'cursive', fontSize: '20px' }}
                />
              </div>
              
              <div style={styles.signatureActions}>
                <button onClick={() => setShowSignatureModal(false)} style={styles.secondaryButton}>Cancel</button>
                <button 
                  onClick={handleSignatureSubmit} 
                  disabled={saving} 
                  style={{ ...styles.primaryButton, background: '#ef4444' }}
                >
                  {saving ? 'Submitting...' : 'Submit Kill Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '24px' },
  header: { marginBottom: '24px' },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 0', marginBottom: '16px', background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  warningBanner: { display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '24px', color: '#991b1b' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' },
  mainColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
  section: { background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0' },
  stepNumber: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '14px', fontWeight: '600' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '300px', overflowY: 'auto' },
  dropdownItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'none', cursor: 'pointer', textAlign: 'left' },
  orderNumber: { fontWeight: '600', color: '#1e293b', marginRight: '8px' },
  clientName: { color: '#6b7280', fontSize: '14px' },
  orderAmount: { color: '#10b981', fontWeight: '500' },
  selectedOrderCard: { marginTop: '16px', padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' },
  selectedOrderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  changeButton: { padding: '6px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  orderDetailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  detailLabel: { fontSize: '12px', color: '#6b7280' },
  detailValue: { fontSize: '14px', fontWeight: '500', color: '#1e293b' },
  productsSection: { borderTop: '1px solid #fecaca', paddingTop: '16px' },
  productsTitle: { fontSize: '13px', fontWeight: '600', color: '#991b1b', margin: '0 0 12px 0' },
  productRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #fee2e2' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', resize: 'vertical' },
  helpText: { fontSize: '12px', color: '#6b7280', marginTop: '4px' },
  approvalBox: { marginBottom: '16px', padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' },
  approvalLabel: { display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '14px', color: '#92400e' },
  approvalCheckbox: { marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' },
  sidebar: { position: 'sticky', top: '24px' },
  summaryCard: { background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  summaryTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0' },
  impactSection: { marginBottom: '12px' },
  impactRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b' },
  divider: { height: '1px', background: '#e2e8f0', margin: '12px 0' },
  lostRevenueBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px' },
  lostRevenueAmount: { fontSize: '20px', fontWeight: '700', color: '#ef4444' },
  submitButton: { width: '100%', padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  signatureModal: { background: 'white', borderRadius: '16px', width: '500px', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: '18px', fontWeight: '600', margin: 0 },
  modalClose: { padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  signatureBody: { padding: '24px' },
  finalWarning: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', fontSize: '14px' },
  signatureActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  primaryButton: { padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  secondaryButton: { padding: '12px 24px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  successContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' },
  successCard: { background: 'white', borderRadius: '16px', padding: '48px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  successIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 24px' },
  successTitle: { fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' },
  successSubtitle: { fontSize: '16px', color: '#64748b', margin: '0 0 24px 0' },
  summaryBox: { background: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b' },
  successActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
