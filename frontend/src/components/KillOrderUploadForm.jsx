import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
};

const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  File: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  XCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  AlertTriangle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
};

export default function KillOrderUploadForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [managementApproved, setManagementApproved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders?status=signed,active&limit=100`, { headers: getAuthHeaders() });
      if (response.ok) setOrders(await response.json());
    } catch (error) {
      console.error('Error:', error);
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
      console.error('Error:', error);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return orders.slice(0, 10);
    return orders.filter(o => 
      o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.client_name?.toLowerCase().includes(orderSearch.toLowerCase())
    ).slice(0, 10);
  }, [orders, orderSearch]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      setUploadedFile(file);
      setUploadError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setUploadError('');
    } else {
      setUploadError('Please upload a PDF file');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const handleSubmit = async () => {
    if (!selectedOrder) { alert('Please select an order'); return; }
    if (!uploadedFile) { alert('Please upload the signed cancellation PDF'); return; }
    if (!effectiveDate) { alert('Please select an effective date'); return; }
    if (!cancellationReason.trim()) { alert('Please provide a cancellation reason'); return; }
    if (!managementApproved) { alert('Please confirm management approval'); return; }
    if (!confirmCancel) { alert('Please confirm you understand this cannot be undone'); return; }

    setSaving(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('client_id', selectedOrder.client_id);
      formData.append('document_type', 'kill_order');

      const uploadResponse = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload document');
      const uploadedDoc = await uploadResponse.json();

      // Create kill order
      const orderData = {
        parent_order_id: selectedOrder.id,
        uploaded_document_id: uploadedDoc.id,
        effective_date: effectiveDate,
        cancellation_reason: cancellationReason,
        management_approval_confirmed: managementApproved,
      };

      const response = await fetch(`${API_BASE}/api/orders/kill-upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create kill order');
      }

      const result = await response.json();
      setSavedOrder(result);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (showSuccess && savedOrder) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={{ ...styles.successIcon, background: '#fee2e2', color: '#dc2626' }}><Icons.XCircle /></div>
          <h1 style={styles.successTitle}>Contract Cancelled</h1>
          <p style={styles.successSubtitle}>
            Kill order <strong>{savedOrder.order_number}</strong> has been processed.
          </p>
          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}><span>Original Order</span><span>{selectedOrder.order_number}</span></div>
            <div style={styles.summaryRow}><span>Client</span><span>{selectedOrder.client_name}</span></div>
            <div style={styles.summaryRow}><span>Effective Date</span><span>{new Date(effectiveDate).toLocaleDateString()}</span></div>
            <div style={styles.summaryRow}><span>Status</span><span style={{ color: '#ef4444', fontWeight: '600' }}>Cancelled</span></div>
          </div>
          <div style={styles.successActions}>
            <button onClick={() => navigate('/orders')} style={{ ...styles.primaryButton, background: '#ef4444' }}>View All Orders</button>
            <button onClick={() => window.location.reload()} style={styles.secondaryButton}>Process Another</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/orders/new/select')} style={styles.backButton}><Icons.ArrowLeft /><span>Back</span></button>
        <div>
          <h1 style={styles.title}>Upload Kill Order</h1>
          <p style={styles.subtitle}>Upload a pre-signed cancellation document</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div style={styles.warningBanner}>
        <Icons.AlertTriangle />
        <div>
          <strong>This action cannot be undone</strong>
          <p style={{ margin: '4px 0 0 0' }}>Uploading a kill order will permanently cancel the selected contract.</p>
        </div>
      </div>

      <div style={styles.formGrid}>
        <div style={styles.mainColumn}>
          {/* Step 1: Select Order */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>1</span>Select Order to Cancel</h2>
            <div style={styles.searchWrapper}>
              <Icons.Search />
              <input type="text" placeholder="Search orders..." value={orderSearch}
                onChange={(e) => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
                onFocus={() => setShowOrderDropdown(true)} style={styles.searchInput} />
              {showOrderDropdown && filteredOrders.length > 0 && (
                <div style={styles.dropdown}>
                  {filteredOrders.map((order) => (
                    <button key={order.id} onClick={() => { loadOrderDetails(order.id); setOrderSearch(order.order_number); setShowOrderDropdown(false); }} style={styles.dropdownItem}>
                      <div><span style={styles.orderNumber}>{order.order_number}</span><span style={styles.clientName}>{order.client_name}</span></div>
                      <span style={styles.orderAmount}>{formatCurrency(order.monthly_total)}/mo</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedOrder && (
              <div style={styles.selectedCard}>
                <div style={styles.selectedHeader}>
                  <div><strong style={{ color: '#ef4444' }}>{selectedOrder.order_number}</strong> — {selectedOrder.client_name}</div>
                  <button onClick={() => { setSelectedOrder(null); setOrderSearch(''); }} style={styles.changeButton}>Change</button>
                </div>
                <div style={styles.orderDetails}>
                  <span>Monthly: <strong>{formatCurrency(selectedOrder.monthly_total)}</strong></span>
                  <span>Term: <strong>{selectedOrder.term_months} months</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Upload PDF */}
          {selectedOrder && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>2</span>Upload Signed Cancellation</h2>
              <div style={{ ...styles.dropZone, borderColor: uploadedFile ? '#10b981' : uploadError ? '#ef4444' : '#d1d5db', backgroundColor: uploadedFile ? '#ecfdf5' : '#f9fafb' }}
                onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
                {uploadedFile ? (
                  <div style={styles.uploadedFile}>
                    <Icons.File />
                    <div style={styles.fileDetails}><span style={styles.fileName}>{uploadedFile.name}</span><span style={styles.fileSize}>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span></div>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }} style={styles.removeFile}><Icons.X /></button>
                  </div>
                ) : (
                  <><Icons.Upload /><p style={styles.dropText}>Drag & drop signed cancellation PDF here</p><p style={styles.dropSubtext}>or click to browse</p></>
                )}
              </div>
              {uploadError && <p style={styles.errorText}>{uploadError}</p>}
            </div>
          )}

          {/* Step 3: Cancellation Details */}
          {selectedOrder && uploadedFile && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>3</span>Cancellation Details</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Effective Date *</label>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Reason for Cancellation *</label>
                <textarea value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} placeholder="Describe the reason for cancellation..." style={styles.textarea} rows={4} />
              </div>

              {/* Approvals */}
              <div style={styles.approvalBox}>
                <label style={styles.approvalLabel}>
                  <input type="checkbox" checked={managementApproved} onChange={(e) => setManagementApproved(e.target.checked)} style={styles.checkbox} />
                  <div><strong>I have discussed this cancellation with Management and received approval.</strong></div>
                </label>
              </div>
              <div style={{ ...styles.approvalBox, background: '#fef2f2', borderColor: '#fecaca', marginTop: '12px' }}>
                <label style={{ ...styles.approvalLabel, color: '#991b1b' }}>
                  <input type="checkbox" checked={confirmCancel} onChange={(e) => setConfirmCancel(e.target.checked)} style={styles.checkbox} />
                  <div><strong>I understand this action cannot be undone.</strong></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Cancellation Summary</h3>
            {selectedOrder ? (
              <>
                <div style={styles.summarySection}>
                  <div style={styles.summaryLine}><span>Order</span><span>{selectedOrder.order_number}</span></div>
                  <div style={styles.summaryLine}><span>Client</span><span>{selectedOrder.client_name}</span></div>
                  <div style={styles.summaryLine}><span>Monthly Value</span><span>{formatCurrency(selectedOrder.monthly_total)}</span></div>
                </div>
                <div style={styles.lostBox}>
                  <span>Contract Being Cancelled</span>
                  <span style={styles.lostAmount}>-{formatCurrency(selectedOrder.contract_total)}</span>
                </div>
                <button onClick={handleSubmit} disabled={saving || !uploadedFile || !managementApproved || !confirmCancel || !cancellationReason.trim()}
                  style={{ ...styles.submitButton, opacity: (saving || !uploadedFile || !managementApproved || !confirmCancel || !cancellationReason.trim()) ? 0.5 : 1 }}>
                  {saving ? 'Processing...' : 'Process Kill Order'}
                </button>
              </>
            ) : <p style={{ color: '#6b7280' }}>Select an order to continue</p>}
          </div>
        </div>
      </div>
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
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' },
  mainColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
  section: { background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0' },
  stepNumber: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '14px', fontWeight: '600' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '300px', overflowY: 'auto' },
  dropdownItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'none', cursor: 'pointer', textAlign: 'left' },
  orderNumber: { fontWeight: '600', color: '#1e293b', marginRight: '8px' },
  clientName: { color: '#6b7280', fontSize: '14px' },
  orderAmount: { color: '#10b981', fontWeight: '500' },
  selectedCard: { marginTop: '16px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' },
  selectedHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  changeButton: { padding: '6px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  orderDetails: { display: 'flex', gap: '24px', fontSize: '14px', color: '#6b7280' },
  dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', border: '2px dashed', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' },
  dropText: { fontSize: '16px', fontWeight: '500', color: '#374151', margin: '12px 0 4px 0' },
  dropSubtext: { fontSize: '14px', color: '#6b7280', margin: 0 },
  uploadedFile: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' },
  fileDetails: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  fileName: { fontSize: '14px', fontWeight: '500', color: '#1e293b' },
  fileSize: { fontSize: '12px', color: '#6b7280' },
  removeFile: { padding: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' },
  errorText: { color: '#ef4444', fontSize: '13px', marginTop: '8px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', resize: 'vertical' },
  approvalBox: { padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' },
  approvalLabel: { display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '14px', color: '#92400e' },
  checkbox: { marginTop: '4px', width: '18px', height: '18px' },
  sidebar: { position: 'sticky', top: '24px' },
  summaryCard: { background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  summaryTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0' },
  summarySection: { marginBottom: '16px' },
  summaryLine: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b' },
  lostBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px' },
  lostAmount: { color: '#ef4444', fontWeight: '700', fontSize: '18px' },
  submitButton: { width: '100%', padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  successContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' },
  successCard: { background: 'white', borderRadius: '16px', padding: '48px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  successIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 24px' },
  successTitle: { fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' },
  successSubtitle: { fontSize: '16px', color: '#64748b', margin: '0 0 24px 0' },
  summaryBox: { background: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b' },
  successActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  primaryButton: { padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  secondaryButton: { padding: '12px 24px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

const sheet = document.createElement('style');
sheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(sheet);
