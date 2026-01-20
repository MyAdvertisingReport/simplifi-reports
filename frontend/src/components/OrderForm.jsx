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
  const [editingClient, setEditingClient] = useState(null);
  
  // Order details
  const [orderItems, setOrderItems] = useState([]);
  const [contractStartDate, setContractStartDate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [customTerm, setCustomTerm] = useState('');
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [isOneTime, setIsOneTime] = useState(false);
  const [billUpfront, setBillUpfront] = useState(false);
  const [scheduleNotes, setScheduleNotes] = useState('');
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
    if (!contractStartDate) return '';
    
    // For one-time orders, end date = start date
    if (isOneTime) {
      return contractStartDate;
    }
    
    const months = isCustomTerm ? (parseInt(customTerm) || 0) : parseInt(termMonths);
    if (!months) return '';
    const start = new Date(contractStartDate + 'T00:00:00');
    start.setMonth(start.getMonth() + months);
    start.setDate(start.getDate() - 1);
    return start.toISOString().split('T')[0];
  }, [contractStartDate, termMonths, customTerm, isCustomTerm, isOneTime]);

  // Get effective term months (1 for one-time orders)
  const effectiveTermMonths = useMemo(() => {
    if (isOneTime) return 1;
    return isCustomTerm ? (parseInt(customTerm) || 0) : parseInt(termMonths);
  }, [termMonths, customTerm, isCustomTerm, isOneTime]);

  // Calculate totals
  const totals = useMemo(() => {
    const lineItemsTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const setupFees = orderItems.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0);
    
    // For one-time orders, don't multiply by months
    const contractTotal = isOneTime 
      ? lineItemsTotal + setupFees
      : (lineItemsTotal * effectiveTermMonths) + setupFees;
    
    const hasUnapprovedAdjustments = orderItems.some(item => item.price_adjusted && !item.price_approved);
    
    return { 
      monthlyTotal: lineItemsTotal, 
      setupFees, 
      contractTotal, 
      hasUnapprovedAdjustments,
      isOneTime 
    };
  }, [orderItems, effectiveTermMonths, isOneTime]);

  // Add product to order
  const addProductToOrder = (product) => {
    const setupFee = parseFloat(product.setup_fee) || 0;
    const newItem = {
      id: Date.now(),
      product_id: product.id,
      entity_id: product.entity_id,
      product_name: product.name,
      product_category: product.category || product.category_code,
      unit_price: parseFloat(product.default_rate) || 0,
      original_price: parseFloat(product.default_rate) || 0, // Track original for comparison
      quantity: 1,
      line_total: parseFloat(product.default_rate) || 0,
      setup_fee: setupFee,
      original_setup_fee: setupFee, // Track original setup fee for waive/restore
      rate_type: product.rate_type,
      entity_name: product.entity_name,
      category_name: product.category_name,
      price_adjusted: false,
      price_approved: false,
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
      if (field === 'unit_price' || field === 'quantity') {
        const price = parseFloat(updated.unit_price) || 0;
        const qty = parseInt(updated.quantity) || 1;
        updated.line_total = price * qty;
        
        // Check if price was adjusted from original
        if (field === 'unit_price') {
          updated.price_adjusted = price !== updated.original_price;
          if (!updated.price_adjusted) {
            updated.price_approved = false; // Reset approval if back to original
          }
        }
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

  // Update existing client
  const handleUpdateClient = (updatedClient, isUpdate) => {
    if (isUpdate) {
      // Update in clients list
      setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
      // Update selected client
      setSelectedClient(updatedClient);
    }
    setEditingClient(null);
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
    
    // Check for unapproved price adjustments
    const unapprovedItems = orderItems.filter(item => item.price_adjusted && !item.price_approved);
    if (unapprovedItems.length > 0) {
      alert('Please confirm management approval for all price adjustments before saving.');
      return;
    }

    setSaving(true);
    try {
      const orderData = {
        client_id: selectedClient.id,
        contract_start_date: contractStartDate,
        contract_end_date: contractEndDate,
        term_months: effectiveTermMonths,
        billing_frequency: billUpfront ? 'upfront' : 'monthly',
        notes: orderNotes,
        internal_notes: scheduleNotes ? `Schedule: ${scheduleNotes}` : '',
        items: orderItems.map(item => ({
          entity_id: item.entity_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: 0,
          line_total: item.line_total,
          notes: item.price_adjusted ? `Price adjusted from $${item.original_price} (approved)` : item.notes,
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
          setTermMonths('');
          setCustomTerm('');
          setIsCustomTerm(false);
          setIsOneTime(false);
          setBillUpfront(false);
          setScheduleNotes('');
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
                <div style={{ flex: 1 }}>
                  <div style={styles.clientName}>{selectedClient.business_name}</div>
                  {selectedClient.contact_email && (
                    <div style={styles.clientEmail}>{selectedClient.contact_first_name} {selectedClient.contact_last_name} • {selectedClient.contact_email}</div>
                  )}
                  {selectedClient.website && (
                    <div style={styles.clientWebsite}>{selectedClient.website}</div>
                  )}
                </div>
                <div style={styles.clientActions}>
                  <button onClick={() => setEditingClient(selectedClient)} style={styles.editClientButton}>Edit</button>
                  <button onClick={() => setSelectedClient(null)} style={styles.changeButton}>Change</button>
                </div>
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
                <label style={styles.label}>Term *</label>
                {!isCustomTerm ? (
                  <select
                    value={isOneTime ? 'one-time' : termMonths}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'other') {
                        setIsCustomTerm(true);
                        setIsOneTime(false);
                        setCustomTerm('');
                      } else if (val === 'one-time') {
                        setIsOneTime(true);
                        setIsCustomTerm(false);
                        setBillUpfront(true); // One-time is always billed upfront
                      } else {
                        setIsOneTime(false);
                        setTermMonths(val);
                      }
                    }}
                    style={{
                      ...styles.select,
                      color: termMonths === '' && !isOneTime ? '#9ca3af' : '#1e293b'
                    }}
                  >
                    <option value="" disabled>Select contract length...</option>
                    <option value="one-time">One-Time / Single Run</option>
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="13">13 Months</option>
                    <option value="24">24 Months</option>
                    <option value="other">Other...</option>
                  </select>
                ) : (
                  <div style={styles.customTermWrapper}>
                    <input
                      type="number"
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      placeholder="# months"
                      style={{ ...styles.input, flex: 1 }}
                      min="1"
                    />
                    <button 
                      onClick={() => {
                        setIsCustomTerm(false);
                        setTermMonths('');
                      }}
                      style={styles.cancelCustomButton}
                    >
                      Cancel
                    </button>
                  </div>
                )}
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
                <label style={styles.label}>&nbsp;</label>
                {isOneTime ? (
                  <div style={styles.oneTimeIndicator}>
                    <span>💵 Billed as one-time charge</span>
                  </div>
                ) : (
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={billUpfront}
                      onChange={(e) => setBillUpfront(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>Bill full contract upfront</span>
                  </label>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Schedule Notes (optional)</label>
              <input
                type="text"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="e.g., Every other month, specific issues, etc."
                style={styles.input}
              />
              <div style={styles.fieldHint}>Use this for custom schedules like "6 issues, every other month"</div>
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
                          {item.original_price && (
                            <span style={styles.itemBookValue}>Book: {formatCurrency(item.original_price)}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => removeOrderItem(item.id)} style={styles.removeButton}>
                        <Icons.Trash />
                      </button>
                    </div>
                    
                    <div style={styles.itemDetailsSimple}>
                      <div style={styles.itemField}>
                        <label>Price</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateOrderItem(item.id, 'unit_price', e.target.value)}
                          style={{
                            ...styles.itemInput,
                            ...(item.price_adjusted ? styles.itemInputAdjusted : {})
                          }}
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
                      <div style={styles.itemTotal}>
                        <label>Line Total</label>
                        <span>{formatCurrency(item.line_total)}</span>
                      </div>
                    </div>
                    
                    {/* Price adjustment approval - only shows when price differs from book value */}
                    {item.price_adjusted && (
                      <div style={styles.priceApprovalBox}>
                        <label style={styles.approvalLabel}>
                          <input
                            type="checkbox"
                            checked={item.price_approved}
                            onChange={(e) => updateOrderItem(item.id, 'price_approved', e.target.checked)}
                            style={styles.approvalCheckbox}
                          />
                          <span>I have discussed this price adjustment with Management and received approval</span>
                        </label>
                        {!item.price_approved && (
                          <div style={styles.approvalWarning}>
                            ⚠️ Approval required before saving
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Setup Fee - editable with waive option */}
                    {(item.original_setup_fee > 0 || item.setup_fee > 0) && (
                      <div style={styles.setupFeeRow}>
                        <div style={styles.setupFeeLabel}>
                          <span>Setup Fee</span>
                          {item.setup_fee === 0 && item.original_setup_fee > 0 && (
                            <span style={styles.waivedBadge}>WAIVED</span>
                          )}
                        </div>
                        <div style={styles.setupFeeControls}>
                          <input
                            type="number"
                            value={item.setup_fee}
                            onChange={(e) => updateOrderItem(item.id, 'setup_fee', parseFloat(e.target.value) || 0)}
                            style={{
                              ...styles.setupFeeInput,
                              ...(item.setup_fee < item.original_setup_fee ? styles.setupFeeAdjusted : {})
                            }}
                            min="0"
                            step="1"
                          />
                          {item.setup_fee > 0 && (
                            <button
                              type="button"
                              onClick={() => updateOrderItem(item.id, 'setup_fee', 0)}
                              style={styles.waiveButton}
                            >
                              Waive
                            </button>
                          )}
                          {item.setup_fee === 0 && item.original_setup_fee > 0 && (
                            <button
                              type="button"
                              onClick={() => updateOrderItem(item.id, 'setup_fee', item.original_setup_fee)}
                              style={styles.restoreButton}
                            >
                              Restore ${item.original_setup_fee}
                            </button>
                          )}
                        </div>
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
              {isOneTime ? (
                <>
                  <div style={styles.summaryRow}>
                    <span>Order Type</span>
                    <span style={{ ...styles.summaryValue, color: '#8b5cf6' }}>One-Time</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Line Items Total</span>
                    <span style={styles.summaryValue}>{formatCurrency(totals.monthlyTotal)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.summaryRow}>
                    <span>Monthly Total</span>
                    <span style={styles.summaryValue}>{formatCurrency(totals.monthlyTotal)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Contract Term</span>
                    <span>{effectiveTermMonths} months</span>
                  </div>
                </>
              )}
              {totals.setupFees > 0 && (
                <div style={styles.summaryRow}>
                  <span>Setup Fees</span>
                  <span>{formatCurrency(totals.setupFees)}</span>
                </div>
              )}
            </div>

            <div style={styles.summaryTotal}>
              <span>{isOneTime ? 'Total' : 'Contract Total'}</span>
              <span style={styles.totalValue}>{formatCurrency(totals.contractTotal)}</span>
            </div>

            {totals.hasUnapprovedAdjustments && (
              <div style={styles.summaryWarning}>
                ⚠️ Price adjustments require approval before saving
              </div>
            )}

            <div style={styles.summaryActions}>
              <button
                onClick={() => handleSaveOrder('draft')}
                disabled={saving || totals.hasUnapprovedAdjustments}
                style={{
                  ...styles.saveButton,
                  ...(totals.hasUnapprovedAdjustments ? styles.buttonDisabled : {})
                }}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => handleSaveOrder('pending_approval')}
                disabled={saving || totals.hasUnapprovedAdjustments}
                style={{
                  ...styles.submitButton,
                  ...(totals.hasUnapprovedAdjustments ? styles.buttonDisabled : {})
                }}
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
              <span style={styles.statLabel}>Mediums</span>
              <span style={styles.statValue}>
                {[...new Set(orderItems.map(i => i.product_category))].length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal - Mobile Optimized Two-Step */}
      {showProductModal && (
        <ProductSelectorModal
          products={products}
          entities={entities}
          categories={categories}
          onSelect={addProductToOrder}
          onClose={() => setShowProductModal(false)}
          formatCurrency={formatCurrency}
        />
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <ClientModal
          onSave={handleCreateClient}
          onClose={() => setShowNewClientModal(false)}
          isEdit={false}
        />
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <ClientModal
          client={editingClient}
          onSave={handleUpdateClient}
          onClose={() => setEditingClient(null)}
          isEdit={true}
        />
      )}
    </div>
  );
}

// ============================================================
// PRODUCT SELECTOR MODAL - Mobile Optimized Two-Step
// ============================================================
function ProductSelectorModal({ products, entities, categories, onSelect, onClose, formatCurrency }) {
  const [step, setStep] = useState(1); // 1: Brand, 2: Medium, 3: Products
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedMedium, setSelectedMedium] = useState(null);

  // Brand configurations with icons and colors
  const brandConfig = {
    wsic: {
      name: 'WSIC Radio',
      icon: '📻',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      description: 'Radio, Podcast & Events'
    },
    lkn: {
      name: 'Lake Norman Woman',
      icon: '📰',
      color: '#ec4899',
      bgColor: '#fdf2f8',
      description: 'Print & Digital Advertising'
    },
    lwp: {
      name: 'LiveWorkPlay LKN',
      icon: '🌟',
      color: '#10b981',
      bgColor: '#ecfdf5',
      description: 'Combined audience reach'
    }
  };

  // Medium configurations with icons
  const mediumConfig = {
    broadcast: { icon: '📻', name: 'Broadcast', description: 'Radio commercials & sponsorships' },
    podcast: { icon: '🎙️', name: 'Podcast', description: 'Podcast ads & studio services' },
    'web-social': { icon: '🌐', name: 'Web & Social', description: 'Newsletters, websites & social' },
    events: { icon: '📅', name: 'Events', description: 'Sponsorships & live remotes' },
    programmatic: { icon: '💻', name: 'Programmatic Digital', description: 'Display, OTT/CTV & Meta ads' },
    print: { icon: '📰', name: 'Print', description: 'Magazine ads & editorials' }
  };

  // Map entity codes to brand keys
  const entityToBrand = {};
  entities.forEach(e => {
    if (e.code === 'wsic') entityToBrand[e.id] = 'wsic';
    if (e.code === 'lkn') entityToBrand[e.id] = 'lkn';
    if (e.code === 'lwp') entityToBrand[e.id] = 'lwp';
  });

  // Get mediums available for selected brand
  const getMediumsForBrand = (brandCode) => {
    if (brandCode === 'wsic') {
      return ['broadcast', 'podcast', 'events', 'web-social'];
    } else if (brandCode === 'lkn') {
      return ['programmatic', 'print', 'web-social'];
    } else if (brandCode === 'lwp') {
      return ['web-social'];
    }
    return [];
  };

  // Map category names to medium keys
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

  // Filter products for selected brand and medium
  const getFilteredProducts = () => {
    if (!selectedBrand || !selectedMedium) return [];
    
    // For LiveWorkPlay, show ONLY LWP products (no multi-brand options)
    if (selectedBrand === 'lwp') {
      return products.filter(p => {
        const productBrand = entityToBrand[p.entity_id];
        const productMedium = categoryToMedium(p.category_name);
        return productBrand === 'lwp' && productMedium === 'web-social';
      });
    }
    
    // For other brands, show only their brand-specific products
    return products.filter(p => {
      const productBrand = entityToBrand[p.entity_id];
      const productMedium = categoryToMedium(p.category_name);
      return productBrand === selectedBrand && productMedium === selectedMedium;
    });
  };

  // Get product count for a brand/medium combination
  const getProductCount = (brandCode, mediumCode) => {
    // For LWP, only count LWP products
    if (brandCode === 'lwp') {
      return products.filter(p => {
        const productBrand = entityToBrand[p.entity_id];
        return productBrand === 'lwp' && categoryToMedium(p.category_name) === 'web-social';
      }).length;
    }
    return products.filter(p => {
      const productBrand = entityToBrand[p.entity_id];
      const productMedium = categoryToMedium(p.category_name);
      return productBrand === brandCode && productMedium === mediumCode;
    }).length;
  };

  const handleBrandSelect = (brandCode) => {
    setSelectedBrand(brandCode);
    const mediums = getMediumsForBrand(brandCode);
    // If only one medium, skip to products
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
        // Skip back to brand selection if only one medium
        setSelectedMedium(null);
        setSelectedBrand(null);
        setStep(1);
      } else {
        setSelectedMedium(null);
        setStep(2);
      }
    } else if (step === 2) {
      setSelectedBrand(null);
      setStep(1);
    }
  };

  const handleProductSelect = (product) => {
    onSelect(product);
    // Reset for next selection
    setStep(1);
    setSelectedBrand(null);
    setSelectedMedium(null);
  };

  const filteredProducts = getFilteredProducts();
  const availableMediums = selectedBrand ? getMediumsForBrand(selectedBrand) : [];

  return (
    <div style={productSelectorStyles.overlay} onClick={onClose}>
      <div style={productSelectorStyles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={productSelectorStyles.header}>
          {step > 1 && (
            <button onClick={handleBack} style={productSelectorStyles.backButton}>
              ← Back
            </button>
          )}
          <h2 style={productSelectorStyles.title}>
            {step === 1 && 'Select Brand'}
            {step === 2 && `${brandConfig[selectedBrand]?.icon} ${brandConfig[selectedBrand]?.name}`}
            {step === 3 && `${mediumConfig[selectedMedium]?.icon} ${mediumConfig[selectedMedium]?.name}`}
          </h2>
          <button onClick={onClose} style={productSelectorStyles.closeButton}>
            <Icons.X />
          </button>
        </div>

        {/* Step 1: Select Brand */}
        {step === 1 && (
          <div style={productSelectorStyles.optionsList}>
            {Object.entries(brandConfig).map(([code, config]) => (
              <button
                key={code}
                onClick={() => handleBrandSelect(code)}
                style={{
                  ...productSelectorStyles.optionCard,
                  borderLeftColor: config.color,
                  backgroundColor: config.bgColor
                }}
              >
                <span style={productSelectorStyles.optionIcon}>{config.icon}</span>
                <div style={productSelectorStyles.optionContent}>
                  <div style={productSelectorStyles.optionName}>{config.name}</div>
                  <div style={productSelectorStyles.optionDesc}>{config.description}</div>
                </div>
                <span style={productSelectorStyles.optionArrow}>→</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Select Medium */}
        {step === 2 && (
          <div style={productSelectorStyles.optionsList}>
            {availableMediums.map(mediumCode => {
              const config = mediumConfig[mediumCode];
              const productCount = getProductCount(selectedBrand, mediumCode);

              return (
                <button
                  key={mediumCode}
                  onClick={() => handleMediumSelect(mediumCode)}
                  style={productSelectorStyles.optionCard}
                >
                  <span style={productSelectorStyles.optionIcon}>{config.icon}</span>
                  <div style={productSelectorStyles.optionContent}>
                    <div style={productSelectorStyles.optionName}>{config.name}</div>
                    <div style={productSelectorStyles.optionDesc}>{config.description}</div>
                  </div>
                  <div style={productSelectorStyles.optionMeta}>
                    <span style={productSelectorStyles.productCount}>{productCount}</span>
                    <span style={productSelectorStyles.optionArrow}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Select Product */}
        {step === 3 && (
          <div style={productSelectorStyles.productsList}>
            {filteredProducts.length === 0 ? (
              <div style={productSelectorStyles.emptyState}>
                No products available in this category
              </div>
            ) : (
              filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  style={productSelectorStyles.productCard}
                >
                  <div style={productSelectorStyles.productInfo}>
                    <div style={productSelectorStyles.productName}>{product.name}</div>
                    {product.description && (
                      <div style={productSelectorStyles.productDesc}>{product.description}</div>
                    )}
                  </div>
                  <div style={productSelectorStyles.productPricing}>
                    <div style={productSelectorStyles.productPrice}>
                      {formatCurrency(product.default_rate)}
                    </div>
                    <div style={productSelectorStyles.productRate}>{product.rate_type}</div>
                    {product.setup_fee > 0 && (
                      <div style={productSelectorStyles.setupFee}>
                        +{formatCurrency(product.setup_fee)} setup
                      </div>
                    )}
                  </div>
                  <span style={productSelectorStyles.addIcon}>+</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Product Selector Styles - Responsive (Mobile + Desktop)
const productSelectorStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    maxWidth: '480px',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    gap: '12px',
  },
  backButton: {
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
  },
  title: {
    flex: 1,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  closeButton: {
    padding: '8px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    border: 'none',
    borderLeft: '4px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.15s, box-shadow 0.15s',
    width: '100%',
  },
  optionIcon: {
    fontSize: '32px',
    lineHeight: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  optionDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  optionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  productCount: {
    padding: '4px 10px',
    backgroundColor: '#e2e8f0',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
  },
  optionArrow: {
    fontSize: '20px',
    color: '#94a3b8',
  },
  productsList: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    flex: 1,
  },
  productCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background-color 0.15s',
    width: '100%',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  productDesc: {
    fontSize: '13px',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  productPricing: {
    textAlign: 'right',
    flexShrink: 0,
  },
  productPrice: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
  },
  productRate: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  setupFee: {
    fontSize: '11px',
    color: '#f59e0b',
    marginTop: '2px',
  },
  addIcon: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    fontSize: '20px',
    fontWeight: '600',
    flexShrink: 0,
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '15px',
  },
  sectionDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 4px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  featuredProduct: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: '2px',
  },
  featuredBadge: {
    marginLeft: '8px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#10b981',
  },
};

// Client Modal Component (Create or Edit) - Multi-Contact Support
function ClientModal({ client, onSave, onClose, isEdit = false }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'contacts'
  const [editingContact, setEditingContact] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: client?.business_name || '',
    industry: client?.industry || '',
    website: client?.website || '',
    status: client?.status || 'prospect',
  });

  // Initialize contacts from client data
  const [contacts, setContacts] = useState(() => {
    if (client?.contacts && Array.isArray(client.contacts)) {
      // Map legacy 'primary' type to 'owner'
      return client.contacts.map(c => ({
        ...c,
        contact_type: c.contact_type === 'primary' ? 'owner' : (c.contact_type || 'other')
      }));
    }
    // Legacy single contact support
    if (client?.contact_first_name || client?.contact_last_name) {
      return [{
        id: 'legacy_primary',
        first_name: client.contact_first_name || '',
        last_name: client.contact_last_name || '',
        email: client.contact_email || '',
        phone: client.contact_phone || '',
        title: client.contact_title || '',
        contact_type: 'owner',
        is_primary: true
      }];
    }
    return [];
  });

  // Contact types (Owner is the primary/main contact)
  const contactTypes = [
    { value: 'owner', label: 'Owner/Decision Maker', icon: '👔' },
    { value: 'billing', label: 'Billing Contact', icon: '💰' },
    { value: 'marketing', label: 'Marketing/Branding', icon: '📢' },
    { value: 'other', label: 'Other', icon: '👤' }
  ];

  // Empty contact template
  const emptyContact = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    contact_type: '',
    is_primary: false
  };

  // Auto-format website URL
  const formatWebsite = (url) => {
    if (!url) return '';
    url = url.trim();
    if (url && !url.match(/^https?:\/\//i)) {
      url = url.replace(/^www\./i, '');
      url = 'https://' + url;
    }
    return url;
  };

  const handleAddContact = () => {
    setEditingContact({ ...emptyContact, id: `new_${Date.now()}` });
    setShowContactForm(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact({ ...contact });
    setShowContactForm(true);
  };

  const handleSaveContact = () => {
    if (!editingContact.first_name && !editingContact.last_name) {
      alert('Please enter at least a first or last name');
      return;
    }
    if (!editingContact.contact_type) {
      alert('Please select a contact type');
      return;
    }

    // If this contact is set as owner, make them the primary contact
    let updatedContacts = [...contacts];
    if (editingContact.contact_type === 'owner') {
      updatedContacts = updatedContacts.map(c => ({
        ...c,
        is_primary: false
      }));
      editingContact.is_primary = true;
    }

    // Find if editing existing or adding new
    const existingIndex = updatedContacts.findIndex(c => c.id === editingContact.id);
    if (existingIndex >= 0) {
      updatedContacts[existingIndex] = editingContact;
    } else {
      updatedContacts.push(editingContact);
    }

    // Ensure at least one primary contact (prefer owner type)
    const hasPrimary = updatedContacts.some(c => c.contact_type === 'owner' || c.is_primary);
    if (!hasPrimary && updatedContacts.length > 0) {
      updatedContacts[0].contact_type = 'primary';
      updatedContacts[0].is_primary = true;
    }

    setContacts(updatedContacts);
    setShowContactForm(false);
    setEditingContact(null);
  };

  const handleRemoveContact = (contactId) => {
    if (contacts.length <= 1) {
      alert('Client must have at least one contact');
      return;
    }
    const updatedContacts = contacts.filter(c => c.id !== contactId);
    // Ensure we still have a primary (prefer owner type)
    const hasPrimary = updatedContacts.some(c => c.contact_type === 'owner' || c.is_primary);
    if (!hasPrimary && updatedContacts.length > 0) {
      updatedContacts[0].contact_type = 'primary';
      updatedContacts[0].is_primary = true;
    }
    setContacts(updatedContacts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.business_name) {
      alert('Business name is required');
      return;
    }
    
    // Format website before saving
    const dataToSave = {
      ...formData,
      website: formatWebsite(formData.website),
      contacts: contacts
    };

    // For backward compatibility, also include primary contact fields
    const primaryContact = contacts.find(c => c.contact_type === 'owner' || c.is_primary) || contacts[0];
    if (primaryContact) {
      dataToSave.contact_first_name = primaryContact.first_name;
      dataToSave.contact_last_name = primaryContact.last_name;
      dataToSave.contact_email = primaryContact.email;
      dataToSave.contact_phone = primaryContact.phone;
      dataToSave.contact_title = primaryContact.title;
    }
    
    setSaving(true);
    try {
      if (isEdit && client?.id) {
        const response = await fetch(`${API_BASE}/api/orders/clients/${client.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });
        if (response.ok) {
          const updatedClient = await response.json();
          onSave({ ...updatedClient, contacts }, true);
        } else {
          throw new Error('Failed to update client');
        }
      } else {
        onSave(dataToSave, false);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const getContactTypeInfo = (type) => {
    // Handle legacy 'primary' type - map to 'owner'
    if (type === 'primary') {
      return contactTypes.find(t => t.value === 'owner');
    }
    // Find matching type or default to 'other' (last in array)
    return contactTypes.find(t => t.value === type) || contactTypes[contactTypes.length - 1];
  };

  // Contact Form Sub-modal
  if (showContactForm && editingContact) {
    return (
      <div style={styles.modalOverlay} onClick={() => setShowContactForm(false)}>
        <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>
              {editingContact.id?.startsWith('new_') ? 'Add Contact' : 'Edit Contact'}
            </h2>
            <button onClick={() => setShowContactForm(false)} style={styles.closeButton}>
              <Icons.X />
            </button>
          </div>
          
          <div style={styles.modalBody}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Type *</label>
              <select
                value={editingContact.contact_type}
                onChange={(e) => setEditingContact({...editingContact, contact_type: e.target.value})}
                style={{
                  ...styles.select,
                  color: editingContact.contact_type ? '#1e293b' : '#9ca3af'
                }}
              >
                <option value="" disabled>Select contact role...</option>
                {contactTypes.map(type => (
                  <option key={type.value} value={type.value} style={{ color: '#1e293b' }}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name *</label>
                <input
                  type="text"
                  value={editingContact.first_name}
                  onChange={(e) => setEditingContact({...editingContact, first_name: e.target.value})}
                  style={styles.input}
                  placeholder="Enter first name"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  value={editingContact.last_name}
                  onChange={(e) => setEditingContact({...editingContact, last_name: e.target.value})}
                  style={styles.input}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={editingContact.email}
                  onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                  style={styles.input}
                  placeholder="name@company.com"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  value={editingContact.phone}
                  onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                  style={styles.input}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Job Title</label>
              <input
                type="text"
                value={editingContact.title}
                onChange={(e) => setEditingContact({...editingContact, title: e.target.value})}
                style={styles.input}
                placeholder="e.g., Owner, Marketing Director, Accountant"
              />
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={() => setShowContactForm(false)} style={styles.secondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={handleSaveContact} style={styles.primaryButton}>
              {editingContact.id?.startsWith('new_') ? 'Add Contact' : 'Save Contact'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{isEdit ? 'Edit Client' : 'New Client'}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div style={clientModalStyles.tabs}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              ...clientModalStyles.tab,
              ...(activeTab === 'details' ? clientModalStyles.tabActive : {})
            }}
          >
            Business Details
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            style={{
              ...clientModalStyles.tab,
              ...(activeTab === 'contacts' ? clientModalStyles.tabActive : {})
            }}
          >
            Contacts ({contacts.length})
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.modalBody}>
            {/* Business Details Tab */}
            {activeTab === 'details' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Business Name *</label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    style={styles.input}
                    placeholder="Enter business or organization name"
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
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      style={styles.input}
                      placeholder="example.com"
                    />
                    <div style={styles.fieldHint}>https:// will be added automatically</div>
                  </div>
                </div>

                {/* Quick contact summary */}
                {contacts.length > 0 && (
                  <div style={clientModalStyles.contactSummary}>
                    <div style={clientModalStyles.contactSummaryHeader}>
                      <span style={clientModalStyles.contactSummaryTitle}>
                        {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('contacts')}
                        style={clientModalStyles.manageLink}
                      >
                        Manage →
                      </button>
                    </div>
                    {contacts.slice(0, 2).map(contact => {
                      const typeInfo = getContactTypeInfo(contact.contact_type);
                      return (
                        <div key={contact.id} style={clientModalStyles.contactMini}>
                          <span>{typeInfo.icon}</span>
                          <span>{contact.first_name} {contact.last_name}</span>
                          {contact.email && <span style={{ color: '#64748b' }}>• {contact.email}</span>}
                        </div>
                      );
                    })}
                    {contacts.length > 2 && (
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        +{contacts.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <>
                <div style={clientModalStyles.contactsHeader}>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    Client Contacts
                  </span>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    style={clientModalStyles.addContactButton}
                  >
                    + Add Contact
                  </button>
                </div>

                {contacts.length === 0 ? (
                  <div style={clientModalStyles.emptyContacts}>
                    <p>No contacts added yet</p>
                    <button
                      type="button"
                      onClick={handleAddContact}
                      style={clientModalStyles.addFirstButton}
                    >
                      + Add First Contact
                    </button>
                  </div>
                ) : (
                  <div style={clientModalStyles.contactsList}>
                    {contacts.map(contact => {
                      const typeInfo = getContactTypeInfo(contact.contact_type);
                      return (
                        <div key={contact.id} style={clientModalStyles.contactCard}>
                          <div style={clientModalStyles.contactIcon}>
                            {typeInfo.icon}
                          </div>
                          <div style={clientModalStyles.contactInfo}>
                            <div style={clientModalStyles.contactName}>
                              {contact.first_name} {contact.last_name}
                              {contact.contact_type === 'owner' && (
                                <span style={clientModalStyles.primaryBadge}>Main Contact</span>
                              )}
                            </div>
                            <div style={clientModalStyles.contactType}>{typeInfo.label}</div>
                            {contact.title && (
                              <div style={clientModalStyles.contactDetail}>{contact.title}</div>
                            )}
                            {contact.email && (
                              <div style={clientModalStyles.contactDetail}>📧 {contact.email}</div>
                            )}
                            {contact.phone && (
                              <div style={clientModalStyles.contactDetail}>📱 {contact.phone}</div>
                            )}
                          </div>
                          <div style={clientModalStyles.contactActions}>
                            <button
                              type="button"
                              onClick={() => handleEditContact(contact)}
                              style={clientModalStyles.contactActionBtn}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveContact(contact.id)}
                              style={{ ...clientModalStyles.contactActionBtn, color: '#ef4444' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.primaryButton}>
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Client Modal specific styles
const clientModalStyles = {
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
  },
  tab: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: '-1px',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  contactSummary: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  contactSummaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  contactSummaryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  manageLink: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  contactMini: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#374151',
    marginBottom: '4px',
  },
  contactsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  addContactButton: {
    padding: '8px 14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyContacts: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#64748b',
  },
  addFirstButton: {
    marginTop: '12px',
    padding: '10px 20px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    color: '#64748b',
    fontSize: '14px',
    cursor: 'pointer',
  },
  contactsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactCard: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  contactIcon: {
    fontSize: '24px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryBadge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  contactType: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  contactDetail: {
    fontSize: '13px',
    color: '#374151',
    marginTop: '4px',
  },
  contactActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contactActionBtn: {
    padding: '6px 10px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#64748b',
    cursor: 'pointer',
  },
};

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
  clientWebsite: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  clientActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  editClientButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#3b82f6',
    cursor: 'pointer',
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
  setupFeeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: '#fefce8',
    borderRadius: '8px',
    border: '1px solid #fef08a',
  },
  setupFeeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#854d0e',
  },
  waivedBadge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    backgroundColor: '#22c55e',
    color: 'white',
    borderRadius: '4px',
  },
  setupFeeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  setupFeeInput: {
    width: '80px',
    padding: '6px 8px',
    border: '1px solid #fde047',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'right',
    backgroundColor: 'white',
  },
  setupFeeAdjusted: {
    backgroundColor: '#fef9c3',
    borderColor: '#facc15',
  },
  waiveButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  restoreButton: {
    padding: '6px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #22c55e',
    borderRadius: '6px',
    color: '#16a34a',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
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
  // New styles for price adjustment and custom term
  customTermWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  cancelCustomButton: {
    padding: '10px 14px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  fieldHint: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '6px',
    fontStyle: 'italic',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    height: '46px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  oneTimeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#f3e8ff',
    border: '1px solid #d8b4fe',
    borderRadius: '8px',
    color: '#7c3aed',
    fontSize: '14px',
    fontWeight: '500',
    height: '46px',
  },
  itemDetailsSimple: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 1fr',
    gap: '12px',
    alignItems: 'end',
  },
  itemInputAdjusted: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  itemBookValue: {
    fontSize: '11px',
    padding: '2px 6px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '4px',
  },
  priceApprovalBox: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
  },
  approvalLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '13px',
    color: '#92400e',
    cursor: 'pointer',
  },
  approvalCheckbox: {
    marginTop: '2px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  approvalWarning: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: '500',
  },
  summaryWarning: {
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#fbbf24',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
