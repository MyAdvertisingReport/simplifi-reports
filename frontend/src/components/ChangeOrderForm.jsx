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
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  AlertTriangle: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  ArrowUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>,
  ArrowDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>,
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
};

export default function ChangeOrderForm() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const [newItems, setNewItems] = useState([]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [managementApproved, setManagementApproved] = useState(false);

  // Contract term/renewal fields
  const [updateContractTerm, setUpdateContractTerm] = useState(false);
  const [newTermMonths, setNewTermMonths] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [customTerm, setCustomTerm] = useState('');

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [ordersRes, productsRes, entitiesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders?status=signed,active&limit=100`, { headers }),
        fetch(`${API_BASE}/api/orders/products/list`, { headers }),
        fetch(`${API_BASE}/api/orders/entities/list`, { headers }),
        fetch(`${API_BASE}/api/orders/categories/list`, { headers })
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
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
        setNewItems(order.items?.map(item => ({
          ...item,
          id: item.id || Date.now() + Math.random(),
          isOriginal: true,
          isRemoved: false,
          originalPrice: parseFloat(item.unit_price),
        })) || []);
        setEffectiveDate(new Date().toISOString().split('T')[0]);
        // Pre-populate contract dates from original order
        if (order.contract_start_date) {
          setNewStartDate(order.contract_start_date.split('T')[0]);
        }
        if (order.term_months) {
          setNewTermMonths(order.term_months.toString());
        }
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  // Calculate end date when start date or term changes
  const calculatedEndDate = useMemo(() => {
    if (!newStartDate || !updateContractTerm) return newEndDate;
    const months = isCustomTerm ? (parseInt(customTerm) || 0) : parseInt(newTermMonths);
    if (!months) return '';
    const start = new Date(newStartDate);
    start.setMonth(start.getMonth() + months);
    start.setDate(start.getDate() - 1);
    return start.toISOString().split('T')[0];
  }, [newStartDate, newTermMonths, customTerm, isCustomTerm, updateContractTerm]);

  // Update newEndDate when calculated changes
  useEffect(() => {
    if (updateContractTerm && calculatedEndDate) {
      setNewEndDate(calculatedEndDate);
    }
  }, [calculatedEndDate, updateContractTerm]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return orders.slice(0, 10);
    return orders.filter(o => 
      o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.client_name?.toLowerCase().includes(orderSearch.toLowerCase())
    ).slice(0, 10);
  }, [orders, orderSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedEntity && p.entity_id !== selectedEntity) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      return true;
    });
  }, [products, selectedEntity, selectedCategory]);

  const changeSummary = useMemo(() => {
    if (!selectedOrder) return null;
    const originalItems = selectedOrder.items || [];
    const originalMonthly = originalItems.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0);
    const activeNewItems = newItems.filter(item => !item.isRemoved);
    const newMonthly = activeNewItems.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0);
    const monthlyDifference = newMonthly - originalMonthly;

    const addedItems = activeNewItems.filter(item => !item.isOriginal);
    const removedItems = newItems.filter(item => item.isOriginal && item.isRemoved);
    const modifiedItems = activeNewItems.filter(item => {
      if (!item.isOriginal) return false;
      return item.originalPrice !== parseFloat(item.unit_price);
    });

    return {
      originalMonthly,
      newMonthly,
      monthlyDifference,
      addedItems,
      removedItems,
      modifiedItems,
      hasChanges: addedItems.length > 0 || removedItems.length > 0 || modifiedItems.length > 0,
    };
  }, [selectedOrder, newItems]);

  const addProductToOrder = (product) => {
    const newItem = {
      id: Date.now(),
      product_id: product.id,
      entity_id: product.entity_id,
      product_name: product.name,
      product_category: product.category || product.category_code,
      unit_price: parseFloat(product.default_rate) || 0,
      quantity: 1,
      line_total: parseFloat(product.default_rate) || 0,
      setup_fee: parseFloat(product.setup_fee) || 0,
      entity_name: product.entity_name,
      isOriginal: false,
      isRemoved: false,
    };
    setNewItems([...newItems, newItem]);
    setShowProductModal(false);
  };

  const updateOrderItem = (itemId, field, value) => {
    setNewItems(newItems.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'unit_price' || field === 'quantity') {
        updated.line_total = (parseFloat(updated.unit_price) || 0) * (parseInt(updated.quantity) || 1);
      }
      return updated;
    }));
  };

  const toggleRemoveItem = (itemId) => {
    setNewItems(newItems.map(item => 
      item.id === itemId ? { ...item, isRemoved: !item.isRemoved } : item
    ));
  };

  const deleteNewItem = (itemId) => {
    setNewItems(newItems.filter(item => item.id !== itemId));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const handleSubmit = () => {
    if (!managementApproved) {
      alert('Please confirm you have discussed this change with management');
      return;
    }
    if (!changeSummary?.hasChanges) {
      alert('No changes have been made to this order');
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
      const changeOrderData = {
        parent_order_id: selectedOrder.id,
        order_type: 'change',
        effective_date: effectiveDate,
        notes: changeNotes,
        management_approval_confirmed: managementApproved,
        signature: signature.trim(),
        change_summary: {
          original_monthly: changeSummary.originalMonthly,
          new_monthly: changeSummary.newMonthly,
          difference: changeSummary.monthlyDifference,
          added: changeSummary.addedItems.map(i => ({ name: i.product_name, price: i.unit_price })),
          removed: changeSummary.removedItems.map(i => ({ name: i.product_name, price: i.unit_price })),
          modified: changeSummary.modifiedItems.map(i => ({ name: i.product_name, old: i.originalPrice, new: i.unit_price })),
        },
        items: newItems.filter(i => !i.isRemoved).map(item => ({
          entity_id: item.entity_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          entity_name: item.entity_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          setup_fee: item.setup_fee || 0,
        })),
      };

      const response = await fetch(`${API_BASE}/api/orders/change`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(changeOrderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create change order');
      }

      const result = await response.json();
      setSavedOrder(result);
      setShowSuccess(true);
      setShowSignatureModal(false);
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to create change order: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (showSuccess && savedOrder) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}><Icons.Check /></div>
          <h1 style={styles.successTitle}>Change Order Submitted!</h1>
          <p style={styles.successSubtitle}>
            Change order <strong>{savedOrder.order_number}</strong> has been created and sent to the client for signature.
          </p>
          <div style={styles.changeSummaryCard}>
            <div style={styles.changeRow}>
              <span>Previous Monthly</span>
              <span>{formatCurrency(changeSummary.originalMonthly)}</span>
            </div>
            <div style={styles.changeRow}>
              <span>New Monthly</span>
              <span>{formatCurrency(changeSummary.newMonthly)}</span>
            </div>
            <div style={{...styles.changeRow, ...styles.changeTotal}}>
              <span>Monthly Change</span>
              <span style={{ color: changeSummary.monthlyDifference >= 0 ? '#10b981' : '#ef4444' }}>
                {changeSummary.monthlyDifference >= 0 ? '+' : ''}{formatCurrency(changeSummary.monthlyDifference)}
              </span>
            </div>
          </div>
          <div style={styles.successActions}>
            <button onClick={() => navigate('/orders')} style={styles.primaryButton}>View All Orders</button>
            <button onClick={() => window.location.reload()} style={styles.secondaryButton}>Create Another</button>
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
          <h1 style={styles.title}>Create Change Order</h1>
          <p style={styles.subtitle}>Modify an existing contract with electronic signature</p>
        </div>
      </div>

      <div style={styles.formGrid}>
        <div style={styles.mainColumn}>
          {/* Step 1: Select Order */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>1</span>Select Order to Modify</h2>
            
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
                    <strong style={{ fontSize: '16px' }}>{selectedOrder.order_number}</strong>
                    <span style={{ color: '#6b7280', marginLeft: '8px' }}>{selectedOrder.client_name}</span>
                  </div>
                  <button onClick={() => { setSelectedOrder(null); setNewItems([]); setOrderSearch(''); }} style={styles.changeButton}>Change</button>
                </div>
                <div style={styles.orderDetails}>
                  <div><span>Monthly:</span> <strong>{formatCurrency(selectedOrder.monthly_total)}</strong></div>
                  <div><span>Term:</span> <strong>{selectedOrder.term_months} months</strong></div>
                  <div><span>Start:</span> <strong>{new Date(selectedOrder.contract_start_date).toLocaleDateString()}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Modify Products */}
          {selectedOrder && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>2</span>Modify Products</h2>
              
              <div style={styles.productList}>
                {newItems.map((item) => (
                  <div key={item.id} style={{
                    ...styles.productItem,
                    opacity: item.isRemoved ? 0.5 : 1,
                    backgroundColor: item.isRemoved ? '#fef2f2' : item.isOriginal ? '#f9fafb' : '#ecfdf5',
                    borderColor: item.isRemoved ? '#fecaca' : item.isOriginal ? '#e2e8f0' : '#a7f3d0',
                  }}>
                    <div style={styles.productInfo}>
                      <span style={{ ...styles.productName, textDecoration: item.isRemoved ? 'line-through' : 'none' }}>
                        {item.product_name}
                      </span>
                      <span style={styles.productEntity}>{item.entity_name}</span>
                      {!item.isOriginal && <span style={styles.newBadge}>New</span>}
                    </div>
                    
                    <div style={styles.productPricing}>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateOrderItem(item.id, 'unit_price', e.target.value)}
                        style={styles.priceInput}
                        disabled={item.isRemoved}
                        step="0.01"
                      />
                      <span style={styles.perMonth}>/mo</span>
                    </div>

                    {item.isOriginal ? (
                      <button onClick={() => toggleRemoveItem(item.id)} style={{
                        ...styles.actionButton,
                        color: item.isRemoved ? '#10b981' : '#ef4444',
                      }}>
                        {item.isRemoved ? <Icons.Undo /> : <Icons.Trash />}
                      </button>
                    ) : (
                      <button onClick={() => deleteNewItem(item.id)} style={{ ...styles.actionButton, color: '#ef4444' }}>
                        <Icons.Trash />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => setShowProductModal(true)} style={styles.addMoreButton}>
                <Icons.Plus /> Add Product
              </button>
            </div>
          )}

          {/* Step 3: Change Details */}
          {selectedOrder && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}><span style={styles.stepNumber}>3</span>Change Details</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Effective Date *</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Contract Term Update / Renewal Section */}
              <div style={styles.renewalSection}>
                <label style={styles.renewalToggle}>
                  <input
                    type="checkbox"
                    checked={updateContractTerm}
                    onChange={(e) => setUpdateContractTerm(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginRight: '10px' }}
                  />
                  <div>
                    <strong style={{ color: '#1e293b' }}>Update Contract Term / Renew Contract</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Check this to extend or modify the contract dates
                    </p>
                  </div>
                </label>

                {updateContractTerm && (
                  <div style={styles.renewalFields}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>New Contract Term *</label>
                      <select
                        value={isCustomTerm ? 'custom' : newTermMonths}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setIsCustomTerm(true);
                            setNewTermMonths('');
                          } else {
                            setIsCustomTerm(false);
                            setNewTermMonths(e.target.value);
                            setCustomTerm('');
                          }
                        }}
                        style={styles.select}
                      >
                        <option value="">Select term...</option>
                        <option value="1">1 Month</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                        <option value="36">36 Months</option>
                        <option value="custom">Custom...</option>
                      </select>
                    </div>

                    {isCustomTerm && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Custom Term (months)</label>
                        <input
                          type="number"
                          value={customTerm}
                          onChange={(e) => setCustomTerm(e.target.value)}
                          placeholder="Number of months"
                          style={styles.input}
                          min="1"
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>New Start Date *</label>
                        <input
                          type="date"
                          value={newStartDate}
                          onChange={(e) => setNewStartDate(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>New End Date</label>
                        <input
                          type="date"
                          value={newEndDate}
                          readOnly
                          style={{ ...styles.input, backgroundColor: '#f3f4f6' }}
                        />
                      </div>
                    </div>

                    {selectedOrder && (
                      <div style={styles.currentTermInfo}>
                        <span>Current: {selectedOrder.term_months} months</span>
                        <span>•</span>
                        <span>{selectedOrder.contract_start_date?.split('T')[0]} to {selectedOrder.contract_end_date?.split('T')[0]}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason for Change</label>
                <textarea
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="Describe the reason for this change order (e.g., renewal, adding services, price adjustment)..."
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              {/* Management Approval Checkbox */}
              <div style={styles.approvalBox}>
                <label style={styles.approvalLabel}>
                  <input
                    type="checkbox"
                    checked={managementApproved}
                    onChange={(e) => setManagementApproved(e.target.checked)}
                    style={styles.approvalCheckbox}
                  />
                  <div>
                    <strong>I have discussed this change order with Management and received approval to proceed.</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      This confirmation is required for all change orders.
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
            <h3 style={styles.summaryTitle}>Change Summary</h3>
            
            {changeSummary ? (
              <>
                <div style={styles.summarySection}>
                  <div style={styles.summaryRow}>
                    <span>Current Monthly</span>
                    <span>{formatCurrency(changeSummary.originalMonthly)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>New Monthly</span>
                    <span>{formatCurrency(changeSummary.newMonthly)}</span>
                  </div>
                </div>

                <div style={{
                  ...styles.differenceBox,
                  backgroundColor: changeSummary.monthlyDifference >= 0 ? '#ecfdf5' : '#fef2f2',
                  borderColor: changeSummary.monthlyDifference >= 0 ? '#a7f3d0' : '#fecaca',
                }}>
                  <span>Monthly Difference</span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: changeSummary.monthlyDifference >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '18px',
                    fontWeight: '700',
                  }}>
                    {changeSummary.monthlyDifference >= 0 ? <Icons.ArrowUp /> : <Icons.ArrowDown />}
                    {changeSummary.monthlyDifference >= 0 ? '+' : ''}{formatCurrency(changeSummary.monthlyDifference)}
                  </div>
                </div>

                {changeSummary.addedItems.length > 0 && (
                  <div style={styles.changeListSection}>
                    <h4 style={{ ...styles.changeListTitle, color: '#10b981' }}>+ Added ({changeSummary.addedItems.length})</h4>
                    {changeSummary.addedItems.map((item, i) => (
                      <div key={i} style={styles.changeListItem}>{item.product_name}</div>
                    ))}
                  </div>
                )}

                {changeSummary.removedItems.length > 0 && (
                  <div style={styles.changeListSection}>
                    <h4 style={{ ...styles.changeListTitle, color: '#ef4444' }}>− Removed ({changeSummary.removedItems.length})</h4>
                    {changeSummary.removedItems.map((item, i) => (
                      <div key={i} style={styles.changeListItem}>{item.product_name}</div>
                    ))}
                  </div>
                )}

                {changeSummary.modifiedItems.length > 0 && (
                  <div style={styles.changeListSection}>
                    <h4 style={{ ...styles.changeListTitle, color: '#f59e0b' }}>~ Modified ({changeSummary.modifiedItems.length})</h4>
                    {changeSummary.modifiedItems.map((item, i) => (
                      <div key={i} style={styles.changeListItem}>
                        {item.product_name}: {formatCurrency(item.originalPrice)} → {formatCurrency(item.unit_price)}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!changeSummary.hasChanges || !managementApproved}
                  style={{
                    ...styles.submitButton,
                    opacity: (!changeSummary.hasChanges || !managementApproved) ? 0.5 : 1,
                  }}
                >
                  Submit Change Order
                </button>
              </>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Select an order to see change summary</p>
            )}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProductModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Add Product</h3>
              <button onClick={() => setShowProductModal(false)} style={styles.modalClose}><Icons.X /></button>
            </div>
            <div style={styles.modalFilters}>
              <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} style={styles.filterSelect}>
                <option value="">All Brands</option>
                {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={styles.filterSelect}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.modalProductList}>
              {filteredProducts.map((product) => (
                <button key={product.id} onClick={() => addProductToOrder(product)} style={styles.modalProductItem}>
                  <div style={styles.modalProductInfo}>
                    <span style={styles.modalProductName}>{product.name}</span>
                    <span style={styles.modalProductMeta}>{product.entity_name} • {product.category_name}</span>
                  </div>
                  <div style={styles.modalProductPrice}>
                    <span>{formatCurrency(product.default_rate)}</span>
                    <span style={styles.modalPriceType}>/mo</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.signatureModal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Sign Change Order</h3>
              <button onClick={() => setShowSignatureModal(false)} style={styles.modalClose}><Icons.X /></button>
            </div>
            <div style={styles.signatureBody}>
              <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                By signing below, you confirm that you have management approval for this change order
                and authorize it to be sent to the client for signature.
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
                <button onClick={handleSignatureSubmit} disabled={saving} style={styles.primaryButton}>
                  {saving ? 'Submitting...' : 'Submit Change Order'}
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
  header: { marginBottom: '32px' },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 0', marginBottom: '16px', background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' },
  mainColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
  section: { background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0' },
  stepNumber: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#f59e0b', color: 'white', borderRadius: '50%', fontSize: '14px', fontWeight: '600' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '300px', overflowY: 'auto' },
  dropdownItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'none', cursor: 'pointer', textAlign: 'left' },
  orderNumber: { fontWeight: '600', color: '#1e293b', marginRight: '8px' },
  clientName: { color: '#6b7280', fontSize: '14px' },
  orderAmount: { color: '#10b981', fontWeight: '500' },
  selectedOrderCard: { marginTop: '16px', padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' },
  selectedOrderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  changeButton: { padding: '6px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  orderDetails: { display: 'flex', gap: '24px', fontSize: '14px', color: '#6b7280' },
  productList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  productItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '8px', border: '1px solid', transition: 'all 0.2s' },
  productInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  productName: { fontSize: '14px', fontWeight: '500', color: '#1e293b' },
  productEntity: { fontSize: '12px', color: '#6b7280' },
  newBadge: { display: 'inline-block', padding: '2px 8px', background: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', marginTop: '4px', width: 'fit-content' },
  productPricing: { display: 'flex', alignItems: 'center', gap: '4px' },
  priceInput: { width: '100px', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', textAlign: 'right' },
  perMonth: { fontSize: '13px', color: '#6b7280' },
  actionButton: { padding: '8px', background: 'none', border: 'none', cursor: 'pointer' },
  addMoreButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'none', border: '2px dashed #d1d5db', borderRadius: '8px', color: '#6b7280', fontSize: '14px', cursor: 'pointer', marginTop: '12px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' },
  renewalSection: { marginBottom: '20px', padding: '16px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px' },
  renewalToggle: { display: 'flex', alignItems: 'flex-start', cursor: 'pointer' },
  renewalFields: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fef08a' },
  currentTermInfo: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280', marginTop: '8px', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' },
  approvalBox: { marginTop: '20px', padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' },
  approvalLabel: { display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '14px', color: '#92400e' },
  approvalCheckbox: { marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' },
  sidebar: { position: 'sticky', top: '24px' },
  summaryCard: { background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' },
  summaryTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 20px 0' },
  summarySection: { marginBottom: '16px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b' },
  differenceBox: { padding: '16px', borderRadius: '8px', border: '1px solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  changeListSection: { marginBottom: '16px' },
  changeListTitle: { fontSize: '13px', fontWeight: '600', marginBottom: '8px' },
  changeListItem: { fontSize: '13px', color: '#6b7280', padding: '4px 0' },
  submitButton: { width: '100%', padding: '14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', width: '600px', maxHeight: '80vh', overflow: 'hidden' },
  signatureModal: { background: 'white', borderRadius: '16px', width: '500px', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: '18px', fontWeight: '600', margin: 0 },
  modalClose: { padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalFilters: { display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f9fafb' },
  filterSelect: { flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: 'white' },
  modalProductList: { maxHeight: '400px', overflowY: 'auto' },
  modalProductItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 24px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'none', cursor: 'pointer', textAlign: 'left' },
  modalProductInfo: { display: 'flex', flexDirection: 'column' },
  modalProductName: { fontSize: '14px', fontWeight: '500', color: '#1e293b' },
  modalProductMeta: { fontSize: '12px', color: '#6b7280' },
  modalProductPrice: { textAlign: 'right' },
  modalPriceType: { fontSize: '12px', color: '#6b7280' },
  signatureBody: { padding: '24px' },
  signatureActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  primaryButton: { padding: '12px 24px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  secondaryButton: { padding: '12px 24px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  successContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' },
  successCard: { background: 'white', borderRadius: '16px', padding: '48px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  successIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', margin: '0 auto 24px' },
  successTitle: { fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' },
  successSubtitle: { fontSize: '16px', color: '#64748b', margin: '0 0 24px 0' },
  changeSummaryCard: { background: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' },
  changeRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#64748b' },
  changeTotal: { borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px', fontWeight: '600', color: '#1e293b' },
  successActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
