import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Icon components matching the existing site style
const Icons = {
  Package: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>
    </svg>
  ),
  Grid: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
  ),
  Layers: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
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
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  DollarSign: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
};

// Category icon mapping
const categoryIcons = {
  radio: '📻',
  newspaper: '📰',
  monitor: '🖥️',
  globe: '🌐',
  calendar: '📅',
  mic: '🎙️',
};

export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, packagesRes, categoriesRes, entitiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/products`),
        fetch(`${API_BASE}/api/admin/packages`),
        fetch(`${API_BASE}/api/admin/categories`),
        fetch(`${API_BASE}/api/admin/entities`)
      ]);

      if (!productsRes.ok || !packagesRes.ok || !categoriesRes.ok || !entitiesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [productsData, packagesData, categoriesData, entitiesData] = await Promise.all([
        productsRes.json(),
        packagesRes.json(),
        categoriesRes.json(),
        entitiesRes.json()
      ]);

      setProducts(productsData);
      setPackages(packagesData);
      setCategories(categoriesData);
      setEntities(entitiesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Unable to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEntity = filterEntity === 'all' || product.entity_id === filterEntity;
      const matchesCategory = filterCategory === 'all' || product.category_id === filterCategory;
      return matchesSearch && matchesEntity && matchesCategory;
    });
  }, [products, searchTerm, filterEntity, filterCategory]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = !searchTerm || 
        pkg.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEntity = filterEntity === 'all' || pkg.entity_id === filterEntity;
      return matchesSearch && matchesEntity;
    });
  }, [packages, searchTerm, filterEntity]);

  // Helper functions
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  const getEntityName = (entityId) => {
    const entity = entities.find(e => e.id === entityId);
    return entity?.name || entity?.code?.toUpperCase() || 'Unknown';
  };

  const getCategoryColor = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.color || '#6b7280';
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatRateType = (type) => {
    const types = {
      'monthly': 'Monthly',
      'per_spot': 'Per Spot',
      'per_issue': 'Per Issue',
      'per_event': 'Per Event',
      'one_time': 'One-Time',
      'per_month': 'Per Month',
    };
    return types[type] || type;
  };

  // CRUD operations
  const handleSaveProduct = async (productData) => {
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `${API_BASE}/api/admin/products/${editingItem.id}`
        : `${API_BASE}/api/admin/products`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) throw new Error('Failed to save product');
      
      await fetchAllData();
      setShowProductModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/products/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchAllData();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product.');
    }
  };

  const handleSavePackage = async (packageData) => {
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `${API_BASE}/api/admin/packages/${editingItem.id}`
        : `${API_BASE}/api/admin/packages`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData),
      });

      if (!response.ok) throw new Error('Failed to save package');
      
      await fetchAllData();
      setShowPackageModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving package:', err);
      alert('Failed to save package. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/packages/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchAllData();
    } catch (err) {
      console.error('Error deleting package:', err);
      alert('Failed to delete package.');
    }
  };

  const handleSaveCategory = async (categoryData) => {
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `${API_BASE}/api/admin/categories/${editingItem.id}`
        : `${API_BASE}/api/admin/categories`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) throw new Error('Failed to save category');
      
      await fetchAllData();
      setShowCategoryModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to save category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Tab content
  const tabs = [
    { id: 'products', label: 'Products', icon: Icons.Package, count: products.length },
    { id: 'packages', label: 'Packages', icon: Icons.Layers, count: packages.length },
    { id: 'categories', label: 'Categories', icon: Icons.Grid, count: categories.length },
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Product Management</h1>
          <p style={styles.subtitle}>Manage products, packages, and categories for WSIC and Lake Norman Woman</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <Icons.AlertCircle />
          <span>{error}</span>
          <button onClick={fetchAllData} style={styles.retryButton}>Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              <tab.icon />
              <span>{tab.label}</span>
              <span style={{
                ...styles.tabBadge,
                ...(activeTab === tab.id ? styles.tabBadgeActive : {}),
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {activeTab === 'products' && (
            <button 
              onClick={() => { setEditingItem(null); setShowProductModal(true); }}
              style={styles.primaryButton}
            >
              <Icons.Plus /> Add Product
            </button>
          )}
          {activeTab === 'packages' && (
            <button 
              onClick={() => { setEditingItem(null); setShowPackageModal(true); }}
              style={styles.primaryButton}
            >
              <Icons.Plus /> Add Package
            </button>
          )}
          {activeTab === 'categories' && (
            <button 
              onClick={() => { setEditingItem(null); setShowCategoryModal(true); }}
              style={styles.primaryButton}
            >
              <Icons.Plus /> Add Category
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {(activeTab === 'products' || activeTab === 'packages') && (
        <div style={styles.filtersContainer}>
          <div style={styles.searchWrapper}>
            <Icons.Search />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Entities</option>
            {entities.map(entity => (
              <option key={entity.id} value={entity.id}>{entity.name}</option>
            ))}
          </select>
          {activeTab === 'products' && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'products' && (
          <ProductsTable
            products={filteredProducts}
            categories={categories}
            entities={entities}
            getCategoryName={getCategoryName}
            getCategoryColor={getCategoryColor}
            getEntityName={getEntityName}
            formatCurrency={formatCurrency}
            formatRateType={formatRateType}
            onEdit={(product) => { setEditingItem(product); setShowProductModal(true); }}
            onDelete={handleDeleteProduct}
          />
        )}

        {activeTab === 'packages' && (
          <PackagesGrid
            packages={filteredPackages}
            getEntityName={getEntityName}
            formatCurrency={formatCurrency}
            onEdit={(pkg) => { setEditingItem(pkg); setShowPackageModal(true); }}
            onDelete={handleDeletePackage}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesGrid
            categories={categories}
            categoryIcons={categoryIcons}
            onEdit={(cat) => { setEditingItem(cat); setShowCategoryModal(true); }}
          />
        )}
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingItem}
          categories={categories}
          entities={entities}
          onSave={handleSaveProduct}
          onClose={() => { setShowProductModal(false); setEditingItem(null); }}
          saving={saving}
        />
      )}

      {showPackageModal && (
        <PackageModal
          pkg={editingItem}
          products={products}
          entities={entities}
          onSave={handleSavePackage}
          onClose={() => { setShowPackageModal(false); setEditingItem(null); }}
          saving={saving}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingItem}
          onSave={handleSaveCategory}
          onClose={() => { setShowCategoryModal(false); setEditingItem(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}

// Products Table Component
function ProductsTable({ products, getCategoryName, getCategoryColor, getEntityName, formatCurrency, formatRateType, onEdit, onDelete }) {
  if (products.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Icons.Package />
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Product</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Entity</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Rate Type</th>
            <th style={styles.th}>Status</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id} style={styles.tr}>
              <td style={styles.td}>
                <div style={styles.productName}>{product.name}</div>
                <div style={styles.productCode}>{product.code}</div>
              </td>
              <td style={styles.td}>
                <span 
                  style={{
                    ...styles.categoryBadge,
                    backgroundColor: `${getCategoryColor(product.category_id)}15`,
                    color: getCategoryColor(product.category_id),
                    borderColor: `${getCategoryColor(product.category_id)}30`,
                  }}
                >
                  {getCategoryName(product.category_id)}
                </span>
              </td>
              <td style={styles.td}>
                <span style={styles.entityBadge}>{getEntityName(product.entity_id)}</span>
              </td>
              <td style={styles.td}>
                <span style={styles.price}>{formatCurrency(product.base_price)}</span>
              </td>
              <td style={styles.td}>
                <span style={styles.rateType}>{formatRateType(product.rate_type)}</span>
              </td>
              <td style={styles.td}>
                <span style={product.is_active ? styles.statusActive : styles.statusInactive}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                <div style={styles.actionButtons}>
                  <button onClick={() => onEdit(product)} style={styles.iconButton} title="Edit">
                    <Icons.Edit />
                  </button>
                  <button onClick={() => onDelete(product.id)} style={styles.iconButtonDanger} title="Delete">
                    <Icons.Trash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Packages Grid Component
function PackagesGrid({ packages, getEntityName, formatCurrency, onEdit, onDelete }) {
  if (packages.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Icons.Layers />
        <p>No packages found</p>
      </div>
    );
  }

  return (
    <div style={styles.packagesGrid}>
      {packages.map(pkg => (
        <div key={pkg.id} style={styles.packageCard}>
          <div style={styles.packageHeader}>
            <div>
              <h3 style={styles.packageName}>{pkg.name}</h3>
              <span style={styles.entityBadge}>{getEntityName(pkg.entity_id)}</span>
            </div>
            <div style={styles.actionButtons}>
              <button onClick={() => onEdit(pkg)} style={styles.iconButton} title="Edit">
                <Icons.Edit />
              </button>
              <button onClick={() => onDelete(pkg.id)} style={styles.iconButtonDanger} title="Delete">
                <Icons.Trash />
              </button>
            </div>
          </div>
          {pkg.description && <p style={styles.packageDescription}>{pkg.description}</p>}
          <div style={styles.packagePricing}>
            <div style={styles.packagePrice}>
              <span style={styles.priceLabel}>Package Price</span>
              <span style={styles.priceValue}>{formatCurrency(pkg.package_price)}</span>
            </div>
            {pkg.items && pkg.items.length > 0 && (
              <div style={styles.packageItems}>
                <span style={styles.itemsLabel}>{pkg.items.length} items included</span>
              </div>
            )}
          </div>
          <div style={styles.packageStatus}>
            <span style={pkg.is_active ? styles.statusActive : styles.statusInactive}>
              {pkg.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Categories Grid Component
function CategoriesGrid({ categories, categoryIcons, onEdit }) {
  return (
    <div style={styles.categoriesGrid}>
      {categories.map(cat => (
        <div key={cat.id} style={styles.categoryCard}>
          <div style={styles.categoryHeader}>
            <div 
              style={{
                ...styles.categoryIcon,
                backgroundColor: `${cat.color}15`,
              }}
            >
              <span style={{ fontSize: '24px' }}>{categoryIcons[cat.icon] || '📦'}</span>
            </div>
            <button onClick={() => onEdit(cat)} style={styles.iconButton} title="Edit">
              <Icons.Edit />
            </button>
          </div>
          <h3 style={styles.categoryName}>{cat.name}</h3>
          <p style={styles.categoryDescription}>{cat.description}</p>
          <div style={styles.categoryFooter}>
            <span style={styles.categoryCode}>{cat.code}</span>
            <span style={cat.is_active ? styles.statusActive : styles.statusInactive}>
              {cat.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Product Modal
function ProductModal({ product, categories, entities, onSave, onClose, saving }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    code: product?.code || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    entity_id: product?.entity_id || '',
    base_price: product?.base_price || '',
    rate_type: product?.rate_type || 'monthly',
    min_term_months: product?.min_term_months || 1,
    setup_fee: product?.setup_fee || '',
    is_active: product?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      base_price: parseFloat(formData.base_price) || 0,
      setup_fee: formData.setup_fee ? parseFloat(formData.setup_fee) : null,
      min_term_months: parseInt(formData.min_term_months) || 1,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} style={styles.closeButton}><Icons.X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.modalBody}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                  style={styles.input}
                  required
                />
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category *</label>
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  style={styles.select}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Entity *</label>
                <select
                  value={formData.entity_id}
                  onChange={e => setFormData({...formData, entity_id: e.target.value})}
                  style={styles.select}
                  required
                >
                  <option value="">Select entity</option>
                  {entities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Base Price *</label>
                <div style={styles.inputWithIcon}>
                  <Icons.DollarSign />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={e => setFormData({...formData, base_price: e.target.value})}
                    style={styles.inputWithIconInput}
                    required
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Rate Type *</label>
                <select
                  value={formData.rate_type}
                  onChange={e => setFormData({...formData, rate_type: e.target.value})}
                  style={styles.select}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="per_spot">Per Spot</option>
                  <option value="per_issue">Per Issue</option>
                  <option value="per_event">Per Event</option>
                  <option value="one_time">One-Time</option>
                </select>
              </div>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Setup Fee</label>
                <div style={styles.inputWithIcon}>
                  <Icons.DollarSign />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.setup_fee}
                    onChange={e => setFormData({...formData, setup_fee: e.target.value})}
                    style={styles.inputWithIconInput}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Min Term (Months)</label>
                <input
                  type="number"
                  value={formData.min_term_months}
                  onChange={e => setFormData({...formData, min_term_months: e.target.value})}
                  style={styles.input}
                  min="1"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  style={styles.checkbox}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.primaryButton}>
              {saving ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Package Modal
function PackageModal({ pkg, products, entities, onSave, onClose, saving }) {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    code: pkg?.code || '',
    description: pkg?.description || '',
    entity_id: pkg?.entity_id || '',
    package_price: pkg?.package_price || '',
    is_active: pkg?.is_active ?? true,
    items: pkg?.items || [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      package_price: parseFloat(formData.package_price) || 0,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{pkg ? 'Edit Package' : 'Add Package'}</h2>
          <button onClick={onClose} style={styles.closeButton}><Icons.X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.modalBody}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Package Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Package Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                  style={styles.input}
                  required
                />
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Entity *</label>
                <select
                  value={formData.entity_id}
                  onChange={e => setFormData({...formData, entity_id: e.target.value})}
                  style={styles.select}
                  required
                >
                  <option value="">Select entity</option>
                  {entities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Package Price *</label>
                <div style={styles.inputWithIcon}>
                  <Icons.DollarSign />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.package_price}
                    onChange={e => setFormData({...formData, package_price: e.target.value})}
                    style={styles.inputWithIconInput}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  style={styles.checkbox}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.primaryButton}>
              {saving ? 'Saving...' : (pkg ? 'Update Package' : 'Create Package')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Category Modal
function CategoryModal({ category, onSave, onClose, saving }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || '',
    icon: category?.icon || 'package',
    color: category?.color || '#3b82f6',
    display_order: category?.display_order || 1,
    is_active: category?.is_active ?? true,
  });

  const iconOptions = [
    { value: 'radio', label: '📻 Radio' },
    { value: 'newspaper', label: '📰 Newspaper' },
    { value: 'monitor', label: '🖥️ Monitor' },
    { value: 'globe', label: '🌐 Globe' },
    { value: 'calendar', label: '📅 Calendar' },
    { value: 'mic', label: '🎙️ Microphone' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      display_order: parseInt(formData.display_order) || 1,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{category ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} style={styles.closeButton}><Icons.X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.modalBody}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                  style={styles.input}
                  required
                />
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Icon</label>
                <select
                  value={formData.icon}
                  onChange={e => setFormData({...formData, icon: e.target.value})}
                  style={styles.select}
                >
                  {iconOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color</label>
                <div style={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    style={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    style={styles.colorTextInput}
                  />
                </div>
              </div>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData({...formData, display_order: e.target.value})}
                  style={styles.input}
                  min="1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>
          </div>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.primaryButton}>
              {saving ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
            </button>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '15px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    marginBottom: '24px',
    fontSize: '14px',
  },
  retryButton: {
    marginLeft: 'auto',
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  tabsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '24px',
    paddingBottom: '0',
  },
  tabs: {
    display: 'flex',
    gap: '0',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '-1px',
  },
  tabActive: {
    color: '#1e3a5f',
    borderBottomColor: '#3b82f6',
  },
  tabBadge: {
    padding: '2px 8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  tabBadgeActive: {
    backgroundColor: '#dbeafe',
    color: '#3b82f6',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '10px 18px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filtersContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    minWidth: '280px',
    color: '#94a3b8',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
  },
  filterSelect: {
    padding: '10px 14px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    minWidth: '150px',
    cursor: 'pointer',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  tableContainer: {
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
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  productName: {
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '2px',
  },
  productCode: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid',
  },
  entityBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
  },
  price: {
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  rateType: {
    color: '#64748b',
    fontSize: '13px',
  },
  statusActive: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
  },
  statusInactive: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  iconButton: {
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
    transition: 'all 0.15s',
  },
  iconButtonDanger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
  },
  packagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    padding: '20px',
  },
  packageCard: {
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    transition: 'box-shadow 0.2s',
  },
  packageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  packageName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  packageDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  packagePricing: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderTop: '1px solid #f1f5f9',
    marginBottom: '12px',
  },
  packagePrice: {
    display: 'flex',
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '2px',
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
  },
  packageItems: {},
  itemsLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  packageStatus: {
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    padding: '20px',
  },
  categoryCard: {
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  categoryIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  categoryDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  categoryFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
  },
  categoryCode: {
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'monospace',
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
    maxWidth: '560px',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 160px)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
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
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
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
  inputWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#94a3b8',
  },
  inputWithIconInput: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  colorInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorInput: {
    width: '40px',
    height: '40px',
    padding: '2px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  colorTextInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
