import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Auth helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  File: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
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
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
};

export default function UploadOrderForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
  
  // Order details
  const [orderItems, setOrderItems] = useState([]);
  const [contractStartDate, setContractStartDate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [customTerm, setCustomTerm] = useState('');
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [isOneTime, setIsOneTime] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [signedDate, setSignedDate] = useState('');

  // File upload
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // New Client Modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClient, setNewClient] = useState({
    business_name: '',
    contact_first_name: '',
    contact_last_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Payment/Billing Info (from signed contract)
  const [paymentMethod, setPaymentMethod] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  
  // Credit Card Details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardZip, setCardZip] = useState('');
  
  // ACH Details
  const [achName, setAchName] = useState('');
  const [achRouting, setAchRouting] = useState('');
  const [achAccount, setAchAccount] = useState('');
  const [achType, setAchType] = useState('checking');
  
  // Invoice/Check Details
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoicePO, setInvoicePO] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  
  // Payment processing state
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSaved, setPaymentSaved] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new client
  const handleCreateClient = async () => {
    if (!newClient.business_name.trim()) {
      alert('Business name is required');
      return;
    }
    if (!newClient.contact_email.trim()) {
      alert('Contact email is required');
      return;
    }

    setCreatingClient(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/clients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newClient),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create client');
      }

      const createdClient = await response.json();
      
      // Add to clients list and select it
      setClients(prev => [createdClient, ...prev]);
      setSelectedClient(createdClient);
      setClientSearch(createdClient.business_name);
      setShowNewClientModal(false);
      setNewClient({
        business_name: '',
        contact_first_name: '',
        contact_last_name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
      });
    } catch (error) {
      console.error('Error creating client:', error);
      alert(`Failed to create client: ${error.message}`);
    } finally {
      setCreatingClient(false);
    }
  };

  // Save payment method to Stripe
  const savePaymentToStripe = async () => {
    if (!selectedClient) {
      setPaymentError('Please select a client first');
      return false;
    }

    // Determine entity code from order items
    const entityCode = orderItems.length > 0 
      ? (entities.find(e => e.id === orderItems[0].entity_id)?.code || 'wsic')
      : 'wsic';

    setProcessingPayment(true);
    setPaymentError('');

    try {
      if (paymentMethod === 'credit_card') {
        // Parse expiry
        const [expMonth, expYear] = cardExpiry.split('/').map(s => s.trim());
        
        if (!cardNumber || !expMonth || !expYear || !cardCvc) {
          throw new Error('Please fill in all card details');
        }

        const response = await fetch(`${API_BASE}/api/orders/payment-method/card`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            entityCode,
            clientId: selectedClient.id,
            cardNumber: cardNumber.replace(/\s/g, ''),
            expMonth,
            expYear,
            cvc: cardCvc,
            zip: cardZip,
            clientEmail: selectedClient.contact_email,
            clientName: selectedClient.business_name,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to save card');
        }

        setPaymentSaved(true);
        console.log('Card saved:', result.card);
        return true;

      } else if (paymentMethod === 'ach') {
        if (!achName || !achRouting || !achAccount) {
          throw new Error('Please fill in all bank account details');
        }

        const response = await fetch(`${API_BASE}/api/orders/payment-method/ach`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            entityCode,
            clientId: selectedClient.id,
            accountHolderName: achName,
            routingNumber: achRouting,
            accountNumber: achAccount,
            accountType: achType,
            clientEmail: selectedClient.contact_email,
            clientName: selectedClient.business_name,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to save bank account');
        }

        setPaymentSaved(true);
        console.log('Bank account saved:', result.bankAccount);
        return true;
      }

      // For check/invoice, no Stripe action needed
      return true;

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message);
      return false;
    } finally {
      setProcessingPayment(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  // Format expiry as MM/YY
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? ' / ' + v.substring(2, 4) : '');
    }
    return v;
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 10);
    return clients.filter(c => 
      c.business_name?.toLowerCase().includes(clientSearch.toLowerCase())
    ).slice(0, 10);
  }, [clients, clientSearch]);

  // Filter products
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
    if (isOneTime) return contractStartDate;
    
    const months = isCustomTerm ? (parseInt(customTerm) || 0) : parseInt(termMonths);
    if (!months) return '';
    const start = new Date(contractStartDate + 'T00:00:00');
    start.setMonth(start.getMonth() + months);
    start.setDate(start.getDate() - 1);
    return start.toISOString().split('T')[0];
  }, [contractStartDate, termMonths, customTerm, isCustomTerm, isOneTime]);

  // Get effective term months
  const effectiveTermMonths = useMemo(() => {
    if (isOneTime) return 1;
    return isCustomTerm ? (parseInt(customTerm) || 0) : parseInt(termMonths);
  }, [termMonths, customTerm, isCustomTerm, isOneTime]);

  // Calculate totals
  const totals = useMemo(() => {
    const lineItemsTotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const setupFees = orderItems.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0);
    const contractTotal = isOneTime 
      ? lineItemsTotal + setupFees
      : (lineItemsTotal * effectiveTermMonths) + setupFees;
    
    return { monthlyTotal: lineItemsTotal, setupFees, contractTotal };
  }, [orderItems, effectiveTermMonths, isOneTime]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setUploadError('File size must be less than 10MB');
        return;
      }
      setUploadedFile(file);
      setUploadError('');
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Please upload a PDF file');
        return;
      }
      setUploadedFile(file);
      setUploadError('');
    }
  };

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
      original_price: parseFloat(product.default_rate) || 0,
      quantity: 1,
      line_total: parseFloat(product.default_rate) || 0,
      setup_fee: setupFee,
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
      if (field === 'unit_price' || field === 'quantity') {
        const price = parseFloat(updated.unit_price) || 0;
        const qty = parseInt(updated.quantity) || 1;
        updated.line_total = price * qty;
      }
      return updated;
    }));
  };

  // Remove item
  const removeOrderItem = (itemId) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  // Submit order
  const handleSubmit = async () => {
    // Validation
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    if (!uploadedFile) {
      alert('Please upload the signed contract PDF');
      return;
    }
    if (!contractStartDate) {
      alert('Please select a contract start date');
      return;
    }
    if (!signedDate) {
      alert('Please enter the date the contract was signed');
      return;
    }
    if (orderItems.length === 0) {
      alert('Please add at least one product');
      return;
    }

    setSaving(true);
    try {
      // Step 1: Upload the PDF file
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('client_id', selectedClient.id);
      formData.append('document_type', 'contract');

      const uploadResponse = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload document');
      }

      const uploadedDoc = await uploadResponse.json();

      // Step 2: Create the order with status 'signed'
      const orderData = {
        client_id: selectedClient.id,
        order_type: 'upload',
        status: 'signed',
        contract_start_date: contractStartDate,
        contract_end_date: contractEndDate,
        term_months: effectiveTermMonths,
        billing_frequency: 'monthly',
        notes: orderNotes,
        uploaded_document_id: uploadedDoc.id,
        client_signature_date: signedDate,
        items: orderItems.map(item => ({
          entity_id: item.entity_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          entity_name: item.entity_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          original_price: item.original_price || item.unit_price,
          discount_percent: 0,
          line_total: item.line_total,
          setup_fee: item.setup_fee || 0,
          notes: item.notes,
        })),
      };

      const orderResponse = await fetch(`${API_BASE}/api/orders/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const createdOrder = await orderResponse.json();
      setSavedOrder(createdOrder);
      setShowSuccess(true);

    } catch (error) {
      console.error('Error creating upload order:', error);
      alert(`Failed to create order: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Success Page
  if (showSuccess && savedOrder) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>
            <Icons.Check />
          </div>
          <h1 style={styles.successTitle}>Contract Uploaded Successfully!</h1>
          <p style={styles.successSubtitle}>
            Order <strong>{savedOrder.order_number}</strong> has been created for {selectedClient?.business_name}
          </p>
          
          <div style={styles.successSummary}>
            <div style={styles.summaryRow}>
              <span>Document:</span>
              <span style={styles.summaryValue}>{uploadedFile?.name}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Signed Date:</span>
              <span style={styles.summaryValue}>{new Date(signedDate).toLocaleDateString()}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Contract Term:</span>
              <span style={styles.summaryValue}>{effectiveTermMonths} months</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Monthly Total:</span>
              <span style={styles.summaryValue}>{formatCurrency(totals.monthlyTotal)}</span>
            </div>
            <div style={styles.summaryRowTotal}>
              <span>Contract Value:</span>
              <span style={styles.totalValue}>{formatCurrency(totals.contractTotal)}</span>
            </div>
          </div>

          <div style={styles.successActions}>
            <button
              onClick={() => navigate('/orders')}
              style={styles.primaryButton}
            >
              View All Orders
            </button>
            <button
              onClick={() => {
                setShowSuccess(false);
                setSelectedClient(null);
                setUploadedFile(null);
                setOrderItems([]);
                setContractStartDate('');
                setTermMonths('');
                setSignedDate('');
              }}
              style={styles.secondaryButton}
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/orders/new/select')} style={styles.backButton}>
          <Icons.ArrowLeft />
          <span>Back</span>
        </button>
        <div>
          <h1 style={styles.title}>Upload Signed Contract</h1>
          <p style={styles.subtitle}>Upload a pre-signed contract PDF to create an order</p>
        </div>
      </div>

      <div style={styles.formGrid}>
        {/* Main Form */}
        <div style={styles.mainColumn}>
          {/* Step 1: Upload PDF */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.stepNumber}>1</span>
              Upload Signed Contract
            </h2>
            
            <div
              style={{
                ...styles.dropZone,
                borderColor: uploadedFile ? '#10b981' : uploadError ? '#ef4444' : '#d1d5db',
                backgroundColor: uploadedFile ? '#ecfdf5' : uploadError ? '#fef2f2' : '#f9fafb',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {uploadedFile ? (
                <div style={styles.uploadedFileInfo}>
                  <Icons.File />
                  <div style={styles.fileDetails}>
                    <span style={styles.fileName}>{uploadedFile.name}</span>
                    <span style={styles.fileSize}>
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    style={styles.removeFileButton}
                  >
                    <Icons.X />
                  </button>
                </div>
              ) : (
                <>
                  <Icons.Upload />
                  <p style={styles.dropZoneText}>
                    Drag & drop your signed contract PDF here
                  </p>
                  <p style={styles.dropZoneSubtext}>
                    or click to browse (max 10MB)
                  </p>
                </>
              )}
            </div>
            
            {uploadError && (
              <p style={styles.errorText}>{uploadError}</p>
            )}
          </div>

          {/* Step 2: Client Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.stepNumber}>2</span>
              Select Client
            </h2>
            
            <div style={styles.clientSearchRow}>
              <div style={styles.clientSearchWrapper}>
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
                  style={styles.clientSearchInput}
                />
                
                {showClientDropdown && (
                  <div style={styles.clientDropdown}>
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearch(client.business_name);
                            setShowClientDropdown(false);
                          }}
                          style={styles.clientOption}
                        >
                          <span style={styles.clientName}>{client.business_name}</span>
                          {client.contact_email && (
                            <span style={styles.clientEmail}>{client.contact_email}</span>
                          )}
                        </button>
                      ))
                    ) : clientSearch && (
                      <div style={styles.noResults}>
                        No clients found matching "{clientSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowNewClientModal(true)}
                style={styles.createClientButton}
              >
                <Icons.Plus /> New Client
              </button>
            </div>

            {selectedClient && (
              <div style={styles.selectedClientCard}>
                <div style={styles.selectedClientInfo}>
                  <strong>{selectedClient.business_name}</strong>
                  {selectedClient.contact_first_name && (
                    <span>{selectedClient.contact_first_name} {selectedClient.contact_last_name}</span>
                  )}
                  {selectedClient.contact_email && (
                    <span>{selectedClient.contact_email}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch('');
                  }}
                  style={styles.changeClientButton}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Contract Details */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.stepNumber}>3</span>
              Contract Details
            </h2>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date Signed *</label>
                <input
                  type="date"
                  value={signedDate}
                  onChange={(e) => setSignedDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contract Start Date *</label>
                <input
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contract Term *</label>
                {isCustomTerm ? (
                  <div style={styles.customTermRow}>
                    <input
                      type="number"
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      placeholder="Months"
                      style={styles.input}
                      min="1"
                    />
                    <button
                      onClick={() => {
                        setIsCustomTerm(false);
                        setCustomTerm('');
                      }}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={isOneTime ? 'one-time' : termMonths}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'one-time') {
                        setIsOneTime(true);
                        setTermMonths('1');
                      } else if (val === 'custom') {
                        setIsCustomTerm(true);
                        setIsOneTime(false);
                      } else {
                        setIsOneTime(false);
                        setTermMonths(val);
                      }
                    }}
                    style={styles.select}
                  >
                    <option value="">Select term...</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="one-time">One-Time</option>
                    <option value="custom">Custom...</option>
                  </select>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contract End Date</label>
                <input
                  type="text"
                  value={contractEndDate ? new Date(contractEndDate).toLocaleDateString() : '—'}
                  disabled
                  style={{ ...styles.input, backgroundColor: '#f3f4f6' }}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Any additional notes about this order..."
                style={styles.textarea}
                rows={3}
              />
            </div>

            {/* Payment Information from Signed Contract */}
            <div style={styles.paymentSection}>
              <h3 style={styles.paymentTitle}>Payment Information (from signed contract)</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select payment method...</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="ach">ACH / Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="invoice">Invoice / Net 30</option>
                </select>
              </div>

              {/* Credit Card Entry */}
              {paymentMethod === 'credit_card' && (
                <div style={styles.cardEntrySection}>
                  <div style={styles.cardEntryHeader}>
                    <span style={styles.lockIcon}>🔒</span>
                    <span>Enter card details securely</span>
                  </div>
                  <p style={styles.cardEntryNote}>
                    Card information is sent directly to Stripe and stored securely.
                  </p>
                  <div style={styles.stripeCardElement}>
                    <div style={styles.cardInputsGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Card Number</label>
                        <input
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          style={styles.input}
                          maxLength="19"
                          disabled={paymentSaved}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Expiration</label>
                          <input
                            type="text"
                            placeholder="MM / YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            style={styles.input}
                            maxLength="9"
                            disabled={paymentSaved}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>CVC</label>
                          <input
                            type="text"
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            style={styles.input}
                            maxLength="4"
                            disabled={paymentSaved}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>ZIP</label>
                          <input
                            type="text"
                            placeholder="28036"
                            value={cardZip}
                            onChange={(e) => setCardZip(e.target.value)}
                            style={styles.input}
                            maxLength="10"
                            disabled={paymentSaved}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {paymentError && (
                    <p style={styles.paymentError}>{paymentError}</p>
                  )}
                  
                  {paymentSaved ? (
                    <div style={styles.paymentSuccess}>
                      ✓ Card saved to Stripe successfully
                    </div>
                  ) : (
                    <button
                      onClick={savePaymentToStripe}
                      disabled={processingPayment || !cardNumber || !cardExpiry || !cardCvc}
                      style={{
                        ...styles.savePaymentButton,
                        opacity: (processingPayment || !cardNumber || !cardExpiry || !cardCvc) ? 0.5 : 1,
                      }}
                    >
                      {processingPayment ? 'Saving to Stripe...' : '💳 Save Card to Stripe'}
                    </button>
                  )}
                </div>
              )}

              {/* ACH / Bank Transfer Entry */}
              {paymentMethod === 'ach' && (
                <div style={styles.cardEntrySection}>
                  <div style={styles.cardEntryHeader}>
                    <span style={styles.lockIcon}>🏦</span>
                    <span>Enter bank account details</span>
                  </div>
                  <p style={styles.cardEntryNote}>
                    Bank information is sent to Stripe for secure ACH processing.
                  </p>
                  <div style={styles.cardInputsGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Business Name or Individual Name"
                        value={achName}
                        onChange={(e) => setAchName(e.target.value)}
                        style={styles.input}
                        disabled={paymentSaved}
                      />
                    </div>
                    <div style={styles.formRow}>
                      <div style={{ ...styles.formGroup, flex: 2 }}>
                        <label style={styles.label}>Routing Number</label>
                        <input
                          type="text"
                          placeholder="110000000"
                          value={achRouting}
                          onChange={(e) => setAchRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          style={styles.input}
                          maxLength="9"
                          disabled={paymentSaved}
                        />
                      </div>
                      <div style={{ ...styles.formGroup, flex: 2 }}>
                        <label style={styles.label}>Account Number</label>
                        <input
                          type="text"
                          placeholder="000123456789"
                          value={achAccount}
                          onChange={(e) => setAchAccount(e.target.value.replace(/\D/g, ''))}
                          style={styles.input}
                          disabled={paymentSaved}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Account Type</label>
                      <select 
                        value={achType}
                        onChange={(e) => setAchType(e.target.value)}
                        style={styles.select}
                        disabled={paymentSaved}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                  </div>
                  
                  {paymentError && (
                    <p style={styles.paymentError}>{paymentError}</p>
                  )}
                  
                  {paymentSaved ? (
                    <div style={styles.paymentSuccess}>
                      ✓ Bank account saved to Stripe successfully
                    </div>
                  ) : (
                    <button
                      onClick={savePaymentToStripe}
                      disabled={processingPayment || !achName || !achRouting || !achAccount}
                      style={{
                        ...styles.savePaymentButton,
                        opacity: (processingPayment || !achName || !achRouting || !achAccount) ? 0.5 : 1,
                      }}
                    >
                      {processingPayment ? 'Saving to Stripe...' : '🏦 Save Bank Account to Stripe'}
                    </button>
                  )}
                </div>
              )}

              {/* Check Payment */}
              {paymentMethod === 'check' && (
                <div style={styles.checkSection}>
                  <p style={styles.checkNote}>
                    Client will pay by check. Invoices will be generated and mailed.
                  </p>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Billing Address (for invoices)</label>
                    <textarea
                      placeholder="Enter billing address for check payments..."
                      value={checkAddress}
                      onChange={(e) => setCheckAddress(e.target.value)}
                      style={styles.textarea}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Invoice / Net 30 */}
              {paymentMethod === 'invoice' && (
                <div style={styles.checkSection}>
                  <p style={styles.checkNote}>
                    Client will be invoiced with Net 30 payment terms.
                  </p>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Billing Contact Email</label>
                      <input
                        type="email"
                        placeholder="ap@company.com"
                        value={invoiceEmail}
                        onChange={(e) => setInvoiceEmail(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>PO Number (if required)</label>
                      <input
                        type="text"
                        placeholder="PO-12345"
                        value={invoicePO}
                        onChange={(e) => setInvoicePO(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Billing Notes */}
              <div style={{ ...styles.formGroup, marginTop: '16px' }}>
                <label style={styles.label}>Additional Billing Notes</label>
                <input
                  type="text"
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="Any special billing instructions..."
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Step 4: Products */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.stepNumber}>4</span>
              Products Included
            </h2>

            {orderItems.length === 0 ? (
              <div style={styles.emptyProducts}>
                <p>No products added yet</p>
                <button
                  onClick={() => setShowProductModal(true)}
                  style={styles.addProductButton}
                >
                  <Icons.Plus />
                  Add Product
                </button>
              </div>
            ) : (
              <>
                <div style={styles.productList}>
                  {orderItems.map((item) => (
                    <div key={item.id} style={styles.productItem}>
                      <div style={styles.productInfo}>
                        <span style={styles.productName}>{item.product_name}</span>
                        <span style={styles.productEntity}>{item.entity_name}</span>
                      </div>
                      <div style={styles.productPricing}>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateOrderItem(item.id, 'unit_price', e.target.value)}
                          style={styles.priceInput}
                          step="0.01"
                        />
                        <span style={styles.perMonth}>/mo</span>
                      </div>
                      {item.setup_fee > 0 && (
                        <span style={styles.setupFee}>
                          +{formatCurrency(item.setup_fee)} setup
                        </span>
                      )}
                      <button
                        onClick={() => removeOrderItem(item.id)}
                        style={styles.removeButton}
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowProductModal(true)}
                  style={styles.addMoreButton}
                >
                  <Icons.Plus />
                  Add Another Product
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Order Summary</h3>
            
            {selectedClient && (
              <div style={styles.summarySection}>
                <span style={styles.summaryLabel}>Client</span>
                <span style={styles.summaryValue}>{selectedClient.business_name}</span>
              </div>
            )}

            {contractStartDate && (
              <div style={styles.summarySection}>
                <span style={styles.summaryLabel}>Contract Period</span>
                <span style={styles.summaryValue}>
                  {new Date(contractStartDate).toLocaleDateString()} - {contractEndDate ? new Date(contractEndDate).toLocaleDateString() : '—'}
                </span>
              </div>
            )}

            <div style={styles.summaryDivider} />

            <div style={styles.summarySection}>
              <span style={styles.summaryLabel}>Monthly Total</span>
              <span style={styles.summaryAmount}>{formatCurrency(totals.monthlyTotal)}</span>
            </div>

            {totals.setupFees > 0 && (
              <div style={styles.summarySection}>
                <span style={styles.summaryLabel}>Setup Fees</span>
                <span style={styles.summaryAmount}>{formatCurrency(totals.setupFees)}</span>
              </div>
            )}

            <div style={styles.summaryTotal}>
              <span>Contract Total</span>
              <span style={styles.totalAmount}>{formatCurrency(totals.contractTotal)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !selectedClient || !uploadedFile || orderItems.length === 0}
              style={{
                ...styles.submitButton,
                opacity: (saving || !selectedClient || !uploadedFile || orderItems.length === 0) ? 0.5 : 1,
              }}
            >
              {saving ? 'Creating Order...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProductModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Add Product</h3>
              <button onClick={() => setShowProductModal(false)} style={styles.modalClose}>
                <Icons.X />
              </button>
            </div>
            
            <div style={styles.modalFilters}>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">All Brands</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.modalProductList}>
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProductToOrder(product)}
                  style={styles.modalProductItem}
                >
                  <div style={styles.modalProductInfo}>
                    <span style={styles.modalProductName}>{product.name}</span>
                    <span style={styles.modalProductMeta}>
                      {product.entity_name} • {product.category_name}
                    </span>
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

      {/* New Client Modal */}
      {showNewClientModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewClientModal(false)}>
          <div style={styles.newClientModal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New Client</h2>
              <button onClick={() => setShowNewClientModal(false)} style={styles.closeButton}>
                <Icons.X />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Business Name *</label>
                <input
                  type="text"
                  value={newClient.business_name}
                  onChange={(e) => setNewClient(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Company name"
                  style={styles.input}
                  autoFocus
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact First Name</label>
                  <input
                    type="text"
                    value={newClient.contact_first_name}
                    onChange={(e) => setNewClient(prev => ({ ...prev, contact_first_name: e.target.value }))}
                    placeholder="First name"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact Last Name</label>
                  <input
                    type="text"
                    value={newClient.contact_last_name}
                    onChange={(e) => setNewClient(prev => ({ ...prev, contact_last_name: e.target.value }))}
                    placeholder="Last name"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    value={newClient.contact_email}
                    onChange={(e) => setNewClient(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="email@example.com"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone</label>
                  <input
                    type="tel"
                    value={newClient.contact_phone}
                    onChange={(e) => setNewClient(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  value={newClient.address}
                  onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                  style={styles.input}
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 2 }}>
                  <label style={styles.label}>City</label>
                  <input
                    type="text"
                    value={newClient.city}
                    onChange={(e) => setNewClient(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>State</label>
                  <input
                    type="text"
                    value={newClient.state}
                    onChange={(e) => setNewClient(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="NC"
                    style={styles.input}
                    maxLength={2}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ZIP</label>
                  <input
                    type="text"
                    value={newClient.zip}
                    onChange={(e) => setNewClient(prev => ({ ...prev, zip: e.target.value }))}
                    placeholder="28036"
                    style={styles.input}
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowNewClientModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={creatingClient || !newClient.business_name.trim() || !newClient.contact_email.trim()}
                style={{
                  ...styles.submitButton,
                  opacity: (creatingClient || !newClient.business_name.trim() || !newClient.contact_email.trim()) ? 0.5 : 1,
                }}
              >
                {creatingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '32px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    marginBottom: '16px',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '14px',
    cursor: 'pointer',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: '32px',
    alignItems: 'start',
  },
  mainColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0',
  },
  stepNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: '600',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    border: '2px dashed',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  dropZoneText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
    margin: '12px 0 4px 0',
  },
  dropZoneSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  uploadedFileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  fileDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  fileSize: {
    fontSize: '12px',
    color: '#6b7280',
  },
  removeFileButton: {
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '8px',
  },
  clientSearchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
  },
  clientSearchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
  },
  clientDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  clientOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    borderBottom: '1px solid #f1f5f9',
  },
  clientName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  clientEmail: {
    fontSize: '12px',
    color: '#6b7280',
  },
  selectedClientCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    marginTop: '12px',
  },
  selectedClientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  changeClientButton: {
    padding: '8px 16px',
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
  },
  customTermRow: {
    display: 'flex',
    gap: '8px',
  },
  cancelButton: {
    padding: '10px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  emptyProducts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '2px dashed #e2e8f0',
  },
  addProductButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '12px',
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  productInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  productName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  productEntity: {
    fontSize: '12px',
    color: '#6b7280',
  },
  productPricing: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  priceInput: {
    width: '100px',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'right',
  },
  perMonth: {
    fontSize: '13px',
    color: '#6b7280',
  },
  setupFee: {
    fontSize: '12px',
    color: '#10b981',
    whiteSpace: 'nowrap',
  },
  removeButton: {
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
  },
  addMoreButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    background: 'none',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  sidebar: {
    position: 'sticky',
    top: '24px',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0',
  },
  summarySection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'right',
  },
  summaryAmount: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  summaryDivider: {
    height: '1px',
    background: '#e2e8f0',
    margin: '16px 0',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  totalAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '600px',
    maxHeight: '80vh',
    overflow: 'hidden',
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
    margin: 0,
  },
  modalClose: {
    padding: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
  },
  modalFilters: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f9fafb',
  },
  filterSelect: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  modalProductList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  modalProductItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '16px 24px',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  modalProductInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  modalProductName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  modalProductMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  modalProductPrice: {
    textAlign: 'right',
  },
  modalPriceType: {
    fontSize: '12px',
    color: '#6b7280',
  },
  // Success styles
  successContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    padding: '24px',
  },
  successCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  successIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    background: '#dcfce7',
    color: '#16a34a',
    borderRadius: '50%',
    margin: '0 auto 24px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  successSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  successSummary: {
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#64748b',
  },
  summaryRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  totalValue: {
    color: '#10b981',
    fontWeight: '700',
  },
  successActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  // New styles for client creation and payment
  clientSearchRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  createClientButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  noResults: {
    padding: '16px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  paymentSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  paymentTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  cardEntrySection: {
    marginTop: '16px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  cardEntryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  lockIcon: {
    fontSize: '16px',
  },
  cardEntryNote: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  stripeCardElement: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #d1d5db',
  },
  cardInputsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stripeNotice: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    borderRadius: '6px',
    border: '1px solid #fcd34d',
  },
  checkSection: {
    marginTop: '16px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  checkNote: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  savePaymentButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 20px',
    marginTop: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  paymentError: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  paymentSuccess: {
    marginTop: '16px',
    padding: '14px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    color: '#059669',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center',
  },
  achNote: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '13px',
  },
  newClientModal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '560px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f9fafb',
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

// Add keyframe animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(styleSheet);
