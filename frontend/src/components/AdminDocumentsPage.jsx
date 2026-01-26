import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
};

const Icons = {
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  File: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Filter: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
};

const typeConfig = {
  contract: { bg: '#ecfdf5', text: '#10b981', label: 'Contract' },
  change_order: { bg: '#fffbeb', text: '#f59e0b', label: 'Change Order' },
  kill_order: { bg: '#fef2f2', text: '#ef4444', label: 'Kill Order' },
  other: { bg: '#f3f4f6', text: '#6b7280', label: 'Other' },
};

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [docsRes, clientsRes, entitiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/documents`, { headers }),
        fetch(`${API_BASE}/api/orders/clients?limit=500`, { headers }),
        fetch(`${API_BASE}/api/orders/entities/list`, { headers }),
      ]);
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    if (selectedTab !== 'all') filtered = filtered.filter(doc => doc.document_type === selectedTab);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => doc.file_name?.toLowerCase().includes(s) || doc.client_name?.toLowerCase().includes(s) || doc.order_number?.toLowerCase().includes(s));
    }
    if (selectedClient) filtered = filtered.filter(doc => doc.client_id === selectedClient);
    if (selectedEntity) filtered = filtered.filter(doc => doc.entity_id === selectedEntity);
    if (dateRange.start) filtered = filtered.filter(doc => new Date(doc.created_at) >= new Date(dateRange.start));
    if (dateRange.end) filtered = filtered.filter(doc => new Date(doc.created_at) <= new Date(dateRange.end + 'T23:59:59'));
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [documents, selectedTab, searchTerm, selectedClient, selectedEntity, dateRange]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const typeCounts = useMemo(() => {
    const c = { all: documents.length, contract: 0, change_order: 0, kill_order: 0, other: 0 };
    documents.forEach(d => c[d.document_type] !== undefined ? c[d.document_type]++ : c.other++);
    return c;
  }, [documents]);

  const clearFilters = () => {
    setSearchTerm(''); setSelectedClient(''); setSelectedEntity(''); setDateRange({ start: '', end: '' }); setCurrentPage(1);
  };

  const hasFilters = searchTerm || selectedClient || selectedEntity || dateRange.start || dateRange.end;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatSize = (b) => !b ? '—' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  if (loading) return <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div><h1 style={styles.title}>Documents</h1><p style={styles.subtitle}>View and manage all uploaded documents</p></div>
        <span style={styles.docCount}>{filteredDocuments.length} documents</span>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[{ key: 'all', label: 'All' }, { key: 'contract', label: 'Contracts' }, { key: 'change_order', label: 'Change Orders' }, { key: 'kill_order', label: 'Kill Orders' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setSelectedTab(tab.key); setCurrentPage(1); }}
            style={{ ...styles.tab, ...(selectedTab === tab.key ? styles.tabActive : {}) }}
          >
            {tab.label}
            <span style={{ ...styles.tabCount, backgroundColor: selectedTab === tab.key ? '#3b82f6' : '#e2e8f0', color: selectedTab === tab.key ? 'white' : '#64748b' }}>
              {typeCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Icons.Search />
          <input type="text" placeholder="Search documents..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={styles.searchInput} />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={styles.clearSearch}><Icons.X /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ ...styles.filterButton, ...(hasFilters ? styles.filterButtonActive : {}) }}>
          <Icons.Filter /> Filters {hasFilters && <span style={styles.filterBadge}>!</span>}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={styles.filterPanel}>
          <div style={styles.filterGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Client</label>
              <select value={selectedClient} onChange={(e) => { setSelectedClient(e.target.value); setCurrentPage(1); }} style={styles.filterSelect}>
                <option value="">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Brand</label>
              <select value={selectedEntity} onChange={(e) => { setSelectedEntity(e.target.value); setCurrentPage(1); }} style={styles.filterSelect}>
                <option value="">All Brands</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date From</label>
              <input type="date" value={dateRange.start} onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1); }} style={styles.filterInput} />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date To</label>
              <input type="date" value={dateRange.end} onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1); }} style={styles.filterInput} />
            </div>
          </div>
          {hasFilters && <button onClick={clearFilters} style={styles.clearFiltersButton}>Clear All Filters</button>}
        </div>
      )}

      {/* Documents Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHead}>
              <th style={styles.th}>Document</th>
              <th style={styles.th}>Client</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Brand</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Size</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocs.length === 0 ? (
              <tr><td colSpan="7" style={styles.emptyState}>No documents found</td></tr>
            ) : (
              paginatedDocs.map(doc => {
                const type = typeConfig[doc.document_type] || typeConfig.other;
                return (
                  <tr key={doc.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.docCell}>
                        <div style={styles.fileIcon}><Icons.File /></div>
                        <div>
                          <div style={styles.fileName}>{doc.file_name || doc.original_file_name}</div>
                          {doc.order_number && <div style={styles.orderNum}>Order: {doc.order_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}><span style={styles.clientLink}>{doc.client_name || '—'}</span></td>
                    <td style={styles.td}>
                      <span style={{ ...styles.typeBadge, backgroundColor: type.bg, color: type.text }}>{type.label}</span>
                    </td>
                    <td style={styles.td}>{doc.entity_name || '—'}</td>
                    <td style={styles.td}>{formatDate(doc.created_at)}</td>
                    <td style={styles.td}>{formatSize(doc.file_size)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actions}>
                        <button style={styles.actionBtn} title="View"><Icons.Eye /></button>
                        <button style={styles.actionBtn} title="Download"><Icons.Download /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}>
            <Icons.ChevronLeft /> Previous
          </button>
          <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}>
            Next <Icons.ChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  docCount: { fontSize: '14px', color: '#6b7280', background: '#f1f5f9', padding: '8px 16px', borderRadius: '8px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'none', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { background: '#eff6ff', color: '#3b82f6' },
  tabCount: { padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '16px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px' },
  clearSearch: { padding: '4px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  filterButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', position: 'relative' },
  filterButtonActive: { borderColor: '#3b82f6', color: '#3b82f6' },
  filterBadge: { position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  filterPanel: { background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  filterGroup: { display: 'flex', flexDirection: 'column' },
  filterLabel: { fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  filterSelect: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: 'white' },
  filterInput: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' },
  clearFiltersButton: { marginTop: '16px', padding: '8px 16px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' },
  tableContainer: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f9fafb' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#374151' },
  docCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  fileIcon: { width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  fileName: { fontWeight: '500', color: '#1e293b' },
  orderNum: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
  clientLink: { color: '#3b82f6', cursor: 'pointer' },
  typeBadge: { padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500' },
  actions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  actionBtn: { padding: '6px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', cursor: 'pointer' },
  emptyState: { padding: '48px', textAlign: 'center', color: '#6b7280' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' },
  pageBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  pageInfo: { fontSize: '14px', color: '#6b7280' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

const sheet = document.createElement('style');
sheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(sheet);
