import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Icons
const Icons = {
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  DollarSign: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
};

export default function OrderForm() {
  // Data states
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  // Order details
  const [orderItems, setOrderItems] = useState([]);
  const [contractStartDate, setContractStartDate] = useState('');
  const [termMonths, setTermMonths] = useState(6);
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [paymentPreference, setPaymentPreference] = useState('invoice');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Product selection
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [clientsRes, productsRes, entitiesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders/clients?limit=100`),
        fetch(`${API_BASE}/api/orders/products/list`),
        fetch(`${API_BASE}/api/orders/entities/list`),
        fetch(`${API_BASE}/api/orders/categories/list`)
      ]);

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 10);
    return clients.filter(c => 
      c.business_name?.toLowerCase().includes(clientSearch.toLowerCase())
    ).slice(0, 10);
  }, [clients, clientSearch]);

  // Filter products based on entity and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedEntity && p.entity_id !== selectedEntity) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      return true;
    });
  }, [products, selectedEntity, selectedCategory]);

  // Calculate contract end date
  const contractEndDate = useMemo(() => {
    if (!contractStartDate || !termMonths) return '';
    const start = new Date(contractStartDate);
    start.setMonth(start.getMonth() + parseInt(termMonths));
    start.setDate(start.getDate() - 1);
    return start.toISOString().split('T')[0];
  }, [contractStartDate, termMonths]);

  // Calculate totals
  const totals = useMemo(() => {
    const monthlyTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const setupFees = orderItems.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0);
    const contractTotal = (monthlyTotal * termMonths) + setupFees;
    return { monthlyTotal, setupFees, contractTotal };
  }, [orderItems, termMonths]);

  // Add product to order
  const addProductToOrder = (product) => {
    const newItem = {
      id: Date.now(),
      product_id: product.id,
      entity_id: product.entity_id,
      product_name: product.name,
      product_category: product.category || product.category_code,
      unit_price: parseFloat(product.default_rate) || 0,
      quantity: 1,
      discount_percent: 0,
      line_total: parseFloat(product.default_rate) || 0,
      setup_fee: parseFloat(product.setup_fee) || 0,
      rate_type: product.rate_type,
      entity_name: product.entity_name,
      category_name: product.category_name,
      notes: '',
    };
    setOrderItems([...orderItems, newItem]);
    setShowProductModal(false);
  };

  // Update item
  const updateOrderItem = (itemId, field, value) => {
    setOrderItems(orderItems.map(item => {
      if (item.id !== itemId) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate line total
      if (field === 'unit_price' || field === 'quantity' || field === 'discount_percent') {
        const price = parseFloat(updated.unit_price) || 0;
        const qty = parseInt(updated.quantity) || 1;
        const discount = parseFloat(updated.discount_percent) || 0;
        updated.line_total = price * qty * (1 - discount / 100);
      }
      
      return updated;
    }));
  };

  // Remove item
  const removeOrderItem = (itemId) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  // Create new client
  const handleCreateClient = async (clientData) => {
    try {
      const response = await fetch(`${API_BASE}/api/orders/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      
      if (response.ok) {
        const newClient = await response.json();
        setClients([newClient, ...clients]);
        setSelectedClient(newClient);
        setShowNewClientModal(false);
        setClientSearch('');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client');
    }
  };

  // Save order
  const handleSaveOrder = async (status = 'draft') => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    if (!contractStartDate) {
      alert('Please select a contract start date');
      return;
    }
    if (orderItems.length === 0) {
      alert('Please add at least one product');
      return;
    }

    setSaving(true);
    try {
      const orderData = {
        client_id: selectedClient.id,
        contract_start_date: contractStartDate,
        contract_end_date: contractEndDate,
        term_months: parseInt(termMonths),
        billing_frequency: billingFrequency,
        payment_preference: paymentPreference,
        notes: orderNotes,
        items: orderItems.map(item => ({
          entity_id: item.entity_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          line_total: item.line_total,
          notes: item.notes,
        })),
      };

      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const newOrder = await response.json();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        // Reset form for new order
        if (status === 'draft') {
          // Keep the success message but stay on form
        } else {
          // Clear form for next order
          setSelectedClient(null);
          setOrderItems([]);
          setContractStartDate('');
          setTermMonths(6);
          setOrderNotes('');
        }
      } else {
        const error = await response.json();
        alert(`Failed to save order: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading order form...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>New Order</h1>
          <p style={styles.subtitle}>Create a new advertising order</p>
        </div>
        {saveSuccess && (
          <div style={styles.successBanner}>
            <Icons.Check /> Order saved successfully!
          </div>
        )}
      </div>

      <div style={styles.formGrid}>
        {/* Left Column - Order Details */}
        <div style={styles.leftColumn}>
          {/* Client Selection */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}><Icons.Building /> Client</h2>
            
            {selectedClient ? (
              <div style={styles.selectedClient}>
                <div>
                  <div style={styles.clientName}>{selectedClient.business_name}</div>
                  {selectedClient.contact_email && (
                    <div style={styles.clientEmail}>{selectedClient.contact_first_name} {selectedClient.contact_last_name} • {selectedClient.contact_email}</div>
                  )}
                </div>
                <button onClick={() => setSelectedClient(null)} style={styles.changeButton}>Change</button>
              </div>
            ) : (
              <div style={styles.clientSearch}>
                <div style={styles.searchWrapper}>
                  <Icons.Search />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    style={styles.searchInput}
                  />
                </div>
                
                {showClientDropdown && (
                  <div style={styles.dropdown}>
                    {filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <div
                          key={client.id}
                          style={styles.dropdownItem}
                          onClick={() => {
                            setSelectedClient(client);
                            setShowClientDropdown(false);
                            setClientSearch('');
                          }}
                        >
                          <div style={styles.dropdownItemName}>{client.business_name}</div>
                          {client.contact_email && (
                            <div style={styles.dropdownItemEmail}>{client.contact_email}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={styles.dropdownEmpty}>No clients found</div>
                    )}
                    <div
                      style={styles.dropdownAddNew}
                      onClick={() => {
                        setShowNewClientModal(true);
                        setShowClientDropdown(false);
                      }}
                    >
                      <Icons.Plus /> Add New Client
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contract Details */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}><Icons.Calendar /> Contract Details</h2>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start Date *</label>
                <input
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Term (Months) *</label>
                <select
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  style={styles.select}
                >
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="13">13 Months</option>
                  <option value="24">24 Months</option>
                </select>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={contractEndDate}
                  disabled
                  style={{ ...styles.input, backgroundColor: '#f8fafc' }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Frequency</label>
                <select
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value)}
                  style={styles.select}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="upfront">Upfront (Full Term)</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Preference</label>
              <select
                value={paymentPreference}
                onChange={(e) => setPaymentPreference(e.target.value)}
                style={styles.select}
              >
                <option value="invoice">Invoice</option>
                <option value="credit_card">Credit Card</option>
                <option value="ach">ACH/Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Order Items */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}><Icons.FileText /> Products & Services</h2>
              <button onClick={() => setShowProductModal(true)} style={styles.addButton}>
                <Icons.Plus /> Add Product
              </button>
            </div>

            {orderItems.length === 0 ? (
              <div style={styles.emptyItems}>
                <p>No products added yet</p>
                <button onClick={() => setShowProductModal(true)} style={styles.addProductButton}>
                  <Icons.Plus /> Add Your First Product
                </button>
              </div>
            ) : (
              <div style={styles.itemsList}>
                {orderItems.map(item => (
                  <div key={item.id} style={styles.orderItem}>
                    <div style={styles.itemHeader}>
                      <div>
                        <div style={styles.itemName}>{item.product_name}</div>
                        <div style={styles.itemMeta}>
                          <span style={styles.itemEntity}>{item.entity_name}</span>
                          <span style={styles.itemCategory}>{item.category_name}</span>
                        </div>
                      </div>
                      <button onClick={() => removeOrderItem(item.id)} style={styles.removeButton}>
                        <Icons.Trash />
                      </button>
                    </div>
                    
                    <div style={styles.itemDetails}>
                      <div style={styles.itemField}>
                        <label>Price</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateOrderItem(item.id, 'unit_price', e.target.value)}
                          style={styles.itemInput}
                        />
                      </div>
                      <div style={styles.itemField}>
                        <label>Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(item.id, 'quantity', e.target.value)}
                          style={styles.itemInput}
                          min="1"
                        />
                      </div>
                      <div style={styles.itemField}>
                        <label>Discount %</label>
                        <input
                          type="number"
                          value={item.discount_percent}
                          onChange={(e) => updateOrderItem(item.id, 'discount_percent', e.target.value)}
                          style={styles.itemInput}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div style={styles.itemTotal}>
                        <label>Line Total</label>
                        <span>{formatCurrency(item.line_total)}</span>
                      </div>
                    </div>
                    
                    {item.setup_fee > 0 && (
                      <div style={styles.setupFee}>
                        Setup fee: {formatCurrency(item.setup_fee)} (one-time)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Notes</h2>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Add any notes about this order..."
              style={styles.textarea}
              rows={3}
            />
          </div>
        </div>

        {/* Right Column - Summary */}
        <div style={styles.rightColumn}>
          <div style={styles.summaryCard}>
            <h2 style={styles.summaryTitle}>Order Summary</h2>
            
            <div style={styles.summarySection}>
              <div style={styles.summaryRow}>
                <span>Monthly Total</span>
                <span style={styles.summaryValue}>{formatCurrency(totals.monthlyTotal)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Contract Term</span>
                <span>{termMonths} months</span>
              </div>
              {totals.setupFees > 0 && (
                <div style={styles.summaryRow}>
                  <span>Setup Fees</span>
                  <span>{formatCurrency(totals.setupFees)}</span>
                </div>
              )}
            </div>

            <div style={styles.summaryTotal}>
              <span>Contract Total</span>
              <span style={styles.totalValue}>{formatCurrency(totals.contractTotal)}</span>
            </div>

            <div style={styles.summaryActions}>
              <button
                onClick={() => handleSaveOrder('draft')}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => handleSaveOrder('pending_approval')}
                disabled={saving}
                style={styles.submitButton}
              >
                Submit for Approval
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={styles.statsCard}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Products</span>
              <span style={styles.statValue}>{orderItems.length}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Entities</span>
              <span style={styles.statValue}>
                {[...new Set(orderItems.map(i => i.entity_id))].length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProductModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add Product</h2>
              <button onClick={() => setShowProductModal(false)} style={styles.closeButton}>
                <Icons.X />
              </button>
            </div>
            
            <div style={styles.modalFilters}>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">All Entities</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.productList}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  style={styles.productItem}
                  onClick={() => addProductToOrder(product)}
                >
                  <div style={styles.productInfo}>
                    <div style={styles.productName}>{product.name}</div>
                    <div style={styles.productMeta}>
                      {product.entity_name} • {product.category_name}
                    </div>
                    {product.description && (
                      <div style={styles.productDesc}>{product.description}</div>
                    )}
                  </div>
                  <div style={styles.productPrice}>
                    <div style={styles.priceAmount}>{formatCurrency(product.default_rate)}</div>
                    <div style={styles.priceType}>{product.rate_type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <NewClientModal
          onSave={handleCreateClient}
          onClose={() => setShowNewClientModal(false)}
        />
      )}
    </div>
  );
}

// New Client Modal Component
function NewClientModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    business_name: '',
    industry: '',
    website: '',
    status: 'prospect',
    contact_first_name: '',
    contact_last_name: '',
    contact_email: '',
    contact_phone: '',
    contact_title: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.business_name) {
      alert('Business name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>New Client</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <Icons.X />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.modalBody}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Business Name *</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  style={styles.input}
                  placeholder="e.g., Healthcare, Restaurant"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  style={styles.input}
                  placeholder="https://"
                />
              </div>
            </div>

            <h3 style={styles.sectionTitle}>Primary Contact</h3>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  value={formData.contact_first_name}
                  onChange={(e) => setFormData({...formData, contact_first_name: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  value={formData.contact_last_name}
                  onChange={(e) => setFormData({...formData, contact_last_name: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={formData.contact_title}
                onChange={(e) => setFormData({...formData, contact_title: e.target.value})}
                style={styles.input}
                placeholder="e.g., Owner, Marketing Director"
              />
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" style={styles.primaryButton}>Create Client</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e3a5f',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  selectedClient: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  clientName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  clientEmail: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  changeButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
  },
  clientSearch: {
    position: 'relative',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#94a3b8',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#1e293b',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    zIndex: 100,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
  },
  dropdownItemName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  dropdownItemEmail: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  dropdownEmpty: {
    padding: '16px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  dropdownAddNew: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyItems: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#94a3b8',
  },
  addProductButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    color: '#64748b',
    fontSize: '14px',
    cursor: 'pointer',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderItem: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  itemName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  itemEntity: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '4px',
  },
  itemCategory: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    borderRadius: '4px',
  },
  removeButton: {
    padding: '6px',
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: '6px',
    color: '#dc2626',
    cursor: 'pointer',
  },
  itemDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 100px 1fr',
    gap: '12px',
    alignItems: 'end',
  },
  itemField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  itemInput: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  itemTotal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'right',
  },
  setupFee: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: '12px',
    padding: '24px',
    color: 'white',
    position: 'sticky',
    top: '20px',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 20px 0',
  },
  summarySection: {
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '16px',
    marginBottom: '16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '14px',
    opacity: 0.9,
  },
  summaryValue: {
    fontWeight: '600',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
  },
  totalValue: {
    fontSize: '28px',
    fontWeight: '700',
  },
  summaryActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '24px',
  },
  saveButton: {
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statsCard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  stat: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    display: 'block',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 180px)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalFilters: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  filterSelect: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  productList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1e293b',
  },
  productMeta: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  },
  productDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  productPrice: {
    textAlign: 'right',
  },
  priceAmount: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  priceType: {
    fontSize: '12px',
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '20px 0 12px 0',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
