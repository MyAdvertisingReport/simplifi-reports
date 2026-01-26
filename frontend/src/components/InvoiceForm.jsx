/**
 * InvoiceForm.jsx
 * Create new invoice or generate from existing order
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FileText, ArrowLeft, Plus, Trash2, DollarSign, Calendar,
  Building2, Search, CheckCircle, AlertCircle, X, User
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const Loader2 = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('order');
  
  const [mode, setMode] = useState(orderIdParam ? 'from-order' : 'manual');
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(true);
  
  // New Client Modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    business_name: '',
    contact_first_name: '',
    contact_last_name: '',
    contact_email: '',
    contact_phone: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);
  
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [billingPreference, setBillingPreference] = useState('invoice');
  const [addProcessingFee, setAddProcessingFee] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '' }]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadClients();
    if (orderIdParam) loadOrderDetails(orderIdParam);
  }, [orderIdParam]);

  useEffect(() => {
    if (selectedClient) loadClientOrders(selectedClient.id);
  }, [selectedClient]);

  useEffect(() => {
    setAddProcessingFee(billingPreference === 'card');
  }, [billingPreference]);

  const loadClients = async () => {
    setClientsLoading(true);
    try {
      // Use the same endpoint as OrderForm
      const res = await fetch(`${API_BASE}/api/orders/clients?limit=100`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded clients:', data);
        setClients(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load clients:', res.status);
        setClients([]);
      }
    } catch (err) { 
      console.error('Error loading clients:', err); 
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  const loadClientOrders = async (clientId) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders?client_id=${clientId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders((data.orders || data || []).filter(o => ['signed', 'active'].includes(o.status)));
      }
    } catch (err) { console.error(err); }
  };

  // Handle order selection - fetch full order details
  const handleSelectOrder = async (order) => {
    try {
      // Fetch full order details including items
      const res = await fetch(`${API_BASE}/api/orders/${order.id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load order details');
      const fullOrder = await res.json();
      
      setSelectedOrder(fullOrder);
      setBillingPreference(fullOrder.billing_preference || 'invoice');
      
      // Populate line items from order
      if (fullOrder.items?.length) {
        setItems(fullOrder.items.map(item => ({
          description: item.product_name || 'Advertising Service',
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.adjusted_price || item.unit_price || 0),
          order_item_id: item.id,
          product_id: item.product_id
        })));
      }
      
      // Set billing period to current month by default
      const now = new Date();
      setBillingPeriodStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setBillingPeriodEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
      
    } catch (err) { 
      console.error('Error loading order details:', err);
      setError(err.message); 
    }
  };

  const loadOrderDetails = async (orderId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load order');
      const order = await res.json();
      setSelectedOrder(order);
      setSelectedClient({ id: order.client_id, business_name: order.client_name });
      setBillingPreference(order.billing_preference || 'invoice');
      if (order.items?.length) {
        setItems(order.items.map(item => ({
          description: item.product_name || 'Advertising Service',
          quantity: item.quantity || 1,
          unit_price: item.adjusted_price || item.unit_price || 0,
          order_item_id: item.id,
          product_id: item.product_id
        })));
      }
      const now = new Date();
      setBillingPeriodStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setBillingPeriodEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCreateClient = async () => {
    if (!newClientData.business_name.trim()) {
      setError('Business name is required');
      return;
    }
    
    setCreatingClient(true);
    setError(null);
    
    try {
      // Use the same endpoint as OrderForm
      const res = await fetch(`${API_BASE}/api/orders/clients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newClientData)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create client');
      }
      
      const client = await res.json();
      setClients([client, ...clients]);
      setSelectedClient(client);
      setShowNewClientModal(false);
      setNewClientData({
        business_name: '',
        contact_first_name: '',
        contact_last_name: '',
        contact_email: '',
        contact_phone: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.unit_price || 0) * (parseInt(i.quantity) || 1)), 0);
  const processingFee = addProcessingFee ? Math.round(subtotal * 0.035 * 100) / 100 : 0;
  const total = subtotal + processingFee;

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: '' }]);
  const removeItem = (i) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => { const u = [...items]; u[i][field] = value; setItems(u); };

  const handleGenerateFromOrder = async () => {
    if (!selectedOrder) return setError('Please select an order');
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/billing/generate-from-order/${selectedOrder.id}`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ billing_period_start: billingPeriodStart, billing_period_end: billingPeriodEnd })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const inv = await res.json();
      setSuccess(`Invoice ${inv.invoice_number} created!`);
      setTimeout(() => navigate('/billing'), 1500);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) return setError('Please select a client');
    if (items.every(i => !i.description || !i.unit_price)) return setError('Add at least one line item');
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          client_id: selectedClient.id, order_id: selectedOrder?.id,
          billing_period_start: billingPeriodStart || null, billing_period_end: billingPeriodEnd || null,
          due_date: dueDate, billing_preference: billingPreference, add_processing_fee: addProcessingFee, notes,
          items: items.filter(i => i.description && i.unit_price).map(i => ({ ...i, unit_price: parseFloat(i.unit_price) }))
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const inv = await res.json();
      setSuccess(`Invoice ${inv.invoice_number} created!`);
      setTimeout(() => navigate('/billing'), 1500);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const filteredClients = clients.filter(c => 
    c.business_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const styles = {
    container: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
    backButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 0', marginBottom: '16px', background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: 0 },
    card: { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' },
    sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', cursor: 'pointer', background: 'white' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
    itemRow: { display: 'grid', gridTemplateColumns: '1fr 80px 100px 40px', gap: '12px', alignItems: 'end', marginBottom: '12px' },
    button: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: 'none' },
    buttonPrimary: { background: '#1e3a8a', color: 'white' },
    buttonSecondary: { background: '#f1f5f9', color: '#374151' },
    buttonSuccess: { background: '#059669', color: 'white' },
    alert: { padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' },
    alertError: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' },
    alertSuccess: { background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534' },
    clientCard: { padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.15s' },
    clientCardSelected: { borderColor: '#1e3a8a', background: '#eff6ff' },
    modeToggle: { display: 'flex', gap: '8px', marginBottom: '20px' },
    modeButton: { flex: 1, padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', textAlign: 'center' },
    modeButtonActive: { borderColor: '#1e3a8a', background: '#eff6ff' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', margin: '20px' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalBody: { padding: '24px' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  };

  if (loading) return <div style={styles.container}><div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 size={32} /></div></div>;

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/billing')} style={styles.backButton}><ArrowLeft size={20} /> Back to Billing</button>
        <h1 style={styles.title}>Create Invoice</h1>
      </div>

      {error && <div style={{ ...styles.alert, ...styles.alertError }}><AlertCircle size={20} />{error}</div>}
      {success && <div style={{ ...styles.alert, ...styles.alertSuccess }}><CheckCircle size={20} />{success}</div>}

      {!orderIdParam && (
        <div style={styles.modeToggle}>
          <button style={{ ...styles.modeButton, ...(mode === 'from-order' ? styles.modeButtonActive : {}) }} onClick={() => setMode('from-order')}>
            <FileText size={20} style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: '600' }}>From Order</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Generate from signed order</div>
          </button>
          <button style={{ ...styles.modeButton, ...(mode === 'manual' ? styles.modeButtonActive : {}) }} onClick={() => setMode('manual')}>
            <Plus size={20} style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: '600' }}>Manual</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Custom invoice</div>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Client Selection */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}><Building2 size={20} /> Client</h3>
            <button
              type="button"
              onClick={() => setShowNewClientModal(true)}
              style={{ ...styles.button, ...styles.buttonSecondary, padding: '8px 12px' }}
            >
              <Plus size={16} /> Add Client
            </button>
          </div>
          
          {selectedClient ? (
            <div style={{ ...styles.clientCard, ...styles.clientCardSelected }}>
              <div style={{ fontWeight: '600' }}>{selectedClient.business_name}</div>
              <button type="button" onClick={() => { setSelectedClient(null); setSelectedOrder(null); }} style={{ fontSize: '13px', color: '#1e3a8a', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>Change</button>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Search clients..." 
                  value={clientSearch} 
                  onChange={(e) => setClientSearch(e.target.value)} 
                  style={{ ...styles.input, paddingLeft: '36px' }} 
                />
              </div>
              
              {clientsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={20} /> Loading clients...
                </div>
              ) : !clientSearch ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                  Start typing to search clients...
                </div>
              ) : filteredClients.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                  No clients match your search
                  <br />
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(true)}
                    style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '12px', padding: '8px 16px' }}
                  >
                    <Plus size={16} /> Create New Client
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredClients.slice(0, 10).map(c => (
                    <div key={c.id} style={styles.clientCard} onClick={() => setSelectedClient(c)}>
                      <div style={{ fontWeight: '500' }}>{c.business_name}</div>
                      {c.contact_email && <div style={{ fontSize: '12px', color: '#64748b' }}>{c.contact_email}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Order Selection for from-order mode */}
        {mode === 'from-order' && selectedClient && !orderIdParam && !selectedOrder && (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><FileText size={20} /> Select Order</h3>
            {orders.length === 0 ? (
              <p style={{ color: '#64748b' }}>No billable orders found for this client.</p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {orders.map(o => (
                  <div 
                    key={o.id} 
                    style={{ ...styles.clientCard, ...(selectedOrder?.id === o.id ? styles.clientCardSelected : {}) }} 
                    onClick={() => handleSelectOrder(o)}
                  >
                    <div style={{ fontWeight: '600' }}>{o.order_number}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>${parseFloat(o.monthly_total || 0).toLocaleString()}/mo</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Order Summary - Show selected order details */}
        {mode === 'from-order' && selectedOrder && (
          <div style={{ ...styles.card, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ ...styles.sectionTitle, marginBottom: '4px' }}>📋 Order Summary</h3>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Review order details before generating invoice</div>
              </div>
              <span style={{ 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '600',
                background: selectedOrder.status === 'signed' ? '#dcfce7' : '#dbeafe',
                color: selectedOrder.status === 'signed' ? '#166534' : '#1e40af'
              }}>
                {selectedOrder.status?.toUpperCase()}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Order Number</div>
                <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedOrder.order_number}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Contract Period</div>
                <div style={{ fontWeight: '500', color: '#1e293b' }}>
                  {selectedOrder.contract_start_date ? new Date(selectedOrder.contract_start_date).toLocaleDateString() : 'N/A'} - {selectedOrder.contract_end_date ? new Date(selectedOrder.contract_end_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Term</div>
                <div style={{ fontWeight: '500', color: '#1e293b' }}>{selectedOrder.term_months} month{selectedOrder.term_months !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Monthly Total</div>
                <div style={{ fontWeight: '700', color: '#1e3a8a', fontSize: '18px' }}>${parseFloat(selectedOrder.monthly_total || 0).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Setup Fees</div>
                <div style={{ fontWeight: '500', color: '#1e293b' }}>${parseFloat(selectedOrder.setup_fees || 0).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Contract Total</div>
                <div style={{ fontWeight: '500', color: '#1e293b' }}>${parseFloat(selectedOrder.contract_total || 0).toLocaleString()}</div>
              </div>
            </div>

            {selectedOrder.items?.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Products ({selectedOrder.items.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <span key={idx} style={{ 
                      padding: '4px 10px', 
                      background: '#e0e7ff', 
                      color: '#3730a3', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {item.product_name} - ${parseFloat(item.adjusted_price || item.unit_price || 0).toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              type="button" 
              onClick={() => { setSelectedOrder(null); setItems([{ description: '', quantity: 1, unit_price: '' }]); }}
              style={{ marginTop: '12px', fontSize: '13px', color: '#1e3a8a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Change Order
            </button>
          </div>
        )}

        {/* Invoice Details */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><Calendar size={20} /> Invoice Details</h3>
          <div style={styles.grid}>
            <div><label style={styles.label}>Billing Start</label><input type="date" value={billingPeriodStart} onChange={(e) => setBillingPeriodStart(e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Billing End</label><input type="date" value={billingPeriodEnd} onChange={(e) => setBillingPeriodEnd(e.target.value)} style={styles.input} /></div>
            <div><label style={styles.label}>Due Date *</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} required /></div>
            <div><label style={styles.label}>Payment Method</label><select value={billingPreference} onChange={(e) => setBillingPreference(e.target.value)} style={styles.select}><option value="invoice">Invoice</option><option value="card">Card (+3.5%)</option><option value="ach">ACH</option></select></div>
          </div>
        </div>

        {/* Line Items */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><DollarSign size={20} /> Line Items</h3>
          {items.map((item, i) => (
            <div key={i} style={styles.itemRow}>
              <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} style={styles.input} />
              <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} style={styles.input} />
              <input type="number" step="0.01" placeholder="0.00" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} style={styles.input} />
              <button type="button" onClick={() => removeItem(i)} style={{ padding: '8px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer' }} disabled={items.length <= 1}><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={addItem} style={{ ...styles.button, ...styles.buttonSecondary, marginTop: '8px' }}><Plus size={16} /> Add Item</button>
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {addProcessingFee && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Processing Fee (3.5%)</span><span>${processingFee.toFixed(2)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: '700', fontSize: '18px', borderTop: '1px solid #e2e8f0' }}><span>Total</span><span style={{ color: '#1e3a8a' }}>${total.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Notes */}
        <div style={styles.card}>
          <label style={styles.label}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} placeholder="Notes..." />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/billing')} style={{ ...styles.button, ...styles.buttonSecondary }}>Cancel</button>
          {mode === 'from-order' ? (
            <button type="button" onClick={handleGenerateFromOrder} style={{ ...styles.button, ...styles.buttonPrimary }} disabled={submitting || !selectedOrder}>{submitting ? <Loader2 size={16} /> : <FileText size={16} />} Generate</button>
          ) : (
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }} disabled={submitting || !selectedClient}>{submitting ? <Loader2 size={16} /> : <CheckCircle size={16} />} Create</button>
          )}
        </div>
      </form>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewClientModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Add New Client</h3>
              <button onClick={() => setShowNewClientModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Business Name *</label>
                <input 
                  type="text" 
                  value={newClientData.business_name} 
                  onChange={(e) => setNewClientData({ ...newClientData, business_name: e.target.value })} 
                  style={styles.input} 
                  placeholder="Company Name"
                />
              </div>
              
              <div style={{ ...styles.grid, marginBottom: '16px' }}>
                <div>
                  <label style={styles.label}>Contact First Name</label>
                  <input type="text" value={newClientData.contact_first_name} onChange={(e) => setNewClientData({ ...newClientData, contact_first_name: e.target.value })} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Contact Last Name</label>
                  <input type="text" value={newClientData.contact_last_name} onChange={(e) => setNewClientData({ ...newClientData, contact_last_name: e.target.value })} style={styles.input} />
                </div>
              </div>
              
              <div style={{ ...styles.grid, marginBottom: '16px' }}>
                <div>
                  <label style={styles.label}>Email</label>
                  <input type="email" value={newClientData.contact_email} onChange={(e) => setNewClientData({ ...newClientData, contact_email: e.target.value })} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Phone</label>
                  <input type="tel" value={newClientData.contact_phone} onChange={(e) => setNewClientData({ ...newClientData, contact_phone: e.target.value })} style={styles.input} />
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Address</label>
                <input type="text" value={newClientData.address_street} onChange={(e) => setNewClientData({ ...newClientData, address_street: e.target.value })} style={{ ...styles.input, marginBottom: '8px' }} placeholder="Street Address" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '8px' }}>
                  <input type="text" value={newClientData.address_city} onChange={(e) => setNewClientData({ ...newClientData, address_city: e.target.value })} style={styles.input} placeholder="City" />
                  <input type="text" value={newClientData.address_state} onChange={(e) => setNewClientData({ ...newClientData, address_state: e.target.value })} style={styles.input} placeholder="State" maxLength={2} />
                  <input type="text" value={newClientData.address_zip} onChange={(e) => setNewClientData({ ...newClientData, address_zip: e.target.value })} style={styles.input} placeholder="ZIP" />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button type="button" onClick={() => setShowNewClientModal(false)} style={{ ...styles.button, ...styles.buttonSecondary }}>Cancel</button>
              <button type="button" onClick={handleCreateClient} style={{ ...styles.button, ...styles.buttonSuccess }} disabled={creatingClient || !newClientData.business_name.trim()}>
                {creatingClient ? <Loader2 size={16} /> : <CheckCircle size={16} />} Create Client
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
