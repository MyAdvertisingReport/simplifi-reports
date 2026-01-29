import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Auth helper - get headers with token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

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
  Filter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
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
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  Refresh: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
    </svg>
  ),
  FilePlus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/>
    </svg>
  ),
  RefreshCw: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
    </svg>
  ),
  XCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
    </svg>
  ),
  PenLine: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  ),
};

// Status badge colors
const statusConfig = {
  draft: { label: 'Draft', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  pending_approval: { label: 'Pending Approval', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  approved: { label: 'Approved', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  sent: { label: 'Sent to Client', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  signed: { label: 'Signed', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  active: { label: 'Active', bg: '#dcfce7', color: '#166534', border: '#86efac' },
  completed: { label: 'Completed', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

// Category styling with icons
const categoryConfig = {
  'Print': { bg: '#dbeafe', color: '#1e40af', icon: '📰' },
  'print': { bg: '#dbeafe', color: '#1e40af', icon: '📰' },
  'Broadcast': { bg: '#fce7f3', color: '#9d174d', icon: '📻' },
  'broadcast': { bg: '#fce7f3', color: '#9d174d', icon: '📻' },
  'Podcast': { bg: '#f3e8ff', color: '#7c3aed', icon: '🎙️' },
  'podcast': { bg: '#f3e8ff', color: '#7c3aed', icon: '🎙️' },
  'Digital': { bg: '#dcfce7', color: '#166534', icon: '💻' },
  'digital': { bg: '#dcfce7', color: '#166534', icon: '💻' },
  'Programmatic': { bg: '#dcfce7', color: '#166534', icon: '📊' },
  'programmatic': { bg: '#dcfce7', color: '#166534', icon: '📊' },
  'Events': { bg: '#fef3c7', color: '#92400e', icon: '🎪' },
  'events': { bg: '#fef3c7', color: '#92400e', icon: '🎪' },
  'Web': { bg: '#e0e7ff', color: '#3730a3', icon: '🌐' },
  'web': { bg: '#e0e7ff', color: '#3730a3', icon: '🌐' },
  'web_social': { bg: '#ffe4e6', color: '#be123c', icon: '📱' },
  'Social': { bg: '#ffe4e6', color: '#be123c', icon: '📱' },
  'social': { bg: '#ffe4e6', color: '#be123c', icon: '📱' },
};

const getCategoryStyle = (category) => {
  if (!category) return { bg: '#f3f4f6', color: '#374151', icon: '📋' };
  return categoryConfig[category] || { bg: '#f3f4f6', color: '#374151', icon: '📋' };
};

// Get unique brands from order items
const getOrderBrands = (items) => {
  if (!items || items.length === 0) return [];
  const seen = new Set();
  return items.filter(item => {
    if (!item.entity_name || seen.has(item.entity_name)) return false;
    seen.add(item.entity_name);
    return true;
  }).map(item => ({
    name: item.entity_name,
    logo: item.entity_logo
  }));
};

// Get unique categories from order items
const getOrderCategories = (items) => {
  if (!items || items.length === 0) return [];
  const categories = {};
  items.forEach(item => {
    const cat = item.product_category || item.category || 'Other';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  return Object.entries(categories).map(([name, count]) => ({ name, count }));
};

// Check if order has price adjustments (for approval clarity)
const getAdjustedProducts = (items) => {
  if (!items) return [];
  return items.filter(item => {
    // Check if item has a discount or adjusted price
    const hasDiscount = item.discount_percent && parseFloat(item.discount_percent) > 0;
    const hasAdjustedPrice = item.original_price && 
      parseFloat(item.original_price) !== parseFloat(item.unit_price || item.line_total);
    const hasWaivedSetup = item.original_setup_fee && 
      parseFloat(item.original_setup_fee) > parseFloat(item.setup_fee || 0);
    return hasDiscount || hasAdjustedPrice || hasWaivedSetup;
  });
};

export default function OrderList() {
  // Data states
  const [orders, setOrders] = useState([]);
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // New Order Type Selection Modal
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1 = select type, 2 = select signature method
  const [selectedOrderType, setSelectedOrderType] = useState(null); // 'new', 'change', 'kill'

  // Fetch data on mount
  useEffect(() => {
    fetchOrders();
    fetchFilterOptions();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [entitiesRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders/entities/list`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/orders/categories/list`, { headers: getAuthHeaders() })
      ]);
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch order details');
      const data = await response.json();
      setSelectedOrder(data);
      setShowOrderModal(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      alert('Failed to load order details');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      // Refresh the orders list
      fetchOrders();
      
      // Update modal if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    }
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter (client name or order number)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order =>
        order.client_name?.toLowerCase().includes(query) ||
        order.order_number?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(order => order.status === statusFilter);
    }

    // Entity filter (check if any item matches)
    if (entityFilter) {
      result = result.filter(order =>
        order.items?.some(item => item.entity_id === entityFilter)
      );
    }

    // Category filter (check if any item matches)
    if (categoryFilter) {
      result = result.filter(order =>
        order.items?.some(item => item.product_category === categoryFilter)
      );
    }

    // Date range filter
    if (dateRange.start) {
      result = result.filter(order =>
        new Date(order.contract_start_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      result = result.filter(order =>
        new Date(order.contract_start_date) <= new Date(dateRange.end)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle special cases
      if (sortField === 'total_value') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortField === 'created_at' || sortField === 'contract_start_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [orders, searchQuery, statusFilter, entityFilter, categoryFilter, dateRange, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, entityFilter, categoryFilter, dateRange]);

  // Format helpers
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setEntityFilter('');
    setCategoryFilter('');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = searchQuery || statusFilter || entityFilter || categoryFilter || dateRange.start || dateRange.end;

  // Calculate summary stats
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status === 'active').length;
    const pendingOrders = orders.filter(o => o.status === 'pending_approval').length;
    const totalValue = orders.reduce((sum, o) => sum + (parseFloat(o.total_value) || 0), 0);
    const monthlyRevenue = orders
      .filter(o => o.status === 'active')
      .reduce((sum, o) => sum + (parseFloat(o.monthly_total) || 0), 0);
    return { activeOrders, pendingOrders, totalValue, monthlyRevenue };
  }, [orders]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{ color: '#64748b', marginTop: '12px' }}>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Orders</h1>
          <p style={styles.subtitle}>Manage advertising orders and contracts</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchOrders} style={styles.refreshButton} title="Refresh">
            <Icons.Refresh />
          </button>
          <button onClick={() => { setShowNewOrderModal(true); setModalStep(1); setSelectedOrderType(null); }} style={styles.newOrderButton}>
            <Icons.Plus /> New Order
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Active Orders</span>
          <span style={styles.statValue}>{stats.activeOrders}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pending Approval</span>
          <span style={{ ...styles.statValue, color: stats.pendingOrders > 0 ? '#f59e0b' : '#1e293b' }}>
            {stats.pendingOrders}
          </span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Monthly Revenue</span>
          <span style={styles.statValue}>{formatCurrency(stats.monthlyRevenue)}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Contract Value</span>
          <span style={styles.statValue}>{formatCurrency(stats.totalValue)}</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.filtersCard}>
        <div style={styles.searchRow}>
          <div style={styles.searchWrapper}>
            <Icons.Search />
            <input
              type="text"
              placeholder="Search by client or order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...styles.filterToggle,
              ...(showFilters || hasActiveFilters ? styles.filterToggleActive : {})
            }}
          >
            <Icons.Filter />
            {hasActiveFilters && <span style={styles.filterBadge}></span>}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div style={styles.expandedFilters}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Entity</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                style={styles.filterSelectSmall}
              >
                <option value="">All Entities</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Medium</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={styles.filterSelectSmall}
              >
                <option value="">All Mediums</option>
                {categories.map(c => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Contract Start From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Contract Start To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={styles.filterInput}
              />
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} style={styles.clearFiltersButton}>
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div style={styles.resultsSummary}>
        <span>Showing {paginatedOrders.length} of {filteredOrders.length} orders</span>
      </div>

      {/* Orders Table */}
      {error ? (
        <div style={styles.errorCard}>
          <p>{error}</p>
          <button onClick={fetchOrders} style={styles.retryButton}>Try Again</button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={styles.emptyCard}>
          <Icons.FileText />
          <h3>No orders found</h3>
          <p>{hasActiveFilters ? 'Try adjusting your filters' : 'Create your first order to get started'}</p>
          {!hasActiveFilters && (
            <a href="/orders/new" style={styles.emptyNewButton}>
              <Icons.Plus /> Create Order
            </a>
          )}
        </div>
      ) : (
        <div style={styles.tableCard}>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th} onClick={() => handleSort('client_name')}>
                    <div style={styles.thContent}>
                      Client
                      {sortField === 'client_name' && (
                        sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />
                      )}
                    </div>
                  </th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Brands</th>
                  <th style={styles.th} onClick={() => handleSort('contract_start_date')}>
                    <div style={styles.thContent}>
                      Contract Period
                      {sortField === 'contract_start_date' && (
                        sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />
                      )}
                    </div>
                  </th>
                  <th style={styles.th}>Products</th>
                  <th style={styles.th} onClick={() => handleSort('total_value')}>
                    <div style={styles.thContent}>
                      Value
                      {sortField === 'total_value' && (
                        sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />
                      )}
                    </div>
                  </th>
                  <th style={styles.th}>Sales Rep</th>
                  <th style={styles.th} onClick={() => handleSort('created_at')}>
                    <div style={styles.thContent}>
                      Submitted On
                      {sortField === 'created_at' && (
                        sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />
                      )}
                    </div>
                  </th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => {
                  const status = statusConfig[order.status] || statusConfig.draft;
                  const brands = getOrderBrands(order.items);
                  const categories = getOrderCategories(order.items);
                  return (
                    <tr key={order.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.clientCell}>
                          <span style={styles.clientName}>{order.client_name || 'Unknown Client'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: status.bg,
                          color: status.color,
                          borderColor: status.border,
                        }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {brands.length > 0 ? brands.map((brand, idx) => (
                            <span key={idx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: '#1e3a8a',
                              color: 'white',
                              borderRadius: '6px',
                            }}>
                              {brand.name}
                            </span>
                          )) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.dateCell}>
                          <span>{formatDate(order.contract_start_date)}</span>
                          <span style={styles.dateSeparator}>→</span>
                          <span>{formatDate(order.contract_end_date)}</span>
                        </div>
                        <span style={styles.termMonths}>
                          {order.term_months === 1 ? 'One-Time' : `${order.term_months} months`}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={styles.productCount}>
                            {order.item_count || order.items?.length || 0} products
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {categories.slice(0, 3).map((cat, idx) => {
                              const catStyle = getCategoryStyle(cat.name);
                              return (
                                <span key={idx} style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  backgroundColor: catStyle.bg,
                                  color: catStyle.color,
                                  borderRadius: '4px',
                                }}>
                                  {catStyle.icon} {cat.count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.valueCell}>
                          <span style={styles.totalValue}>{formatCurrency(order.total_value)}</span>
                          {order.term_months > 1 && order.monthly_total && (
                            <span style={styles.monthlyValue}>{formatCurrency(order.monthly_total)}/mo</span>
                          )}
                          {order.term_months === 1 && (
                            <span style={styles.oneTimeLabel}>one-time</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.salesRep}>{order.submitted_by_name || '—'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>{formatDate(order.created_at)}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => fetchOrderDetails(order.id)}
                            style={styles.actionButton}
                            title="View Details"
                          >
                            <Icons.Eye />
                          </button>
                          <a
                            href={`/orders/${order.id}/edit`}
                            style={styles.actionButton}
                            title="Edit Order"
                          >
                            <Icons.Edit />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  ...styles.pageButton,
                  ...(currentPage === 1 ? styles.pageButtonDisabled : {})
                }}
              >
                <Icons.ChevronLeft />
              </button>
              
              <div style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.pageButton,
                  ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
                }}
              >
                <Icons.ChevronRight />
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Order Type Selection Modal */}
      {showNewOrderModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewOrderModal(false)}>
          <div style={styles.newOrderModalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {modalStep === 2 && (
                  <button 
                    onClick={() => { setModalStep(1); setSelectedOrderType(null); }} 
                    style={styles.backButtonSmall}
                  >
                    <Icons.ArrowLeft />
                  </button>
                )}
                <h2 style={styles.modalTitle}>
                  {modalStep === 1 ? 'Select Order Type' : 'Select Signature Method'}
                </h2>
              </div>
              <button onClick={() => setShowNewOrderModal(false)} style={styles.closeButton}>
                <Icons.X />
              </button>
            </div>

            <div style={styles.newOrderModalBody}>
              {modalStep === 1 ? (
                <>
                  <p style={styles.modalSubtext}>What type of order would you like to create?</p>
                  <div style={styles.orderTypeGrid}>
                    {/* New Order */}
                    <button
                      onClick={() => { setSelectedOrderType('new'); setModalStep(2); }}
                      style={styles.orderTypeCard}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <div style={{ ...styles.orderTypeIcon, backgroundColor: '#dbeafe', color: '#2563eb' }}>
                        <Icons.FilePlus />
                      </div>
                      <div style={styles.orderTypeInfo}>
                        <span style={styles.orderTypeName}>New Order</span>
                        <span style={styles.orderTypeDesc}>Create a new advertising contract</span>
                      </div>
                    </button>

                    {/* Change Order */}
                    <button
                      onClick={() => { setSelectedOrderType('change'); setModalStep(2); }}
                      style={styles.orderTypeCard}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.backgroundColor = '#fffbeb'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <div style={{ ...styles.orderTypeIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
                        <Icons.RefreshCw />
                      </div>
                      <div style={styles.orderTypeInfo}>
                        <span style={styles.orderTypeName}>Change Order</span>
                        <span style={styles.orderTypeDesc}>Modify an existing contract</span>
                      </div>
                    </button>

                    {/* Kill Order */}
                    <button
                      onClick={() => { setSelectedOrderType('kill'); setModalStep(2); }}
                      style={styles.orderTypeCard}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <div style={{ ...styles.orderTypeIcon, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                        <Icons.XCircle />
                      </div>
                      <div style={styles.orderTypeInfo}>
                        <span style={styles.orderTypeName}>Kill Order</span>
                        <span style={styles.orderTypeDesc}>Cancel an existing contract</span>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={styles.modalSubtext}>
                    {selectedOrderType === 'new' && 'How will this contract be signed?'}
                    {selectedOrderType === 'change' && 'How will this change order be signed?'}
                    {selectedOrderType === 'kill' && 'How will this cancellation be signed?'}
                  </p>
                  <div style={styles.signatureMethodGrid}>
                    {/* Electronic Signature */}
                    <a
                      href={
                        selectedOrderType === 'new' ? '/orders/new' :
                        selectedOrderType === 'change' ? '/orders/new/change' :
                        '/orders/new/kill'
                      }
                      style={styles.signatureMethodCard}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.backgroundColor = '#ecfdf5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <div style={{ ...styles.signatureMethodIcon, backgroundColor: '#d1fae5', color: '#059669' }}>
                        <Icons.PenLine />
                      </div>
                      <div style={styles.signatureMethodInfo}>
                        <span style={styles.signatureMethodName}>For Electronic Signature</span>
                        <span style={styles.signatureMethodDesc}>Client will sign digitally via email link</span>
                      </div>
                    </a>

                    {/* Already Signed (Upload) */}
                    <a
                      href={
                        selectedOrderType === 'new' ? '/orders/new/upload' :
                        selectedOrderType === 'change' ? '/orders/new/change-upload' :
                        '/orders/new/kill-upload'
                      }
                      style={styles.signatureMethodCard}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.backgroundColor = '#f5f3ff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <div style={{ ...styles.signatureMethodIcon, backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                        <Icons.Upload />
                      </div>
                      <div style={styles.signatureMethodInfo}>
                        <span style={styles.signatureMethodName}>Form Already Signed</span>
                        <span style={styles.signatureMethodDesc}>Upload a pre-signed PDF document</span>
                      </div>
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div style={styles.modalOverlay} onClick={() => setShowOrderModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {selectedOrder.client_name}
                </h2>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: statusConfig[selectedOrder.status]?.bg,
                  color: statusConfig[selectedOrder.status]?.color,
                  borderColor: statusConfig[selectedOrder.status]?.border,
                }}>
                  {statusConfig[selectedOrder.status]?.label}
                </span>
              </div>
              <button onClick={() => setShowOrderModal(false)} style={styles.closeButton}>
                <Icons.X />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Brand Bubbles */}
              {(() => {
                const brands = getOrderBrands(selectedOrder.items);
                const categories = getOrderCategories(selectedOrder.items);
                const adjustedProducts = getAdjustedProducts(selectedOrder.items);
                return (
                  <>
                    {/* Brands Section */}
                    {brands.length > 0 && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        {brands.map((brand, idx) => (
                          <span key={idx} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            backgroundColor: '#1e3a8a',
                            color: 'white',
                            borderRadius: '8px',
                          }}>
                            {brand.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Category Bubbles */}
                    {categories.length > 0 && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                        {categories.map((cat, idx) => {
                          const catStyle = getCategoryStyle(cat.name);
                          return (
                            <span key={idx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: catStyle.bg,
                              color: catStyle.color,
                              borderRadius: '12px',
                            }}>
                              {catStyle.icon} {cat.name} ({cat.count})
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Approval Reason Alert - Show ONLY when pending approval */}
                    {selectedOrder.status === 'pending_approval' && (
                      <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fcd34d',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                      }}>
                        <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          ⚠️ Approval Required
                        </div>
                        {adjustedProducts.length > 0 ? (
                          <>
                            <p style={{ color: '#92400e', fontSize: '13px', margin: '0 0 12px 0' }}>
                              The following products have price adjustments that require approval:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {adjustedProducts.map((item, idx) => {
                                const catStyle = getCategoryStyle(item.product_category);
                                const discount = item.discount_percent ? parseFloat(item.discount_percent) : 0;
                                const originalPrice = item.original_price || item.book_price;
                                const currentPrice = item.unit_price || item.line_total;
                                const waivedSetup = item.original_setup_fee && parseFloat(item.original_setup_fee) > parseFloat(item.setup_fee || 0);
                                
                                return (
                                  <div key={idx} style={{
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        padding: '2px 6px',
                                        fontSize: '10px',
                                        backgroundColor: catStyle.bg,
                                        color: catStyle.color,
                                        borderRadius: '4px',
                                      }}>
                                        {catStyle.icon}
                                      </span>
                                      <span style={{ fontWeight: '500', color: '#1e293b' }}>{item.product_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      {originalPrice && (
                                        <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '13px' }}>
                                          ${parseFloat(originalPrice).toFixed(2)}
                                        </span>
                                      )}
                                      <span style={{ fontWeight: '600', color: '#059669', fontSize: '13px' }}>
                                        ${parseFloat(currentPrice).toFixed(2)}
                                      </span>
                                      {discount > 0 && (
                                        <span style={{
                                          backgroundColor: '#fee2e2',
                                          color: '#991b1b',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                        }}>
                                          -{discount}%
                                        </span>
                                      )}
                                      {waivedSetup && (
                                        <span style={{
                                          backgroundColor: '#dbeafe',
                                          color: '#1e40af',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                        }}>
                                          Setup Waived
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p style={{ color: '#92400e', fontSize: '13px', margin: 0 }}>
                            This order has been submitted for approval. Review the details below and approve or return to draft.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Contract Details */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <Icons.Calendar /> Contract
                </h3>
                <div style={styles.modalInfoGrid}>
                  <div style={styles.modalInfo}>
                    <span style={styles.modalInfoLabel}>Start Date</span>
                    <span style={styles.modalInfoValue}>{formatDate(selectedOrder.contract_start_date)}</span>
                  </div>
                  <div style={styles.modalInfo}>
                    <span style={styles.modalInfoLabel}>End Date</span>
                    <span style={styles.modalInfoValue}>{formatDate(selectedOrder.contract_end_date)}</span>
                  </div>
                  <div style={styles.modalInfo}>
                    <span style={styles.modalInfoLabel}>Term</span>
                    <span style={styles.modalInfoValue}>{selectedOrder.term_months} months</span>
                  </div>
                  <div style={styles.modalInfo}>
                    <span style={styles.modalInfoLabel}>Billing</span>
                    <span style={styles.modalInfoValue}>
                      {selectedOrder.billing_frequency === 'upfront' ? 'Upfront (Full Contract)' : 'Monthly'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <Icons.FileText /> Products ({selectedOrder.items?.length || 0})
                </h3>
                <div style={styles.productsList}>
                  {selectedOrder.items?.map((item, idx) => {
                    const catStyle = getCategoryStyle(item.product_category);
                    return (
                      <div key={idx} style={styles.productItem}>
                        <div style={styles.productItemInfo}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 6px',
                              fontSize: '10px',
                              backgroundColor: catStyle.bg,
                              color: catStyle.color,
                              borderRadius: '4px',
                            }}>
                              {catStyle.icon}
                            </span>
                            <span style={styles.productItemName}>{item.product_name}</span>
                          </div>
                          <span style={styles.productItemMeta}>{item.entity_name || item.product_category}</span>
                        </div>
                        <div style={styles.productItemPrice}>
                          <span>{formatCurrency(item.line_total)}</span>
                          <span style={styles.productItemQty}>× {item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div style={styles.modalTotals}>
                <div style={styles.modalTotalRow}>
                  <span>Monthly Total</span>
                  <span>{formatCurrency(selectedOrder.monthly_total)}</span>
                </div>
                <div style={styles.modalTotalRow}>
                  <span>Setup Fees</span>
                  <span>{formatCurrency(selectedOrder.setup_fees)}</span>
                </div>
                <div style={{ ...styles.modalTotalRow, ...styles.modalTotalRowFinal }}>
                  <span>Contract Total</span>
                  <span style={styles.modalTotalValue}>{formatCurrency(selectedOrder.total_value)}</span>
                </div>
              </div>

              {/* Notes */}
              {(selectedOrder.notes || selectedOrder.internal_notes) && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Notes</h3>
                  {selectedOrder.notes && (
                    <p style={styles.noteText}>{selectedOrder.notes}</p>
                  )}
                  {selectedOrder.internal_notes && (
                    <p style={styles.internalNote}>
                      <strong>Internal:</strong> {selectedOrder.internal_notes}
                    </p>
                  )}
                </div>
              )}

              {/* Status Actions */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Update Status</h3>
                <div style={styles.statusActions}>
                  {selectedOrder.status === 'draft' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'pending_approval')}
                      style={styles.statusButton}
                    >
                      Submit for Approval
                    </button>
                  )}
                  {selectedOrder.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'approved')}
                        style={{ ...styles.statusButton, ...styles.approveButton }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'draft')}
                        style={styles.statusButtonSecondary}
                      >
                        Return to Draft
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'approved' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'active')}
                      style={{ ...styles.statusButton, ...styles.activateButton }}
                    >
                      Activate Contract
                    </button>
                  )}
                  {['draft', 'pending_approval', 'approved'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this order?')) {
                          updateOrderStatus(selectedOrder.id, 'cancelled');
                        }
                      }}
                      style={styles.cancelButton}
                    >
                      Cancel Order
                    </button>
                  )}
                  {selectedOrder.status === 'active' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                      style={styles.statusButtonSecondary}
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <a href={`/orders/${selectedOrder.id}/edit`} style={styles.editButton}>
                <Icons.Edit /> Edit Order
              </a>
              <button onClick={() => setShowOrderModal(false)} style={styles.closeModalButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '32px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
  },
  newOrderButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    marginBottom: '16px',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
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
  filterSelect: {
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'white',
    cursor: 'pointer',
    minWidth: '160px',
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '42px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
    position: 'relative',
  },
  filterToggleActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#3b82f6',
  },
  filterBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '8px',
    height: '8px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
  },
  expandedFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  filterSelectSmall: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1e293b',
    backgroundColor: 'white',
    cursor: 'pointer',
    minWidth: '140px',
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1e293b',
  },
  clearFiltersButton: {
    padding: '8px 16px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#991b1b',
    cursor: 'pointer',
    fontWeight: '500',
  },
  resultsSummary: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '12px',
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    userSelect: 'none',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  orderNumber: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  clientCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  clientName: {
    fontWeight: '500',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  dateSeparator: {
    color: '#94a3b8',
  },
  termMonths: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  productCount: {
    fontSize: '13px',
    color: '#64748b',
  },
  valueCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  totalValue: {
    fontWeight: '600',
  },
  monthlyValue: {
    fontSize: '12px',
    color: '#64748b',
  },
  oneTimeLabel: {
    fontSize: '11px',
    color: '#8b5cf6',
    fontWeight: '500',
  },
  salesRep: {
    fontSize: '13px',
    color: '#64748b',
  },
  dateText: {
    fontSize: '13px',
    color: '#64748b',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  pageButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#1e293b',
    cursor: 'pointer',
  },
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#64748b',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    color: '#991b1b',
  },
  retryButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '60px 40px',
    textAlign: 'center',
    color: '#64748b',
  },
  emptyNewButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    cursor: 'pointer',
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
    display: 'flex',
    flexDirection: 'column',
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
    margin: '0 0 8px 0',
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
    flex: 1,
  },
  modalSection: {
    marginBottom: '24px',
  },
  modalSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '12px',
  },
  modalInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  modalInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  modalInfoLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  modalInfoValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  productItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  productItemName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  productItemMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  productItemPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  productItemQty: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '400',
  },
  modalTotals: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  modalTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '8px',
  },
  modalTotalRowFinal: {
    marginBottom: 0,
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    color: '#1e293b',
    fontWeight: '600',
  },
  modalTotalValue: {
    fontSize: '18px',
    fontWeight: '700',
  },
  noteText: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    lineHeight: 1.6,
  },
  internalNote: {
    fontSize: '13px',
    color: '#64748b',
    margin: '8px 0 0 0',
    padding: '10px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
  },
  statusActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  statusButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusButtonSecondary: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  activateButton: {
    backgroundColor: '#059669',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  closeModalButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  // New Order Type Selection Modal Styles
  newOrderModalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '500px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  newOrderModalBody: {
    padding: '24px',
  },
  modalSubtext: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px',
  },
  orderTypeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderTypeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
  },
  orderTypeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    flexShrink: 0,
  },
  orderTypeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  orderTypeName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  orderTypeDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  signatureMethodGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  signatureMethodCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
  },
  signatureMethodIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    flexShrink: 0,
  },
  signatureMethodInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  signatureMethodName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  signatureMethodDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  backButtonSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
  },
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  table tr:hover { background-color: #f8fafc; }
`;
document.head.appendChild(styleSheet);
