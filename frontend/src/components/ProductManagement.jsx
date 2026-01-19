import React, { useState, useEffect } from 'react';

// ============================================================================
// PRODUCT MANAGEMENT UI
// Admin interface for managing categories, products, and packages
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Icons as simple SVG components
const Icons = {
  radio: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  newspaper: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  monitor: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  globe: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  mic: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  x: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  package: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

const CategoryIcon = ({ icon }) => {
  const IconComponent = Icons[icon] || Icons.globe;
  return <IconComponent />;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState('products');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Filters
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes, pkgRes, entRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/categories`),
        fetch(`${API_BASE}/api/admin/products`),
        fetch(`${API_BASE}/api/admin/packages`),
        fetch(`${API_BASE}/api/admin/entities`),
      ]);

      if (!catRes.ok || !prodRes.ok || !pkgRes.ok || !entRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [catData, prodData, pkgData, entData] = await Promise.all([
        catRes.json(),
        prodRes.json(),
        pkgRes.json(),
        entRes.json(),
      ]);

      setCategories(catData);
      setProducts(prodData);
      setPackages(pkgData);
      setEntities(entData);
    } catch (err) {
      setError(err.message);
      // For development, load mock data
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Mock data for development/testing
    setEntities([
      { id: '89e09b9c-565d-440f-9381-8d3e10b49268', code: 'wsic', name: 'WSIC' },
      { id: '67aed7c3-e356-4d06-870e-b88a23befa22', code: 'lkn', name: 'Lake Norman Woman' },
    ]);
    
    setCategories([
      { id: '1', code: 'broadcast', name: 'Broadcast', icon: 'radio', color: '#3b82f6', display_order: 1 },
      { id: '2', code: 'print', name: 'Print', icon: 'newspaper', color: '#8b5cf6', display_order: 2 },
      { id: '3', code: 'programmatic', name: 'Programmatic Digital', icon: 'monitor', color: '#10b981', display_order: 3 },
      { id: '4', code: 'web_social', name: 'Web & Social', icon: 'globe', color: '#f59e0b', display_order: 4 },
      { id: '5', code: 'events', name: 'Events', icon: 'calendar', color: '#ec4899', display_order: 5 },
      { id: '6', code: 'podcast', name: 'Podcast', icon: 'mic', color: '#6366f1', display_order: 6 },
    ]);

    setProducts([
      // Sample products - these will be replaced with real data from the database
      { id: '1', code: 'wsic_radio_premium', name: 'Radio Premium Package', category_id: '1', category_name: 'Broadcast', entity_id: '89e09b9c-565d-440f-9381-8d3e10b49268', entity_code: 'wsic', default_rate: 1500, rate_type: 'monthly', is_active: true },
      { id: '2', code: 'lkn_print_full', name: 'Full Page Ad', category_id: '2', category_name: 'Print', entity_id: '67aed7c3-e356-4d06-870e-b88a23befa22', entity_code: 'lkn', default_rate: 1250, rate_type: 'per_issue', is_active: true },
    ]);

    setPackages([
      { id: '1', code: 'wsic_starter', name: 'Digital Starter', entity_code: 'wsic', base_price: 500, product_count: 2 },
    ]);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (filterEntity !== 'all' && p.entity_code !== filterEntity) return false;
    if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
    return true;
  });

  // Filter packages
  const filteredPackages = packages.filter(p => {
    if (filterEntity !== 'all' && p.entity_code !== filterEntity) return false;
    return true;
  });

  const tabs = [
    { id: 'products', label: 'Products', count: products.length },
    { id: 'packages', label: 'Packages', count: packages.length },
    { id: 'categories', label: 'Categories', count: categories.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <p className="text-sm text-gray-500">Manage products, packages, and pricing</p>
            </div>
            <div className="flex gap-2">
              {activeTab === 'products' && (
                <button
                  onClick={() => { setEditingItem(null); setShowProductModal(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Icons.plus /> Add Product
                </button>
              )}
              {activeTab === 'packages' && (
                <button
                  onClick={() => { setEditingItem(null); setShowPackageModal(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Icons.plus /> Add Package
                </button>
              )}
              {activeTab === 'categories' && (
                <button
                  onClick={() => { setEditingItem(null); setShowCategoryModal(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Icons.plus /> Add Category
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <strong>Note:</strong> Unable to connect to API. Showing mock data for preview. {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        {(activeTab === 'products' || activeTab === 'packages') && (
          <div className="flex gap-4 mb-6">
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Entities</option>
              {entities.map(e => (
                <option key={e.id} value={e.code}>{e.name}</option>
              ))}
            </select>
            
            {activeTab === 'products' && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Content */}
        {activeTab === 'products' && (
          <ProductsTable 
            products={filteredProducts}
            categories={categories}
            entities={entities}
            onEdit={(p) => { setEditingItem(p); setShowProductModal(true); }}
            onDelete={async (id) => {
              if (confirm('Are you sure you want to delete this product?')) {
                // TODO: API call to delete
                setProducts(products.filter(p => p.id !== id));
              }
            }}
          />
        )}

        {activeTab === 'packages' && (
          <PackagesTable 
            packages={filteredPackages}
            entities={entities}
            onEdit={(p) => { setEditingItem(p); setShowPackageModal(true); }}
            onDelete={async (id) => {
              if (confirm('Are you sure you want to delete this package?')) {
                setPackages(packages.filter(p => p.id !== id));
              }
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTable 
            categories={categories}
            onEdit={(c) => { setEditingItem(c); setShowCategoryModal(true); }}
          />
        )}
      </main>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingItem}
          categories={categories}
          entities={entities}
          onClose={() => { setShowProductModal(false); setEditingItem(null); }}
          onSave={async (productData) => {
            // TODO: API call to save
            if (editingItem) {
              setProducts(products.map(p => p.id === editingItem.id ? { ...p, ...productData } : p));
            } else {
              setProducts([...products, { ...productData, id: Date.now().toString() }]);
            }
            setShowProductModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showPackageModal && (
        <PackageModal
          pkg={editingItem}
          products={products}
          categories={categories}
          entities={entities}
          onClose={() => { setShowPackageModal(false); setEditingItem(null); }}
          onSave={async (packageData) => {
            if (editingItem) {
              setPackages(packages.map(p => p.id === editingItem.id ? { ...p, ...packageData } : p));
            } else {
              setPackages([...packages, { ...packageData, id: Date.now().toString() }]);
            }
            setShowPackageModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingItem}
          onClose={() => { setShowCategoryModal(false); setEditingItem(null); }}
          onSave={async (categoryData) => {
            if (editingItem) {
              setCategories(categories.map(c => c.id === editingItem.id ? { ...c, ...categoryData } : c));
            } else {
              setCategories([...categories, { ...categoryData, id: Date.now().toString() }]);
            }
            setShowCategoryModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// PRODUCTS TABLE
// ============================================================================

function ProductsTable({ products, categories, entities, onEdit, onDelete }) {
  const formatRate = (rate, type) => {
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rate);
    const suffix = {
      'monthly': '/mo',
      'per_issue': '/issue',
      'per_event': '/event',
      'per_week': '/week',
      'one_time': '',
      'cpm': ' CPM',
    }[type] || '';
    return `${amount}${suffix}`;
  };

  const getCategoryColor = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.color || '#6b7280';
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Icons.package />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
        <p className="mt-2 text-gray-500">Get started by adding your first product.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map(product => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-500">{product.code}</div>
              </td>
              <td className="px-6 py-4">
                <span 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${getCategoryColor(product.category_id)}20`, color: getCategoryColor(product.category_id) }}
                >
                  {product.category_name}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  product.entity_code === 'wsic' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {product.entity_code === 'wsic' ? 'WSIC' : 'LKNW'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {formatRate(product.default_rate, product.rate_type)}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onEdit(product)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 mr-2"
                  title="Edit"
                >
                  <Icons.edit />
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                  title="Delete"
                >
                  <Icons.trash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// PACKAGES TABLE
// ============================================================================

function PackagesTable({ packages, entities, onEdit, onDelete }) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Icons.package />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No packages found</h3>
        <p className="mt-2 text-gray-500">Create bundles of products for easier sales.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {packages.map(pkg => (
        <div key={pkg.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                  pkg.entity_code === 'wsic' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {pkg.entity_code === 'wsic' ? 'WSIC' : 'LKNW'}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
              </div>
              {pkg.featured && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                  Featured
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">{pkg.description || 'No description'}</p>
            
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-2xl font-bold text-gray-900">
                ${pkg.base_price?.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">
                {pkg.price_type === 'starting_at' ? ' starting' : ''}
                /mo
              </span>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              {pkg.product_count || 0} products included
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(pkg)}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Icons.edit /> Edit
              </button>
              <button
                onClick={() => onDelete(pkg.id)}
                className="px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Icons.trash />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// CATEGORIES TABLE
// ============================================================================

function CategoriesTable({ categories, onEdit }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map(cat => (
        <div 
          key={cat.id} 
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
            >
              <CategoryIcon icon={cat.icon} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{cat.name}</h3>
              <p className="text-sm text-gray-500">{cat.code}</p>
            </div>
          </div>
          
          {cat.description && (
            <p className="text-sm text-gray-600 mb-4">{cat.description}</p>
          )}

          <button
            onClick={() => onEdit(cat)}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Icons.edit /> Edit
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PRODUCT MODAL
// ============================================================================

function ProductModal({ product, categories, entities, onClose, onSave }) {
  const [formData, setFormData] = useState({
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    entity_id: product?.entity_id || entities[0]?.id || '',
    category_id: product?.category_id || categories[0]?.id || '',
    default_rate: product?.default_rate || '',
    rate_type: product?.rate_type || 'monthly',
    setup_fee: product?.setup_fee || '',
    min_term_months: product?.min_term_months || 1,
    min_quantity: product?.min_quantity || 1,
    max_quantity: product?.max_quantity || '',
    unit_label: product?.unit_label || 'unit',
    requires_details: product?.requires_details || false,
    is_active: product?.is_active ?? true,
    internal_notes: product?.internal_notes || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const rateTypes = [
    { value: 'monthly', label: 'Per Month' },
    { value: 'per_issue', label: 'Per Issue' },
    { value: 'per_event', label: 'Per Event' },
    { value: 'per_week', label: 'Per Week' },
    { value: 'one_time', label: 'One Time' },
    { value: 'cpm', label: 'CPM' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {product ? 'Edit Product' : 'Add Product'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <Icons.x />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., wsic_radio_premium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Radio Premium Package"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the product"
              />
            </div>

            {/* Entity & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity *
                </label>
                <select
                  value={formData.entity_id}
                  onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Pricing</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.default_rate}
                      onChange={(e) => setFormData({ ...formData, default_rate: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Type *
                  </label>
                  <select
                    value={formData.rate_type}
                    onChange={(e) => setFormData({ ...formData, rate_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {rateTypes.map(rt => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Setup Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.setup_fee}
                      onChange={(e) => setFormData({ ...formData, setup_fee: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Terms */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Term (months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.min_term_months}
                  onChange={(e) => setFormData({ ...formData, min_term_months: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_quantity}
                  onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Label
                </label>
                <input
                  type="text"
                  value={formData.unit_label}
                  onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., spot, issue"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_details}
                  onChange={(e) => setFormData({ ...formData, requires_details: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Requires additional details</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes visible only to staff"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PACKAGE MODAL
// ============================================================================

function PackageModal({ pkg, products, categories, entities, onClose, onSave }) {
  const [formData, setFormData] = useState({
    code: pkg?.code || '',
    name: pkg?.name || '',
    description: pkg?.description || '',
    entity_id: pkg?.entity_id || entities[0]?.id || '',
    base_price: pkg?.base_price || '',
    price_type: pkg?.price_type || 'fixed',
    discount_type: pkg?.discount_type || '',
    discount_value: pkg?.discount_value || '',
    default_term_months: pkg?.default_term_months || 1,
    min_term_months: pkg?.min_term_months || 1,
    featured: pkg?.featured || false,
    is_active: pkg?.is_active ?? true,
    internal_notes: pkg?.internal_notes || '',
  });

  const [selectedProducts, setSelectedProducts] = useState(pkg?.items || []);
  const [saving, setSaving] = useState(false);

  // Filter products by selected entity
  const availableProducts = products.filter(p => 
    p.entity_id === formData.entity_id || p.available_all_entities
  );

  const handleAddProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product && !selectedProducts.find(sp => sp.product_id === productId)) {
      setSelectedProducts([...selectedProducts, {
        product_id: productId,
        product_name: product.name,
        quantity: 1,
        override_price: null,
        is_required: true,
      }]);
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(sp => sp.product_id !== productId));
  };

  const handleUpdateProduct = (productId, field, value) => {
    setSelectedProducts(selectedProducts.map(sp => 
      sp.product_id === productId ? { ...sp, [field]: value } : sp
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...formData, items: selectedProducts });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {pkg ? 'Edit Package' : 'Create Package'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <Icons.x />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., wsic_growth"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity *
                </label>
                <select
                  value={formData.entity_id}
                  onChange={(e) => {
                    setFormData({ ...formData, entity_id: e.target.value });
                    setSelectedProducts([]); // Clear products when entity changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Growth Package"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of what's included"
              />
            </div>

            {/* Pricing */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Pricing</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Type
                  </label>
                  <select
                    value={formData.price_type}
                    onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="starting_at">Starting At</option>
                    <option value="minimum">Minimum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Term (months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_term_months}
                    onChange={(e) => setFormData({ ...formData, min_term_months: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Discount</option>
                    <option value="percent">Percentage Off</option>
                    <option value="amount">Fixed Amount Off</option>
                  </select>
                </div>
                {formData.discount_type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value
                    </label>
                    <div className="relative">
                      {formData.discount_type === 'amount' && (
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                      )}
                      <input
                        type="number"
                        step={formData.discount_type === 'percent' ? '1' : '0.01'}
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                        className={`w-full ${formData.discount_type === 'amount' ? 'pl-7' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder={formData.discount_type === 'percent' ? '10' : '100'}
                      />
                      {formData.discount_type === 'percent' && (
                        <span className="absolute right-3 top-2 text-gray-500">%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Products */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Included Products</h3>
                <select
                  onChange={(e) => { handleAddProduct(e.target.value); e.target.value = ''; }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add product...</option>
                  {availableProducts
                    .filter(p => !selectedProducts.find(sp => sp.product_id === p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.default_rate}</option>
                    ))
                  }
                </select>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">No products added yet</p>
                  <p className="text-sm text-gray-400">Use the dropdown above to add products</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedProducts.map((sp, idx) => {
                    const product = products.find(p => p.id === sp.product_id);
                    return (
                      <div key={sp.product_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-400 text-sm w-6">{idx + 1}.</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{sp.product_name || product?.name}</div>
                          <div className="text-sm text-gray-500">
                            Default: ${product?.default_rate}/
                            {product?.rate_type === 'monthly' ? 'mo' : product?.rate_type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={sp.quantity}
                            onChange={(e) => handleUpdateProduct(sp.product_id, 'quantity', parseInt(e.target.value))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            title="Quantity"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={sp.override_price || ''}
                            onChange={(e) => handleUpdateProduct(sp.product_id, 'override_price', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Override $"
                            title="Override price"
                          />
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={sp.is_required}
                              onChange={(e) => handleUpdateProduct(sp.product_id, 'is_required', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            Req
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(sp.product_id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Icons.x />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Featured package</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes visible only to staff"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (pkg ? 'Update Package' : 'Create Package')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY MODAL
// ============================================================================

function CategoryModal({ category, onClose, onSave }) {
  const [formData, setFormData] = useState({
    code: category?.code || '',
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || 'globe',
    color: category?.color || '#6366f1',
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  });

  const [saving, setSaving] = useState(false);

  const iconOptions = [
    { value: 'radio', label: 'Radio' },
    { value: 'newspaper', label: 'Newspaper' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'globe', label: 'Globe' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'mic', label: 'Microphone' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {category ? 'Edit Category' : 'Add Category'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <Icons.x />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., broadcast"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Broadcast"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {iconOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (category ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
