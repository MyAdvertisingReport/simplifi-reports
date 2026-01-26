/**
 * InvoiceForm.jsx
 * Create new invoice or generate from existing order
 * Now includes product selector like OrderForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FileText, ArrowLeft, Plus, Trash2, DollarSign, Calendar,
  Building2, Search, CheckCircle, AlertCircle, X, User, Package
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

// Format currency helper
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('order');
  
  const [mode, setMode] = useState(orderIdParam ? 'from-order' : 'manual');
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(true);
  
  // Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  
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
  const [items, setItems] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadInitialData();
    if (orderIdParam) loadOrderDetails(orderIdParam);
  }, [orderIdParam]);

  useEffect(() => {
    if (selectedClient) loadClientOrders(selectedClient.id);
  }, [selectedClient]);

  useEffect(() => {
    setAddProcessingFee(billingPreference === 'card');
  }, [billingPreference]);

  const loadInitialData = async () => {
    setClientsLoading(true);
    try {
      const headers = getAuthHeaders();
      const [clientsRes, productsRes, entitiesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders/clients?limit=100`, { headers }),
        fetch(`${API_BASE}/api/orders/products/list`, { headers }),
        fetch(`${API_BASE}/api/orders/entities/list`, { headers }),
        fetch(`${API_BASE}/api/orders/categories/list`, { headers })
      ]);
      
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (err) { 
      console.error('Error loading data:', err); 
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
          product_id: item.product_id,
          entity_name: item.entity_name
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
          unit_price: parseFloat(item.adjusted_price || item.unit_price || 0),
          order_item_id: item.id,
          product_id: item.product_id,
          entity_name: item.entity_name
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

  // Add product to invoice items
  const addProductToInvoice = (product) => {
    const entity = entities.find(e => e.id === product.entity_id);
    setItems([...items, {
      description: product.name,
      quantity: 1,
      unit_price: parseFloat(product.default_rate) || 0,
      product_id: product.id,
      entity_name: entity?.name || product.entity_name
    }]);
    setShowProductModal(false);
  };

  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.unit_price || 0) * (parseInt(i.quantity) || 1)), 0);
  const processingFee = addProcessingFee ? Math.round(subtotal * 0.035 * 100) / 100 : 0;
  const total = subtotal + processingFee;

  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
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
    if (items.length === 0) return setError('Add at least one line item');
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          client_id: selectedClient.id, order_id: selectedOrder?.id,
          billing_period_start: billingPeriodStart || null, billing_period_end: billingPeriodEnd || null,
          due_date: dueDate, billing_preference: billingPreference, add_processing_fee: addProcessingFee, notes,
          items: items.map(i => ({ ...i, unit_price: parseFloat(i.unit_price) }))
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
    productItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '10px', background: '#f8fafc' },
    productInfo: { flex: 1 },
    productName: { fontWeight: '600', color: '#1e293b', fontSize: '14px' },
    productEntity: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    productPrice: { fontWeight: '700', color: '#1e3a8a', fontSize: '16px', textAlign: 'right' },
    removeBtn: { padding: '6px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', marginLeft: '12px' },
    addProductBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '10px', background: 'transparent', color: '#64748b', cursor: 'pointer', width: '100%', fontSize: '14px', fontWeight: '500' },
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
              <button type="button" onClick={() => { setSelectedClient(null); setSelectedOrder(null); setItems([]); }} style={{ fontSize: '13px', color: '#1e3a8a', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>Change</button>
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
            
            <button 
              type="button" 
              onClick={() => { setSelectedOrder(null); setItems([]); }}
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

        {/* Line Items - Product Based */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><Package size={20} /> Products & Services</h3>
          
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
              <Package size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ margin: '0 0 16px 0' }}>No products added yet</p>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              {items.map((item, i) => (
                <div key={i} style={styles.productItem}>
                  <div style={styles.productInfo}>
                    <div style={styles.productName}>{item.description}</div>
                    {item.entity_name && <div style={styles.productEntity}>{item.entity_name}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      style={{ ...styles.input, width: '60px', textAlign: 'center' }}
                    />
                    <span style={{ color: '#64748b' }}>×</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                      style={{ ...styles.input, width: '100px', textAlign: 'right' }}
                    />
                    <div style={styles.productPrice}>
                      {formatCurrency((parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1))}
                    </div>
                    <button type="button" onClick={() => removeItem(i)} style={styles.removeBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button 
            type="button" 
            onClick={() => setShowProductModal(true)} 
            style={styles.addProductBtn}
          >
            <Plus size={18} /> Add Product from Catalog
          </button>
          
          {/* Totals */}
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {addProcessingFee && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Processing Fee (3.5%)</span><span>{formatCurrency(processingFee)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: '700', fontSize: '18px', borderTop: '1px solid #e2e8f0' }}><span>Total</span><span style={{ color: '#1e3a8a' }}>{formatCurrency(total)}</span></div>
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
            <button type="button" onClick={handleGenerateFromOrder} style={{ ...styles.button, ...styles.buttonPrimary }} disabled={submitting || !selectedOrder}>{submitting ? <Loader2 size={16} /> : <FileText size={16} />} Generate Invoice</button>
          ) : (
            <button type="submit" style={{ ...styles.button, ...styles.buttonPrimary }} disabled={submitting || !selectedClient || items.length === 0}>{submitting ? <Loader2 size={16} /> : <CheckCircle size={16} />} Create Invoice</button>
          )}
        </div>
      </form>

      {/* Product Selector Modal */}
      {showProductModal && (
        <ProductSelectorModal
          products={products}
          entities={entities}
          categories={categories}
          onSelect={addProductToInvoice}
          onClose={() => setShowProductModal(false)}
        />
      )}

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


// ============================================
// Product Selector Modal (Simplified Version)
// ============================================
function ProductSelectorModal({ products, entities, categories, onSelect, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedMedium, setSelectedMedium] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const brandConfig = {
    wsic: { name: 'WSIC Radio', icon: '📻', color: '#3b82f6', bgColor: '#eff6ff', description: 'Radio, Podcast & Events' },
    lkn: { name: 'Lake Norman Woman', icon: '📰', color: '#ec4899', bgColor: '#fdf2f8', description: 'Print & Digital Advertising' },
    lwp: { name: 'LiveWorkPlay LKN', icon: '🌟', color: '#10b981', bgColor: '#ecfdf5', description: 'Combined audience reach' }
  };

  const mediumConfig = {
    broadcast: { icon: '📻', name: 'Broadcast', description: 'Radio commercials & sponsorships' },
    podcast: { icon: '🎙️', name: 'Podcast', description: 'Podcast ads & studio services' },
    'web-social': { icon: '🌐', name: 'Web & Social', description: 'Newsletters, websites & social' },
    events: { icon: '📅', name: 'Events', description: 'Sponsorships & live remotes' },
    programmatic: { icon: '💻', name: 'Programmatic Digital', description: 'Display, OTT/CTV & Meta ads' },
    print: { icon: '📰', name: 'Print', description: 'Magazine ads & editorials' }
  };

  const entityToBrand = {};
  entities.forEach(e => {
    if (e.code === 'wsic') entityToBrand[e.id] = 'wsic';
    if (e.code === 'lkn') entityToBrand[e.id] = 'lkn';
    if (e.code === 'lwp') entityToBrand[e.id] = 'lwp';
  });

  const getMediumsForBrand = (brandCode) => {
    if (brandCode === 'wsic') return ['broadcast', 'podcast', 'events', 'web-social'];
    if (brandCode === 'lkn') return ['programmatic', 'print', 'web-social'];
    if (brandCode === 'lwp') return ['web-social'];
    return [];
  };

  const categoryToMedium = (categoryName) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('broadcast')) return 'broadcast';
    if (name.includes('podcast')) return 'podcast';
    if (name.includes('web') || name.includes('social')) return 'web-social';
    if (name.includes('event')) return 'events';
    if (name.includes('programmatic') || name.includes('digital')) return 'programmatic';
    if (name.includes('print')) return 'print';
    return null;
  };

  const getFilteredProducts = () => {
    if (!selectedBrand || !selectedMedium) return [];
    return products.filter(p => {
      const productBrand = entityToBrand[p.entity_id];
      const productMedium = categoryToMedium(p.category_name);
      const matchesBrand = productBrand === selectedBrand;
      const matchesMedium = productMedium === selectedMedium;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBrand && matchesMedium && matchesSearch;
    });
  };

  const getProductCount = (brandCode, mediumCode) => {
    return products.filter(p => {
      const productBrand = entityToBrand[p.entity_id];
      const productMedium = categoryToMedium(p.category_name);
      return productBrand === brandCode && productMedium === mediumCode;
    }).length;
  };

  const handleBrandSelect = (brandCode) => {
    setSelectedBrand(brandCode);
    const mediums = getMediumsForBrand(brandCode);
    if (mediums.length === 1) {
      setSelectedMedium(mediums[0]);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleMediumSelect = (mediumCode) => {
    setSelectedMedium(mediumCode);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      const mediums = getMediumsForBrand(selectedBrand);
      if (mediums.length === 1) {
        setSelectedBrand(null);
        setSelectedMedium(null);
        setStep(1);
      } else {
        setSelectedMedium(null);
        setStep(2);
      }
    } else if (step === 2) {
      setSelectedBrand(null);
      setStep(1);
    }
    setSearchQuery('');
  };

  const filteredProducts = getFilteredProducts();
  const availableMediums = selectedBrand ? getMediumsForBrand(selectedBrand) : [];

  const modalStyles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0', gap: '12px' },
    backBtn: { padding: '8px 12px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#64748b', cursor: 'pointer' },
    title: { flex: 1, fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 },
    closeBtn: { padding: '8px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#64748b', cursor: 'pointer' },
    content: { padding: '16px', overflowY: 'auto', flex: 1 },
    optionCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: '#f8fafc', border: 'none', borderLeft: '4px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '12px' },
    optionIcon: { fontSize: '28px' },
    optionContent: { flex: 1 },
    optionName: { fontWeight: '600', color: '#1e293b', fontSize: '15px' },
    optionDesc: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
    productCard: { display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', marginBottom: '10px' },
    productInfo: { flex: 1 },
    productName: { fontWeight: '600', color: '#1e293b', fontSize: '14px' },
    productDesc: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    productPrice: { fontWeight: '700', color: '#1e3a8a', fontSize: '16px' },
    productRate: { fontSize: '11px', color: '#64748b' },
    searchInput: { width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '16px', outline: 'none' },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          {step > 1 && <button onClick={handleBack} style={modalStyles.backBtn}>← Back</button>}
          <h2 style={modalStyles.title}>
            {step === 1 && 'Select Brand'}
            {step === 2 && `${brandConfig[selectedBrand]?.icon} ${brandConfig[selectedBrand]?.name}`}
            {step === 3 && `${mediumConfig[selectedMedium]?.icon} ${mediumConfig[selectedMedium]?.name}`}
          </h2>
          <button onClick={onClose} style={modalStyles.closeBtn}><X size={20} /></button>
        </div>

        <div style={modalStyles.content}>
          {/* Step 1: Select Brand */}
          {step === 1 && Object.entries(brandConfig).map(([code, config]) => (
            <button
              key={code}
              onClick={() => handleBrandSelect(code)}
              style={{ ...modalStyles.optionCard, borderLeftColor: config.color, backgroundColor: config.bgColor }}
            >
              <span style={modalStyles.optionIcon}>{config.icon}</span>
              <div style={modalStyles.optionContent}>
                <div style={modalStyles.optionName}>{config.name}</div>
                <div style={modalStyles.optionDesc}>{config.description}</div>
              </div>
              <span style={{ color: '#94a3b8' }}>→</span>
            </button>
          ))}

          {/* Step 2: Select Medium */}
          {step === 2 && availableMediums.map(mediumCode => {
            const config = mediumConfig[mediumCode];
            const count = getProductCount(selectedBrand, mediumCode);
            return (
              <button key={mediumCode} onClick={() => handleMediumSelect(mediumCode)} style={modalStyles.optionCard}>
                <span style={modalStyles.optionIcon}>{config.icon}</span>
                <div style={modalStyles.optionContent}>
                  <div style={modalStyles.optionName}>{config.name}</div>
                  <div style={modalStyles.optionDesc}>{config.description}</div>
                </div>
                <span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>{count}</span>
              </button>
            );
          })}

          {/* Step 3: Select Product */}
          {step === 3 && (
            <>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={modalStyles.searchInput}
              />
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No products found</div>
              ) : (
                filteredProducts.map(product => (
                  <div key={product.id} onClick={() => onSelect(product)} style={modalStyles.productCard}>
                    <div style={modalStyles.productInfo}>
                      <div style={modalStyles.productName}>{product.name}</div>
                      {product.description && <div style={modalStyles.productDesc}>{product.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={modalStyles.productPrice}>${parseFloat(product.default_rate).toLocaleString()}</div>
                      <div style={modalStyles.productRate}>{product.rate_type}</div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
