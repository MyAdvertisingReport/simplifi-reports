import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, FileText, Settings, LogOut, 
  Menu, X, BarChart3, Calendar, TrendingUp, MousePointer, DollarSign,
  Eye, Target, ArrowLeft, ExternalLink, Copy, Check, Smartphone, Monitor,
  Tablet, Tv, MapPin, Image, Percent, Play, Pause, StopCircle, ChevronRight,
  GripVertical, Save, MessageSquare, Pin, Trash2, Edit3, Video, Radio, Code,
  CheckCircle, AlertCircle, Clock, Bookmark, Flag, Download, History, Award,
  TrendingDown, Zap, Star, ChevronUp, ChevronDown, FileDown, Search, Globe, List,
  Database, RefreshCw
} from 'lucide-react';
import ProductManagement from './components/ProductManagement';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import { 
  ResponsiveContainer, 
  AreaChart as RechartsAreaChart, 
  Area, 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar,
  ComposedChart
} from 'recharts';

// ============================================
// API BASE URL - Use environment variable in production
// ============================================
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================
// RESPONSIVE HOOK
// ============================================
const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Measure immediately on mount
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use 768 as mobile breakpoint (more standard for phones)
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    width: windowSize.width,
    // Helper for grid columns
    gridCols: (desktop, tablet = 2, mobile = 1) => {
      if (windowSize.width < 768) return mobile;
      if (windowSize.width < 1024) return tablet;
      return desktop;
    }
  };
};

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // API returns { user: {...} }, extract the user object
        setUser(data.user || data);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    const { token, user } = await res.json();
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// API HELPER
// ============================================
export const api = {
  get: async (url) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${url}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },
  post: async (url, data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },
  put: async (url, data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },
  delete: async (url) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  }
};

// ============================================
// FORMATTING HELPERS
// ============================================
const formatNumber = (num) => {
  if (num === null || num === undefined) return '—';
  const n = parseFloat(num);
  if (isNaN(n)) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return new Intl.NumberFormat().format(Math.round(n));
};

const formatNumberFull = (num) => {
  if (num === null || num === undefined) return '—';
  const n = parseFloat(num);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat().format(Math.round(n));
};

const formatCurrency = (num) => {
  if (num === null || num === undefined) return '—';
  const n = parseFloat(num);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const formatPercent = (num) => {
  if (num === null || num === undefined) return '—';
  const n = parseFloat(num);
  if (isNaN(n)) return '—';
  // Assume input is always a decimal (0.0031 for 0.31%)
  // Use normalizeCtR() before passing to this function if source is API
  return (n * 100).toFixed(2) + '%';
};

// Normalize CTR from Simpli.fi API
// API returns CTR in inconsistent formats:
// - Campaign stats: 0.31 meaning 0.31% (need to divide by 100)
// - Some endpoints: 0.0031 meaning 0.31% (already decimal)
// We normalize everything to decimal format (0.0031 for 0.31%)
const normalizeCtr = (ctr) => {
  if (ctr === null || ctr === undefined) return 0;
  const n = parseFloat(ctr);
  if (isNaN(n)) return 0;
  // If CTR is between 0 and 1 but greater than typical max CTR (5% = 0.05),
  // it's likely a percentage that needs converting to decimal
  // Campaign CTRs are typically 0.05% - 2% (0.0005 - 0.02 as decimal)
  // If n > 0.05, assume it's a percentage from API
  if (n > 0.05 && n <= 100) {
    // Looks like a percentage, convert to decimal
    return n / 100;
  }
  // Already a decimal or very small percentage
  return n;
};

// Normalize stats object from API/cache
const normalizeStats = (stats) => {
  if (!stats) return null;
  return {
    ...stats,
    ctr: normalizeCtr(stats.ctr)
  };
};

// Top Ad Card component with image error handling
function TopAdCard({ ad, rank }) {
  const [imageError, setImageError] = useState(false);
  const isFirst = rank === 0;
  
  const hasValidPreview = ad.preview_url && !imageError;
  
  // Proxy image URL through our backend for Safari compatibility
  const getProxiedUrl = (url) => {
    if (!url) return null;
    // Use proxy to avoid Safari cross-origin blocking
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
  };
  
  // Parse dimensions from size string for placeholder
  const sizeParts = ad.size?.match(/(\d+)x(\d+)/);
  const displayWidth = sizeParts ? parseInt(sizeParts[1]) : 300;
  const displayHeight = sizeParts ? parseInt(sizeParts[2]) : 250;
  
  return (
    <div style={{ 
      padding: '1.25rem', 
      background: isFirst ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : '#f9fafb', 
      borderRadius: '0.75rem',
      color: isFirst ? 'white' : 'inherit'
    }}>
      {/* Ad Preview - show image if available, or placeholder */}
      <div style={{ 
        marginBottom: '0.75rem', 
        borderRadius: '0.5rem', 
        overflow: 'hidden',
        background: isFirst ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60px',
        maxHeight: '120px',
        position: 'relative'
      }}>
        {hasValidPreview ? (
          ad.is_video ? (
            <video 
              src={ad.preview_url} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '120px', 
                objectFit: 'contain'
              }}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setImageError(true)}
            />
          ) : (
            <img 
              src={getProxiedUrl(ad.preview_url)} 
              alt={ad.size}
              style={{ 
                maxWidth: '100%',
                maxHeight: '120px',
                objectFit: 'contain'
              }}
              onError={() => setImageError(true)}
            />
          )
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: isFirst ? 'rgba(255,255,255,0.5)' : '#9ca3af',
            fontSize: '0.75rem',
            padding: '0.75rem'
          }}>
            <Image size={24} style={{ marginBottom: '0.25rem', opacity: 0.5 }} />
            <span>{ad.size}</span>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{ad.size}</span>
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          background: isFirst ? 'rgba(255,255,255,0.2)' : '#e5e7eb', 
          borderRadius: '0.25rem', 
          fontSize: '0.75rem', 
          fontWeight: 600 
        }}>
          #{rank + 1}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8125rem' }}>
        <div style={{ flex: '1 1 auto', minWidth: '60px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Impressions</div>
          <div style={{ fontWeight: 600 }}>{formatNumber(ad.impressions)}</div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: '50px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Clicks</div>
          <div style={{ fontWeight: 600 }}>{formatNumber(ad.clicks)}</div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: '50px' }}>
          <div style={{ opacity: 0.7, fontSize: '0.6875rem', textTransform: 'uppercase' }}>CTR</div>
          <div style={{ fontWeight: 600 }}>{formatPercent(ad.ctr)}</div>
        </div>
      </div>
    </div>
  );
}

// Parse campaign name to extract strategy type
const parseStrategy = (campaignName) => {
  if (!campaignName) return 'Display';
  const name = campaignName.toLowerCase();
  
  // Check for specific strategies in order of specificity
  // CTV/OTT - check first as these are distinct
  if (name.includes('_ctv') || name.includes('ctv') || name.includes('ott') || name.includes('streaming')) return 'CTV/OTT';
  
  // Addressable/CCA
  if (name.includes('_cca') || name.includes('addressable') || name.includes('zip')) return 'Addressable (CCA)';
  
  // Keywords
  if (name.includes('_keyword') || name.includes('keyword') || name.includes('_kw_') || name.includes('_kw')) return 'Keywords';
  
  // Contextual
  if (name.includes('_contextual') || name.includes('contextual')) return 'Contextual';
  
  // Geo-Fence - expanded patterns including GeoComp, GeoTarget, etc.
  if (name.includes('_gf_') || name.includes('_gf') || 
      name.includes('geofence') || name.includes('geo_fence') || name.includes('geo-fence') ||
      name.includes('geocomp') || name.includes('geo_comp') || name.includes('geo-comp') ||
      name.includes('geotarget') || name.includes('geo_target') || name.includes('geo-target') ||
      name.includes('geoframe') || name.includes('geo_frame') ||
      name.includes('_geo_') || name.match(/_geo[^a-z]/i)) return 'Geo-Fence';
  
  // Site Retargeting - check before general retargeting
  if (name.includes('site_retarget') || name.includes('site retarget') || name.includes('_sr_') || name.includes('siteretarget')) return 'Site Retargeting';
  
  // Retargeting (general)
  if (name.includes('_retarget') || name.includes('retarget')) return 'Retargeting';
  
  // Video (non-OTT)
  if (name.includes('_video') || name.includes('video')) return 'Video';
  
  // Display is the default fallback (instead of Other)
  return 'Display';
};

// Parse ad name to extract size
const parseAdSize = (adName, width, height) => {
  // First try to parse from name
  if (adName) {
    const sizeMatch = adName.match(/(\d{2,4}x\d{2,4})/i);
    if (sizeMatch) return sizeMatch[1];
    if (adName.toLowerCase().includes('.mp4') || adName.toLowerCase().includes('ott')) return 'Video/OTT';
  }
  // Fall back to width/height if available
  if (width && height) {
    return `${width}x${height}`;
  }
  return 'Unknown';
};

// Get status color and icon
const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return { color: '#10b981', bg: '#ecfdf5', icon: Play, label: 'Active' };
    case 'paused':
      return { color: '#f59e0b', bg: '#fffbeb', icon: Pause, label: 'Paused' };
    case 'stopped':
    case 'ended':
      return { color: '#ef4444', bg: '#fef2f2', icon: StopCircle, label: 'Stopped' };
    default:
      return { color: '#6b7280', bg: '#f3f4f6', icon: Target, label: status || 'Unknown' };
  }
};

// ============================================
// LOGIN PAGE
// ============================================
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <BarChart3 size={48} color="#1e3a8a" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Digital Advertising Reports</h1>
          <p style={{ color: '#6b7280' }}>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#fef2f2', borderRadius: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR
// ============================================
function Sidebar({ isOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState({ orders: true });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Check if Client View mode is active
  const clientViewActive = localStorage.getItem('clientViewMode') === 'true';
  
  // Function to turn off client view mode globally
  const turnOffClientView = () => {
    localStorage.setItem('clientViewMode', 'false');
    window.location.reload(); // Reload to update all components
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Building2, label: 'Clients' },
  ];
  
  // Order Management section items
  const orderItems = [
    { path: '/orders', icon: List, label: 'All Orders' },
    { path: '/orders/new', icon: FileText, label: 'New Order' },
    { path: '/admin/products', icon: Database, label: 'Products' },
  ];
  
  if (user?.role === 'admin') {
    navItems.push({ path: '/users', icon: Users, label: 'Users' });
    navItems.push({ path: '/settings', icon: Settings, label: 'Settings' });
  }
  
  // Check if current path is in order management section
  const isOrderSection = location.pathname.startsWith('/orders') || location.pathname === '/admin/products';

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px',
      background: '#111827', padding: '1.5rem', display: 'flex', flexDirection: 'column',
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.2s ease', zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <BarChart3 size={32} color="#3b82f6" />
        <span style={{ color: 'white', fontWeight: 600, fontSize: '1.125rem' }}>Ad Reports</span>
      </div>
      
      {/* Client View Mode Indicator */}
      {clientViewActive && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Eye size={18} color="white" />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>Client View ON</div>
          </div>
          <button 
            onClick={turnOffClientView}
            style={{ 
              background: 'rgba(0,0,0,0.2)', 
              border: 'none', 
              borderRadius: '0.25rem', 
              padding: '0.375rem 0.75rem', 
              color: 'white', 
              fontSize: '0.75rem', 
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Turn Off
          </button>
        </div>
      )}
      
      {/* Client View Toggle Button - when NOT active */}
      {!clientViewActive && (
        <button 
          onClick={() => {
            localStorage.setItem('clientViewMode', 'true');
            window.location.reload();
          }}
          style={{
            background: '#374151',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          <Eye size={18} color="#9ca3af" />
          <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: '0.875rem' }}>Enable Client View</span>
        </button>
      )}
      
      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {/* Main nav items */}
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
            marginBottom: '0.25rem', borderRadius: '0.5rem', textDecoration: 'none',
            color: location.pathname === path ? 'white' : '#9ca3af',
            background: location.pathname === path ? 'rgba(59,130,246,0.2)' : 'transparent'
          }}>
            <Icon size={20} /><span style={{ fontWeight: 500 }}>{label}</span>
          </Link>
        ))}
        
        {/* Order Management Section */}
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={() => toggleSection('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              width: '100%',
              border: 'none',
              borderRadius: '0.5rem',
              background: isOrderSection ? 'rgba(59,130,246,0.1)' : 'transparent',
              cursor: 'pointer',
              color: isOrderSection ? '#60a5fa' : '#9ca3af',
            }}
          >
            <DollarSign size={20} />
            <span style={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>Order Management</span>
            {expandedSections.orders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {/* Sub-items */}
          {expandedSections.orders && (
            <div style={{ marginLeft: '0.5rem', borderLeft: '2px solid #374151', marginTop: '0.25rem' }}>
              {orderItems.map(({ path, icon: Icon, label }) => (
                <Link key={path} to={path} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem',
                  marginLeft: '0.75rem', marginBottom: '0.125rem', borderRadius: '0.375rem', textDecoration: 'none',
                  color: location.pathname === path ? 'white' : '#9ca3af',
                  background: location.pathname === path ? 'rgba(59,130,246,0.2)' : 'transparent',
                  fontSize: '0.875rem'
                }}>
                  <Icon size={16} /><span style={{ fontWeight: 500 }}>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 500, fontSize: '0.875rem' }}>{user?.name}</div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{user?.role === 'admin' ? 'Admin' : 'Sales'}</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', width: '100%' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ============================================
// LAYOUT
// ============================================
function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} />
      <main style={{ marginLeft: sidebarOpen ? '260px' : '0', transition: 'margin 0.2s ease', minHeight: '100vh' }}>
        <header style={{ height: '64px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 30 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

// ============================================
// DASHBOARD PAGE
// ============================================
function DashboardPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const clientsData = await api.get('/api/clients');
      setClients(clientsData);

      // Calculate date range (past 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      // Helper to parse strategy - matches global parseStrategy function
      const parseStrategy = (name) => {
        if (!name) return 'Display';
        const n = name.toLowerCase();
        if (n.includes('ctv') || n.includes('ott') || n.includes('streaming')) return 'OTT/CTV';
        if (n.includes('_cca') || n.includes('addressable') || n.includes('zip')) return 'Addressable';
        if (n.includes('keyword') || n.includes('_kw')) return 'Keyword';
        if (n.includes('contextual')) return 'Contextual';
        if (n.includes('_gf') || n.includes('geofence') || n.includes('geo_fence') || n.includes('geo-fence') ||
            n.includes('geocomp') || n.includes('geo_comp') || n.includes('geotarget') || n.includes('geo_target') ||
            n.includes('_geo_') || n.match(/_geo[^a-z]/i)) return 'Geo-Fence';
        if (n.includes('site_retarget') || n.includes('site retarget') || n.includes('_sr_') || n.includes('siteretarget')) return 'Site Retargeting';
        if (n.includes('retarget')) return 'Retargeting';
        if (n.includes('video')) return 'Video';
        return 'Display';
      };

      // Helper to delay between requests (for rate limiting)
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // Load data for all clients - THROTTLED to avoid rate limiting
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let activeClients = 0;
      let activeCampaigns = 0;
      let allCampaigns = [];
      const clientPerformance = [];
      const dailyTotals = {};
      const strategyTotals = {};
      const endingSoon = [];
      const pixelsNeedingAttention = [];
      const lowCTRCampaigns = [];

      // Process clients in batches with throttling
      const BATCH_SIZE = 2;
      const BATCH_DELAY = 1500; // 1.5 seconds between batches
      
      const clientsWithOrg = clientsData.filter(c => c.simplifi_org_id);
      
      for (let i = 0; i < clientsWithOrg.length; i += BATCH_SIZE) {
        const batch = clientsWithOrg.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (client) => {
        try {
          // Use cached stats endpoint - it handles fetching internally
          let stats, dailyStats;
          try {
            stats = await api.get(`/api/clients/${client.id}/cached-stats?startDate=${startDate}&endDate=${endDate}&byCampaign=true`);
            dailyStats = await api.get(`/api/clients/${client.id}/cached-stats?startDate=${startDate}&endDate=${endDate}`);
          } catch (statsError) {
            console.log(`Stats unavailable for ${client.name}, skipping`);
            // Don't try direct API - just skip this client to avoid rate limiting
            return;
          }
          
          // Only fetch campaigns and pixels if we got stats
          const campaigns = await api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/campaigns`).catch(() => ({ campaigns: [] }));
          const pixelData = await api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/pixels`).catch(() => ({ first_party_segments: [] }));

          // Check pixel status
          const pixels = pixelData.first_party_segments || pixelData.retargeting_segments || [];
          const hasActivePixel = pixels.some(p => p.active === true || p.status === 'Active' || (p.user_count || p.segment_size || 0) > 0);
          
          if (!hasActivePixel) {
            pixelsNeedingAttention.push({
              clientId: client.id,
              clientSlug: client.slug,
              clientName: client.name,
              pixelCount: pixels.length,
              hasPixels: pixels.length > 0,
              primaryColor: client.primary_color
            });
          }

          // Calculate client totals
          let clientImpressions = 0, clientClicks = 0, clientSpend = 0;
          (stats.campaign_stats || []).forEach(s => {
            clientImpressions += s.impressions || 0;
            clientClicks += s.clicks || 0;
            clientSpend += s.total_spend || 0;
          });

          totalImpressions += clientImpressions;
          totalClicks += clientClicks;
          totalSpend += clientSpend;

          // Process campaigns for low CTR check
          const clientCampaignsData = campaigns.campaigns || [];
          const activeCamps = clientCampaignsData.filter(c => c.status?.toLowerCase() === 'active');
          
          // Check each active campaign's CTR from stats (now we have per-campaign stats with byCampaign=true)
          activeCamps.forEach(camp => {
            const campStats = (stats.campaign_stats || []).find(s => s.campaign_id === camp.id);
            if (campStats) {
              const ctr = campStats.impressions > 0 ? (campStats.clicks / campStats.impressions * 100) : 0;
              const strategy = parseStrategy(camp.name);
              
              // Exclude OTT/CTV campaigns (not clickable)
              const isOTT = strategy === 'OTT/CTV' || 
                           camp.name?.toLowerCase().includes('ott') || 
                           camp.name?.toLowerCase().includes('ctv');
              
              // Only consider campaigns with significant impressions (>1000) and CTR below 0.08%
              if (campStats.impressions > 1000 && !isOTT && ctr < 0.08) {
                lowCTRCampaigns.push({
                  ...camp,
                  clientName: client.name,
                  clientId: client.id,
                  clientSlug: client.slug,
                  impressions: campStats.impressions,
                  clicks: campStats.clicks,
                  ctr: ctr,
                  strategy: strategy
                });
              }
            }
          });

          // Process daily stats
          (dailyStats.campaign_stats || []).forEach(day => {
            const date = day.stat_date;
            if (!dailyTotals[date]) {
              dailyTotals[date] = { date, impressions: 0, clicks: 0, spend: 0 };
            }
            dailyTotals[date].impressions += day.impressions || 0;
            dailyTotals[date].clicks += day.clicks || 0;
            dailyTotals[date].spend += day.total_spend || 0;
          });

          // Process campaigns
          const clientCampaigns = campaigns.campaigns || [];
          const active = clientCampaigns.filter(c => c.status?.toLowerCase() === 'active');
          
          if (active.length > 0) {
            activeClients++;
          }
          activeCampaigns += active.length;

          // Check for campaigns ending soon
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          active.forEach(camp => {
            if (camp.end_date) {
              const endDateObj = new Date(camp.end_date);
              if (endDateObj <= thirtyDaysFromNow && endDateObj >= now) {
                endingSoon.push({
                  ...camp,
                  clientName: client.name,
                  clientId: client.id,
                  clientSlug: client.slug,
                  daysRemaining: Math.ceil((endDateObj - now) / (1000 * 60 * 60 * 24))
                });
              }
            }

            // Track strategy totals
            const strategy = parseStrategy(camp.name);
            if (!strategyTotals[strategy]) {
              strategyTotals[strategy] = { impressions: 0, clicks: 0, spend: 0, count: 0 };
            }
            strategyTotals[strategy].count++;
          });

          // Track campaign stats by strategy
          (stats.campaign_stats || []).forEach(stat => {
            const camp = clientCampaigns.find(c => c.id === stat.campaign_id);
            if (camp) {
              const strategy = parseStrategy(camp.name);
              if (!strategyTotals[strategy]) {
                strategyTotals[strategy] = { impressions: 0, clicks: 0, spend: 0, count: 0 };
              }
              strategyTotals[strategy].impressions += stat.impressions || 0;
              strategyTotals[strategy].clicks += stat.clicks || 0;
              strategyTotals[strategy].spend += stat.total_spend || 0;
            }
          });

          clientPerformance.push({
            id: client.id,
            slug: client.slug,
            name: client.name,
            impressions: clientImpressions,
            clicks: clientClicks,
            spend: clientSpend,
            activeCampaigns: active.length,
            primaryColor: client.primary_color
          });

          allCampaigns = [...allCampaigns, ...clientCampaigns.map(c => ({ ...c, clientName: client.name, clientId: client.id, clientSlug: client.slug }))];

        } catch (err) {
          console.error(`Failed to load data for ${client.name}:`, err);
        }
      }));
      
        // Add delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < clientsWithOrg.length) {
          await delay(BATCH_DELAY);
        }
      }

      // Sort daily totals
      const sortedDaily = Object.values(dailyTotals).sort((a, b) => new Date(a.date) - new Date(b.date));

      // Sort client performance
      const topByImpressions = [...clientPerformance].sort((a, b) => b.impressions - a.impressions).slice(0, 5);
      const topBySpend = [...clientPerformance].sort((a, b) => b.spend - a.spend).slice(0, 5);
      // Top by CTR (only clients with at least 1000 impressions to be meaningful)
      const topByCTR = [...clientPerformance]
        .filter(c => c.impressions >= 1000)
        .map(c => ({ ...c, ctr: c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0 }))
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 5);

      // Sort ending soon
      endingSoon.sort((a, b) => a.daysRemaining - b.daysRemaining);
      
      // Sort low CTR campaigns by CTR ascending (worst first)
      lowCTRCampaigns.sort((a, b) => a.ctr - b.ctr);

      setDashboardData({
        totalImpressions,
        totalClicks,
        totalSpend,
        avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0,
        activeClients,
        totalClients: clientsData.length,
        activeCampaigns,
        dailyStats: sortedDaily,
        topByImpressions,
        topBySpend,
        topByCTR,
        endingSoon,
        pixelsNeedingAttention,
        lowCTRCampaigns,
        startDate,
        endDate
      });

    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n?.toLocaleString() || '0';
  };

  const formatCurrency = (n) => '$' + (parseFloat(n) || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  const strategyColors = {
    'OTT/CTV': '#8b5cf6',
    'Geo-Fence': '#10b981',
    'Site Retargeting': '#f59e0b',
    'Retargeting': '#f97316',
    'Keyword': '#3b82f6',
    'Addressable': '#ec4899',
    'Contextual': '#06b6d4',
    'Display': '#6b7280'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Overview of all clients and campaigns</p>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right' }}>
          <div>Past 30 Days</div>
          {dashboardData && (
            <div>{new Date(dashboardData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(dashboardData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCardWithChart 
          label="Impressions" 
          value={formatNumber(dashboardData?.totalImpressions || 0)} 
          data={dashboardData?.dailyStats || []} 
          dataKey="impressions" 
          color="#0d9488" 
        />
        <StatCardWithChart 
          label="Clicks" 
          value={formatNumber(dashboardData?.totalClicks || 0)} 
          data={dashboardData?.dailyStats || []} 
          dataKey="clicks" 
          color="#3b82f6" 
        />
        <StatCardWithChart 
          label="Spend" 
          value={formatCurrency(dashboardData?.totalSpend || 0)} 
          data={dashboardData?.dailyStats || []} 
          dataKey="spend" 
          color="#f59e0b" 
        />
        <MiniStatCard 
          label="Avg CTR" 
          value={`${(dashboardData?.avgCTR || 0).toFixed(2)}%`} 
        />
        <MiniStatCard 
          label="Active Clients" 
          value={`${dashboardData?.activeClients || 0} / ${dashboardData?.totalClients || 0}`} 
        />
        <MiniStatCard 
          label="Active Campaigns" 
          value={dashboardData?.activeCampaigns || 0} 
        />
      </div>

      {/* Needs Attention Section */}
      {(dashboardData?.endingSoon?.length > 0 || dashboardData?.pixelsNeedingAttention?.length > 0 || dashboardData?.lowCTRCampaigns?.length > 0) && (
        <NeedsAttentionSection 
          campaigns={dashboardData.endingSoon || []} 
          pixelsNeedingAttention={dashboardData.pixelsNeedingAttention || []}
          lowCTRCampaigns={dashboardData.lowCTRCampaigns || []}
        />
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Daily Performance */}
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#0d9488" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Daily Performance</h3>
            </div>
            {dashboardData?.dailyStats?.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Per Day</div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.125rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d9488' }}>
                      {formatNumber(Math.round(dashboardData.totalImpressions / dashboardData.dailyStats.length))}
                    </span>
                    <span style={{ fontSize: '0.625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>impr</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6' }}>
                      {formatNumber(Math.round(dashboardData.totalClicks / dashboardData.dailyStats.length))}
                    </span>
                    <span style={{ fontSize: '0.625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>clicks</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {dashboardData?.dailyStats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={dashboardData.dailyStats}>
                <defs>
                  <linearGradient id="dashImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => formatNumber(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ fontSize: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => [formatNumber(value), name]}
                  labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#0d9488" fill="url(#dashImpressions)" strokeWidth={2} name="Impressions" />
                <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              No data available
            </div>
          )}
        </div>

        {/* Top Clients by CTR */}
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Percent size={18} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Top Clients by CTR</h3>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {dashboardData?.topByCTR?.length > 0 ? (
              dashboardData.topByCTR.map((client, i) => (
                <Link 
                  key={client.id} 
                  to={`/client/${client.slug}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.25rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderBottom: i < dashboardData.topByCTR.length - 1 ? '1px solid #f9fafb' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      background: client.primaryColor || '#1e3a8a', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 500 }}>{client.name}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', color: '#8b5cf6', fontWeight: 600 }}>
                    {(parseFloat(client.ctr) || 0).toFixed(2)}%
                  </span>
                </Link>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performers Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Top by Impressions */}
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} color="#0d9488" />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Top Clients by Impressions</h3>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {dashboardData?.topByImpressions?.length > 0 ? (
              dashboardData.topByImpressions.map((client, i) => (
                <Link 
                  key={client.id} 
                  to={`/client/${client.slug}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.25rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderBottom: i < dashboardData.topByImpressions.length - 1 ? '1px solid #f9fafb' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      background: client.primaryColor || '#1e3a8a', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 500 }}>{client.name}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', color: '#0d9488', fontWeight: 600 }}>
                    {formatNumber(client.impressions)}
                  </span>
                </Link>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No data</div>
            )}
          </div>
        </div>

        {/* Top by Spend */}
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Top Clients by Spend</h3>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {dashboardData?.topBySpend?.length > 0 ? (
              dashboardData.topBySpend.map((client, i) => (
                <Link 
                  key={client.id} 
                  to={`/client/${client.slug}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 1.25rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderBottom: i < dashboardData.topBySpend.length - 1 ? '1px solid #f9fafb' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      background: client.primaryColor || '#1e3a8a', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 500 }}>{client.name}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>
                    {formatCurrency(client.spend)}
                  </span>
                </Link>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEEDS ATTENTION SECTION (Expandable)
// ============================================
function NeedsAttentionSection({ campaigns, pixelsNeedingAttention, lowCTRCampaigns }) {
  const [mainExpanded, setMainExpanded] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState(false);
  const [expandedPixels, setExpandedPixels] = useState(false);
  const [expandedLowCTR, setExpandedLowCTR] = useState(false);

  const totalIssues = campaigns.length + pixelsNeedingAttention.length + lowCTRCampaigns.length;

  return (
    <div style={{ background: '#fef3c7', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid #fcd34d', overflow: 'hidden' }}>
      {/* Main Header - Collapsible */}
      <button
        onClick={() => setMainExpanded(!mainExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} color="#d97706" />
          <h3 style={{ margin: 0, color: '#92400e' }}>Needs Attention</h3>
          <span style={{ background: '#fbbf24', color: '#78350f', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
            {totalIssues}
          </span>
        </div>
        {mainExpanded ? <ChevronUp size={20} color="#92400e" /> : <ChevronDown size={20} color="#92400e" />}
      </button>

      {/* Expanded Content */}
      {mainExpanded && (
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {/* Expiring Campaigns Sub-Section */}
          {campaigns.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setExpandedCampaigns(!expandedCampaigns)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid #fde68a',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} color="#d97706" />
                  <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>Expiring Campaigns</span>
                  <span style={{ background: '#fde68a', color: '#92400e', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500 }}>
                    {campaigns.length}
                  </span>
                </div>
                {expandedCampaigns ? <ChevronUp size={16} color="#92400e" /> : <ChevronDown size={16} color="#92400e" />}
              </button>
              
              {expandedCampaigns && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ color: '#92400e', fontSize: '0.75rem', margin: '0 0 0.5rem', opacity: 0.8, paddingLeft: '0.5rem' }}>
                    Campaigns ending within the next 30 days
                  </p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {campaigns.map(camp => (
                      <div key={camp.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'white', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '0.5rem',
                        border: '1px solid #fde68a'
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem' }}>{camp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{camp.clientName}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '0.8125rem', 
                              fontWeight: 600, 
                              color: camp.daysRemaining <= 7 ? '#dc2626' : '#d97706' 
                            }}>
                              {camp.daysRemaining} days left
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                              Ends {new Date(camp.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          <Link 
                            to={`/client/${camp.clientSlug}/campaign/${camp.id}`}
                            style={{ color: '#3b82f6', fontSize: '0.875rem' }}
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pixels Needing Attention Sub-Section */}
          {pixelsNeedingAttention.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setExpandedPixels(!expandedPixels)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid #fde68a',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Radio size={16} color="#d97706" />
                  <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>Pixels Need Attention</span>
                  <span style={{ background: '#fde68a', color: '#92400e', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500 }}>
                    {pixelsNeedingAttention.length}
                  </span>
                </div>
                {expandedPixels ? <ChevronUp size={16} color="#92400e" /> : <ChevronDown size={16} color="#92400e" />}
              </button>
              
              {expandedPixels && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ color: '#92400e', fontSize: '0.75rem', margin: '0 0 0.5rem', opacity: 0.8, paddingLeft: '0.5rem' }}>
                    Clients without an active retargeting pixel
                  </p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {pixelsNeedingAttention.map(client => (
                      <div key={client.clientId} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'white', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '0.5rem',
                        border: '1px solid #fde68a'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            background: client.primaryColor || '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.6875rem'
                          }}>
                            {client.clientName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem' }}>{client.clientName}</div>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                              {client.hasPixels ? 'Pixel inactive or no audience' : 'No pixel configured'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            padding: '0.25rem 0.5rem',
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '0.25rem',
                            fontSize: '0.625rem',
                            fontWeight: 500
                          }}>
                            {client.hasPixels ? 'Inactive' : 'Not Set Up'}
                          </div>
                          <Link 
                            to={`/client/${client.clientSlug}`}
                            style={{ color: '#3b82f6', fontSize: '0.875rem' }}
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Low CTR Campaigns Sub-Section */}
          {lowCTRCampaigns.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedLowCTR(!expandedLowCTR)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid #fde68a',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingDown size={16} color="#d97706" />
                  <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>Low CTR Campaigns</span>
                  <span style={{ background: '#fde68a', color: '#92400e', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500 }}>
                    {lowCTRCampaigns.length}
                  </span>
                </div>
                {expandedLowCTR ? <ChevronUp size={16} color="#92400e" /> : <ChevronDown size={16} color="#92400e" />}
              </button>
              
              {expandedLowCTR && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ color: '#92400e', fontSize: '0.75rem', margin: '0 0 0.5rem', opacity: 0.8, paddingLeft: '0.5rem' }}>
                    Active campaigns with CTR below 0.08% (excludes OTT/CTV)
                  </p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {lowCTRCampaigns.map(camp => (
                      <div key={camp.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'white', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '0.5rem',
                        border: '1px solid #fde68a'
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem' }}>{camp.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                            {camp.clientName} • {camp.strategy}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 700, 
                              color: '#dc2626',
                              fontFamily: 'monospace'
                            }}>
                              {(parseFloat(camp.ctr) || 0).toFixed(3)}% CTR
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                              {camp.clicks.toLocaleString()} clicks / {camp.impressions.toLocaleString()} impr
                            </div>
                          </div>
                          <Link 
                            to={`/client/${camp.clientSlug}/campaign/${camp.id}`}
                            style={{ color: '#3b82f6', fontSize: '0.875rem' }}
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT CARD WITH MINI CHART
// ============================================
function StatCardWithChart({ label, value, data, dataKey, color }) {
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{value}</div>
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={40}>
          <RechartsAreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={1.5} />
          </RechartsAreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ============================================
// MINI STAT CARD (no chart)
// ============================================
function MiniStatCard({ label, value }) {
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{value}</div>
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ label, value, subtitle, icon: Icon, color = '#1e3a8a' }) {
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {Icon && <Icon size={18} color={color} />}
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.25rem' }}>{subtitle}</div>}
    </div>
  );
}

// ============================================
// CLIENTS PAGE
// ============================================
function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [clientStats, setClientStats] = useState({});
  const [brands, setBrands] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [newClient, setNewClient] = useState({ name: '', brandId: '', primaryColor: '#1e3a8a', secondaryColor: '#64748b' });
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [c, b] = await Promise.all([api.get('/api/clients'), api.get('/api/brands')]);
      setClients(c);
      setBrands(b);
      if (b.length) setNewClient(prev => ({ ...prev, brandId: b[0].id }));
      
      // Load stats for each client (past 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      
      // Helper to parse strategy from campaign name - matches global parseStrategy function
      const parseStrategy = (name) => {
        if (!name) return 'Display';
        const n = name.toLowerCase();
        if (n.includes('ctv') || n.includes('ott') || n.includes('streaming')) return 'OTT/CTV';
        if (n.includes('_cca') || n.includes('addressable') || n.includes('zip')) return 'Addressable';
        if (n.includes('keyword') || n.includes('_kw')) return 'Keyword';
        if (n.includes('contextual')) return 'Contextual';
        if (n.includes('_gf') || n.includes('geofence') || n.includes('geo_fence') || n.includes('geo-fence') ||
            n.includes('geocomp') || n.includes('geo_comp') || n.includes('geotarget') || n.includes('geo_target') ||
            n.includes('_geo_') || n.match(/_geo[^a-z]/i)) return 'Geo-Fence';
        if (n.includes('site_retarget') || n.includes('site retarget') || n.includes('_sr_') || n.includes('siteretarget')) return 'Site Retargeting';
        if (n.includes('retarget')) return 'Retargeting';
        if (n.includes('video')) return 'Video';
        return 'Display';
      };
      
      const statsPromises = c.filter(client => client.simplifi_org_id).map(async (client) => {
        try {
          const stats = await api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${startDate}&endDate=${endDate}`);
          const campaigns = await api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/campaigns`);
          
          // Calculate totals
          let totalImpressions = 0, totalClicks = 0, totalSpend = 0;
          (stats.campaign_stats || []).forEach(s => {
            totalImpressions += s.impressions || 0;
            totalClicks += s.clicks || 0;
            totalSpend += s.total_spend || 0;
          });
          
          const activeCampaigns = (campaigns.campaigns || []).filter(camp => camp.status?.toLowerCase() === 'active');
          
          // Get unique strategies from active campaigns
          const strategies = [...new Set(activeCampaigns.map(camp => parseStrategy(camp.name)))];
          
          return {
            clientId: client.id,
            impressions: totalImpressions,
            clicks: totalClicks,
            spend: totalSpend,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0,
            activeCampaigns: activeCampaigns.length,
            strategies,
            startDate,
            endDate
          };
        } catch (err) {
          console.error(`Failed to load stats for ${client.name}:`, err);
          return { clientId: client.id, error: true };
        }
      });
      
      const allStats = await Promise.all(statsPromises);
      const statsMap = {};
      allStats.forEach(s => { statsMap[s.clientId] = s; });
      setClientStats(statsMap);
      
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadOrganizations = async () => {
    try {
      const [orgsData, clientsData] = await Promise.all([
        api.get('/api/simplifi/organizations'),
        api.get('/api/clients')
      ]);
      
      const orgs = orgsData.organizations || [];
      
      // Mark which orgs are already synced as clients
      const syncedOrgIds = new Set(clientsData.map(c => c.simplifi_org_id).filter(Boolean));
      
      const orgsWithStatus = orgs.map(org => {
        const matchingClient = clientsData.find(c => c.simplifi_org_id === org.id);
        return {
          ...org,
          isSynced: syncedOrgIds.has(org.id),
          clientId: matchingClient?.id || null
        };
      });
      
      setOrganizations(orgsWithStatus);
    } catch (err) {
      console.error('Failed to load orgs:', err);
      alert('Failed to load Simpli.fi organizations: ' + err.message);
    }
  };

  const openSyncModal = async () => {
    setShowSyncModal(true);
    setSyncResults(null);
    await loadOrganizations();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const results = await api.post('/api/clients/sync', {});
      setSyncResults(results);
      // Reload clients list
      await loadData();
      // Reload orgs to update status
      await loadOrganizations();
    } catch (err) {
      alert('Sync failed: ' + err.message);
    }
    setSyncing(false);
  };

  // Sync a single organization
  const handleSyncOne = async (org) => {
    try {
      await api.post('/api/clients/sync-one', { orgId: org.id, orgName: org.name });
      setSyncResults({ action: `Synced "${org.name}"` });
      await loadData();
      await loadOrganizations();
    } catch (err) {
      alert('Failed to sync: ' + err.message);
    }
  };

  // Unsync (delete) a client
  const handleUnsync = async (org) => {
    if (!confirm(`Are you sure you want to unsync "${org.name}"? This will delete the client and all associated data.`)) {
      return;
    }
    try {
      await api.delete(`/api/clients/${org.clientId}`);
      setSyncResults({ action: `Unsynced "${org.name}"` });
      await loadData();
      await loadOrganizations();
    } catch (err) {
      alert('Failed to unsync: ' + err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/clients', newClient);
      setShowModal(false);
      await loadData();
    } catch (err) { alert(err.message); }
  };

  const getStatusIndicator = (stats) => {
    if (!stats || stats.error) return { color: '#9ca3af', label: 'No Data', bg: '#f3f4f6' };
    if (stats.activeCampaigns > 0) return { color: '#10b981', label: 'Active', bg: '#dcfce7' };
    return { color: '#dc2626', label: 'Inactive', bg: '#fee2e2' };
  };

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n?.toLocaleString() || '0';
  };

  const formatCurrency = (n) => '$' + (parseFloat(n) || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div><h1>Clients</h1><p style={{ color: '#6b7280' }}>Manage your advertising clients</p></div>
        {user?.role === 'admin' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={openSyncModal} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', 
                background: '#0d9488', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem', 
                fontWeight: 500, 
                cursor: 'pointer' 
              }}
            >
              <Download size={18} /> Sync from Simpli.fi
            </button>
            <button 
              onClick={() => setShowModal(true)} 
              style={{ 
                padding: '0.625rem 1.25rem', 
                background: '#1e3a8a', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem', 
                fontWeight: 500, 
                cursor: 'pointer' 
              }}
            >
              Add Client Manually
            </button>
          </div>
        )}
      </div>
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        {clients.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Building2 size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
            <p style={{ color: '#6b7280' }}>No clients yet.</p>
            {user?.role === 'admin' && (
              <button 
                onClick={openSyncModal}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#0d9488', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Sync from Simpli.fi
              </button>
            )}
          </div>
        ) : isMobile ? (
          /* Mobile: Card layout with all data visible */
          <div>
            {clients.map((c, idx) => {
              const stats = clientStats[c.id];
              const status = getStatusIndicator(stats);
              return (
                <div key={c.id} style={{ 
                  padding: '1rem', 
                  borderBottom: idx < clients.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  {/* Row 1: Logo, Name, Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    {c.logo_path ? (
                      <img src={c.logo_path} alt={c.name} style={{ width: 36, height: 36, borderRadius: '0.5rem', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: c.primary_color || '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.875rem', flexShrink: 0 }}>{c.name.charAt(0)}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{c.name}</div>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: status.bg, 
                          color: status.color,
                          borderRadius: '9999px', 
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          flexShrink: 0
                        }}>
                          {status.label}
                        </span>
                      </div>
                      {/* Strategy Tags */}
                      {stats && !stats.error && stats.strategies && stats.strategies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {stats.strategies.map(strategy => (
                            <span key={strategy} style={{ 
                              padding: '0.125rem 0.375rem', 
                              background: '#f3f4f6', 
                              borderRadius: '0.25rem', 
                              fontSize: '0.625rem',
                              color: '#6b7280',
                              fontWeight: 500
                            }}>
                              {strategy}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Row 2: Stats Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '0.5rem',
                    background: '#f9fafb',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5625rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Campaigns</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: stats?.activeCampaigns > 0 ? '#10b981' : '#9ca3af' }}>
                        {stats && !stats.error ? stats.activeCampaigns : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5625rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Impr</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151' }}>
                        {stats && !stats.error ? formatNumber(stats.impressions) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5625rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Clicks</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151' }}>
                        {stats && !stats.error ? formatNumber(stats.clicks) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5625rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Spend</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151' }}>
                        {stats && !stats.error ? formatCurrency(stats.spend) : '—'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Row 3: View Button */}
                  <Link 
                    to={`/client/${c.slug}`} 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      padding: '0.5rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    View Report <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
            
            {/* Mobile Totals */}
            <div style={{ 
              padding: '1rem', 
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)',
              borderTop: '2px solid #a7f3d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <BarChart3 size={16} color="#059669" />
                <span style={{ fontWeight: 600, color: '#065f46', fontSize: '0.875rem' }}>Total ({clients.length} clients) - Past 30 Days</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.5625rem', color: '#065f46', textTransform: 'uppercase' }}>Campaigns</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                    {Object.values(clientStats).reduce((sum, s) => sum + (s?.activeCampaigns || 0), 0)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.5625rem', color: '#065f46', textTransform: 'uppercase' }}>Impr</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                    {formatNumber(Object.values(clientStats).reduce((sum, s) => sum + (s?.impressions || 0), 0))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.5625rem', color: '#065f46', textTransform: 'uppercase' }}>Clicks</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                    {formatNumber(Object.values(clientStats).reduce((sum, s) => sum + (s?.clicks || 0), 0))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.5625rem', color: '#065f46', textTransform: 'uppercase' }}>Spend</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                    {formatCurrency(Object.values(clientStats).reduce((sum, s) => sum + (s?.spend || 0), 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop: Original table layout */
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '0.5rem 1rem 0', textAlign: 'left' }}></th>
                <th style={{ padding: '0.5rem 1rem 0', textAlign: 'center' }}></th>
                <th style={{ padding: '0.5rem 1rem 0', textAlign: 'center' }}></th>
                <th colSpan={3} style={{ padding: '0.5rem 1rem 0', textAlign: 'center', fontSize: '0.625rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '0.375rem', marginBottom: '0.375rem' }}>Past 30 Days</div>
                </th>
                <th style={{ padding: '0.5rem 1rem 0' }}></th>
              </tr>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '0 1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Client</th>
                <th style={{ padding: '0 1rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0 1rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Campaigns</th>
                <th style={{ padding: '0 1rem 0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                <th style={{ padding: '0 1rem 0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                <th style={{ padding: '0 1rem 0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>
                <th style={{ padding: '0 1rem 0.75rem', width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const stats = clientStats[c.id];
                const status = getStatusIndicator(stats);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {c.logo_path ? (
                          <img src={c.logo_path} alt={c.name} style={{ width: 36, height: 36, borderRadius: '0.5rem', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: c.primary_color || '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>{c.name.charAt(0)}</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          {stats && !stats.error && stats.strategies && stats.strategies.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                              {stats.strategies.map(strategy => (
                                <span key={strategy} style={{ 
                                  padding: '0.125rem 0.375rem', 
                                  background: '#f3f4f6', 
                                  borderRadius: '0.25rem', 
                                  fontSize: '0.625rem',
                                  color: '#6b7280',
                                  fontWeight: 500
                                }}>
                                  {strategy}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem', 
                        background: status.bg, 
                        color: status.color,
                        borderRadius: '9999px', 
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {stats && !stats.error ? (
                        <span style={{ fontWeight: 600, color: stats.activeCampaigns > 0 ? '#10b981' : '#9ca3af' }}>
                          {stats.activeCampaigns}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {stats && !stats.error ? formatNumber(stats.impressions) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {stats && !stats.error ? formatNumber(stats.clicks) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {stats && !stats.error ? formatCurrency(stats.spend) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <Link 
                        to={`/client/${c.slug}`} 
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.375rem 0.75rem',
                          background: '#f3f4f6',
                          color: '#374151',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Footer Row */}
            <tfoot>
              <tr style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)', borderTop: '2px solid #a7f3d0' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: '#065f46' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={18} color="#059669" />
                    <span>Total ({clients.length} clients)</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}></td>
                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                  {Object.values(clientStats).reduce((sum, s) => sum + (s?.activeCampaigns || 0), 0)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 700, color: '#0d9488' }}>
                  {formatNumber(Object.values(clientStats).reduce((sum, s) => sum + (s?.impressions || 0), 0))}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 700, color: '#3b82f6' }}>
                  {formatNumber(Object.values(clientStats).reduce((sum, s) => sum + (s?.clicks || 0), 0))}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 700, color: '#059669' }}>
                  {formatCurrency(Object.values(clientStats).reduce((sum, s) => sum + (s?.spend || 0), 0))}
                </td>
                <td style={{ padding: '1rem' }}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Date range indicator */}
      {clients.length > 0 && (
        <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af' }}>
          Stats shown for {(() => {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${formatDate(thirtyDaysAgo)} – ${formatDate(now)}`;
          })()}
        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Add New Client">
          <form onSubmit={handleCreate}>
            <FormField label="Client Name" value={newClient.name} onChange={(v) => setNewClient({ ...newClient, name: v })} placeholder="Acme Corporation" required />
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Your Brand</label>
              <select value={newClient.brandId} onChange={(e) => setNewClient({ ...newClient, brandId: e.target.value })} required
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <FormField label="Simpli.fi Org ID" value={newClient.simplifiOrgId || ''} onChange={(v) => setNewClient({ ...newClient, simplifiOrgId: v })} placeholder="e.g., 506809" type="number" />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.625rem 1.25rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Create</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <Modal onClose={() => setShowSyncModal(false)} wide>
          <div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Manage Simpli.fi Organizations</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Sync or unsync organizations from your Simpli.fi account.
            </p>

            {/* Sync Results */}
            {syncResults && (
              <div style={{ 
                padding: '1rem', 
                background: syncResults.created?.length > 0 || syncResults.action ? '#ecfdf5' : '#f3f4f6', 
                borderRadius: '0.5rem', 
                marginBottom: '1.5rem',
                border: syncResults.created?.length > 0 || syncResults.action ? '1px solid #a7f3d0' : '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CheckCircle size={18} color="#10b981" />
                  <strong>{syncResults.action || 'Sync Complete!'}</strong>
                </div>
                {syncResults.created && (
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>
                    {syncResults.created.length} clients created, {syncResults.skipped.length} already existed
                    {syncResults.errors.length > 0 && `, ${syncResults.errors.length} errors`}
                  </p>
                )}
              </div>
            )}

            {/* Organizations List */}
            <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
              {organizations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                  Loading organizations...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>ORG ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>ORGANIZATION NAME</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map(org => (
                      <tr key={org.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{org.id}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{org.name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {org.isSynced ? (
                            <button
                              onClick={() => handleUnsync(org)}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.375rem 0.75rem', 
                                background: '#fee2e2', 
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '0.375rem', 
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              <X size={12} /> Unsync
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSyncOne(org)}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.375rem 0.75rem', 
                                background: '#dcfce7', 
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                borderRadius: '0.375rem', 
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              <Check size={12} /> Sync
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {organizations.length > 0 && `${organizations.filter(o => o.isSynced).length} of ${organizations.length} organizations synced`}
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setShowSyncModal(false)} 
                  style={{ padding: '0.625rem 1.25rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  Close
                </button>
                {organizations.filter(o => !o.isSynced).length > 0 && (
                  <button 
                    onClick={handleSync} 
                    disabled={syncing}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 1.25rem', 
                      background: '#0d9488', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '0.5rem', 
                      cursor: 'pointer',
                      opacity: syncing ? 0.7 : 1
                    }}
                  >
                    {syncing ? (
                      <>Syncing...</>
                    ) : (
                      <><Download size={16} /> Sync All ({organizations.filter(o => !o.isSynced).length})</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ============================================
// CLIENT DETAIL PAGE (Main Report View)
// ============================================
function ClientDetailPage({ publicMode = false }) {
  const { slug } = useParams();
  const [client, setClient] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState({});
  const [dailyStats, setDailyStats] = useState([]); // Added for charts
  const [adStats, setAdStats] = useState([]);
  // Note: Device breakdown stats not available via Simpli.fi API
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Report Center Enhanced Data (aggregated across all active campaigns)
  const [locationPerformance, setLocationPerformance] = useState([]);
  const [geoFencePerformance, setGeoFencePerformance] = useState([]);
  const [keywordPerformance, setKeywordPerformance] = useState([]);
  const [domainPerformance, setDomainPerformance] = useState([]);
  const [deviceStats, setDeviceStats] = useState([]);
  const [conversionData, setConversionData] = useState(null);
  const [enhancedDataLoading, setEnhancedDataLoading] = useState(false);
  
  // Client view mode - forced true in public mode
  const [clientViewMode, setClientViewMode] = useState(() => {
    if (publicMode) return true;
    return localStorage.getItem('clientViewMode') === 'true';
  });
  const [editMode, setEditMode] = useState(false); // For rearranging sections
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportLink, setReportLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();
  const { isMobile, isTablet, gridCols } = useResponsive();
  
  // Persist client view mode to localStorage when it changes (not in public mode)
  const toggleClientViewMode = () => {
    if (publicMode) return; // Can't toggle in public mode
    const newValue = !clientViewMode;
    setClientViewMode(newValue);
    localStorage.setItem('clientViewMode', newValue.toString());
  };
  
  // Determine if we should show spend data (only for logged-in users NOT in client view mode, never in public mode)
  const showSpendData = !publicMode && user && !clientViewMode;

  // Default section order for main client page - now includes Report Center sections including device
  const defaultMainSectionOrder = ['active', 'device', 'charts', 'location', 'topads', 'keywords', 'geofences', 'domains', 'history', 'pixel', 'paused'];
  const [sectionOrder, setSectionOrder] = useState(() => {
    const saved = localStorage.getItem('clientMainSectionOrder');
    if (saved) {
      let order = JSON.parse(saved);
      // Add 'device' if not present (for backwards compatibility)
      if (!order.includes('device')) {
        const activeIndex = order.indexOf('active');
        order.splice(activeIndex >= 0 ? activeIndex + 1 : 0, 0, 'device');
      }
      return order;
    }
    return defaultMainSectionOrder;
  });

  // Drag and drop handlers
  const handleDragStart = (e, sectionId) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    if (sectionId !== draggedSection) {
      setDragOverSection(sectionId);
    }
  };
  
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (draggedSection && targetId && draggedSection !== targetId) {
      const newOrder = [...sectionOrder];
      const draggedIndex = newOrder.indexOf(draggedSection);
      const targetIndex = newOrder.indexOf(targetId);
      
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSection);
      
      setSectionOrder(newOrder);
      localStorage.setItem('clientMainSectionOrder', JSON.stringify(newOrder));
    }
    setDraggedSection(null);
    setDragOverSection(null);
  };
  
  const resetSectionOrder = () => {
    setSectionOrder(defaultMainSectionOrder);
    localStorage.setItem('clientMainSectionOrder', JSON.stringify(defaultMainSectionOrder));
  };

  useEffect(() => { loadClient(); }, [slug]);
  useEffect(() => { if (client?.simplifi_org_id) { loadData(); } }, [client]);

  const loadClient = async () => {
    try {
      // Use public endpoint in public mode, authenticated endpoint otherwise
      if (publicMode) {
        const response = await fetch(`${API_BASE}/api/public/client/slug/${slug}`);
        if (!response.ok) throw new Error('Client not found');
        const data = await response.json();
        setClient(data);
      } else {
        const data = await api.get(`/api/clients/slug/${slug}`);
        setClient(data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadData = async () => {
    if (!client?.simplifi_org_id) return;
    setStatsLoading(true);
    try {
      if (publicMode) {
        // Use public stats endpoint
        const response = await fetch(`${API_BASE}/api/public/client/slug/${slug}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        if (!response.ok) throw new Error('Failed to load stats');
        const data = await response.json();
        
        const allCampaigns = data.campaigns || [];
        setCampaigns(allCampaigns);
        
        // Create stats map by campaign id (normalize CTR)
        const statsMap = {};
        (data.campaignStats || []).forEach(s => {
          statsMap[s.campaign_id] = { ...s, ctr: normalizeCtr(s.ctr) };
        });
        setCampaignStats(statsMap);
        setDailyStats((data.dailyStats || []).map(d => ({
          ...d,
          ctr: normalizeCtr(d.ctr)
        })));
        
        // Ad stats are now enriched by the backend
        setAdStats(data.adStats || []);
      } else {
        // Use authenticated endpoints
        // Get all campaigns WITH ADS INCLUDED (using include parameter)
        const campaignsData = await api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/campaigns-with-ads`);
        const allCampaigns = campaignsData.campaigns || [];
        setCampaigns(allCampaigns);

      // Build a map of all ads from all campaigns
      const adDetailsMap = {};
      allCampaigns.forEach(campaign => {
        (campaign.ads || []).forEach(ad => {
          // Debug: log first ad to see available fields
          if (Object.keys(adDetailsMap).length === 0) {
            console.log('Sample ad object fields:', Object.keys(ad));
            console.log('Sample ad object:', ad);
          }
          // Try multiple sources for dimensions
          // 1. original_width/original_height (e.g., "1920 px" -> 1920)
          let width = ad.original_width ? parseInt(ad.original_width) : null;
          let height = ad.original_height ? parseInt(ad.original_height) : null;
          
          // 2. ad_sizes array (e.g., [{width: 300, height: 250}])
          if ((!width || !height) && ad.ad_sizes && ad.ad_sizes.length > 0) {
            width = ad.ad_sizes[0].width || width;
            height = ad.ad_sizes[0].height || height;
          }
          
          // 3. Parse from ad name (e.g., "banner_300x250.jpg")
          if ((!width || !height) && ad.name) {
            const sizeMatch = ad.name.match(/(\d{2,4})x(\d{2,4})/i);
            if (sizeMatch) {
              width = width || parseInt(sizeMatch[1]);
              height = height || parseInt(sizeMatch[2]);
            }
          }
          
          const adFileType = ad.ad_file_types?.[0]?.name || '';
          
          // Try multiple URL sources for the creative preview
          const previewUrl = ad.primary_creative_url 
            || ad.preview_url 
            || ad.thumbnail_url 
            || ad.creative_url
            || ad.media_url
            || ad.image_url
            || ad.asset_url;
          
          adDetailsMap[ad.id] = {
            ...ad,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            // Try multiple possible URL fields
            preview_url: previewUrl,
            width: width,
            height: height,
            is_video: adFileType.toLowerCase() === 'video' || ad.name?.toLowerCase().includes('.mp4'),
            file_type: adFileType
          };
        });
      });

      // Get stats by campaign
      const statsData = await api.get(
        `/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&byCampaign=true`
      );
      
      // Create a map of campaign stats by ID (normalize CTR)
      const statsMap = {};
      (statsData.campaign_stats || []).forEach(s => {
        statsMap[s.campaign_id] = { ...s, ctr: normalizeCtr(s.ctr) };
      });
      setCampaignStats(statsMap);

      // Get daily stats for the charts (aggregated across all campaigns)
      const dailyData = await api.get(
        `/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&byDay=true`
      );
      setDailyStats((dailyData.campaign_stats || []).map(d => ({
        ...d,
        ctr: normalizeCtr(d.ctr)
      })).sort((a, b) => new Date(a.stat_date) - new Date(b.stat_date)));

      // Get ad stats for active campaigns only (for top 3 ad sizes)
      const activeCampaigns = allCampaigns.filter(c => c.status?.toLowerCase() === 'active');
      const activeCampaignIds = activeCampaigns.map(c => c.id);
      
      if (activeCampaignIds.length > 0) {
        // Get ad stats
        const adStatsData = await api.get(
          `/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&byAd=true`
        );
        
        // Merge ad stats with ad details from campaigns, filter to active campaigns, and dedupe by ad_id
        const seenAdIds = new Set();
        const enrichedAdStats = (adStatsData.campaign_stats || [])
          .filter(ad => {
            // Only include ads from active campaigns
            if (!activeCampaignIds.includes(ad.campaign_id)) return false;
            // Dedupe by ad_id
            if (seenAdIds.has(ad.ad_id)) return false;
            seenAdIds.add(ad.ad_id);
            return true;
          })
          .map(stat => {
            const details = adDetailsMap[stat.ad_id] || {};
            return {
              ...stat,
              name: details.name || stat.name || `Ad ${stat.ad_id}`,
              preview_url: details.preview_url, // This is primary_creative_url
              width: details.width,
              height: details.height,
              is_video: details.is_video,
              file_type: details.file_type
            };
          });
        
        setAdStats(enrichedAdStats);
      }

      // Note: Device breakdown stats not available via Simpli.fi public API
      // The Report Center has device reports but they cannot be fetched programmatically
      } // End of else (authenticated mode)

    } catch (err) { console.error(err); }
    setStatsLoading(false);
  };

  // Load Report Center enhanced data - Only loading device stats for client page
  // Keywords, Geo-fences, and Domains are loaded on individual campaign pages
  const loadEnhancedData = async () => {
    // Compute active campaigns inside the function to avoid closure issues
    const activeOnes = campaigns.filter(c => c.status?.toLowerCase() === 'active');
    
    if (!client?.simplifi_org_id || activeOnes.length === 0) {
      setEnhancedDataLoading(false);
      return;
    }
    
    setEnhancedDataLoading(true);
    console.log(`[DEVICE] Loading device data for ${activeOnes.length} active campaigns`);
    
    try {
      // Aggregate device stats across all active campaigns
      const deviceAggregated = {};
      
      // Fetch device breakdown for each active campaign and aggregate
      const devicePromises = activeOnes.slice(0, 5).map(async (campaign) => {
        try {
          const endpoint = publicMode 
            ? `/api/public/report-center/${client.simplifi_org_id}/campaigns/${campaign.id}/device-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
            : `/api/simplifi/organizations/${client.simplifi_org_id}/campaigns/${campaign.id}/device-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          
          console.log(`[DEVICE] Fetching device data for campaign ${campaign.id}`);
          
          const response = publicMode 
            ? await fetch(`${API_BASE}${endpoint}`)
            : await api.get(endpoint);
          
          const data = publicMode ? await response.json() : response;
          const devices = data.device_breakdown || [];
          
          console.log(`[DEVICE] Campaign ${campaign.id} returned ${devices.length} device types`);
          
          devices.forEach(d => {
            const deviceType = d.device_type || 'Unknown';
            if (!deviceAggregated[deviceType]) {
              deviceAggregated[deviceType] = { device_type: deviceType, impressions: 0, clicks: 0 };
            }
            deviceAggregated[deviceType].impressions += d.impressions || 0;
            deviceAggregated[deviceType].clicks += d.clicks || 0;
          });
        } catch (e) {
          console.log(`[DEVICE] Error loading device data for campaign ${campaign.id}:`, e.message);
        }
      });
      
      await Promise.all(devicePromises);
      
      const deviceArray = Object.values(deviceAggregated).sort((a, b) => b.impressions - a.impressions);
      setDeviceStats(deviceArray);
      console.log('[DEVICE] Final aggregated stats:', deviceArray.length, 'device types', deviceArray);
      
    } catch (err) {
      console.error('[DEVICE] Error loading device data:', err);
    }
    
    setEnhancedDataLoading(false);
  };

  // Load enhanced data after campaigns are loaded
  useEffect(() => {
    if (campaigns.length > 0 && client?.simplifi_org_id) {
      loadEnhancedData();
    }
  }, [campaigns, client]);

  // Show the static share link for this client
  const showShareLink = () => {
    if (client?.slug || client?.share_token) {
      setReportLink({ token: client.share_token, slug: client.slug });
    } else {
      alert('Share link not available. Please contact support.');
    }
  };

  const copyLink = () => {
    // Use custom domain for public report links
    const domain = 'https://myadvertisingreport.com';
    const url = client?.slug 
      ? `${domain}/client/${client.slug}/report`
      : `${domain}/report/${client?.share_token || reportLink?.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Separate active and inactive campaigns
  const activeCampaigns = campaigns.filter(c => c.status?.toLowerCase() === 'active');
  const inactiveCampaigns = campaigns.filter(c => c.status?.toLowerCase() !== 'active');

  // Calculate totals for active campaigns only
  const activeTotals = activeCampaigns.reduce((acc, c) => {
    const stats = campaignStats[c.id] || {};
    acc.impressions += stats.impressions || 0;
    acc.clicks += stats.clicks || 0;
    acc.spend += stats.total_spend || 0;
    return acc;
  }, { impressions: 0, clicks: 0, spend: 0 });
  activeTotals.ctr = activeTotals.impressions > 0 ? activeTotals.clicks / activeTotals.impressions : 0;

  // Get top 3 ad sizes from active campaigns - include preview images
  const adSizeStats = adStats.reduce((acc, ad) => {
    const size = parseAdSize(ad.name, ad.width, ad.height);
    if (!acc[size]) {
      acc[size] = { 
        impressions: 0, 
        clicks: 0, 
        preview_url: null,
        is_video: false,
        width: ad.width,
        height: ad.height
      };
    }
    acc[size].impressions += ad.impressions || 0;
    acc[size].clicks += ad.clicks || 0;
    // Capture preview URL from any ad that has one (prefer non-null)
    if (ad.preview_url && !acc[size].preview_url) {
      acc[size].preview_url = ad.preview_url;
      acc[size].is_video = ad.is_video || false;
      acc[size].width = ad.width;
      acc[size].height = ad.height;
    }
    return acc;
  }, {});
  
  // Debug: Log ad stats to see which have preview URLs
  console.log('AdStats summary:', adStats.map(a => ({ 
    name: a.name, 
    size: parseAdSize(a.name, a.width, a.height),
    hasPreview: !!a.preview_url,
    preview_url: a.preview_url // Full URL, not truncated
  })));
  console.log('AdSizeStats:', Object.entries(adSizeStats).map(([size, data]) => ({
    size,
    impressions: data.impressions,
    hasPreview: !!data.preview_url,
    preview_url: data.preview_url // Full URL
  })));
  
  // Expose for debugging in console
  if (typeof window !== 'undefined') {
    window.debugAdStats = adStats;
    window.debugAdSizeStats = adSizeStats;
  }
  
  const topAdSizes = Object.entries(adSizeStats)
    .map(([size, data]) => ({ 
      size, 
      ...data, 
      ctr: data.impressions > 0 ? data.clicks / data.impressions : 0 
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Report Header */}
      {/* Enhanced Client Header with Branding */}
      <div style={{ 
        background: `linear-gradient(135deg, ${client?.primary_color || '#1e3a8a'} 0%, ${client?.secondary_color || '#3b82f6'} 100%)`,
        borderRadius: '0.75rem', 
        marginBottom: '1.5rem', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        {/* Top section with logo and client info */}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', color: 'white' }} className="section-padding">
          <div className="header-content" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: isMobile ? 'unset' : '0 0 auto' }}>
              {/* Client Logo */}
              {client?.logo_path ? (
                <img 
                  src={client.logo_path} 
                  alt={client.name} 
                  style={{ height: isMobile ? '40px' : '48px', width: 'auto', borderRadius: '0.5rem', background: 'white', padding: '0.375rem', flexShrink: 0 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ 
                  width: isMobile ? '40px' : '48px', 
                  height: isMobile ? '40px' : '48px',
                  flexShrink: 0, 
                  borderRadius: '0.5rem', 
                  background: 'rgba(255,255,255,0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.125rem' : '1.25rem',
                  fontWeight: 700
                }}>
                  {client?.name?.charAt(0) || '?'}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '1.125rem' : '1.5rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{client?.name}</h2>
              </div>
            </div>
            
            {/* Date Range Picker - Combined with Report Period */}
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              padding: '0.5rem 0.75rem', 
              borderRadius: '0.5rem',
              textAlign: 'center',
              width: isMobile ? '100%' : 'auto',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.25rem' }}>Report Period</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                <input 
                  type="date" 
                  value={dateRange.startDate} 
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  style={{ 
                    border: 'none', 
                    background: 'rgba(255,255,255,0.2)', 
                    padding: '0.25rem 0.375rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.6875rem', 
                    color: 'white',
                    cursor: 'pointer',
                    flex: '1 1 auto',
                    minWidth: '0',
                    maxWidth: '120px'
                  }} 
                />
                <span style={{ opacity: 0.7, fontSize: '0.6875rem' }}>to</span>
                <input 
                  type="date" 
                  value={dateRange.endDate} 
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  style={{ 
                    border: 'none', 
                    background: 'rgba(255,255,255,0.2)', 
                    padding: '0.25rem 0.375rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.6875rem', 
                    color: 'white',
                    cursor: 'pointer',
                    flex: '1 1 auto',
                    minWidth: '0',
                    maxWidth: '120px'
                  }} 
                />
                <button 
                  onClick={loadData} 
                  disabled={statsLoading}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    background: 'rgba(255,255,255,0.25)', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.6875rem', 
                    cursor: 'pointer',
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                >
                  {statsLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Stats Row - Only show if we have data */}
          {(client?.monthly_budget || client?.start_date || client?.contact_name) && (
            <div style={{ 
              display: 'flex', 
              gap: '1.5rem', 
              marginTop: '1.25rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid rgba(255,255,255,0.2)',
              flexWrap: 'wrap'
            }}>
              {client?.monthly_budget && (
                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.7 }}>Monthly Budget</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{formatCurrency(client.monthly_budget)}</div>
                </div>
              )}
              {client?.start_date && (
                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.7 }}>Campaign Start</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {new Date(client.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
              {client?.contact_name && (
                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.7 }}>Account Contact</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{client.contact_name}</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions Bar */}
        <div style={{ 
          background: 'white', 
          padding: '0.75rem 1rem', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {publicMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                <TrendingUp size={16} /> Digital Advertising Report
              </div>
            ) : (
              <Link to="/clients" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Back to Clients
              </Link>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Edit Layout Button - hidden in public mode */}
              {!publicMode && user && !clientViewMode && (
                <button 
                  onClick={() => setEditMode(!editMode)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    padding: '0.5rem 0.75rem', 
                    background: editMode ? '#dbeafe' : '#f3f4f6', 
                    border: editMode ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '0.375rem', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    color: editMode ? '#1d4ed8' : '#374151',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <GripVertical size={14} />
                  <span className="hide-mobile">{editMode ? 'Done' : 'Edit Layout'}</span>
                </button>
              )}
              {/* Edit Client Button - Admin only, hidden in public mode */}
              {!publicMode && user?.role === 'admin' && !clientViewMode && (
                <button 
                  onClick={() => setShowEditModal(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    padding: '0.5rem 0.75rem', 
                    background: '#f3f4f6', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    color: '#374151',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Edit3 size={14} />
                  <span className="hide-mobile">Edit Client</span>
                </button>
              )}
              {!publicMode && user?.role === 'admin' && (
                <button onClick={showShareLink} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', background: '#0d9488', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <ExternalLink size={14} /> Share
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode Instructions */}
      {editMode && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.75rem 1rem', 
          background: '#dbeafe', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          border: '1px solid #93c5fd'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontSize: '0.875rem' }}>
            <GripVertical size={16} />
            <span><strong>Edit Mode:</strong> Drag sections to reorder them. Order is saved automatically.</span>
          </div>
          <button 
            onClick={resetSectionOrder}
            style={{ 
              padding: '0.375rem 0.75rem', 
              background: 'white', 
              border: '1px solid #93c5fd', 
              borderRadius: '0.375rem', 
              fontSize: '0.8125rem', 
              cursor: 'pointer',
              color: '#1e40af'
            }}
          >
            Reset to Default
          </button>
        </div>
      )}

      {reportLink && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Check size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <code style={{ flex: '1 1 auto', fontSize: '0.8125rem', color: '#065f46', wordBreak: 'break-all', overflowWrap: 'break-word', minWidth: 0 }}>
            {client?.slug 
              ? `https://myadvertisingreport.com/client/${client.slug}/report`
              : `https://myadvertisingreport.com/report/${reportLink.token}`}
          </code>
          <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer', flexShrink: 0 }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Collapsible Internal Notes - just below header for admins, hidden in public mode */}
      {!publicMode && user && !clientViewMode && (
        <InternalNotesSection clientId={client?.id} isCollapsible={true} />
      )}

      {!client?.simplifi_org_id ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <Target size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
          <h3>No Simpli.fi Organization Linked</h3>
          <p style={{ color: '#6b7280' }}>Add the Simpli.fi Organization ID to pull campaign data.</p>
        </div>
      ) : statsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Render sections in order */}
          {sectionOrder.map(sectionId => {
            const sectionProps = {
              key: sectionId,
              id: sectionId,
              isEditMode: editMode,
              onDragStart: handleDragStart,
              onDragOver: handleDragOver,
              onDrop: handleDrop,
              isDragging: draggedSection,
              dragOverId: dragOverSection
            };
            
            switch(sectionId) {
              case 'active':
                return (
                  <DraggableReportSection {...sectionProps} title={`Active Campaigns (${activeCampaigns.length})`} icon={Play} iconColor="#10b981">
                    {/* Summary Stats with Sparklines */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : isTablet ? 2 : (showSpendData ? 4 : 3)}, 1fr)`, gap: isMobile ? '0.5rem' : '1rem', marginBottom: '1.5rem' }}>
                      <StatCardWithSparkline label="Impressions" value={formatNumber(activeTotals.impressions)} data={dailyStats} dataKey="impressions" color="#0d9488" />
                      <StatCardWithSparkline label="Clicks" value={formatNumber(activeTotals.clicks)} data={dailyStats} dataKey="clicks" color="#3b82f6" />
                      <StatCardWithSparkline label="CTR" value={formatPercent(activeTotals.ctr)} data={dailyStats} dataKey="ctr" color="#8b5cf6" showTrend={false} />
                      {showSpendData && <StatCardWithSparkline label="Spend" value={formatCurrency(activeTotals.spend)} data={dailyStats} dataKey="total_spend" color="#f59e0b" />}
                    </div>

                    {/* Active Campaigns Table */}
                    {activeCampaigns.length === 0 ? (
                      <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No active campaigns</p>
                    ) : (
                      <>
                        {/* Mobile: Card layout */}
                        <div className="mobile-cards" style={{ display: isMobile ? 'flex' : 'none', flexDirection: 'column', gap: '0.75rem' }}>
                          {activeCampaigns.map(campaign => {
                            const stats = campaignStats[campaign.id] || {};
                            return (
                              <Link 
                                key={campaign.id} 
                                to={publicMode ? `/client/${slug}/report/campaign/${campaign.id}` : `/client/${slug}/campaign/${campaign.id}`}
                                style={{ 
                                  textDecoration: 'none', 
                                  color: 'inherit',
                                  padding: '1rem', 
                                  background: '#f9fafb', 
                                  borderRadius: '0.5rem',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1, marginRight: '0.5rem' }}>{campaign.name}</div>
                                  <span style={{ padding: '0.25rem 0.5rem', background: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.6875rem', flexShrink: 0 }}>
                                    {parseStrategy(campaign.name)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#6b7280' }}>
                                  <span><strong style={{ color: '#0d9488' }}>{formatNumber(stats.impressions)}</strong> impr</span>
                                  <span><strong style={{ color: '#3b82f6' }}>{formatNumber(stats.clicks)}</strong> clicks</span>
                                  <span><strong>{formatPercent(stats.ctr)}</strong> CTR</span>
                                  <ChevronRight size={16} color="#9ca3af" />
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                        
                        {/* Desktop/Tablet: Table layout */}
                        <div className="desktop-table" style={{ display: isMobile ? 'none' : 'block', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Campaign</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Strategy</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Start</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>End</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>CTR</th>
                                {showSpendData && <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>}
                                <th style={{ padding: '0.75rem', width: '40px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeCampaigns.map(campaign => {
                                const stats = campaignStats[campaign.id] || {};
                                return (
                                  <tr key={campaign.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <span style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                                        {parseStrategy(campaign.name)}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                                      {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                                      {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(stats.impressions)}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(stats.clicks)}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatPercent(stats.ctr)}</td>
                                    {showSpendData && <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(stats.total_spend)}</td>}
                                    <td style={{ padding: '0.75rem' }}>
                                      <Link to={publicMode ? `/client/${slug}/report/campaign/${campaign.id}` : `/client/${slug}/campaign/${campaign.id}`} style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                                        <ChevronRight size={18} />
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </DraggableReportSection>
                );
              
              case 'device':
                // Device breakdown aggregated across all active campaigns
                if (deviceStats.length === 0) {
                  if (enhancedDataLoading) {
                    return (
                      <DraggableReportSection {...sectionProps} title="Performance by Device" icon={Smartphone} iconColor="#6366f1">
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                          <p style={{ fontSize: '0.875rem' }}>Loading device data...</p>
                        </div>
                      </DraggableReportSection>
                    );
                  }
                  return null;
                }
                
                const totalDeviceImpressions = deviceStats.reduce((sum, d) => sum + (d.impressions || 0), 0);
                
                // Device icon mapping
                const getDeviceIcon = (deviceType) => {
                  const type = (deviceType || '').toLowerCase();
                  if (type.includes('mobile') || type.includes('phone')) return Smartphone;
                  if (type.includes('tablet') || type.includes('ipad')) return Tablet;
                  if (type.includes('tv') || type.includes('ctv') || type.includes('connected')) return Tv;
                  if (type.includes('desktop') || type.includes('computer')) return Monitor;
                  return Monitor;
                };
                
                // Device color mapping
                const getDeviceColor = (deviceType, index) => {
                  const type = (deviceType || '').toLowerCase();
                  if (type.includes('mobile')) return { bg: '#dbeafe', color: '#1e40af', bar: '#3b82f6' };
                  if (type.includes('tablet')) return { bg: '#fae8ff', color: '#86198f', bar: '#d946ef' };
                  if (type.includes('tv') || type.includes('ctv')) return { bg: '#dcfce7', color: '#166534', bar: '#22c55e' };
                  if (type.includes('desktop')) return { bg: '#fef3c7', color: '#92400e', bar: '#f59e0b' };
                  // Fallback colors
                  const colors = [
                    { bg: '#e0e7ff', color: '#3730a3', bar: '#6366f1' },
                    { bg: '#ccfbf1', color: '#115e59', bar: '#14b8a6' },
                    { bg: '#fee2e2', color: '#991b1b', bar: '#ef4444' }
                  ];
                  return colors[index % colors.length];
                };
                
                return (
                  <DraggableReportSection {...sectionProps} title="Performance by Device" icon={Smartphone} iconColor="#6366f1">
                    {/* Explanation */}
                    <div style={{ 
                      padding: '0.75rem 1rem', 
                      background: '#f9fafb', 
                      borderRadius: '0.5rem', 
                      marginBottom: '1rem',
                      fontSize: '0.8125rem',
                      color: '#6b7280'
                    }}>
                      <strong style={{ color: '#374151' }}>📱 What is this?</strong> This shows what types of devices people used when they saw your ads across all active campaigns.
                    </div>
                    
                    {/* Device Cards */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${Math.min(deviceStats.length, 4)}, 1fr)`, 
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      {deviceStats.slice(0, 4).map((device, i) => {
                        const percentage = totalDeviceImpressions > 0 ? ((device.impressions || 0) / totalDeviceImpressions * 100) : 0;
                        const DeviceIcon = getDeviceIcon(device.device_type);
                        const colors = getDeviceColor(device.device_type, i);
                        
                        return (
                          <div key={i} style={{ 
                            background: colors.bg, 
                            padding: '1.25rem', 
                            borderRadius: '0.75rem',
                            textAlign: 'center',
                            border: `1px solid ${colors.bar}20`
                          }}>
                            <DeviceIcon size={32} color={colors.color} style={{ marginBottom: '0.75rem' }} />
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.color, marginBottom: '0.5rem' }}>
                              {device.device_type || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.color, marginBottom: '0.25rem' }}>
                              {percentage.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {formatNumber(device.impressions)} impressions
                            </div>
                            {device.clicks > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                {formatNumber(device.clicks)} clicks
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Visual Bar Chart */}
                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                        Device Distribution
                      </div>
                      {deviceStats.map((device, i) => {
                        const percentage = totalDeviceImpressions > 0 ? ((device.impressions || 0) / totalDeviceImpressions * 100) : 0;
                        const colors = getDeviceColor(device.device_type, i);
                        
                        return (
                          <div key={i} style={{ marginBottom: i < deviceStats.length - 1 ? '0.75rem' : 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{device.device_type}</span>
                              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{percentage.toFixed(1)}%</span>
                            </div>
                            <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: colors.bar,
                                borderRadius: '4px',
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                      Based on {formatNumber(totalDeviceImpressions)} total impressions across {activeCampaigns.length} active campaign{activeCampaigns.length !== 1 ? 's' : ''}
                    </div>
                  </DraggableReportSection>
                );
              
              case 'charts':
                if (dailyStats.length === 0) return null;
                // Calculate totals for the date range
                const chartTotals = dailyStats.reduce((acc, day) => ({
                  impressions: acc.impressions + (day.impressions || 0),
                  clicks: acc.clicks + (day.clicks || 0),
                  spend: acc.spend + (day.spend || day.total_spend || 0)
                }), { impressions: 0, clicks: 0, spend: 0 });
                const chartCTR = chartTotals.impressions > 0 ? (chartTotals.clicks / chartTotals.impressions * 100) : 0;
                
                return (
                  <DraggableReportSection {...sectionProps} title="Performance Trends" icon={TrendingUp} iconColor="#0d9488">
                    <DualChartRow data={dailyStats} />
                    {/* Totals Row */}
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: isMobile ? '0.75rem' : '1rem 1.25rem', 
                      background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)', 
                      borderRadius: '0.75rem',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center', 
                        justifyContent: 'space-between',
                        gap: isMobile ? '0.75rem' : '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <BarChart3 size={18} color="#059669" />
                          <span style={{ fontWeight: 600, color: '#065f46', fontSize: '0.875rem' }}>Date Range Totals</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${showSpendData ? 4 : 3}, auto)`, gap: isMobile ? '0.5rem' : '2rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impressions</div>
                            <div style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 700, color: '#0d9488' }}>{formatNumber(chartTotals.impressions)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clicks</div>
                            <div style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 700, color: '#3b82f6' }}>{formatNumber(chartTotals.clicks)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CTR</div>
                            <div style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 700, color: '#8b5cf6' }}>{chartCTR.toFixed(2)}%</div>
                          </div>
                          {showSpendData && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spend</div>
                              <div style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(chartTotals.spend)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </DraggableReportSection>
                );
              
              case 'history':
                // History section removed - data was loaded from PDF endpoint which is no longer available
                return null;
              
              // Note: Device breakdown not available via Simpli.fi API
              
              case 'topads':
                if (topAdSizes.length === 0) return null;
                return (
                  <DraggableReportSection {...sectionProps} title="Top 3 Ads by Size (Active Campaigns)" icon={Image} iconColor="#6366f1">
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : isTablet ? 2 : 3}, 1fr)`, gap: '1rem' }}>
                      {topAdSizes.map((ad, i) => (
                        <TopAdCard key={ad.size} ad={ad} rank={i} />
                      ))}
                    </div>
                  </DraggableReportSection>
                );
              
              case 'paused':
                if (inactiveCampaigns.length === 0) return null;
                return (
                  <DraggableReportSection {...sectionProps} title={`Paused & Stopped Campaigns (${inactiveCampaigns.length})`} icon={Pause} iconColor="#f59e0b">
                    {/* Mobile: Card layout */}
                    <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
                      {inactiveCampaigns.map(campaign => {
                        const stats = campaignStats[campaign.id] || {};
                        const statusStyle = getStatusStyle(campaign.status);
                        const StatusIcon = statusStyle.icon;
                        return (
                          <Link 
                            key={campaign.id} 
                            to={publicMode ? `/client/${slug}/report/campaign/${campaign.id}` : `/client/${slug}/campaign/${campaign.id}`}
                            style={{ 
                              textDecoration: 'none', 
                              color: 'inherit',
                              padding: '1rem', 
                              background: '#fffbeb', 
                              borderRadius: '0.5rem',
                              border: '1px solid #fde68a',
                              opacity: 0.85,
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', flex: '1 1 0', minWidth: 0, wordWrap: 'break-word', overflowWrap: 'break-word' }}>{campaign.name}</div>
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem',
                                padding: '0.25rem 0.5rem', 
                                background: statusStyle.bg, 
                                color: statusStyle.color,
                                borderRadius: '0.25rem', 
                                fontSize: '0.6875rem',
                                fontWeight: 500,
                                flexShrink: 0,
                                whiteSpace: 'nowrap'
                              }}>
                                <StatusIcon size={10} />
                                {statusStyle.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#6b7280' }}>
                              <span><strong>{formatNumber(stats.impressions)}</strong> impr</span>
                              <span><strong>{formatNumber(stats.clicks)}</strong> clicks</span>
                              <ChevronRight size={16} color="#9ca3af" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    
                    {/* Desktop: Table layout */}
                    <div className="desktop-table" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Campaign</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Start</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>End</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                            <th style={{ padding: '0.75rem', width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {inactiveCampaigns.map(campaign => {
                            const stats = campaignStats[campaign.id] || {};
                            const statusStyle = getStatusStyle(campaign.status);
                            const StatusIcon = statusStyle.icon;
                            return (
                              <tr key={campaign.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: 0.75 }}>
                                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{campaign.name}</td>
                                <td style={{ padding: '0.75rem' }}>
                                  <span style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '0.25rem',
                                    padding: '0.25rem 0.5rem', 
                                    background: statusStyle.bg, 
                                    color: statusStyle.color,
                                    borderRadius: '0.25rem', 
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                  }}>
                                    <StatusIcon size={12} />
                                    {statusStyle.label}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                                  {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                                  {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(stats.impressions)}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(stats.clicks)}</td>
                                <td style={{ padding: '0.75rem' }}>
                                  <Link to={publicMode ? `/client/${slug}/report/campaign/${campaign.id}` : `/client/${slug}/campaign/${campaign.id}`} style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                                    <ChevronRight size={18} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </DraggableReportSection>
                );
              
              case 'pixel':
                // Only show pixel section if org ID exists and user is logged in (not client view)
                if (!client?.simplifi_org_id || clientViewMode) return null;
                return (
                  <DraggableReportSection {...sectionProps} title="Retargeting Pixel" icon={Radio} iconColor="#0d9488">
                    <PixelSection orgId={client.simplifi_org_id} clientName={client.name} />
                  </DraggableReportSection>
                );
              
              case 'location':
                // Location Performance is now only shown on individual campaign pages
                return null;
              
              case 'keywords':
                // Keyword Performance is now only shown on individual campaign pages (keyword campaigns only)
                return null;
              
              case 'geofences':
                // Geo-Fence Performance is now only shown on individual campaign pages (geo-fence campaigns only)
                return null;
              
              case 'domains':
                // Top Domains is now only shown on individual campaign pages (OTT/CTV campaigns only)
                return null;
              
              default:
                return null;
            }
          })}
        </>
      )}
      
      {/* Edit Client Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} wide>
          <EditClientForm 
            client={client} 
            onSave={async (updates) => {
              try {
                const updated = await api.put(`/api/clients/${client?.id}`, updates);
                setClient(updated);
                setShowEditModal(false);
              } catch (err) {
                alert('Failed to update client: ' + err.message);
              }
            }}
            onCancel={() => setShowEditModal(false)}
          />
        </Modal>
      )}
      
      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <DiagnosticsPanel 
          isPublic={publicMode} 
          onClose={() => setShowDiagnostics(false)} 
        />
      )}
      
      {/* Footer for public reports */}
      {publicMode && (
        <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
          <div>Powered by WSIC Digital Advertising</div>
          <button
            onClick={() => setShowDiagnostics(true)}
            style={{
              marginTop: '0.75rem',
              padding: '0.375rem 0.75rem',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              color: '#9ca3af',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            <Settings size={12} />
            Report Diagnostics
          </button>
        </div>
      )}
      
      {/* Diagnostics button for admin view (non-public) */}
      {!publicMode && user && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setShowDiagnostics(true)}
            style={{
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              color: '#6b7280',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Settings size={14} />
            System Diagnostics
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// CAMPAIGN DETAIL PAGE (Sub-page for individual campaign)
// ============================================
function CampaignDetailPage({ publicMode = false }) {
  const { slug, campaignId } = useParams();
  const [client, setClient] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [adStats, setAdStats] = useState([]);
  const [deviceStats, setDeviceStats] = useState([]);
  const [geoStats, setGeoStats] = useState([]);
  const [geoFences, setGeoFences] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Report Center Enhanced Data
  const [geoFencePerformance, setGeoFencePerformance] = useState([]);
  const [locationPerformance, setLocationPerformance] = useState([]);
  const [conversionData, setConversionData] = useState(null);
  const [enhancedDeviceStats, setEnhancedDeviceStats] = useState([]);
  const [viewabilityData, setViewabilityData] = useState(null);
  const [domainPerformance, setDomainPerformance] = useState([]);
  const [keywordPerformance, setKeywordPerformance] = useState([]);
  const [enhancedDataLoading, setEnhancedDataLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [dataFromCache, setDataFromCache] = useState(false);
  
  // Campaign type detection - determines which sections to show
  const [campaignType, setCampaignType] = useState({
    isGeoFence: false,
    isKeyword: false,
    isOTT: false,
    isDisplay: false,
    isVideo: false
  });
  
  // Helper to detect campaign type from name
  const detectCampaignType = (campaignName) => {
    const name = (campaignName || '').toLowerCase();
    return {
      isGeoFence: name.includes('_gf') || name.includes('geofence') || name.includes('geo_fence') || 
                  name.includes('geo-fence') || name.includes('geocomp') || name.includes('geo_comp') ||
                  name.includes('geotarget') || name.includes('_geo_'),
      isKeyword: name.includes('keyword') || name.includes('search') || name.includes('_kw') ||
                 name.includes('contextual') || name.includes('_ctx'),
      isOTT: name.includes('ott') || name.includes('ctv') || name.includes('streaming') ||
             name.includes('connected_tv') || name.includes('connected-tv'),
      isDisplay: name.includes('display') || name.includes('banner') || name.includes('_disp'),
      isVideo: name.includes('video') || name.includes('_vid') || name.includes('preroll')
    };
  };
  
  // Client view mode persists across pages via localStorage
  const [clientViewMode, setClientViewMode] = useState(() => {
    return localStorage.getItem('clientViewMode') === 'true';
  });
  const [editMode, setEditMode] = useState(false); // For rearranging sections
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Persist client view mode to localStorage when it changes
  const toggleClientViewMode = () => {
    const newValue = !clientViewMode;
    setClientViewMode(newValue);
    localStorage.setItem('clientViewMode', newValue.toString());
  };
  
  // Default section order - can be customized (device is on main client page only)
  const defaultSectionOrder = ['performance', 'vcr', 'conversions', 'charts', 'geo', 'geofences', 'keywords', 'keywordPerformance', 'ads', 'domains', 'daily'];
  const [sectionOrder, setSectionOrder] = useState(() => {
    // In public mode, always use default order (don't use localStorage)
    if (publicMode) {
      return defaultSectionOrder;
    }
    
    // Try to load saved order from localStorage
    const saved = localStorage.getItem('campaignSectionOrder');
    if (saved) {
      let order = JSON.parse(saved);
      // Remove 'device' from campaign pages (it's now on main client page only)
      order = order.filter(s => s !== 'device');
      // Add any new sections that aren't in the saved order
      defaultSectionOrder.forEach(section => {
        if (!order.includes(section)) {
          // Find the position of the section before this one in default order
          const defaultIndex = defaultSectionOrder.indexOf(section);
          const previousSection = defaultSectionOrder[defaultIndex - 1];
          const insertIndex = previousSection ? order.indexOf(previousSection) + 1 : order.length;
          order.splice(insertIndex, 0, section);
        }
      });
      return order;
    }
    return defaultSectionOrder;
  });
  
  const { user } = useAuth();
  const { isMobile, isTablet, gridCols } = useResponsive();
  
  // Determine if we should show spend data (not in public mode, not in client view mode)
  const showSpendData = !publicMode && user && !clientViewMode;
  
  // Determine campaign type for conditional sections - improved detection
  const campaignStrategy = parseStrategy(campaign?.name);
  const campaignNameLower = campaign?.name?.toLowerCase() || '';
  const isGeoFenceCampaign = campaignStrategy === 'Geo-Fence' || 
                             campaignNameLower.includes('_gf') || 
                             campaignNameLower.includes('geofence') || campaignNameLower.includes('geo_fence') || campaignNameLower.includes('geo-fence') ||
                             campaignNameLower.includes('geocomp') || campaignNameLower.includes('geo_comp') ||
                             campaignNameLower.includes('geotarget') || campaignNameLower.includes('geo_target') ||
                             campaignNameLower.includes('_geo_');
  const isKeywordCampaign = campaignStrategy === 'Keywords' || campaignNameLower.includes('keyword') || campaignNameLower.includes('_kw');
  const isOTTCampaign = campaignStrategy === 'CTV/OTT' ||
                        campaignNameLower.includes('ott') || 
                        campaignNameLower.includes('ctv') ||
                        campaignNameLower.includes('streaming');

  // Debug logging
  console.log('Campaign Detection:', {
    name: campaign?.name,
    strategy: campaignStrategy,
    isGeoFenceCampaign,
    isKeywordCampaign,
    isOTTCampaign,
    keywordPerformanceLength: keywordPerformance.length,
    sectionOrderIncludesKeywordPerformance: sectionOrder.includes('keywordPerformance')
  });

  // Drag and drop handlers
  const handleDragStart = (e, sectionId) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    if (sectionId !== draggedSection) {
      setDragOverSection(sectionId);
    }
  };
  
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (draggedSection && targetId && draggedSection !== targetId) {
      const newOrder = [...sectionOrder];
      const draggedIndex = newOrder.indexOf(draggedSection);
      const targetIndex = newOrder.indexOf(targetId);
      
      // Remove dragged item and insert at target position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSection);
      
      setSectionOrder(newOrder);
      localStorage.setItem('campaignSectionOrder', JSON.stringify(newOrder));
    }
    setDraggedSection(null);
    setDragOverSection(null);
  };
  
  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };
  
  const resetSectionOrder = () => {
    setSectionOrder(defaultSectionOrder);
    localStorage.setItem('campaignSectionOrder', JSON.stringify(defaultSectionOrder));
  };

  useEffect(() => { loadData(); }, [slug, campaignId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get client by slug - use public endpoint if in public mode
      let clientData;
      if (publicMode) {
        const response = await fetch(`${API_BASE}/api/public/client/slug/${slug}`);
        if (!response.ok) throw new Error('Client not found');
        clientData = await response.json();
      } else {
        clientData = await api.get(`/api/clients/slug/${slug}`);
      }
      setClient(clientData);

      // In public mode, fetch data from public endpoints
      if (publicMode) {
        console.log('[PUBLIC] Starting loadPublicCampaignData...');
        await loadPublicCampaignData(clientData);
        console.log('[PUBLIC] Finished loadPublicCampaignData, setting loading=false');
        setLoading(false);
        return;
      }

      // Try to get cached data first (FAST - single call)
      let usedCache = false;
      try {
        const cachedData = await api.get(
          `/api/clients/${clientData.id}/campaigns/${campaignId}/cached-data?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        
        if (cachedData && (cachedData.campaign || cachedData.stats?.impressions > 0 || cachedData.dailyStats?.length > 0)) {
          console.log('[CACHE] Using cached data for campaign', campaignId);
          usedCache = true;
          
          // Set all data from cache
          setCampaign(cachedData.campaign);
          setStats(normalizeStats(cachedData.stats));
          setDailyStats((cachedData.dailyStats || []).map(d => ({
            ...d,
            ctr: normalizeCtr(d.ctr)
          })).sort((a, b) => 
            new Date(a.stat_date || a.date) - new Date(b.stat_date || b.date)
          ));
          
          // Detect campaign type from name
          const detectedType = detectCampaignType(cachedData.campaign?.name);
          setCampaignType(detectedType);
          console.log('[CACHE] Campaign type detected:', detectedType);
          
          // Ads with stats already merged
          if (cachedData.ads?.length > 0) {
            console.log('[DEBUG] Received ads from cache:', cachedData.ads.length);
            const enrichedAds = cachedData.ads.map(ad => ({
              ...ad,
              ad_id: ad.id,
              total_spend: ad.spend || ad.total_spend || 0,
              ctr: ad.impressions > 0 ? ad.clicks / ad.impressions : 0,
              cpm: ad.impressions > 0 ? ((ad.spend || ad.total_spend || 0) / ad.impressions) * 1000 : 0,
              cpc: ad.clicks > 0 ? (ad.spend || ad.total_spend || 0) / ad.clicks : 0
            }));
            console.log('[DEBUG] Enriched ads:', enrichedAds.length, enrichedAds[0]);
            setAdStats(enrichedAds);
          } else {
            console.log('[DEBUG] No ads in cached data, fetching from API...');
            // Fetch ads from API as fallback
            try {
              const [adsResponse, adStatsResponse] = await Promise.all([
                api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/campaigns/${campaignId}/ads`),
                api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}&byAd=true`)
              ]);
              
              const adsFromApi = adsResponse.ads || [];
              const adStatsFromApi = adStatsResponse.campaign_stats || [];
              
              // Build stats map
              const statsMap = {};
              adStatsFromApi.forEach(s => { statsMap[s.ad_id] = s; });
              
              // Merge ads with stats
              const enrichedAds = adsFromApi.map(ad => {
                const stat = statsMap[ad.id] || {};
                // Parse dimensions
                let width = ad.original_width ? parseInt(ad.original_width) : null;
                let height = ad.original_height ? parseInt(ad.original_height) : null;
                if ((!width || !height) && ad.ad_sizes?.length > 0) {
                  width = width || ad.ad_sizes[0].width;
                  height = height || ad.ad_sizes[0].height;
                }
                const sizeMatch = ad.name?.match(/(\d{2,4})x(\d{2,4})/i);
                if (sizeMatch && (!width || !height)) {
                  width = width || parseInt(sizeMatch[1]);
                  height = height || parseInt(sizeMatch[2]);
                }
                
                return {
                  ...ad,
                  ad_id: ad.id,
                  preview_url: ad.primary_creative_url,
                  width,
                  height,
                  is_video: ad.ad_file_types?.[0]?.name?.toLowerCase() === 'video' || ad.name?.toLowerCase().includes('.mp4'),
                  impressions: stat.impressions || 0,
                  clicks: stat.clicks || 0,
                  spend: parseFloat(stat.total_spend) || 0,
                  total_spend: parseFloat(stat.total_spend) || 0,
                  ctr: stat.impressions > 0 ? stat.clicks / stat.impressions : 0,
                  cpm: stat.impressions > 0 ? (parseFloat(stat.total_spend) / stat.impressions) * 1000 : 0,
                  cpc: stat.clicks > 0 ? parseFloat(stat.total_spend) / stat.clicks : 0
                };
              });
              
              console.log('[DEBUG] Fetched ads from API:', enrichedAds.length, enrichedAds[0]);
              setAdStats(enrichedAds);
            } catch (adError) {
              console.log('[DEBUG] Could not fetch ads from API:', adError.message);
            }
          }
          
          // Keywords
          if (cachedData.keywords?.length > 0) {
            setKeywords(cachedData.keywords);
            setKeywordPerformance(cachedData.keywords);
          }
          
          // Geo-fences
          if (cachedData.geoFences?.length > 0) {
            setGeoFences(cachedData.geoFences);
            setGeoFencePerformance(cachedData.geoFences);
          }
          
          // Location stats
          if (cachedData.locationStats?.length > 0) {
            setLocationPerformance(cachedData.locationStats);
            setGeoStats(cachedData.locationStats);
          }
          
          // Device stats
          if (cachedData.deviceStats?.length > 0) {
            setEnhancedDeviceStats(cachedData.deviceStats);
            setDeviceStats(cachedData.deviceStats);
          }
          
          // Viewability
          if (cachedData.viewability) {
            setViewabilityData(cachedData.viewability);
          }
          
          // Conversions
          if (cachedData.conversions?.length > 0) {
            setConversionData(cachedData.conversions);
          }
          
          // Track cache status
          setDataFromCache(cachedData.fromCache || false);
          if (cachedData.lastSynced) {
            setLastSynced(new Date(cachedData.lastSynced));
            console.log('[CACHE] Data last synced:', new Date(cachedData.lastSynced).toLocaleString());
          }
          
          // If cache data was incomplete, still try to load enhanced data in background
          if (!cachedData.fromCache || !cachedData.locationStats?.length) {
            loadEnhancedData(clientData.simplifi_org_id, campaignId, cachedData.campaign);
          }
        }
      } catch (cacheError) {
        console.log('[CACHE] Cache not available, falling back to direct API:', cacheError.message);
        setDataFromCache(false);
      }

      // If cache didn't work, fall back to direct API calls
      if (!usedCache) {
        setDataFromCache(false);
        await loadDataFromAPI(clientData);
      }
      
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // Load campaign data from public endpoints (no auth required)
  const loadPublicCampaignData = async (clientData) => {
    console.log('[PUBLIC] Loading campaign data from public API...');
    
    try {
      // Get all campaigns to find this one
      const response = await fetch(
        `${API_BASE}/api/public/client/slug/${slug}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      
      // Find this campaign
      const campaignData = (data.campaigns || []).find(c => c.id === parseInt(campaignId));
      setCampaign(campaignData);
      
      // Detect campaign type
      const detectedType = detectCampaignType(campaignData?.name);
      setCampaignType(detectedType);
      
      // Get campaign stats
      const campaignStats = (data.campaignStats || []).find(s => s.campaign_id === parseInt(campaignId));
      setStats(normalizeStats(campaignStats || null));
      
      // Get daily stats for this campaign (filter from all daily stats)
      // Note: Public API returns aggregated daily stats, not per-campaign
      // We'll show what we have
      setDailyStats((data.dailyStats || []).map(d => ({
        ...d,
        ctr: normalizeCtr(d.ctr)
      })).sort((a, b) => new Date(a.stat_date || a.date) - new Date(b.stat_date || b.date)));
      
      // Get ads for this campaign
      const campaignAds = (data.adStats || [])
        .filter(ad => ad.campaign_id === parseInt(campaignId))
        .map(ad => ({
          ...ad,
          ad_id: ad.ad_id || ad.id,
          ctr: ad.impressions > 0 ? ad.clicks / ad.impressions : 0,
          cpm: ad.impressions > 0 ? (parseFloat(ad.total_spend) / ad.impressions) * 1000 : 0,
          cpc: ad.clicks > 0 ? parseFloat(ad.total_spend) / ad.clicks : 0
        }));
      setAdStats(campaignAds);
      
      // Try to load additional data from public report center endpoints
      const orgId = clientData.simplifi_org_id;
      
      // Load geo-fence data (always try, let UI hide if empty)
      try {
        const gfResponse = await fetch(
          `${API_BASE}/api/public/report-center/${orgId}/campaigns/${campaignId}/geo-fence-performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        if (gfResponse.ok) {
          const gfData = await gfResponse.json();
          // API returns geofence_performance (no underscore)
          const rawGeoFenceData = gfData.geofence_performance || gfData.geo_fence_performance || [];
          // Map geoFenceName to name for the component
          const geoFenceData = rawGeoFenceData.map(gf => ({
            ...gf,
            id: gf.geoFenceId,
            name: gf.geoFenceName || gf.name
          }));
          setGeoFencePerformance(geoFenceData);
          setGeoFences(geoFenceData);
        }
      } catch (e) { console.log('Geo-fence data not available'); }
      
      // Load keyword data (always try, let UI hide if empty)
      try {
        const kwResponse = await fetch(
          `${API_BASE}/api/public/report-center/${orgId}/campaigns/${campaignId}/keyword-performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        if (kwResponse.ok) {
          const kwData = await kwResponse.json();
          setKeywordPerformance(kwData.keyword_performance || []);
          setKeywords(kwData.keyword_performance || []);
        }
      } catch (e) { console.log('Keyword data not available'); }
      
      // Load domain performance (always try)
      try {
        const domainResponse = await fetch(
          `${API_BASE}/api/public/report-center/${orgId}/campaigns/${campaignId}/domain-performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        if (domainResponse.ok) {
          const domainData = await domainResponse.json();
          setDomainPerformance(domainData.domain_performance || []);
          console.log('[PUBLIC] Domain performance loaded:', (domainData.domain_performance || []).length, 'domains');
        }
      } catch (e) { console.log('Domain data not available'); }
      
      // Load location performance
      try {
        const locResponse = await fetch(
          `${API_BASE}/api/public/report-center/${orgId}/campaigns/${campaignId}/location-performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        if (locResponse.ok) {
          const locData = await locResponse.json();
          setLocationPerformance(locData.location_performance || []);
          setGeoStats(locData.location_performance || []);
        }
      } catch (e) { console.log('Location data not available'); }
      
      // Load device breakdown
      try {
        const deviceResponse = await fetch(
          `${API_BASE}/api/public/report-center/${orgId}/campaigns/${campaignId}/device-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        if (deviceResponse.ok) {
          const deviceData = await deviceResponse.json();
          setEnhancedDeviceStats(deviceData.device_breakdown || []);
          setDeviceStats(deviceData.device_breakdown || []);
        }
      } catch (e) { console.log('Device data not available'); }
      
      console.log('[PUBLIC] loadPublicCampaignData COMPLETED');
    } catch (err) {
      console.error('[PUBLIC] Error loading campaign data:', err);
    }
  };

  // Trigger a sync for this client
  const triggerSync = async () => {
    if (!client?.id || syncing) return;
    
    setSyncing(true);
    try {
      await api.post(`/api/clients/${client.id}/sync-data`, { 
        fullSync: false, 
        includeReportCenter: true 
      });
      
      // Wait a bit then reload data
      setTimeout(async () => {
        await loadData();
        setSyncing(false);
      }, 3000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncing(false);
    }
  };

  // Fallback: Load data directly from Simpli.fi API (slower)
  const loadDataFromAPI = async (clientData) => {
    console.log('[API] Loading data directly from Simpli.fi API...');
    
    // Get campaign details
    const campaignsData = await api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/campaigns`);
    const campaignData = (campaignsData.campaigns || []).find(c => c.id === parseInt(campaignId));
    setCampaign(campaignData);
    
    // Detect campaign type
    const detectedType = detectCampaignType(campaignData?.name);
    setCampaignType(detectedType);
    console.log('[API] Campaign type detected:', detectedType);

    // Fetch ads directly
    let adsFromApi = [];
    try {
      const adsResponse = await api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/campaigns/${campaignId}/ads`);
      adsFromApi = adsResponse.ads || [];
      console.log('Ads fetched:', adsFromApi.length);
    } catch (adsErr) {
      console.error('Failed to fetch ads:', adsErr);
    }

    // Build ad details map
    const adDetailsMap = {};
    adsFromApi.forEach(ad => {
      let width = null, height = null;
      const sizeMatch = ad.name?.match(/(\d{2,4})x(\d{2,4})/i);
      if (sizeMatch) {
        width = parseInt(sizeMatch[1]);
        height = parseInt(sizeMatch[2]);
      }
      const isVideo = ad.name?.toLowerCase().includes('.mp4') || 
                     ad.name?.toLowerCase().includes('.mov') ||
                     ad.name?.toLowerCase().includes('video');
      
      adDetailsMap[ad.id] = {
        ...ad,
        preview_url: ad.primary_creative_url,
        width, height,
        is_video: isVideo,
        file_type: isVideo ? 'Video' : 'Image'
      };
    });

    // Get campaign stats
    const statsData = await api.get(
      `/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}`
    );
    setStats(normalizeStats(statsData.campaign_stats?.[0] || null));

    // Get daily stats
    const dailyData = await api.get(
      `/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}&byDay=true`
    );
    setDailyStats((dailyData.campaign_stats || []).map(d => ({
      ...d,
      ctr: normalizeCtr(d.ctr)
    })).sort((a, b) => new Date(a.stat_date || a.date) - new Date(b.stat_date || b.date)));

    // Get ad stats
    const adData = await api.get(
      `/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}&byAd=true`
    );
    
    const campaignIdNum = parseInt(campaignId);
    const filteredStats = (adData.campaign_stats || []).filter(stat => stat.campaign_id === campaignIdNum);
    
    // Deduplicate ad stats
    const adStatsMap = new Map();
    filteredStats.forEach(stat => {
      const adId = stat.ad_id;
      if (!adId) return;
      if (adStatsMap.has(adId)) {
        const existing = adStatsMap.get(adId);
        existing.impressions = (existing.impressions || 0) + (stat.impressions || 0);
        existing.clicks = (existing.clicks || 0) + (stat.clicks || 0);
        existing.total_spend = (parseFloat(existing.total_spend) || 0) + (parseFloat(stat.total_spend) || 0);
      } else {
        adStatsMap.set(adId, { ...stat });
      }
    });
    
    const deduplicatedStats = Array.from(adStatsMap.values()).map(stat => ({
      ...stat,
      ctr: stat.impressions > 0 ? stat.clicks / stat.impressions : 0,
      cpm: stat.impressions > 0 ? (stat.total_spend / stat.impressions) * 1000 : 0,
      cpc: stat.clicks > 0 ? stat.total_spend / stat.clicks : 0
    }));
    
    const enrichedAds = deduplicatedStats.map(stat => {
      const details = adDetailsMap[stat.ad_id] || {};
      return {
        ...stat,
        name: details.name || stat.name || `Ad ${stat.ad_id}`,
        preview_url: details.preview_url,
        width: details.width,
        height: details.height,
        is_video: details.is_video,
        file_type: details.file_type
      };
    });
    console.log('[DEBUG] Enriched ads from API:', enrichedAds.length, enrichedAds[0]);
    setAdStats(enrichedAds);

    // Get geo stats
    try {
      const geoData = await api.get(
        `/api/simplifi/organizations/${clientData.simplifi_org_id}/geo-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}`
      );
      setGeoStats(geoData.campaign_stats || []);
    } catch (e) { console.error('Could not fetch geo stats:', e); }

    // Get geo-fences if applicable
    const campNameLower = campaignData?.name?.toLowerCase() || '';
    const isGeoFence = campNameLower.includes('_gf') || 
                       campNameLower.includes('geofence') || campNameLower.includes('geo_fence') || campNameLower.includes('geo-fence') ||
                       campNameLower.includes('geocomp') || campNameLower.includes('geo_comp') || campNameLower.includes('geo-comp') ||
                       campNameLower.includes('geotarget') || campNameLower.includes('geo_target') ||
                       campNameLower.includes('_geo_');
    if (isGeoFence) {
      try {
        const fencesData = await api.get(`/api/simplifi/campaigns/${campaignId}/geo_fences`);
        setGeoFences(fencesData.geo_fences || []);
      } catch (e) { console.error('Could not fetch geo-fences:', e); }
    }

    // Get keywords
    try {
      const keywordSummary = await api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/campaigns/${campaignId}/keywords`);
      const keywordInfo = keywordSummary.keywords?.[0];
      if (keywordInfo && keywordInfo.count > 0) {
        try {
          const keywordList = await api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/campaigns/${campaignId}/keywords/download`);
          setKeywords(keywordList.keywords || []);
        } catch (downloadErr) {
          setKeywords([{ 
            keyword: `${keywordInfo.count} keywords in campaign`,
            count: keywordInfo.count,
            isSummary: true
          }]);
        }
      }
    } catch (e) { console.log('Keywords not available:', e.message); }
    
    // Fetch enhanced data in background
    loadEnhancedData(clientData.simplifi_org_id, campaignId, campaignData);
  };
  
  // Load enhanced data from Report Center (runs in background)
  const loadEnhancedData = async (orgId, campId, campaignData) => {
    setEnhancedDataLoading(true);
    try {
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;
      
      // Use the campaign type detection helper
      const detectedType = detectCampaignType(campaignData?.name);
      // Also update state if not already set
      if (!campaignType.isGeoFence && !campaignType.isKeyword) {
        setCampaignType(detectedType);
      }
      
      console.log(`Campaign "${campaignData?.name}" - Type:`, detectedType);
      
      const promises = [];
      
      // ALWAYS fetch device breakdown (useful for all campaigns)
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/device-breakdown?startDate=${startDate}&endDate=${endDate}`)
          .then(data => {
            const deviceData = data.device_breakdown || [];
            setEnhancedDeviceStats(deviceData);
            setDeviceStats(deviceData);
            console.log('Device breakdown loaded:', deviceData.length, 'devices');
          })
          .catch(e => console.log('Device breakdown not available:', e.message))
      );
      
      // ALWAYS fetch location performance (shows on ALL campaign pages)
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/location-performance?startDate=${startDate}&endDate=${endDate}`)
          .then(data => {
            // Server wraps in location_performance property
            const locations = data.location_performance || [];
            const locationMap = new Map();
            locations.forEach(loc => {
              const key = `${loc.city || ''}-${loc.metro || ''}-${loc.region || ''}-${loc.country || ''}`;
              if (locationMap.has(key)) {
                const existing = locationMap.get(key);
                existing.impressions += loc.impressions || 0;
                existing.clicks += loc.clicks || 0;
                existing.spend += loc.spend || 0;
                existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) : 0;
              } else {
                locationMap.set(key, { ...loc, ctr: normalizeCtr(loc.ctr) });
              }
            });
            setLocationPerformance(Array.from(locationMap.values()));
          })
          .catch(e => console.log('Location performance not available:', e.message))
      );
      
      // Always fetch conversions
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/conversions?startDate=${startDate}&endDate=${endDate}`)
          .then(data => setConversionData(data.conversions || []))
          .catch(e => console.log('Conversion data not available:', e.message))
      );
      
      // Always fetch viewability
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/viewability?startDate=${startDate}&endDate=${endDate}`)
          .then(data => setViewabilityData(data.viewability || null))
          .catch(e => console.log('Viewability data not available:', e.message))
      );
      
      // ALWAYS fetch geo-fence performance - let UI hide if empty
      // (campaigns can have geo-targeting even if not named "geo-fence")
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/geo-fence-performance?startDate=${startDate}&endDate=${endDate}`)
          .then(data => {
            const gfPerf = data.geofence_performance || [];
            console.log(`[GEOFENCE] Authenticated mode received ${gfPerf.length} geo-fences from API`);
            if (gfPerf.length > 0) {
              console.log(`[GEOFENCE] First geo-fence:`, JSON.stringify(gfPerf[0]));
            }
            setGeoFencePerformance(gfPerf);
            // Also set geoFences if we don't have any yet (Report Center data can serve as geo-fence definitions)
            if (gfPerf.length > 0) {
              console.log(`Geo-fence performance loaded: ${gfPerf.length} geo-fences`);
              // Map to geoFences format for display
              const gfData = gfPerf.map((gf, idx) => ({
                id: gf.geoFenceId || `gf-${idx}`,
                name: gf.geoFenceName || (gf.geoFenceId ? `Geo-Fence ${gf.geoFenceId}` : `Location ${idx + 1}`),
                impressions: gf.impressions,
                clicks: gf.clicks,
                ctr: gf.ctr,
                spend: gf.spend
              }));
              console.log(`[GEOFENCE] Setting geoFences with ${gfData.length} items`);
              setGeoFences(prev => prev.length > 0 ? prev : gfData);
            }
          })
          .catch(e => console.log('Geo-fence performance not available:', e.message))
      );
      
      // ALWAYS fetch keyword performance - let UI hide if empty
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/keyword-performance?startDate=${startDate}&endDate=${endDate}`)
          .then(data => {
            const kwPerf = data.keyword_performance || [];
            if (kwPerf.length > 0) {
              console.log(`Keyword performance loaded: ${kwPerf.length} keywords`);
              setKeywordPerformance(kwPerf);
            }
          })
          .catch(e => console.log('Keyword performance not available:', e.message))
      );
      
      // ALWAYS fetch domain performance
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/domain-performance?startDate=${startDate}&endDate=${endDate}`)
          .then(data => {
            const domains = data.domain_performance || [];
            setDomainPerformance(domains);
            console.log('Domain performance loaded:', domains.length, 'domains');
          })
          .catch(e => console.log('Domain performance not available:', e.message))
      );
      
      await Promise.all(promises);
      
    } catch (err) {
      console.error('Error loading enhanced data:', err);
    }
    setEnhancedDataLoading(false);
  };

  const statusStyle = getStatusStyle(campaign?.status);
  const StatusIcon = statusStyle.icon;

  console.log('[RENDER] loading state:', loading);
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Campaign Header - Branded */}
      <div style={{ 
        background: `linear-gradient(135deg, ${client?.primary_color || '#1e3a8a'} 0%, ${client?.secondary_color || '#3b82f6'} 100%)`,
        borderRadius: '0.75rem', 
        marginBottom: '1.5rem', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        {/* Top section with campaign info */}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', minWidth: 0, flex: '1 1 auto' }}>
              {/* Client Logo */}
              {client?.logo_path ? (
                <img 
                  src={client.logo_path} 
                  alt={client.name} 
                  style={{ height: '48px', width: 'auto', borderRadius: '0.5rem', background: 'white', padding: '0.375rem' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '0.5rem', 
                  background: 'rgba(255,255,255,0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}>
                  {client?.name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: isMobile ? '1.125rem' : '1.5rem', fontWeight: 700, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{campaign?.name || 'Campaign'}</h2>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    padding: '0.25rem 0.75rem', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    <StatusIcon size={12} />
                    {statusStyle.label}
                  </span>
                </div>
                {/* Strategy Badge */}
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem', 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '0.375rem', 
                  fontSize: '0.8125rem',
                  fontWeight: 500
                }}>
                  {parseStrategy(campaign?.name)}
                </span>
              </div>
            </div>
            
            {/* Campaign Date Range & Report Period */}
            <div style={{ textAlign: isMobile ? 'center' : 'right', width: isMobile ? '100%' : 'auto' }}>
              {/* Campaign Flight Dates */}
              {(campaign?.start_date || campaign?.end_date) && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '0.375rem',
                  marginBottom: '0.75rem',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem'
                }}>
                  <span style={{ opacity: 0.8 }}>Campaign Flight: </span>
                  <span style={{ fontWeight: 600 }}>
                    {campaign?.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    {' → '}
                    {campaign?.end_date ? new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}
                  </span>
                </div>
              )}
              {/* Report Period */}
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                padding: '0.75rem 1rem', 
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.5rem' }}>Report Period</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <input 
                    type="date" 
                    value={dateRange.startDate} 
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    style={{ 
                      border: 'none', 
                      background: 'rgba(255,255,255,0.2)', 
                      padding: '0.375rem 0.5rem', 
                      borderRadius: '0.25rem', 
                      fontSize: '0.8125rem', 
                      color: 'white',
                      cursor: 'pointer'
                    }} 
                  />
                  <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>to</span>
                  <input 
                    type="date" 
                    value={dateRange.endDate} 
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    style={{ 
                      border: 'none', 
                      background: 'rgba(255,255,255,0.2)', 
                      padding: '0.375rem 0.5rem', 
                      borderRadius: '0.25rem', 
                      fontSize: '0.8125rem', 
                      color: 'white',
                      cursor: 'pointer'
                    }} 
                  />
                  <button 
                    onClick={loadData} 
                    style={{ 
                      padding: '0.375rem 0.75rem', 
                      background: 'rgba(255,255,255,0.25)', 
                      color: 'white', 
                      border: '1px solid rgba(255,255,255,0.3)', 
                      borderRadius: '0.25rem', 
                      fontSize: '0.75rem', 
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Update
                  </button>
                </div>
                {/* Cache/Sync Status */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.75rem', 
                  marginTop: '0.5rem',
                  fontSize: '0.6875rem',
                  opacity: 0.8
                }}>
                  {dataFromCache && (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      background: 'rgba(34, 197, 94, 0.3)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px'
                    }}>
                      <Database size={10} />
                      Cached
                    </span>
                  )}
                  {lastSynced && (
                    <span>Last synced: {lastSynced.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  )}
                  {!clientViewMode && !publicMode && (
                    <button
                      onClick={triggerSync}
                      disabled={syncing}
                      style={{
                        padding: '0.125rem 0.5rem',
                        background: syncing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '0.25rem',
                        fontSize: '0.625rem',
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <RefreshCw size={10} className={syncing ? 'spin' : ''} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions Bar */}
        <div style={{ 
          background: 'white', 
          padding: '0.75rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Link to={publicMode ? `/client/${slug}/report` : `/client/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to {client?.name}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Edit Layout Button - only for logged-in users */}
            {user && !clientViewMode && !publicMode && (
              <button 
                onClick={() => setEditMode(!editMode)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.5rem 0.875rem', 
                  background: editMode ? '#dbeafe' : '#f3f4f6', 
                  border: editMode ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '0.375rem', 
                  fontSize: '0.8125rem', 
                  cursor: 'pointer',
                  color: editMode ? '#1d4ed8' : '#374151'
                }}
              >
                <GripVertical size={14} />
                {editMode ? 'Done' : 'Edit Layout'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Mode Instructions */}
      {editMode && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.75rem 1rem', 
          background: '#dbeafe', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          border: '1px solid #93c5fd'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontSize: '0.875rem' }}>
            <GripVertical size={16} />
            <span><strong>Edit Mode:</strong> Drag sections to reorder them. Order is saved automatically.</span>
          </div>
          <button 
            onClick={resetSectionOrder}
            style={{ 
              padding: '0.375rem 0.75rem', 
              background: 'white', 
              border: '1px solid #93c5fd', 
              borderRadius: '0.375rem', 
              fontSize: '0.8125rem', 
              cursor: 'pointer',
              color: '#1e40af'
            }}
          >
            Reset to Default
          </button>
        </div>
      )}

      {/* Collapsible Internal Notes - just below header for admins */}
      {/* Notes are client-level only - same notes appear on client page and all campaign pages */}
      {user && !clientViewMode && !publicMode && (
        <InternalNotesSection clientId={client?.id} isCollapsible={true} />
      )}

      {/* Render sections in order */}
      {sectionOrder.map(sectionId => {
        const sectionProps = {
          key: sectionId,
          id: sectionId,
          isEditMode: editMode,
          onDragStart: handleDragStart,
          onDragOver: handleDragOver,
          onDrop: handleDrop,
          isDragging: draggedSection,
          dragOverId: dragOverSection
        };
        
        switch(sectionId) {
          case 'performance':
            return (
              <DraggableReportSection {...sectionProps} title="Campaign Performance">
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : isTablet ? 2 : (showSpendData ? 6 : 3)}, 1fr)`, gap: '1rem', marginBottom: '1.5rem' }}>
                  <StatCardWithChart label="Impressions" value={formatNumber(stats?.impressions)} data={dailyStats} dataKey="impressions" color="#0d9488" />
                  <StatCardWithChart label="Clicks" value={formatNumber(stats?.clicks)} data={dailyStats} dataKey="clicks" color="#3b82f6" />
                  <StatCardWithChart label="CTR" value={formatPercent(stats?.ctr)} data={dailyStats} dataKey="ctr" color="#8b5cf6" />
                  {showSpendData && <StatCardWithChart label="Spend" value={formatCurrency(stats?.total_spend)} data={dailyStats} dataKey="total_spend" color="#f59e0b" />}
                  {showSpendData && <MiniStatCard label="CPM" value={formatCurrency(stats?.cpm)} />}
                  {showSpendData && <MiniStatCard label="CPC" value={formatCurrency(stats?.cpc)} />}
                </div>
              </DraggableReportSection>
            );
          
          case 'vcr':
            // Only show VCR for OTT/CTV/Video campaigns that have VCR data
            if (!isOTTCampaign || !stats?.vcr) return null;
            return (
              <DraggableReportSection {...sectionProps} title="Video Performance" icon={Video} iconColor="#8b5cf6">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
                  <VCRCard vcr={stats.vcr} impressions={stats.impressions} />
                  <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: '#374151' }}>
                      What is Video Completion Rate?
                    </h4>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.6 }}>
                      VCR measures the percentage of video ads that viewers watch to completion. 
                      A higher VCR indicates better engagement with your video content.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
                      <div style={{ textAlign: 'center', padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 500 }}>Below 60%</div>
                        <div style={{ fontSize: '0.6875rem', color: '#b91c1c' }}>Needs Improvement</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 500 }}>60-80%</div>
                        <div style={{ fontSize: '0.6875rem', color: '#b45309' }}>Good</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', background: '#d1fae5', borderRadius: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 500 }}>Above 80%</div>
                        <div style={{ fontSize: '0.6875rem', color: '#047857' }}>Excellent</div>
                      </div>
                    </div>
                  </div>
                </div>
              </DraggableReportSection>
            );
          
          case 'charts':
            if (dailyStats.length === 0) return null;
            return (
              <DraggableReportSection {...sectionProps} title="Performance Trends" icon={TrendingUp} iconColor="#0d9488">
                <DualPerformanceChart data={dailyStats} title1="Total Range Impressions" title2="Total Range Clicks" />
              </DraggableReportSection>
            );
          
          case 'device':
            // Device breakdown from Report Center
            if (deviceStats.length === 0 && enhancedDeviceStats.length === 0) {
              if (enhancedDataLoading) {
                return (
                  <DraggableReportSection {...sectionProps} title="By Device" icon={Smartphone} iconColor="#6366f1">
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                      <p style={{ fontSize: '0.875rem' }}>Loading device data...</p>
                    </div>
                  </DraggableReportSection>
                );
              }
              return null;
            }
            
            const deviceData = enhancedDeviceStats.length > 0 ? enhancedDeviceStats : deviceStats;
            const totalDeviceImpressions = deviceData.reduce((sum, d) => sum + (d.impressions || 0), 0);
            
            return (
              <DraggableReportSection {...sectionProps} title={`By Device (${deviceData.length} types)`} icon={Smartphone} iconColor="#6366f1">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(deviceData.length, 4)}, 1fr)`, gap: '1rem' }}>
                  {deviceData.map((device, i) => {
                    const percentage = totalDeviceImpressions > 0 ? ((device.impressions || 0) / totalDeviceImpressions * 100) : 0;
                    const DeviceIcon = device.device_type?.toLowerCase().includes('mobile') ? Smartphone : 
                                       device.device_type?.toLowerCase().includes('tablet') ? Tablet :
                                       device.device_type?.toLowerCase().includes('tv') || device.device_type?.toLowerCase().includes('ctv') ? Tv : Monitor;
                    return (
                      <div key={i} style={{ 
                        background: '#f9fafb', 
                        padding: '1.25rem', 
                        borderRadius: '0.75rem',
                        textAlign: 'center'
                      }}>
                        <DeviceIcon size={28} color="#6366f1" style={{ marginBottom: '0.75rem' }} />
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                          {device.device_type || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
                          {percentage.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {formatNumber(device.impressions)} impressions
                        </div>
                        {device.clicks > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {formatNumber(device.clicks)} clicks
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DraggableReportSection>
            );
          
          case 'geo':
            // Check if we have enhanced location data from Report Center
            const hasEnhancedLocationData = locationPerformance.length > 0;
            const hasGeoData = geoStats.length > 0 && geoStats.some(g => g.geo_name || g.dma_name || g.metro || g.state);
            
            if (!hasEnhancedLocationData && !hasGeoData) {
              // Show loading or message
              if (enhancedDataLoading) {
                return (
                  <DraggableReportSection {...sectionProps} title="Performance by Location" icon={MapPin} iconColor="#10b981">
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                      <p style={{ fontSize: '0.875rem' }}>Loading location data from Report Center...</p>
                    </div>
                  </DraggableReportSection>
                );
              }
              return null; // Hide if no data available
            }
            
            // Use enhanced location data if available
            if (hasEnhancedLocationData) {
              // Check if spend data is actually available (not all 0s)
              const hasSpendData = locationPerformance.some(loc => (loc.spend || 0) > 0);
              const showSpend = showSpendData && hasSpendData;
              
              return (
                <DraggableReportSection {...sectionProps} title={`Performance by Location (${locationPerformance.length} locations)`} icon={MapPin} iconColor="#10b981">
                  <ExpandableLocationTable 
                    locations={locationPerformance} 
                    showSpend={showSpend} 
                    formatNumber={formatNumberFull}
                    formatCurrency={formatCurrency}
                  />
                </DraggableReportSection>
              );
            }
            
            // Fallback to old geo stats if available
            return (
              <DraggableReportSection {...sectionProps} title="Performance by Location" icon={MapPin} iconColor="#10b981">
                <GeoBreakdownChart data={geoStats} />
              </DraggableReportSection>
            );
          
          case 'keywords':
            // Skip this - we'll show everything in keywordPerformance
            return null;
          
          case 'keywordPerformance':
            // Only show for keyword campaigns OR if we have actual keyword data
            // This prevents showing empty keyword sections on non-keyword campaigns
            const hasKeywordData = keywords.length > 0 || keywordPerformance.length > 0;
            const isKeywordCampaign = campaignType.isKeyword;
            
            // Skip if not a keyword campaign AND no keyword data
            if (!hasKeywordData && !isKeywordCampaign) return null;
            // Also skip if we're still loading and have no data
            if (!hasKeywordData) return null;
            
            // Check if spend data is actually available and user is admin
            const hasKwSpendData = keywordPerformance.some(kw => (kw.spend || 0) > 0);
            const showKwSpend = showSpendData && hasKwSpendData;
            
            return (
              <DraggableReportSection {...sectionProps} title={`Keyword Performance (${keywordPerformance.length || keywords.length})`} icon={Target} iconColor="#8b5cf6">
                <ExpandableKeywordPerformance 
                  keywords={keywords}
                  keywordPerformance={keywordPerformance}
                  showSpend={showKwSpend}
                  formatNumber={formatNumberFull}
                  formatCurrency={formatCurrency}
                  isAdmin={user?.role === 'admin'}
                />
              </DraggableReportSection>
            );
          
          case 'ads':
            if (adStats.length === 0) return null;
            return (
              <DraggableReportSection {...sectionProps} title={`Ad Performance (${adStats.length} ads)`} icon={Image} iconColor="#6366f1">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {adStats
                    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
                    .map((ad, i) => (
                      <AdPerformanceCard key={ad.ad_id || i} ad={ad} showSpendData={showSpendData} />
                    ))}
                </div>
              </DraggableReportSection>
            );
          
          case 'geofences':
            // Only show for geo-fence campaigns OR if we have actual geo-fence data
            const hasGeoFenceData = geoFences.length > 0 || geoFencePerformance.length > 0;
            const isGeoFenceCampaign = campaignType.isGeoFence;
            
            // Skip if not a geo-fence campaign AND no geo-fence data AND not loading
            if (!hasGeoFenceData && !isGeoFenceCampaign && !enhancedDataLoading) return null;
            // Also skip if we have no data and not loading
            if (!hasGeoFenceData && !enhancedDataLoading) return null;
            
            // Show loading state if we're still fetching
            if (enhancedDataLoading && !hasGeoFenceData) {
              // Only show loading for geo-fence campaigns
              if (!isGeoFenceCampaign) return null;
              return (
                <DraggableReportSection {...sectionProps} title="Geo-Fence Targeting" icon={MapPin} iconColor="#0d9488">
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '0.875rem' }}>Loading geo-fence data...</p>
                  </div>
                </DraggableReportSection>
              );
            }
            
            // Skip if still no data after loading
            if (!hasGeoFenceData) return null;
            
            // Merge geo-fence definitions with performance data
            const mergedGeoFences = geoFences.map(fence => {
              const perf = geoFencePerformance.find(p => 
                p.geoFenceId === fence.id || 
                p.geoFenceName?.toLowerCase() === fence.name?.toLowerCase()
              );
              return {
                ...fence,
                impressions: perf?.impressions || fence.impressions || 0,
                clicks: perf?.clicks || fence.clicks || 0,
                ctr: perf?.ctr || fence.ctr || 0,
                spend: perf?.spend || fence.spend || 0
              };
            }).sort((a, b) => b.impressions - a.impressions);
            
            // If we have performance data but no fence definitions, use performance data
            const displayFences = mergedGeoFences.length > 0 ? mergedGeoFences : 
              geoFencePerformance.map((p, idx) => ({
                id: p.geoFenceId || `gf-${idx}`,
                name: p.geoFenceName || (p.geoFenceId ? `Geo-Fence ${p.geoFenceId}` : `Location ${idx + 1}`),
                impressions: p.impressions,
                clicks: p.clicks,
                ctr: p.ctr,
                spend: p.spend
              })).sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
            
            // Check if we have any stats
            const hasGeoStats = displayFences.some(f => f.impressions > 0 || f.clicks > 0);
            
            return (
              <DraggableReportSection {...sectionProps} title={`Geo-Fence Targeting (${displayFences.length} Locations)`} icon={MapPin} iconColor="#0d9488">
                {/* Enhanced Explanation */}
                <div style={{ 
                  padding: '0.875rem 1rem', 
                  background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)', 
                  borderRadius: '0.75rem', 
                  marginBottom: '1.25rem',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                  color: '#0f766e',
                  border: '1px solid #a7f3d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <MapPin size={14} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '0.375rem', color: '#065f46', fontSize: isMobile ? '0.8125rem' : '0.875rem' }}>
                        Geo-Fence Targeting
                      </div>
                      <div style={{ lineHeight: 1.5 }}>
                        These are physical locations being targeted for this campaign. When people visit these locations, their device is captured and they become eligible to see your ads. This allows you to reach customers based on <strong>real-world behavior</strong>.
                      </div>
                    </div>
                  </div>
                </div>
                
                {enhancedDataLoading && geoFencePerformance.length === 0 && (
                  <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Loading performance data from Report Center...</span>
                  </div>
                )}
                <ExpandableGeoFenceList 
                  fences={displayFences} 
                  formatNumber={formatNumberFull}
                  isMobile={isMobile}
                  hasStats={hasGeoStats}
                />
              </DraggableReportSection>
            );
          
          case 'conversions':
            // Only show conversion tracking if campaign has actual conversion data
            // Check for: totalConversions > 0, or clickConversions > 0, or viewConversions > 0
            const hasConversionData = conversionData && (
              (conversionData.totalConversions && conversionData.totalConversions > 0) ||
              (conversionData.clickConversions && conversionData.clickConversions > 0) ||
              (conversionData.viewConversions && conversionData.viewConversions > 0)
            );
            
            if (!hasConversionData) return null;
            
            return (
              <DraggableReportSection {...sectionProps} title="Conversion Tracking" icon={Target} iconColor="#10b981">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '0.75rem' : '1rem' }}>
                  <div style={{ background: '#f0fdf4', padding: isMobile ? '0.75rem' : '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#15803d', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Conversions</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#166534' }}>{formatNumberFull(conversionData.totalConversions)}</div>
                  </div>
                  <div style={{ background: '#eff6ff', padding: isMobile ? '0.75rem' : '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Click Conversions</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#1e40af' }}>{formatNumberFull(conversionData.clickConversions)}</div>
                  </div>
                  <div style={{ background: '#fdf4ff', padding: isMobile ? '0.75rem' : '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#a21caf', textTransform: 'uppercase', marginBottom: '0.25rem' }}>View Conversions</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#86198f' }}>{formatNumberFull(conversionData.viewConversions)}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: isMobile ? '0.75rem' : '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Conversion Rate</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#374151' }}>{conversionData.conversionRate?.toFixed(2) || '0.00'}%</div>
                  </div>
                </div>
              </DraggableReportSection>
            );
          
          case 'domains':
            if (domainPerformance.length === 0) return null;
            
            // Helper to clean up domain names for display
            const cleanDomainName = (domain) => {
              if (!domain) return 'Unknown';
              
              // Map common app bundle IDs to friendly names
              const domainMappings = {
                'com.treemolabs.apps.cbsnews': 'CBS News',
                'com.cbs.app': 'CBS',
                'com.roku': 'Roku',
                'com.pluto.tv': 'Pluto TV',
                'com.tubitv': 'Tubi TV',
                'com.amazon.firetv': 'Amazon Fire TV',
                'com.hulu': 'Hulu',
                'com.peacock': 'Peacock',
                'com.paramount': 'Paramount+',
                'com.discovery': 'Discovery+',
                'com.fox.now': 'Fox Now',
                'com.nbc.news': 'NBC News',
                'com.abc.news': 'ABC News',
                'com.weather.weather': 'Weather Channel',
                'mobi.ifunny': 'iFunny',
                'com.teevee.mobile': 'TeeVee',
              };
              
              // Check for exact match first
              const lowerDomain = domain.toLowerCase();
              for (const [key, value] of Object.entries(domainMappings)) {
                if (lowerDomain.includes(key.toLowerCase())) return value;
              }
              
              // If it's a URL, extract the domain
              if (domain.startsWith('http')) {
                try {
                  const url = new URL(domain);
                  return url.hostname.replace('www.', '');
                } catch {}
              }
              
              // If it's an app bundle ID (com.xxx.xxx), try to extract readable name
              if (domain.includes('.') && !domain.includes(' ')) {
                const parts = domain.split('.');
                // Get the last meaningful part
                const lastPart = parts[parts.length - 1];
                if (lastPart && lastPart.length > 2 && !/^\d+$/.test(lastPart)) {
                  // Capitalize and clean up
                  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/([A-Z])/g, ' $1').trim();
                }
                // Try second to last part
                if (parts.length >= 2) {
                  const secondLast = parts[parts.length - 2];
                  if (secondLast && secondLast.length > 2 && !/^\d+$/.test(secondLast)) {
                    return secondLast.charAt(0).toUpperCase() + secondLast.slice(1);
                  }
                }
              }
              
              // Return as-is if it's just numbers (likely an ID)
              if (/^\d+$/.test(domain)) {
                return `App ID: ${domain}`;
              }
              
              return domain;
            };
            
            // Aggregate domains by cleaned name (in case same app appears multiple times)
            const aggregatedDomains = {};
            domainPerformance.forEach(d => {
              const cleanName = cleanDomainName(d.domain);
              if (!aggregatedDomains[cleanName]) {
                aggregatedDomains[cleanName] = {
                  domain: cleanName,
                  originalDomain: d.domain,
                  impressions: 0,
                  clicks: 0,
                  spend: 0,
                  complete_rate: d.complete_rate,
                  count: 0
                };
              }
              aggregatedDomains[cleanName].impressions += d.impressions || 0;
              aggregatedDomains[cleanName].clicks += d.clicks || 0;
              aggregatedDomains[cleanName].spend += d.spend || 0;
              aggregatedDomains[cleanName].count += 1;
              // Keep the highest completion rate if multiple
              if (d.complete_rate && d.complete_rate > (aggregatedDomains[cleanName].complete_rate || 0)) {
                aggregatedDomains[cleanName].complete_rate = d.complete_rate;
              }
            });
            
            const sortedDomains = Object.values(aggregatedDomains).sort((a, b) => b.impressions - a.impressions);
            const displayDomains = sortedDomains.slice(0, 15);
            
            // Calculate max impressions for bar scaling
            const maxDomainImpressions = Math.max(...displayDomains.map(d => d.impressions || 0));
            
            // Check if we have completion rate data (OTT/CTV campaigns)
            const hasCompletionRate = displayDomains.some(d => d.complete_rate > 0);
            
            // Calculate totals
            const totalDomainImpressions = sortedDomains.reduce((sum, d) => sum + (d.impressions || 0), 0);
            
            return (
              <DraggableReportSection {...sectionProps} title="Where Your Ads Appeared" icon={Globe} iconColor="#6366f1">
                {/* Summary Stats */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                  gap: isMobile ? '0.75rem' : '1rem', 
                  marginBottom: '1.5rem',
                  padding: isMobile ? '0.75rem' : '1rem',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                  borderRadius: '0.75rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Placements</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#1e40af' }}>{sortedDomains.length.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Impressions</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#059669' }}>{formatNumber(totalDomainImpressions)}</div>
                  </div>
                  {!isMobile && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Top Placement</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{displayDomains[0]?.domain || '—'}</div>
                    </div>
                  )}
                </div>
                
                {/* Explanation for non-technical users */}
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  background: '#f9fafb', 
                  borderRadius: '0.5rem', 
                  marginBottom: '1rem',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                  color: '#6b7280'
                }}>
                  <strong style={{ color: '#374151' }}>📺 What is this?</strong> This shows the apps, websites, and streaming services where your video ads were shown.
                </div>
                
                <div style={{ maxHeight: isMobile ? '350px' : '450px', overflow: 'auto' }}>
                  {/* Header - simplified on mobile */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr 1fr' : (hasCompletionRate ? '1.5fr 2fr 1fr' : '1fr 2fr'), 
                    gap: isMobile ? '0.5rem' : '1rem',
                    padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                    borderBottom: '2px solid #e5e7eb',
                    background: '#f9fafb',
                    position: 'sticky',
                    top: 0
                  }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>App / Website</div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: isMobile ? 'right' : 'center' }}>
                      {isMobile ? 'Impressions' : 'Times Shown'}
                    </div>
                    {!isMobile && hasCompletionRate && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Watched to End</div>
                    )}
                  </div>
                  
                  {/* Rows */}
                  {displayDomains.map((d, i) => {
                    const impressionPercent = maxDomainImpressions > 0 ? ((d.impressions || 0) / maxDomainImpressions * 100) : 0;
                    const completeRate = d.complete_rate ?? null;
                    
                    return (
                      <div key={i} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr 1fr' : (hasCompletionRate ? '1.5fr 2fr 1fr' : '1fr 2fr'), 
                        gap: isMobile ? '0.5rem' : '1rem',
                        padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        alignItems: 'center',
                        background: i % 2 === 0 ? 'white' : '#fafafa'
                      }}>
                        {/* Domain Name with icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          {!isMobile && (
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '0.375rem',
                              background: `hsl(${(i * 37) % 360}, 70%, 95%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: `hsl(${(i * 37) % 360}, 70%, 35%)`,
                              flexShrink: 0
                            }}>
                              {d.domain.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ 
                              fontSize: isMobile ? '0.75rem' : '0.875rem', 
                              fontWeight: 500, 
                              color: '#374151',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {d.domain}
                            </div>
                            {!isMobile && d.count > 1 && (
                              <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                                {d.count} variants
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Mobile: Just show number. Desktop: Show bar */}
                        {isMobile ? (
                          <div style={{ textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600, color: '#0d9488' }}>
                            {formatNumber(d.impressions)}
                          </div>
                        ) : (
                          /* Impressions Bar */
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              flex: 1, 
                              height: '24px', 
                              background: '#e5e7eb', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${impressionPercent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)',
                                borderRadius: '4px',
                                minWidth: impressionPercent > 0 ? '4px' : '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                paddingRight: impressionPercent > 30 ? '0.5rem' : '0'
                              }}>
                                {impressionPercent > 30 && (
                                  <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {formatNumberFull(d.impressions)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {impressionPercent <= 30 && (
                              <div style={{ 
                                fontSize: '0.8125rem', 
                                fontWeight: 500, 
                                color: '#374151',
                                minWidth: '55px',
                                textAlign: 'right'
                              }}>
                                {formatNumberFull(d.impressions)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Completion Rate Bar (if available) - hidden on mobile */}
                        {!isMobile && hasCompletionRate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              flex: 1, 
                              height: '24px', 
                              background: '#e5e7eb', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${completeRate ?? 0}%`,
                                height: '100%',
                                background: completeRate >= 95 ? 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)' :
                                           completeRate >= 80 ? 'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)' :
                                           completeRate >= 50 ? 'linear-gradient(90deg, #eab308 0%, #facc15 100%)' :
                                           'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
                                borderRadius: '4px'
                              }} />
                            </div>
                            <div style={{ 
                              fontSize: '0.8125rem', 
                              fontWeight: 500, 
                              color: completeRate >= 80 ? '#059669' : completeRate >= 50 ? '#d97706' : '#dc2626',
                              minWidth: '50px',
                              textAlign: 'right'
                            }}>
                              {completeRate !== null && completeRate > 0 ? `${completeRate.toFixed(1)}%` : '—'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {sortedDomains.length > 15 && (
                  <div style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8125rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    Showing top 15 of {sortedDomains.length} placements • {formatNumber(totalDomainImpressions)} total impressions
                  </div>
                )}
              </DraggableReportSection>
            );
          
          case 'viewability':
            if (!viewabilityData) return null;
            return (
              <DraggableReportSection {...sectionProps} title="Viewability Metrics" icon={Eye} iconColor="#8b5cf6">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div style={{ background: '#faf5ff', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#7c3aed', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Viewability Rate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6d28d9' }}>{viewabilityData.viewabilityRate?.toFixed(1) || '0'}%</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Measured Impressions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#374151' }}>{formatNumber(viewabilityData.measuredImpressions)}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#15803d', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Viewable Impressions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{formatNumber(viewabilityData.viewableImpressions)}</div>
                  </div>
                  <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Avg View Time</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{viewabilityData.avgViewTime?.toFixed(1) || '0'}s</div>
                  </div>
                </div>
              </DraggableReportSection>
            );
          
          case 'daily':
            if (dailyStats.length === 0) return null;
            return (
              <DraggableReportSection {...sectionProps} title="Daily Breakdown" icon={Calendar} iconColor="#6b7280">
                {/* Mobile: Card layout */}
                <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflow: 'auto' }}>
                  {dailyStats.map((d, i) => {
                    const clicks = d.clicks || d.click_count || d.total_clicks || 0;
                    const impressions = d.impressions || d.impression_count || d.total_impressions || 0;
                    const ctr = d.ctr || (impressions > 0 ? clicks / impressions : 0);
                    const spend = d.total_spend || d.spend || d.cost || 0;
                    
                    return (
                      <div key={d.stat_date || d.date || i} style={{ 
                        padding: '0.75rem', 
                        background: '#f9fafb', 
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
                          {new Date(d.stat_date || d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                          <span><strong style={{ color: '#0d9488' }}>{formatNumber(impressions)}</strong> impr</span>
                          <span><strong style={{ color: '#3b82f6' }}>{formatNumber(clicks)}</strong> clicks</span>
                          <span><strong>{formatPercent(ctr)}</strong></span>
                          {showSpendData && <span style={{ color: '#059669' }}>{formatCurrency(spend)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Desktop: Table layout */}
                <div className="desktop-table" style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>CTR</th>
                        {showSpendData && <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyStats.map((d, i) => {
                        const clicks = d.clicks || d.click_count || d.total_clicks || 0;
                        const impressions = d.impressions || d.impression_count || d.total_impressions || 0;
                        const ctr = d.ctr || (impressions > 0 ? clicks / impressions : 0);
                        const spend = d.total_spend || d.spend || d.cost || 0;
                        
                        return (
                          <tr key={d.stat_date || d.date || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{new Date(d.stat_date || d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(impressions)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(clicks)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatPercent(ctr)}</td>
                            {showSpendData && <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(spend)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </DraggableReportSection>
            );
          
          default:
            return null;
        }
      })}
    </div>
  );
}

// ============================================
// AD PERFORMANCE CARD
// ============================================
function AdPerformanceCard({ ad, showSpendData = true }) {
  const [imageError, setImageError] = useState(false);
  
  // Use dimensions from API if available, otherwise parse from name
  const sizeMatch = ad.name?.match(/(\d{2,4}x\d{2,4})/i);
  const adSize = sizeMatch ? sizeMatch[1] : (ad.width && ad.height ? `${ad.width}x${ad.height}` : null);
  const isVideo = ad.is_video || ad.file_type?.toLowerCase() === 'video' || ad.name?.toLowerCase().includes('.mp4');
  
  // Calculate display dimensions
  const width = ad.width || (sizeMatch ? parseInt(sizeMatch[1].split('x')[0]) : 300);
  const height = ad.height || (sizeMatch ? parseInt(sizeMatch[1].split('x')[1]) : 250);
  const aspectRatio = width / height;
  const maxWidth = 180;
  const displayWidth = Math.min(width, maxWidth);
  const displayHeight = displayWidth / aspectRatio;

  const mediaUrl = ad.preview_url; // This is primary_creative_url from Simpli.fi
  
  // Proxy image URL through our backend for Safari compatibility
  const getProxiedUrl = (url) => {
    if (!url) return null;
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '200px 1fr', 
      gap: '1.5rem', 
      padding: '1rem', 
      background: '#f9fafb', 
      borderRadius: '0.75rem',
      alignItems: 'center'
    }}>
      {/* Ad Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ 
          width: displayWidth, 
          height: Math.max(displayHeight, 60),
          background: '#e5e7eb',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '1px solid #d1d5db'
        }}>
          {mediaUrl && !imageError ? (
            isVideo ? (
              <video 
                src={mediaUrl} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                muted
                loop
                autoPlay
                playsInline
                onError={() => setImageError(true)}
              />
            ) : (
              <img 
                src={getProxiedUrl(mediaUrl)} 
                alt={ad.name} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                onError={() => setImageError(true)} 
              />
            )
          ) : isVideo ? (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <Tv size={28} />
              <div style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>Video</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <Image size={28} />
              <div style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>{adSize || 'Ad'}</div>
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.6875rem', color: '#6b7280', textAlign: 'center' }}>
          {adSize || (isVideo ? 'Video' : 'Display')}
          {ad.file_type && <span> • {ad.file_type}</span>}
        </div>
      </div>

      {/* Ad Stats */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem', color: '#111827' }}>
          {ad.name || `Ad ${ad.ad_id}`}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: showSpendData ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Impressions</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatNumber(ad.impressions)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Clicks</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatNumber(ad.clicks)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>CTR</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatPercent(ad.ctr)}</div>
          </div>
          {showSpendData && (
            <div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Spend</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(ad.total_spend)}</div>
            </div>
          )}
          {showSpendData && (
            <div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>CPM</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(ad.cpm)}</div>
            </div>
          )}
          {showSpendData && (
            <div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>CPC</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(ad.cpc)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// REPORT SECTION COMPONENT
// ============================================
function ReportSection({ title, children, icon: Icon, iconColor }) {
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
      <h3 style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        fontSize: '1rem', 
        fontWeight: 600, 
        marginBottom: '1.25rem', 
        paddingBottom: '0.75rem', 
        borderBottom: '1px solid #f3f4f6' 
      }}>
        {Icon && <Icon size={20} color={iconColor} />}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ============================================
// DRAGGABLE REPORT SECTION (for reordering)
// ============================================
function DraggableReportSection({ 
  id, 
  title, 
  children, 
  icon: Icon, 
  iconColor, 
  isEditMode, 
  onDragStart, 
  onDragOver, 
  onDrop,
  isDragging,
  dragOverId 
}) {
  return (
    <div 
      draggable={isEditMode}
      onDragStart={(e) => onDragStart?.(e, id)}
      onDragOver={(e) => onDragOver?.(e, id)}
      onDrop={(e) => onDrop?.(e, id)}
      style={{ 
        background: 'white', 
        borderRadius: '0.75rem', 
        padding: '1.5rem', 
        marginBottom: '1.5rem', 
        border: dragOverId === id ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
        opacity: isDragging === id ? 0.5 : 1,
        cursor: isEditMode ? 'grab' : 'default',
        transition: 'all 0.2s ease',
        transform: dragOverId === id ? 'scale(1.01)' : 'scale(1)'
      }}
    >
      <h3 style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        fontSize: '1rem', 
        fontWeight: 600, 
        marginBottom: '1.25rem', 
        paddingBottom: '0.75rem', 
        borderBottom: '1px solid #f3f4f6' 
      }}>
        {isEditMode && (
          <GripVertical size={18} color="#9ca3af" style={{ cursor: 'grab', marginRight: '0.25rem' }} />
        )}
        {Icon && <Icon size={20} color={iconColor} />}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ============================================
// PERFORMANCE CHART
// ============================================
function PerformanceChart({ data }) {
  if (!data?.length) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>No data</div>;
  
  const maxImp = Math.max(...data.map(d => d.impressions || 0));
  const height = 160;
  
  return (
    <div style={{ position: 'relative', height: '100%', paddingLeft: '50px', paddingBottom: '25px' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: '25px', width: '45px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '5px' }}>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{formatNumber(maxImp)}</span>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>0</span>
      </div>
      <div style={{ height: '100%', position: 'relative' }}>
        <svg style={{ width: '100%', height: '100%' }} preserveAspectRatio="none" viewBox={`0 0 ${data.length * 20} ${height}`}>
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1="0" y1={height * i / 4} x2={data.length * 20} y2={height * i / 4} stroke="#f3f4f6" strokeWidth="1" />
          ))}
          <path
            d={`M 0,${height} ${data.map((d, i) => `L ${i * 20 + 10},${height - ((d.impressions || 0) / maxImp * height * 0.9)}`).join(' ')} L ${(data.length - 1) * 20 + 10},${height} Z`}
            fill="rgba(13, 148, 136, 0.1)"
          />
          <path
            d={data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * 20 + 10},${height - ((d.impressions || 0) / maxImp * height * 0.9)}`).join(' ')}
            fill="none" stroke="#0d9488" strokeWidth="2"
          />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{new Date(data[0].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{new Date(data[data.length - 1].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

// ============================================
// IMPROVED AREA CHART - Shows trend with proper scale
// ============================================
function AreaChart({ data, dataKey, color = '#0d9488', title, total, height = 160, formatValue = formatNumber }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  if (!data?.length) return null;
  
  const values = data.map(d => d[dataKey] || 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  
  // Use percentage-based width for responsive chart - always use full width
  const chartWidth = 500; // Fixed viewBox width, SVG will scale to container
  const chartHeight = height - 40; // Leave room for labels
  
  // Calculate nice scale values
  const scaleTop = Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal || 1)))) * Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
  const scaleMid = Math.round(scaleTop / 2);
  
  // Padding for the chart area
  const paddingLeft = 10;
  const paddingRight = 10;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  
  // Generate path for area
  const getY = (val) => chartHeight - ((val / (scaleTop || 1)) * chartHeight);
  const getX = (i) => paddingLeft + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
  
  const linePath = data.map((d, i) => {
    const x = getX(i);
    const y = getY(d[dataKey] || 0);
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');
  
  const areaPath = `${linePath} L ${getX(data.length - 1)},${chartHeight} L ${paddingLeft},${chartHeight} Z`;

  // Determine which points to show (first, last, and evenly spaced in between)
  const pointsToShow = data.length <= 7 
    ? data.map((_, i) => i) 
    : [0, ...Array.from({ length: 5 }, (_, i) => Math.round((i + 1) * (data.length - 1) / 6)), data.length - 1];

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{formatValue(total)}</span>
      </div>
      
      <div style={{ position: 'relative', height: `${height}px` }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 30, width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '8px' }}>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{formatNumber(scaleTop)}</span>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{formatNumber(scaleMid)}</span>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>0</span>
        </div>
        
        {/* Chart area */}
        <div style={{ marginLeft: '55px', height: `${height - 30}px`, position: 'relative' }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            <line x1={paddingLeft} y1={getY(scaleTop)} x2={chartWidth - paddingRight} y2={getY(scaleTop)} stroke="#f3f4f6" strokeWidth="1" />
            <line x1={paddingLeft} y1={getY(scaleMid)} x2={chartWidth - paddingRight} y2={getY(scaleMid)} stroke="#f3f4f6" strokeWidth="1" />
            <line x1={paddingLeft} y1={chartHeight} x2={chartWidth - paddingRight} y2={chartHeight} stroke="#e5e7eb" strokeWidth="1" />
            
            {/* Area fill */}
            <path d={areaPath} fill={`${color}15`} />
            
            {/* Line */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Interactive data points - all points for hover detection */}
            {data.map((d, i) => {
              const x = getX(i);
              const y = getY(d[dataKey] || 0);
              const isVisible = pointsToShow.includes(i);
              const isHovered = hoveredPoint === i;
              return (
                <g key={i}>
                  {/* Invisible larger hit area */}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="15" 
                    fill="transparent" 
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Visible point */}
                  {(isVisible || isHovered) && (
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={isHovered ? "7" : "5"} 
                      fill="white" 
                      stroke={color} 
                      strokeWidth={isHovered ? "3" : "2.5"} 
                      style={{ transition: 'r 0.15s' }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredPoint !== null && data[hoveredPoint] && (
            <div style={{
              position: 'absolute',
              left: `${(getX(hoveredPoint) / chartWidth) * 100}%`,
              top: `${(getY(data[hoveredPoint][dataKey] || 0) / chartHeight) * 100}%`,
              transform: 'translate(-50%, -120%)',
              background: '#1f2937',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              zIndex: 10,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>
                {new Date(data[hoveredPoint].stat_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ color: '#a5f3fc' }}>{formatValue(data[hoveredPoint][dataKey])}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* X-axis dates */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '55px', marginTop: '8px' }}>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
          {data[0] && new Date(data[0].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {data.length > 2 && (
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
            {new Date(data[Math.floor(data.length / 2)].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
          {data[data.length - 1] && new Date(data[data.length - 1].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ============================================
// IMPROVED BAR CHART - For clicks with daily bars
// ============================================
function BarChart({ data, dataKey, color = '#3b82f6', title, total, height = 160, formatValue = formatNumber }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  
  if (!data?.length) return null;
  
  const values = data.map(d => d[dataKey] || 0);
  const maxVal = Math.max(...values, 1);
  
  // Calculate nice scale
  const scaleTop = Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal || 1)))) * Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
  const scaleMid = Math.round(scaleTop / 2);
  
  const chartHeight = height - 40;
  const getBarHeight = (val) => ((val || 0) / (scaleTop || 1)) * chartHeight;

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{formatValue(total)}</span>
      </div>
      
      <div style={{ position: 'relative', height: `${height}px` }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 30, width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '8px' }}>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{formatNumber(scaleTop)}</span>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{formatNumber(scaleMid)}</span>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>0</span>
        </div>
        
        {/* Grid lines */}
        <div style={{ position: 'absolute', left: '55px', right: 0, top: 0, bottom: '30px', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderBottom: '1px solid #f3f4f6' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderBottom: '1px solid #f3f4f6' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderBottom: '1px solid #e5e7eb' }} />
        </div>
        
        {/* Chart area */}
        <div style={{ marginLeft: '55px', height: `${chartHeight}px`, display: 'flex', alignItems: 'flex-end', gap: data.length > 20 ? '1px' : '3px', position: 'relative' }}>
          {data.map((d, i) => {
            const barHeight = getBarHeight(d[dataKey]);
            const isHovered = hoveredBar === i;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  maxWidth: data.length > 15 ? '12px' : '24px',
                  height: `${barHeight}px`,
                  minHeight: d[dataKey] > 0 ? '3px' : '0',
                  background: isHovered 
                    ? `linear-gradient(180deg, ${color} 0%, ${color} 100%)`
                    : `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.15s ease, background 0.15s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  transform: isHovered ? 'scaleX(1.2)' : 'scaleX(1)',
                  zIndex: isHovered ? 1 : 0
                }}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
              />
            );
          })}
          
          {/* Tooltip */}
          {hoveredBar !== null && data[hoveredBar] && (
            <div style={{
              position: 'absolute',
              left: `${((hoveredBar + 0.5) / data.length) * 100}%`,
              bottom: `${getBarHeight(data[hoveredBar][dataKey]) + 10}px`,
              transform: 'translateX(-50%)',
              background: '#1f2937',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              zIndex: 10,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>
                {new Date(data[hoveredBar].stat_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ color: '#93c5fd' }}>{formatValue(data[hoveredBar][dataKey])}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* X-axis dates */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '55px', marginTop: '8px' }}>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
          {data[0] && new Date(data[0].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {data.length > 2 && (
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
            {new Date(data[Math.floor(data.length / 2)].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
          {data[data.length - 1] && new Date(data[data.length - 1].stat_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ============================================
// DUAL CHART ROW - Side by side area + bar
// ============================================
function DualChartRow({ data }) {
  if (!data?.length) return null;
  
  const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
  const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
      <AreaChart 
        data={data} 
        dataKey="impressions" 
        color="#0d9488" 
        title="Total Range Impressions" 
        total={totalImpressions} 
      />
      <BarChart 
        data={data} 
        dataKey="clicks" 
        color="#3b82f6" 
        title="Total Range Clicks" 
        total={totalClicks} 
      />
    </div>
  );
}

// ============================================
// STATS SUMMARY CARDS WITH MINI SPARKLINES
// ============================================
function StatCardWithSparkline({ label, value, data, dataKey, color = '#0d9488', showTrend = true }) {
  const values = data?.map(d => d[dataKey] || 0) || [];
  const max = Math.max(...values, 1);
  const height = 32;
  const width = 80;
  
  // Calculate trend (compare last 7 days to previous 7 days)
  let trend = null;
  if (showTrend && values.length >= 14) {
    const recent = values.slice(-7).reduce((a, b) => a + b, 0);
    const previous = values.slice(-14, -7).reduce((a, b) => a + b, 0);
    if (previous > 0) {
      trend = ((recent - previous) / previous * 100).toFixed(1);
    }
  }
  
  // Generate sparkline path
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - (v / max * height * 0.8) - 2;
    return `${x},${y}`;
  });
  const linePath = `M ${points.join(' L ')}`;
  
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
          {trend !== null && (
            <div style={{ 
              fontSize: '0.6875rem', 
              color: parseFloat(trend) >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 500,
              marginTop: '0.125rem'
            }}>
              {parseFloat(trend) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(trend))}% vs prev
            </div>
          )}
        </div>
        {values.length > 1 && (
          <svg width={width} height={height} style={{ flexShrink: 0 }}>
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          </svg>
        )}
      </div>
    </div>
  );
}

// Keep the old simple versions for backward compatibility
function DualPerformanceChart({ data, title1 = "Impressions", title2 = "Clicks" }) {
  return <DualChartRow data={data} />;
}

// ============================================
// DEVICE BREAKDOWN CHART
// ============================================
function DeviceBreakdownChart({ data }) {
  if (!data?.length) return null;
  
  const total = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const deviceIcons = {
    'desktop': Monitor,
    'mobile': Smartphone,
    'tablet': Tablet,
    'ctv': Tv,
    'connected tv': Tv,
    'other': Target
  };
  
  // Sort by impressions descending
  const sortedData = [...data].sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  
  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {/* Simple bar chart */}
        <div style={{ flex: 1 }}>
          {sortedData.map((item, i) => {
            const pct = total > 0 ? ((item.impressions || 0) / total * 100) : 0;
            const DeviceIcon = deviceIcons[item.device_type?.toLowerCase()] || deviceIcons['other'];
            return (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DeviceIcon size={16} color={colors[i % colors.length]} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.device_type || 'Unknown'}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sortedData.length, 4)}, 1fr)`, gap: '0.5rem' }}>
        {sortedData.slice(0, 4).map((item, i) => {
          const DeviceIcon = deviceIcons[item.device_type?.toLowerCase()] || deviceIcons['other'];
          return (
            <div key={i} style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
              <DeviceIcon size={20} color={colors[i % colors.length]} style={{ marginBottom: '0.25rem' }} />
              <div style={{ fontSize: '0.6875rem', color: '#6b7280', marginBottom: '0.125rem' }}>{item.device_type}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatNumber(item.impressions)}</div>
              <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{formatNumber(item.clicks)} clicks</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// EXPANDABLE LOCATION TABLE - Shows top 3 with View All
// ============================================
function ExpandableLocationTable({ locations, showSpend, formatNumber, formatCurrency }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedStates, setExpandedStates] = useState({});
  
  // Sort locations by impressions
  const sortedLocations = [...locations].sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  
  // Group locations by state/region
  const groupedByState = sortedLocations.reduce((acc, loc) => {
    const state = loc.region || loc.state || 'Other';
    if (!acc[state]) {
      acc[state] = {
        name: state,
        country: loc.country || 'US',
        locations: [],
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0
      };
    }
    acc[state].locations.push(loc);
    acc[state].totalImpressions += loc.impressions || 0;
    acc[state].totalClicks += loc.clicks || 0;
    acc[state].totalSpend += loc.spend || 0;
    return acc;
  }, {});
  
  // Convert to array and sort by impressions
  const stateGroups = Object.values(groupedByState)
    .map(group => ({
      ...group,
      ctr: group.totalImpressions > 0 ? (group.totalClicks / group.totalImpressions) * 100 : 0,
      locationCount: group.locations.length
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions);
  
  // Get top 5 individual locations for the summary view
  const top5Locations = sortedLocations.slice(0, 5);
  
  // Get max impressions for the visual bar
  const maxImpressions = top5Locations[0]?.impressions || 1;
  
  // Toggle state expansion
  const toggleState = (stateName) => {
    setExpandedStates(prev => ({
      ...prev,
      [stateName]: !prev[stateName]
    }));
  };
  
  // Calculate totals
  const totalImpressions = sortedLocations.reduce((sum, loc) => sum + (loc.impressions || 0), 0);
  const totalClicks = sortedLocations.reduce((sum, loc) => sum + (loc.clicks || 0), 0);
  const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  
  if (!expanded) {
    // Collapsed view: Show top 5 locations with visual bars
    return (
      <div>
        {/* Summary stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem', 
          marginBottom: '1.25rem',
          padding: '1rem',
          background: '#f0fdf4',
          borderRadius: '0.75rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', color: '#059669', textTransform: 'uppercase', fontWeight: 600 }}>Total Locations</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>{locations.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', color: '#059669', textTransform: 'uppercase', fontWeight: 600 }}>States/Regions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>{stateGroups.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', color: '#059669', textTransform: 'uppercase', fontWeight: 600 }}>Avg CTR</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>{overallCTR.toFixed(2)}%</div>
          </div>
        </div>
        
        {/* Top 5 locations with visual bars */}
        <div style={{ marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
          Top Performing Locations
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {top5Locations.map((loc, i) => {
            const barWidth = (loc.impressions / maxImpressions) * 100;
            const ctr = loc.impressions > 0 ? (loc.clicks / loc.impressions) * 100 : 0;
            return (
              <div key={i} style={{ position: 'relative', overflow: 'hidden', borderRadius: '0.5rem' }}>
                {/* Background bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${barWidth}%`,
                  background: 'linear-gradient(90deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '0.5rem',
                  zIndex: 0
                }} />
                {/* Content */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto', minWidth: '120px' }}>
                    <div style={{ 
                      width: '22px', 
                      height: '22px', 
                      borderRadius: '50%', 
                      background: '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{loc.city || loc.metro || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {loc.region && `${loc.region}`}{loc.country && loc.country !== 'US' && `, ${loc.country}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right', minWidth: '50px' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase' }}>Impressions</div>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#065f46', fontSize: '0.875rem' }}>{formatNumber(loc.impressions)}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '40px' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase' }}>Clicks</div>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#3b82f6', fontSize: '0.875rem' }}>{formatNumber(loc.clicks)}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '45px' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase' }}>CTR</div>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#7c3aed', fontSize: '0.875rem' }}>{ctr.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Expand button */}
        {locations.length > 5 && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#f0fdf4',
              border: '1px solid #a7f3d0',
              borderRadius: '0.5rem',
              color: '#065f46',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            View by State/Region ({stateGroups.length} regions, {locations.length} total locations)
            <ChevronDown size={18} />
          </button>
        )}
      </div>
    );
  }
  
  // Expanded view: Grouped by state with expandable cities
  // Limit to top 10 states for manageability
  const displayStates = stateGroups.slice(0, 10);
  const hiddenStatesCount = stateGroups.length - 10;
  const hiddenLocationsCount = stateGroups.slice(10).reduce((sum, s) => sum + s.locationCount, 0);
  
  return (
    <div>
      {/* Summary header */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        background: '#f0fdf4',
        borderRadius: '0.5rem'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
          <strong>{formatNumber(totalImpressions)}</strong> impressions across <strong>{locations.length}</strong> locations
        </div>
        <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
          Overall CTR: <strong>{overallCTR.toFixed(2)}%</strong>
        </div>
      </div>
      
      {/* State groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayStates.map((state, i) => {
          const isStateExpanded = expandedStates[state.name];
          const topCities = state.locations.slice(0, 5);
          
          return (
            <div key={state.name} style={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: '0.5rem',
              overflow: 'hidden'
            }}>
              {/* State header - clickable */}
              <button
                onClick={() => toggleState(state.name)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: isStateExpanded ? '#f0fdf4' : '#fafafa',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <MapPin size={18} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{state.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {state.locationCount} {state.locationCount === 1 ? 'city' : 'cities'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#065f46' }}>
                      {formatNumber(state.totalImpressions)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>impressions</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#7c3aed' }}>
                      {(parseFloat(state.ctr) || 0).toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>CTR</div>
                  </div>
                  {isStateExpanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
                </div>
              </button>
              
              {/* Expanded city list */}
              {isStateExpanded && (
                <div style={{ padding: '0.5rem 1rem 1rem', background: 'white' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>City</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Impressions</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Clicks</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>CTR</th>
                        {showSpend && <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Spend</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {topCities.map((loc, j) => {
                        const cityCtr = loc.impressions > 0 ? (loc.clicks / loc.impressions) * 100 : 0;
                        return (
                          <tr key={j} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>{loc.city || loc.metro || 'Unknown'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>{formatNumber(loc.impressions)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>{formatNumber(loc.clicks)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>{cityCtr.toFixed(2)}%</td>
                            {showSpend && <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.875rem' }}>{formatCurrency(loc.spend)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {state.locationCount > 5 && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.5rem', 
                      background: '#f9fafb', 
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      + {state.locationCount - 5} more cities in {state.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Hidden states notice */}
      {hiddenStatesCount > 0 && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem', 
          background: '#f9fafb', 
          borderRadius: '0.5rem',
          fontSize: '0.8125rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          + {hiddenStatesCount} more regions with {hiddenLocationsCount} locations
        </div>
      )}
      
      {/* Collapse button */}
      <button
        onClick={() => {
          setExpanded(false);
          setExpandedStates({});
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          width: '100%',
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#f0fdf4',
          border: '1px solid #a7f3d0',
          borderRadius: '0.5rem',
          color: '#065f46',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Show Less <ChevronUp size={18} />
      </button>
    </div>
  );
}

// ============================================
// EXPANDABLE KEYWORD PERFORMANCE - Combined keywords + performance with charts
// ============================================
function ExpandableKeywordPerformance({ keywords, keywordPerformance, showSpend, formatNumber, formatCurrency, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  
  // Use performance data if available, otherwise fall back to just keyword list
  const hasPerformanceData = keywordPerformance && keywordPerformance.length > 0;
  const displayData = hasPerformanceData ? keywordPerformance : keywords;
  
  if (!displayData || displayData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <Target size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
        <p>No keyword data available</p>
      </div>
    );
  }
  
  // Calculate totals for performance data
  const totalImpressions = hasPerformanceData ? keywordPerformance.reduce((sum, kw) => sum + (kw.impressions || 0), 0) : 0;
  const totalClicks = hasPerformanceData ? keywordPerformance.reduce((sum, kw) => sum + (kw.clicks || 0), 0) : 0;
  const totalSpend = hasPerformanceData ? keywordPerformance.reduce((sum, kw) => sum + (kw.spend || 0), 0) : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
  
  // Get top keywords by impressions for chart
  const topKeywords = hasPerformanceData 
    ? [...keywordPerformance].sort((a, b) => b.impressions - a.impressions).slice(0, 8)
    : [];
  
  // Calculate max impressions for bar scaling
  const maxImpressions = topKeywords.length > 0 ? Math.max(...topKeywords.map(k => k.impressions)) : 1;
  
  // Colors for the bars
  const barColors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#faf5ff', '#fdf4ff'];
  
  return (
    <div>
      {/* Summary Stats */}
      {hasPerformanceData && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: showSpend && isAdmin ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '0.75rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Total Impressions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5b21b6' }}>{formatNumber(totalImpressions)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Total Clicks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5b21b6' }}>{formatNumber(totalClicks)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Avg CTR</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5b21b6' }}>{avgCTR.toFixed(2)}%</div>
          </div>
          {showSpend && isAdmin && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Total Spend</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5b21b6' }}>{formatCurrency(totalSpend)}</div>
            </div>
          )}
        </div>
      )}
      
      {/* View Toggle */}
      {hasPerformanceData && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            background: '#f3f4f6', 
            borderRadius: '0.5rem', 
            padding: '0.25rem'
          }}>
            <button
              onClick={() => setViewMode('chart')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: viewMode === 'chart' ? 'white' : 'transparent',
                boxShadow: viewMode === 'chart' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                color: viewMode === 'chart' ? '#5b21b6' : '#6b7280',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              <BarChart3 size={16} /> Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: viewMode === 'table' ? 'white' : 'transparent',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                color: viewMode === 'table' ? '#5b21b6' : '#6b7280',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              <List size={16} /> Table
            </button>
          </div>
        </div>
      )}
      
      {/* Chart View */}
      {hasPerformanceData && viewMode === 'chart' && (
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
            Top Keywords by Impressions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topKeywords.map((kw, i) => {
              const barWidth = (kw.impressions / maxImpressions) * 100;
              const impressionShare = totalImpressions > 0 ? (kw.impressions / totalImpressions * 100) : 0;
              
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <Target size={14} color={barColors[i] || '#8b5cf6'} />
                      <span style={{ 
                        fontWeight: 500, 
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {kw.keyword}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {formatNumber(kw.impressions)} impr
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>
                        {kw.clicks} clicks
                      </span>
                      <span style={{ 
                        fontSize: '0.6875rem', 
                        color: '#8b5cf6',
                        background: '#f5f3ff',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontWeight: 600
                      }}>
                        {impressionShare.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    height: '8px', 
                    background: '#f3f4f6', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${barWidth}%`, 
                      height: '100%', 
                      background: `linear-gradient(90deg, ${barColors[i] || '#8b5cf6'} 0%, ${barColors[Math.min(i+1, 7)]} 100%)`,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          
          {keywordPerformance.length > 8 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: '#f9fafb', 
              borderRadius: '0.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              +{keywordPerformance.length - 8} more keywords • Switch to table view to see all
            </div>
          )}
        </div>
      )}
      
      {/* Table View */}
      {hasPerformanceData && viewMode === 'table' && (
        <div style={{ maxHeight: expanded ? 'none' : '400px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Keyword</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>CTR</th>
                {showSpend && isAdmin && <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>}
              </tr>
            </thead>
            <tbody>
              {keywordPerformance.map((kw, i) => {
                const impressionShare = totalImpressions > 0 ? (kw.impressions / totalImpressions * 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: barColors[Math.min(i, 7)]
                        }} />
                        <span style={{ fontWeight: 500 }}>{kw.keyword}</span>
                        <span style={{ 
                          fontSize: '0.6875rem', 
                          color: '#8b5cf6',
                          background: '#f5f3ff',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '9999px'
                        }}>
                          {impressionShare.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(kw.impressions)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(kw.clicks)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{kw.ctr?.toFixed(2) || '0.00'}%</td>
                    {showSpend && isAdmin && <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(kw.spend)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Fallback: Just show keyword list if no performance data */}
      {!hasPerformanceData && keywords.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
            Campaign Keywords ({keywords.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(expanded ? keywords : keywords.slice(0, 12)).map((kw, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  background: '#f5f3ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  color: '#5b21b6'
                }}
              >
                <Target size={12} color="#8b5cf6" />
                <span style={{ fontWeight: 500 }}>{kw.keyword}</span>
              </div>
            ))}
          </div>
          
          {keywords.length > 12 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#f5f3ff',
                border: '1px solid #c4b5fd',
                borderRadius: '0.5rem',
                color: '#5b21b6',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {expanded ? (
                <>Show Less <ChevronUp size={18} /></>
              ) : (
                <>View All {keywords.length} Keywords <ChevronDown size={18} /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPANDABLE GEO-FENCE LIST - Shows top 4 with View All
// ============================================
function ExpandableGeoFenceList({ fences, formatNumber, isMobile, hasStats, campaignStats }) {
  const [expanded, setExpanded] = useState(false);
  
  // Calculate totals for summary
  const totalImpressions = fences.reduce((sum, f) => sum + (f.impressions || 0), 0);
  const totalClicks = fences.reduce((sum, f) => sum + (f.clicks || 0), 0);
  const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  
  // Check if we have per-location stats or just location names
  const hasPerLocationStats = fences.some(f => (f.impressions || 0) > 0 || (f.clicks || 0) > 0);
  
  // Sort by impressions (or alphabetically if no stats)
  const sortedFences = [...fences].sort((a, b) => {
    if (hasPerLocationStats) {
      return (b.impressions || 0) - (a.impressions || 0);
    }
    return (a.name || '').localeCompare(b.name || '');
  });
  const maxImpressions = sortedFences[0]?.impressions || 1;
  
  const displayFences = expanded ? sortedFences : sortedFences.slice(0, 6);
  const hasMore = fences.length > 6;
  
  // Colors for the bars
  const barColors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];
  
  return (
    <div>
      {/* Summary Stats Cards - Always show for geo-fence targeting */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
        gap: isMobile ? '0.5rem' : '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', 
          padding: isMobile ? '0.75rem' : '1rem', 
          borderRadius: '0.75rem',
          border: '1px solid #99f6e4'
        }}>
          <div style={{ fontSize: '0.6875rem', color: '#0f766e', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
            Target Locations
          </div>
          <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, color: '#0d9488' }}>
            {fences.length}
          </div>
        </div>
        
        {hasPerLocationStats ? (
          <>
            <div style={{ 
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', 
              padding: isMobile ? '0.75rem' : '1rem', 
              borderRadius: '0.75rem',
              border: '1px solid #99f6e4'
            }}>
              <div style={{ fontSize: '0.6875rem', color: '#0f766e', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                Total Impressions
              </div>
              <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, color: '#0d9488' }}>
                {formatNumber(totalImpressions)}
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
              padding: isMobile ? '0.75rem' : '1rem', 
              borderRadius: '0.75rem',
              border: '1px solid #93c5fd'
            }}>
              <div style={{ fontSize: '0.6875rem', color: '#1d4ed8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                Total Clicks
              </div>
              <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, color: '#3b82f6' }}>
                {formatNumber(totalClicks)}
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', 
              padding: isMobile ? '0.75rem' : '1rem', 
              borderRadius: '0.75rem',
              border: '1px solid #d8b4fe'
            }}>
              <div style={{ fontSize: '0.6875rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                Avg CTR
              </div>
              <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, color: '#8b5cf6' }}>
                {overallCTR.toFixed(2)}%
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Show campaign-level stats context when per-location isn't available */}
            <div style={{ 
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', 
              padding: isMobile ? '0.75rem' : '1rem', 
              borderRadius: '0.75rem',
              border: '1px solid #fde047',
              gridColumn: isMobile ? 'span 1' : 'span 3'
            }}>
              <div style={{ fontSize: '0.6875rem', color: '#a16207', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                How It Works
              </div>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.8125rem', color: '#854d0e', lineHeight: 1.4 }}>
                {isMobile ? (
                  'Visitors to these locations become your target audience for ads.'
                ) : (
                  'People who visit these locations have their devices captured and become part of your target audience. Campaign impressions are shown in the Performance section above.'
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Horizontal Bar Chart - Only show if we have per-location stats */}
      {hasPerLocationStats && sortedFences.length > 0 && (
        <div style={{ 
          background: '#f9fafb', 
          borderRadius: '0.75rem', 
          padding: isMobile ? '1rem' : '1.25rem',
          marginBottom: '1.25rem',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            color: '#6b7280', 
            textTransform: 'uppercase',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BarChart3 size={14} />
            Impressions by Location
          </div>
          
          {sortedFences.slice(0, 5).map((fence, i) => {
            const pct = maxImpressions > 0 ? ((fence.impressions || 0) / maxImpressions) * 100 : 0;
            return (
              <div key={fence.id || i} style={{ marginBottom: i < 4 ? '0.75rem' : 0 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.375rem'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    flex: 1,
                    minWidth: 0
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: barColors[i % barColors.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ 
                      fontSize: isMobile ? '0.8125rem' : '0.875rem', 
                      fontWeight: 500,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {fence.name || 'Unnamed Location'}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '0.75rem' : '1.5rem',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ 
                      fontSize: isMobile ? '0.75rem' : '0.8125rem', 
                      fontWeight: 600, 
                      color: '#0d9488',
                      fontFamily: 'monospace',
                      minWidth: isMobile ? '50px' : '70px',
                      textAlign: 'right'
                    }}>
                      {formatNumber(fence.impressions || 0)}
                    </span>
                    {!isMobile && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280',
                        minWidth: '50px',
                        textAlign: 'right'
                      }}>
                        {formatNumber(fence.clicks || 0)} clicks
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  height: '8px', 
                  background: '#e5e7eb', 
                  borderRadius: '4px', 
                  overflow: 'hidden',
                  marginLeft: isMobile ? 0 : '28px'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${pct}%`, 
                    background: `linear-gradient(90deg, ${barColors[i % barColors.length]} 0%, ${barColors[(i + 1) % barColors.length]} 100%)`,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Location Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
        gap: isMobile ? '0.75rem' : '1rem' 
      }}>
        {displayFences.map((fence, i) => (
          <div key={fence.id || i} style={{ 
            padding: isMobile ? '0.875rem' : '1rem', 
            background: 'white', 
            borderRadius: '0.75rem', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <MapPin size={18} color="#0d9488" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: isMobile ? '0.875rem' : '0.9375rem', 
                  color: '#111827', 
                  marginBottom: '0.125rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {fence.name || 'Unnamed Location'}
                </div>
                {fence.address && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {fence.address}
                  </div>
                )}
                
                {/* Stats row - only show if we have per-location stats */}
                {hasPerLocationStats && (
                  <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '1rem' : '1.5rem', 
                    marginTop: '0.625rem',
                    paddingTop: '0.625rem',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Impressions</div>
                      <div style={{ fontSize: isMobile ? '0.9375rem' : '1rem', fontWeight: 700, color: '#0d9488' }}>
                        {formatNumber(fence.impressions || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Clicks</div>
                      <div style={{ fontSize: isMobile ? '0.9375rem' : '1rem', fontWeight: 700, color: '#3b82f6' }}>
                        {formatNumber(fence.clicks || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>CTR</div>
                      <div style={{ fontSize: isMobile ? '0.9375rem' : '1rem', fontWeight: 700, color: '#6b7280' }}>
                        {((fence.ctr || 0) * (fence.ctr > 1 ? 1 : 100)).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show a subtle indicator for target fences without stats */}
                {!hasPerLocationStats && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}>
                    <Target size={12} color="#10b981" />
                    <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>Target Zone Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* View More Button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
            border: '1px solid #99f6e4',
            borderRadius: '0.75rem',
            color: '#0f766e',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {expanded ? (
            <>Show Less <ChevronUp size={18} /></>
          ) : (
            <>View All {fences.length} Locations <ChevronDown size={18} /></>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================
// GEO/LOCATION BREAKDOWN
// ============================================
function GeoBreakdownChart({ data }) {
  if (!data?.length) return null;
  
  const total = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
  const sortedData = [...data].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 10);
  const maxImpressions = sortedData[0]?.impressions || 1;
  
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>LOCATION</th>
            <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>IMPRESSIONS</th>
            <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>CLICKS</th>
            <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>CTR</th>
            <th style={{ padding: '0.5rem', width: '120px' }}></th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, i) => {
            const pct = (item.impressions || 0) / maxImpressions * 100;
            return (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} color="#6b7280" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.geo_name || item.dma_name || item.metro || 'Unknown'}</span>
                  </div>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatNumber(item.impressions)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatNumber(item.clicks)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatPercent(item.ctr)}</td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// KEYWORDS TABLE
// ============================================
function KeywordsTable({ keywords }) {
  if (!keywords?.length) return null;
  
  return (
    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>KEYWORD</th>
            <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>MATCH TYPE</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((kw, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.5rem', fontSize: '0.8125rem' }}>{kw.name || kw.keyword || kw}</td>
              <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                <span style={{ padding: '0.125rem 0.5rem', background: '#f3f4f6', borderRadius: '0.25rem', fontSize: '0.6875rem' }}>
                  {kw.match_type || 'Broad'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// INTERNAL NOTES COMPONENT (Staff Only)
// ============================================
function InternalNotesSection({ clientId, showFullHistory = true, isCollapsible = false }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!isCollapsible);
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadNotes();
  }, [clientId]);

  const loadNotes = async () => {
    try {
      // All notes are client-level - same notes appear on client page and all campaign pages
      const url = `/api/clients/${clientId}/notes`;
      const data = await api.get(url);
      setNotes(data || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      await api.post(`/api/clients/${clientId}/notes`, {
        note: newNote,
        noteType: noteType
      });
      setNewNote('');
      setNoteType('general');
      loadNotes();
    } catch (err) {
      alert('Failed to add note');
    }
    setLoading(false);
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.delete(`/api/notes/${noteId}`);
      loadNotes();
    } catch (err) {
      alert('Failed to delete note');
    }
  };

  const handleTogglePin = async (noteId) => {
    try {
      await api.post(`/api/notes/${noteId}/toggle-pin`);
      loadNotes();
    } catch (err) {
      alert('Failed to toggle pin');
    }
  };

  const noteTypeColors = {
    general: { bg: '#f3f4f6', color: '#374151', icon: MessageSquare },
    strategy: { bg: '#dbeafe', color: '#1d4ed8', icon: Target },
    issue: { bg: '#fef3c7', color: '#92400e', icon: AlertCircle },
    milestone: { bg: '#d1fae5', color: '#065f46', icon: CheckCircle },
    billing: { bg: '#fce7f3', color: '#9d174d', icon: DollarSign }
  };

  // Sort notes: pinned first, then by date descending
  const sortedNotes = [...notes].sort((a, b) => {
    const aPinned = a.is_pinned === 1 || a.is_pinned === true;
    const bPinned = b.is_pinned === 1 || b.is_pinned === true;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const displayNotes = showAll ? sortedNotes : sortedNotes.slice(0, 3);
  const hasMoreNotes = sortedNotes.length > 3;

  // Collapsible header for when used as standalone component
  if (isCollapsible) {
    return (
      <div style={{ 
        background: '#fffbeb', 
        borderRadius: '0.75rem', 
        border: '1px solid #fde68a',
        marginBottom: '1.5rem',
        overflow: 'hidden'
      }}>
        {/* Collapsible Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} color="#ca8a04" />
            <span style={{ fontWeight: 600, color: '#92400e' }}>Client Notes (Internal Only)</span>
            {notes.length > 0 && (
              <span style={{ 
                background: '#fbbf24', 
                color: '#78350f', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 600 
              }}>
                {notes.length}
              </span>
            )}
          </div>
          {expanded ? <ChevronUp size={18} color="#92400e" /> : <ChevronDown size={18} color="#92400e" />}
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {/* Add New Note */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <select 
                value={noteType} 
                onChange={(e) => setNoteType(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #fde68a', borderRadius: '0.375rem', fontSize: '0.8125rem', background: 'white' }}
              >
                <option value="general">General</option>
                <option value="strategy">Strategy</option>
                <option value="issue">Issue</option>
                <option value="milestone">Milestone</option>
                <option value="billing">Billing</option>
              </select>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #fde68a', borderRadius: '0.375rem', fontSize: '0.8125rem', background: 'white' }}
              />
              <button
                onClick={handleAddNote}
                disabled={loading || !newNote.trim()}
                style={{ padding: '0.5rem 1rem', background: '#ca8a04', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                Add
              </button>
            </div>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {displayNotes.length === 0 ? (
                <p style={{ color: '#92400e', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem', opacity: 0.7 }}>
                  No notes yet. Add your first note above.
                </p>
              ) : (
                displayNotes.map(note => {
                  const typeStyle = noteTypeColors[note.note_type] || noteTypeColors.general;
                  const TypeIcon = typeStyle.icon;
                  const isPinned = note.is_pinned === 1 || note.is_pinned === true;
                  return (
                    <div 
                      key={note.id} 
                      style={{ 
                        padding: '0.75rem', 
                        background: 'white', 
                        borderRadius: '0.5rem', 
                        border: isPinned ? '2px solid #ca8a04' : '1px solid #fde68a',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          padding: '0.25rem 0.5rem', 
                          background: typeStyle.bg, 
                          color: typeStyle.color, 
                          borderRadius: '0.25rem', 
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          gap: '0.25rem'
                        }}>
                          <TypeIcon size={10} />
                          {note.note_type}
                        </span>
                        {isPinned && <Pin size={12} color="#ca8a04" />}
                        <span style={{ fontSize: '0.6875rem', color: '#6b7280', marginLeft: 'auto' }}>
                          {note.user_name} • {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#374151' }}>{note.note}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button 
                          onClick={() => handleTogglePin(note.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: isPinned ? '#ca8a04' : '#6b7280' }}
                          title={isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#ef4444' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* View All Button */}
            {hasMoreNotes && (
              <button 
                onClick={() => setShowAll(!showAll)}
                style={{ 
                  marginTop: '0.75rem', 
                  width: '100%',
                  padding: '0.5rem',
                  background: 'white', 
                  border: '1px solid #fde68a', 
                  borderRadius: '0.375rem',
                  color: '#92400e', 
                  cursor: 'pointer', 
                  fontSize: '0.8125rem', 
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {showAll ? (
                  <>Show Less <ChevronUp size={16} /></>
                ) : (
                  <>View All {notes.length} Notes <ChevronDown size={16} /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Original non-collapsible version
  return (
    <div>
      {/* Add New Note */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <select 
          value={noteType} 
          onChange={(e) => setNoteType(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', fontSize: '0.8125rem', background: 'white' }}
        >
          <option value="general">General</option>
          <option value="strategy">Strategy</option>
          <option value="issue">Issue</option>
          <option value="milestone">Milestone</option>
          <option value="billing">Billing</option>
        </select>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', fontSize: '0.8125rem' }}
        />
        <button
          onClick={handleAddNote}
          disabled={loading || !newNote.trim()}
          style={{ padding: '0.5rem 1rem', background: '#ca8a04', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
        >
          Add
        </button>
      </div>

      {/* Notes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayNotes.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>
            No notes yet. Add your first note above.
          </p>
        ) : (
          displayNotes.map(note => {
            const typeStyle = noteTypeColors[note.note_type] || noteTypeColors.general;
            const TypeIcon = typeStyle.icon;
            const isPinned = note.is_pinned === 1 || note.is_pinned === true;
            return (
              <div 
                key={note.id} 
                style={{ 
                  padding: '0.75rem', 
                  background: '#fefce8', 
                  borderRadius: '0.5rem', 
                  border: isPinned ? '2px solid #ca8a04' : '1px solid #fef08a',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '0.25rem 0.5rem', 
                    background: typeStyle.bg, 
                    color: typeStyle.color, 
                    borderRadius: '0.25rem', 
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    gap: '0.25rem'
                  }}>
                    <TypeIcon size={10} />
                    {note.note_type}
                  </span>
                  {isPinned && <Pin size={12} color="#ca8a04" />}
                  <span style={{ fontSize: '0.6875rem', color: '#6b7280', marginLeft: 'auto' }}>
                    {note.user_name} • {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#374151' }}>{note.note}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => handleTogglePin(note.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: isPinned ? '#ca8a04' : '#6b7280' }}
                    title={isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#ef4444' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {hasMoreNotes && !showAll && (
        <button 
          onClick={() => setShowAll(true)}
          style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: '#ca8a04', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
        >
          View All ({notes.length} notes)
        </button>
      )}
    </div>
  );
}

// ============================================
// CAMPAIGN HISTORY SECTION (12 Month)
// ============================================
function CampaignHistorySection({ data, showSpendData = true }) {
  if (!data) return null;
  
  const { monthlyBreakdown, allTimeHighs, growth, totalImpressions, totalClicks, totalSpend } = data;
  
  const maxImpressions = Math.max(...(monthlyBreakdown || []).map(m => m.impressions), 1);
  
  return (
    <div>
      {/* Highlights Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* All-Time High */}
        <div style={{ 
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
          borderRadius: '0.75rem', 
          padding: '1.25rem', 
          color: 'white',
          textAlign: 'center'
        }}>
          <Award size={28} style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.25rem' }}>All-Time High Impressions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(allTimeHighs?.impressions)}</div>
          <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>{allTimeHighs?.bestMonth?.month}</div>
        </div>
        
        {/* 12-Month Total */}
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)', 
          borderRadius: '0.75rem', 
          padding: '1.25rem', 
          color: 'white',
          textAlign: 'center'
        }}>
          <BarChart3 size={28} style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.25rem' }}>12-Month Impressions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatNumber(totalImpressions)}</div>
          <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>{formatNumber(totalClicks)} clicks</div>
        </div>
        
        {/* Growth */}
        <div style={{ 
          background: growth?.impressions >= 0 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
          borderRadius: '0.75rem', 
          padding: '1.25rem', 
          color: 'white',
          textAlign: 'center'
        }}>
          {growth?.impressions >= 0 ? <TrendingUp size={28} style={{ marginBottom: '0.5rem' }} /> : <TrendingDown size={28} style={{ marginBottom: '0.5rem' }} />}
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.25rem' }}>Impression Growth</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {growth?.impressions >= 0 ? '+' : ''}{(growth?.impressions || 0).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>vs previous month</div>
        </div>
        
        {/* Best Performer */}
        <div style={{ 
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
          borderRadius: '0.75rem', 
          padding: '1.25rem', 
          color: 'white',
          textAlign: 'center'
        }}>
          <Star size={28} style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.25rem' }}>Best Month</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{allTimeHighs?.bestMonth?.month}</div>
          <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>{formatNumber(allTimeHighs?.bestMonth?.clicks)} clicks</div>
        </div>
      </div>
      
      {/* Monthly Trend Chart */}
      <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '1.25rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>Monthly Impressions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(monthlyBreakdown || []).map((month, idx) => {
            const pct = maxImpressions > 0 ? (month.impressions / maxImpressions * 100) : 0;
            const isLatest = idx === monthlyBreakdown.length - 1;
            return (
              <div key={month.month} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '60px', fontSize: '0.75rem', color: '#6b7280', fontWeight: isLatest ? 600 : 400 }}>{month.month}</div>
                <div style={{ flex: 1, height: '24px', background: '#e5e7eb', borderRadius: '0.25rem', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    background: isLatest 
                      ? 'linear-gradient(90deg, #3b82f6 0%, #1e3a8a 100%)'
                      : 'linear-gradient(90deg, #93c5fd 0%, #60a5fa 100%)',
                    borderRadius: '0.25rem',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ width: '80px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: isLatest ? '#1e3a8a' : '#6b7280' }}>
                  {formatNumber(month.impressions)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Yearly Summary */}
      {showSpendData && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#166534' }}>12-Month Total Investment</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>{formatCurrency(totalSpend)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// VCR (Video Completion Rate) CARD - For OTT/CTV
// ============================================
function VCRCard({ vcr, impressions, showLabel = true }) {
  // Normalize VCR - API might return as percentage (85) or decimal (0.85)
  let normalizedVcr = vcr;
  if (vcr > 1) {
    // Already a percentage, convert to decimal
    normalizedVcr = vcr / 100;
  }
  
  const percentage = normalizedVcr ? (normalizedVcr * 100).toFixed(1) : 0;
  const isGood = normalizedVcr >= 0.8; // 80%+ is considered good
  const color = isGood ? '#10b981' : normalizedVcr >= 0.6 ? '#f59e0b' : '#ef4444';
  
  return (
    <div style={{ 
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      borderRadius: '0.75rem', 
      padding: '1.25rem', 
      border: `1px solid ${color}30`,
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Video size={20} color={color} />
        {showLabel && <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6b7280' }}>Video Completion Rate</span>}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: color, marginBottom: '0.25rem' }}>
        {percentage}%
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
        of {formatNumber(impressions)} impressions completed
      </div>
      {isGood && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.375rem 0.75rem', 
          background: '#d1fae5', 
          borderRadius: '9999px', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.25rem',
          fontSize: '0.75rem',
          color: '#065f46',
          fontWeight: 500
        }}>
          <CheckCircle size={12} />
          Excellent Performance
        </div>
      )}
    </div>
  );
}

// ============================================
// PIXEL VERIFICATION SECTION
// ============================================
function PixelSection({ orgId, clientName }) {
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPixels();
  }, [orgId]);

  const loadPixels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/simplifi/organizations/${orgId}/pixels`);
      console.log('Pixel data received:', data);
      // Handle various response structures - the API returns first_party_segments
      const segments = data.first_party_segments || data.retargeting_segments || data.segments || data || [];
      setPixels(Array.isArray(segments) ? segments : []);
    } catch (err) {
      console.error('Failed to load pixels:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  const copyPixelCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading pixel data...</div>;
  }
  
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <Radio size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
        <p style={{ margin: 0 }}>Unable to load retargeting pixels</p>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  // Handle both old (segment_size/status) and new (user_count/active) field names
  const hasActivePixel = pixels.some(p => 
    p.status === 'Active' || 
    p.active === true || 
    (p.segment_size || 0) > 0 || 
    (p.user_count || 0) > 0
  );

  // Calculate total audience size from either field
  const totalAudienceSize = pixels.reduce((sum, p) => sum + (p.segment_size || p.user_count || 0), 0);

  return (
    <div>
      {/* Retargeting Value Banner */}
      <div style={{ 
        background: hasActivePixel 
          ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
          : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        borderRadius: '0.75rem', 
        padding: '1.5rem', 
        marginBottom: '1rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-30px', right: '60px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {hasActivePixel ? <Radio size={28} /> : <Code size={28} />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {hasActivePixel ? 'Retargeting Pixel Active' : 'Retargeting Pixel Setup Required'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
              {hasActivePixel 
                ? 'Your pixel is collecting visitor data for retargeting campaigns'
                : 'Place the pixel on your website to enable powerful retargeting'
              }
            </p>
          </div>
          {hasActivePixel && (
            <div style={{ 
              padding: '0.5rem 1rem', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatNumber(totalAudienceSize)}
              </div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>Audience Size</div>
              <div style={{ fontSize: '0.5625rem', opacity: 0.6, marginTop: '0.125rem' }}>Rolling 30-day window</div>
            </div>
          )}
        </div>
      </div>

      {/* Pixel List */}
      {pixels.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pixels.map(pixel => {
            const isActive = pixel.status === 'Active' || pixel.active === true;
            const audienceSize = pixel.segment_size || pixel.user_count || 0;
            const daysInactive = pixel.days_inactive;
            
            return (
              <div key={pixel.id} style={{ 
                padding: '1rem', 
                background: '#f9fafb', 
                borderRadius: '0.5rem', 
                border: '1px solid #e5e7eb' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{pixel.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Audience: {formatNumber(audienceSize)} users
                      {daysInactive !== undefined && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          • {daysInactive > 0 ? `${daysInactive} days inactive` : 'Active'}
                        </span>
                      )}
                    </div>
                    {pixel.last_activity && pixel.last_activity !== 'Not yet seen' && (
                      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        Last activity: {pixel.last_activity}
                      </div>
                    )}
                  </div>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    background: isActive ? '#d1fae5' : '#fef3c7',
                    color: isActive ? '#065f46' : '#92400e',
                    borderRadius: '0.25rem',
                    fontSize: '0.6875rem',
                    fontWeight: 500
                  }}>
                    {isActive ? 'Active' : (pixel.status || 'Pending')}
                  </span>
                </div>
                
                {/* Show pixel code if available, or offer to fetch it */}
                {pixel.pixel_code ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280' }}>Pixel Code:</span>
                      <button
                        onClick={() => copyPixelCode(pixel.pixel_code, pixel.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          padding: '0.25rem 0.5rem', 
                          background: '#3b82f6', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '0.25rem', 
                          fontSize: '0.6875rem', 
                          cursor: 'pointer' 
                        }}
                      >
                        {copiedId === pixel.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === pixel.id ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre style={{ 
                      padding: '0.75rem', 
                      background: '#1f2937', 
                      color: '#d1d5db', 
                      borderRadius: '0.375rem', 
                      fontSize: '0.6875rem', 
                      overflow: 'auto',
                      maxHeight: '100px',
                      margin: 0
                    }}>
                      {pixel.pixel_code}
                    </pre>
                  </div>
                ) : pixel.resources && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    {pixel.has_rules && <span style={{ marginRight: '1rem' }}>✓ Has rules</span>}
                    {pixel.has_custom_values && <span>✓ Has custom values</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <Code size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ margin: '0 0 0.5rem', fontWeight: 500 }}>No retargeting pixels configured</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9ca3af' }}>
            First-party segments (retargeting pixels) can be set up in the Simpli.fi platform
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================
function Modal({ children, title, onClose, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: wide ? '600px' : '480px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {title && <h2 style={{ marginBottom: '1.5rem' }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
    </div>
  );
}

// ============================================
// EDIT CLIENT FORM
// ============================================
function EditClientForm({ client, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    logoPath: client?.logo_path || '',
    primaryColor: client?.primary_color || '#1e3a8a',
    secondaryColor: client?.secondary_color || '#3b82f6',
    monthlyBudget: client?.monthly_budget || '',
    campaignGoal: client?.campaign_goal || '',
    contactName: client?.contact_name || '',
    contactEmail: client?.contact_email || '',
    startDate: client?.start_date || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name: formData.name,
      logoPath: formData.logoPath || null,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : null,
      campaignGoal: formData.campaignGoal || null,
      contactName: formData.contactName || null,
      contactEmail: formData.contactEmail || null,
      startDate: formData.startDate || null
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Edit Client Settings</h2>
      
      {/* Basic Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Basic Information</h4>
        <FormField label="Client Name" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
        <FormField label="Logo URL" value={formData.logoPath} onChange={(v) => setFormData({...formData, logoPath: v})} placeholder="https://example.com/logo.png" />
      </div>
      
      {/* Colors */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Brand Colors</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Primary Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="color" 
                value={formData.primaryColor} 
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                style={{ width: '48px', height: '36px', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                value={formData.primaryColor} 
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Secondary Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="color" 
                value={formData.secondaryColor} 
                onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                style={{ width: '48px', height: '36px', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              />
              <input 
                type="text" 
                value={formData.secondaryColor} 
                onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
            </div>
          </div>
        </div>
        {/* Preview */}
        <div style={{ 
          marginTop: '0.75rem', 
          height: '40px', 
          borderRadius: '0.375rem', 
          background: `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)` 
        }} />
      </div>
      
      {/* Campaign Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Campaign Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Monthly Budget</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
              <input 
                type="number" 
                value={formData.monthlyBudget} 
                onChange={(e) => setFormData({...formData, monthlyBudget: e.target.value})}
                placeholder="5000"
                style={{ width: '100%', padding: '0.625rem', paddingLeft: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Campaign Start Date</label>
            <input 
              type="date" 
              value={formData.startDate} 
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            />
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Campaign Goal / Objective</label>
          <input 
            type="text" 
            value={formData.campaignGoal} 
            onChange={(e) => setFormData({...formData, campaignGoal: e.target.value})}
            placeholder="e.g., Brand Awareness, Lead Generation, Website Traffic"
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
          />
        </div>
      </div>
      
      {/* Contact Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Account Contact</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Contact Name" value={formData.contactName} onChange={(v) => setFormData({...formData, contactName: v})} placeholder="John Smith" />
          <FormField label="Contact Email" value={formData.contactEmail} onChange={(v) => setFormData({...formData, contactEmail: v})} placeholder="john@example.com" type="email" />
        </div>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
        <button 
          type="button" 
          onClick={onCancel}
          style={{ padding: '0.625rem 1.25rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Cancel
        </button>
        <button 
          type="submit"
          disabled={saving}
          style={{ padding: '0.625rem 1.25rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ============================================
// OTHER PAGES
// ============================================
function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'sales' });
  
  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userClients, setUserClients] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  useEffect(() => { 
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, clientsData] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/clients')
      ]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users', newUser);
      setShowModal(false);
      setNewUser({ email: '', password: '', name: '', role: 'sales' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const openAssignModal = async (u) => {
    setSelectedUser(u);
    setShowAssignModal(true);
    setAssignmentsLoading(true);
    try {
      const assignedClients = await api.get(`/api/users/${u.id}/clients`);
      setUserClients(assignedClients.map(c => c.id));
    } catch (err) {
      console.error(err);
      setUserClients([]);
    }
    setAssignmentsLoading(false);
  };

  const toggleClientAssignment = async (clientId) => {
    const isAssigned = userClients.includes(clientId);
    try {
      if (isAssigned) {
        await api.delete(`/api/clients/${clientId}/assignments/${selectedUser.id}`);
        setUserClients(userClients.filter(id => id !== clientId));
      } else {
        await api.post(`/api/clients/${clientId}/assignments`, { userId: selectedUser.id });
        setUserClients([...userClients, clientId]);
      }
    } catch (err) {
      alert('Failed to update assignment: ' + err.message);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  // Only admins can see this page
  if (user?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#6b7280' }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div><h1>Users</h1><p style={{ color: '#6b7280' }}>Manage team members and client assignments</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: '0.625rem 1.25rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Add User</button>
      </div>
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{u.email}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: u.role === 'admin' ? '#dcfce7' : '#fef3c7', color: u.role === 'admin' ? '#166534' : '#92400e' }}>
                    {u.role === 'admin' ? 'Admin' : 'Sales'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  {u.role === 'sales' && (
                    <button 
                      onClick={() => openAssignModal(u)}
                      style={{ padding: '0.375rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Assign Clients
                    </button>
                  )}
                  {u.role === 'admin' && (
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Full Access</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <Modal title="Add New User" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <FormField label="Name" value={newUser.name} onChange={(v) => setNewUser({ ...newUser, name: v })} required />
            <FormField label="Email" value={newUser.email} onChange={(v) => setNewUser({ ...newUser, email: v })} type="email" required />
            <FormField label="Password" value={newUser.password} onChange={(v) => setNewUser({ ...newUser, password: v })} type="password" required />
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Role</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                <option value="sales">Sales (View Assigned Clients Only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.625rem 1.25rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Create</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Clients Modal */}
      {showAssignModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Assign Clients to {selectedUser.name}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select which clients this sales rep can view and access.
            </p>
            
            {assignmentsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                {clients.length === 0 ? (
                  <p style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>No clients available. Sync clients from Simpli.fi first.</p>
                ) : (
                  clients.map(client => (
                    <label 
                      key={client.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: userClients.includes(client.id) ? '#eff6ff' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={userClients.includes(client.id)}
                        onChange={() => toggleClientAssignment(client.id)}
                        style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 500 }}>{client.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {userClients.length} client{userClients.length !== 1 ? 's' : ''} assigned
              </span>
              <button 
                onClick={() => setShowAssignModal(false)} 
                style={{ padding: '0.625rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PUBLIC REPORT PAGE (No auth required)
// ============================================
function PublicReportPage() {
  const { token } = useParams();
  const [client, setClient] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState({});
  const [dailyStats, setDailyStats] = useState([]);
  const [adStats, setAdStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const { isMobile, isTablet, gridCols } = useResponsive();

  useEffect(() => {
    loadClient();
  }, [token]);

  useEffect(() => {
    if (client?.simplifi_org_id) {
      loadStats();
    }
  }, [client, dateRange]);

  const loadClient = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/client/${token}`);
      if (!response.ok) {
        throw new Error('Report not found');
      }
      const data = await response.json();
      setClient(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/client/${token}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      
      setCampaigns(data.campaigns || []);
      
      // Create stats map by campaign id (normalize CTR)
      const statsMap = {};
      (data.campaignStats || []).forEach(s => {
        statsMap[s.campaign_id] = { ...s, ctr: normalizeCtr(s.ctr) };
      });
      setCampaignStats(statsMap);
      setDailyStats((data.dailyStats || []).map(d => ({
        ...d,
        ctr: normalizeCtr(d.ctr)
      })));
      setAdStats(data.adStats || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '0.5rem' }}>Report Not Found</h1>
          <p style={{ color: '#6b7280' }}>This report link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status?.toLowerCase() === 'active');
  const totalStats = activeCampaigns.reduce((acc, c) => {
    const s = campaignStats[c.id] || {};
    acc.impressions += s.impressions || 0;
    acc.clicks += s.clicks || 0;
    return acc;
  }, { impressions: 0, clicks: 0 });
  totalStats.ctr = totalStats.impressions > 0 ? totalStats.clicks / totalStats.impressions : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ 
        background: `linear-gradient(135deg, ${client?.primary_color || '#1e3a8a'} 0%, ${client?.secondary_color || '#3b82f6'} 100%)`,
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {client?.logo_path ? (
                <img src={client.logo_path} alt={client.name} style={{ height: '56px', background: 'white', borderRadius: '0.5rem', padding: '0.375rem' }} />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                  {client?.name?.charAt(0)}
                </div>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{client?.name}</h1>
                {client?.campaign_goal && <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>{client.campaign_goal}</p>}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.25rem' }}>Report Period</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  style={{ border: 'none', background: 'rgba(255,255,255,0.2)', padding: '0.375rem', borderRadius: '0.25rem', fontSize: '0.8125rem', color: 'white' }} />
                <span style={{ opacity: 0.7 }}>to</span>
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  style={{ border: 'none', background: 'rgba(255,255,255,0.2)', padding: '0.375rem', borderRadius: '0.25rem', fontSize: '0.8125rem', color: 'white' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem' }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : 3}, 1fr)`, gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '0.75rem', padding: '1.5rem', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Total Impressions</div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700 }}>{formatNumber(totalStats.impressions)}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>Total Clicks</div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700, color: '#111827' }}>{formatNumber(totalStats.clicks)}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>Click-Through Rate</div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700, color: '#111827' }}>{formatPercent(totalStats.ctr)}</div>
          </div>
        </div>

        {/* Performance Chart */}
        {dailyStats.length > 0 && (
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#0d9488" /> Performance Trends
            </h3>
            <DualChartRow data={dailyStats} />
          </div>
        )}

        {/* Active Campaigns */}
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={18} color="#10b981" /> Active Campaigns ({activeCampaigns.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>CAMPAIGN</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>IMPRESSIONS</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>CLICKS</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>CTR</th>
              </tr>
            </thead>
            <tbody>
              {activeCampaigns.map(c => {
                const s = campaignStats[c.id] || {};
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(s.impressions)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(s.clicks)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatPercent(s.ctr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#9ca3af', fontSize: '0.75rem' }}>
          <p>Report generated by Digital Advertising Reports</p>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Edit user state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', name: '', role: '', password: '' });
  const [editError, setEditError] = useState('');
  
  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusData, usersData] = await Promise.all([
        api.get('/api/health').catch(() => ({ simplifiConfigured: false })),
        user?.role === 'admin' ? api.get('/api/users').catch(() => []) : Promise.resolve([])
      ]);
      setStatus(statusData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await api.put('/api/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setEditForm({ email: u.email, name: u.name, role: u.role, password: '' });
    setEditError('');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setEditError('');
    
    try {
      const updates = {
        email: editForm.email,
        name: editForm.name,
        role: editForm.role
      };
      if (editForm.password) {
        updates.password = editForm.password;
      }
      
      await api.put(`/api/users/${editingUser.id}`, updates);
      setEditingUser(null);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/api/users/${deletingUser.id}`);
      setDeletingUser(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Configure your account and manage users</p>
      
      {/* My Account Section */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
          <h3 style={{ margin: 0 }}>My Account</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Email</label>
              <p style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{user?.email}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Name</label>
              <p style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{user?.name}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Role</label>
              <p style={{ margin: '0.25rem 0 0', fontWeight: 500, textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{ marginTop: '0.5rem', padding: '0.625rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, width: 'fit-content' }}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Simpli.fi Connection */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0 }}>Simpli.fi Connection</h3></div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: status?.simplifiConfigured ? '#10b981' : '#ef4444' }} />
            <span style={{ fontWeight: 500 }}>{status?.simplifiConfigured ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>
      </div>

      {/* User Management (Admin only) */}
      {user?.role === 'admin' && (
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ margin: 0 }}>User Management</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {loading ? (
              <p>Loading users...</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: u.role === 'admin' ? '#dbeafe' : '#f3f4f6', color: u.role === 'admin' ? '#1d4ed8' : '#374151' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleEditUser(u)}
                          style={{ padding: '0.375rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginRight: '0.5rem', fontSize: '0.875rem' }}
                        >
                          Edit
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            style={{ padding: '0.375rem 0.75rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              {passwordError && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{passwordError}</p>}
              {passwordSuccess && <p style={{ color: '#10b981', fontSize: '0.875rem', marginBottom: '1rem' }}>{passwordSuccess}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '0.625rem 1.25rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Change Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Edit User</h3>
            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                >
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxSizing: 'border-box' }}
                  placeholder="Leave blank to keep current"
                />
              </div>
              {editError && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{editError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ padding: '0.625rem 1.25rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#dc2626' }}>Delete User</h3>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              Are you sure you want to delete <strong>{deletingUser.name}</strong> ({deletingUser.email})? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingUser(null)} style={{ padding: '0.625rem 1.25rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteUser} style={{ padding: '0.625rem 1.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Delete User</button>
            </div>
          </div>
        </div>
      )}
      
      {/* System Diagnostics Section */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', marginTop: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} />
            System Diagnostics
          </h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Run system diagnostics to check API connectivity, image proxy status, database health, and client configuration.
          </p>
          <button
            onClick={() => setShowDiagnostics(true)}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Settings size={16} />
            Open Diagnostics Panel
          </button>
        </div>
      </div>
      
      {/* Diagnostics Panel Modal */}
      {showDiagnostics && (
        <DiagnosticsPanel 
          isPublic={false} 
          onClose={() => setShowDiagnostics(false)} 
        />
      )}
    </div>
  );
}

// ============================================
// SLUG-BASED PUBLIC REPORT PAGE
// ============================================
function SlugReportPage() {
  const { slug } = useParams();
  const [client, setClient] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState({});
  const [dailyStats, setDailyStats] = useState([]);
  const [adStats, setAdStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadClient();
  }, [slug]);

  useEffect(() => {
    if (client?.simplifi_org_id) {
      loadStats();
    }
  }, [client, dateRange]);

  const loadClient = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/client/slug/${slug}`);
      if (!response.ok) {
        throw new Error('Report not found');
      }
      const data = await response.json();
      setClient(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/client/slug/${slug}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      
      setCampaigns(data.campaigns || []);
      
      // Create stats map by campaign id (normalize CTR)
      const statsMap = {};
      (data.campaignStats || []).forEach(s => {
        statsMap[s.campaign_id] = { ...s, ctr: normalizeCtr(s.ctr) };
      });
      setCampaignStats(statsMap);
      setDailyStats((data.dailyStats || []).map(d => ({
        ...d,
        ctr: normalizeCtr(d.ctr)
      })));
      setAdStats(data.adStats || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '0.5rem' }}>Report Not Found</h1>
          <p style={{ color: '#6b7280' }}>This report link is invalid or the client doesn't exist.</p>
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status?.toLowerCase() === 'active');
  const totalStats = activeCampaigns.reduce((acc, c) => {
    const s = campaignStats[c.id] || {};
    acc.impressions += s.impressions || 0;
    acc.clicks += s.clicks || 0;
    return acc;
  }, { impressions: 0, clicks: 0 });
  totalStats.ctr = totalStats.impressions > 0 ? totalStats.clicks / totalStats.impressions : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ 
        background: `linear-gradient(135deg, ${client?.primary_color || '#1e3a8a'} 0%, ${client?.secondary_color || '#3b82f6'} 100%)`,
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {client?.logo_path && (
                <img src={client.logo_path} alt={client.name} style={{ height: '48px', background: 'white', padding: '0.25rem', borderRadius: '0.5rem' }} />
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{client?.name}</h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>Digital Advertising Report</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: 'none' }}
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Impressions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatNumber(totalStats.impressions)}</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Clicks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatNumber(totalStats.clicks)}</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>CTR</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatPercent(totalStats.ctr)}</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Active Campaigns</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{activeCampaigns.length}</div>
          </div>
        </div>

        {/* Daily Performance Chart */}
        {dailyStats.length > 0 && (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Daily Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsAreaChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stat_date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="impressions" stroke={client?.primary_color || '#3b82f6'} fill={client?.primary_color || '#3b82f6'} fillOpacity={0.2} />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Campaigns */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Campaign Performance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Campaign</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Impressions</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Clicks</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#6b7280', fontWeight: 500 }}>CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => {
                const stats = campaignStats[campaign.id] || {};
                const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) : 0;
                const statusStyle = getStatusStyle(campaign.status);
                return (
                  <tr key={campaign.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{campaign.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{parseStrategy(campaign.name)}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem',
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatNumber(stats.impressions || 0)}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatNumber(stats.clicks || 0)}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem' }}>{formatPercent(ctr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#9ca3af', fontSize: '0.875rem' }}>
          Powered by WSIC Digital Advertising
        </div>
      </div>
    </div>
  );
}

// ============================================
// DIAGNOSTICS PANEL
// ============================================
function DiagnosticsPanel({ isPublic = false, onClose }) {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [testImageUrl, setTestImageUrl] = useState('');
  const [imageTestResult, setImageTestResult] = useState(null);
  const [testingImage, setTestingImage] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const { isMobile } = useResponsive();
  const { user, token } = useAuth();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const endpoint = isPublic ? '/api/diagnostics/public' : '/api/diagnostics/admin';
      const headers = isPublic ? {} : { 'Authorization': `Bearer ${token}` };
      
      const response = await fetch(`${API_BASE}${endpoint}`, { headers });
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      setDiagnostics({ error: error.message });
    }
    setLoading(false);
  };

  const testImageProxy = async () => {
    if (!testImageUrl) return;
    setTestingImage(true);
    setImageTestResult(null);
    setPreviewLoaded(false);
    setPreviewError(false);
    
    try {
      const response = await fetch(`${API_BASE}/api/diagnostics/test-image?url=${encodeURIComponent(testImageUrl)}`);
      const data = await response.json();
      setImageTestResult(data);
    } catch (error) {
      setImageTestResult({ status: 'error', message: error.message });
    }
    setTestingImage(false);
  };

  const copyDiagnosticsReport = () => {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };

    const report = `
=== SIMPLI.FI REPORTS DIAGNOSTICS ===
Generated: ${new Date().toISOString()}

--- DEVICE INFO ---
Safari: ${deviceInfo.isSafari ? 'Yes' : 'No'}
iOS: ${deviceInfo.isIOS ? 'Yes' : 'No'}
Mobile: ${deviceInfo.isMobile ? 'Yes' : 'No'}
Screen: ${deviceInfo.screenWidth} x ${deviceInfo.screenHeight}
Platform: ${deviceInfo.platform}
User Agent: ${deviceInfo.userAgent}

--- SERVER STATUS ---
Status: ${diagnostics?.server?.status || 'Unknown'}
Uptime: ${diagnostics?.server?.uptime ? Math.floor(diagnostics.server.uptime / 60) + ' minutes' : 'N/A'}

--- IMAGE PROXY ---
Status: ${diagnostics?.imageProxy?.status || 'Unknown'}
Endpoint: ${diagnostics?.imageProxy?.endpoint || '/api/proxy/image'}

--- DATABASE ---
Status: ${diagnostics?.database?.status || 'Unknown'}
Message: ${diagnostics?.database?.message || 'N/A'}
Clients: ${diagnostics?.database?.clients ?? 'N/A'}
Users: ${diagnostics?.database?.users ?? 'N/A'}

--- SIMPLI.FI API ---
Status: ${diagnostics?.simplifiApi?.status || 'Unknown'}
Message: ${diagnostics?.simplifiApi?.message || 'N/A'}

--- CLIENT CONFIGURATION ---
Status: ${diagnostics?.clients?.status || 'Unknown'}
Total Clients: ${diagnostics?.clients?.total ?? 'N/A'}
With Issues: ${diagnostics?.clients?.withIssues ?? 'N/A'}
${diagnostics?.clients?.issues?.length > 0 ? 'Issues:\n' + diagnostics.clients.issues.map(c => `  - ${c.name}: ${c.issues.join(', ')}`).join('\n') : ''}

--- ENVIRONMENT ---
Node Env: ${diagnostics?.environment?.nodeEnv || 'N/A'}
Has Simpli.fi App Key: ${diagnostics?.environment?.hasSimplifiAppKey ? 'Yes' : 'No'}
Has Simpli.fi User Key: ${diagnostics?.environment?.hasSimplifiUserKey ? 'Yes' : 'No'}
Has Database URL: ${diagnostics?.environment?.hasDatabaseUrl ? 'Yes' : 'No'}
Has JWT Secret: ${diagnostics?.environment?.hasJwtSecret ? 'Yes' : 'No'}

=== END OF REPORT ===
    `.trim();

    navigator.clipboard.writeText(report).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    }).catch(err => {
      alert('Failed to copy: ' + err.message);
    });
  };

  const clearCache = async (clientId = null) => {
    setClearingCache(true);
    try {
      const response = await fetch(`${API_BASE}/api/diagnostics/clear-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientId })
      });
      const data = await response.json();
      alert(data.message || 'Cache cleared');
    } catch (error) {
      alert('Error clearing cache: ' + error.message);
    }
    setClearingCache(false);
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      ok: { bg: '#dcfce7', color: '#166534', icon: CheckCircle },
      warning: { bg: '#fef3c7', color: '#92400e', icon: AlertCircle },
      error: { bg: '#fee2e2', color: '#991b1b', icon: AlertCircle },
      unknown: { bg: '#f3f4f6', color: '#6b7280', icon: Clock }
    };
    const style = colors[status] || colors.unknown;
    const Icon = style.icon;
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        background: style.bg,
        color: style.color,
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        <Icon size={12} />
        {status.toUpperCase()}
      </span>
    );
  };

  const Section = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: '#f9fafb',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          {title}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {open && <div style={{ padding: '1rem' }}>{children}</div>}
      </div>
    );
  };

  // Get browser/device info
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: isMobile ? '0.5rem' : '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} color="#6366f1" />
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>
              {isPublic ? 'Report Diagnostics' : 'System Diagnostics'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <RefreshCw size={24} className="spin" color="#6366f1" />
              <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>Running diagnostics...</p>
            </div>
          ) : diagnostics?.error ? (
            <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem', color: '#991b1b' }}>
              Error: {diagnostics.error}
            </div>
          ) : (
            <>
              {/* Device Info */}
              <Section title="📱 Your Device">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div><strong>Safari:</strong> {deviceInfo.isSafari ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>iOS:</strong> {deviceInfo.isIOS ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Mobile:</strong> {deviceInfo.isMobile ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Screen:</strong> {deviceInfo.screenWidth} × {deviceInfo.screenHeight}</div>
                </div>
                {deviceInfo.isSafari && deviceInfo.isIOS && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
                    ⚠️ You're on iOS Safari. Images use our proxy server for compatibility.
                  </div>
                )}
              </Section>

              {/* Server Status */}
              <Section title="🖥️ Server Status">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span>Backend Server:</span>
                  <StatusBadge status={diagnostics?.server?.status || 'unknown'} />
                </div>
                {diagnostics?.server?.uptime && (
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                    Uptime: {Math.floor(diagnostics.server.uptime / 3600)}h {Math.floor((diagnostics.server.uptime % 3600) / 60)}m
                  </div>
                )}
              </Section>

              {/* Image Proxy */}
              <Section title="🖼️ Image Proxy (Safari Fix)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span>Proxy Status:</span>
                  <StatusBadge status={diagnostics?.imageProxy?.status || 'unknown'} />
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {diagnostics?.imageProxy?.message || diagnostics?.imageProxy?.note}
                </div>
                
                {/* Image Test Tool */}
                <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>Test Image URL</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={testImageUrl}
                      onChange={(e) => setTestImageUrl(e.target.value)}
                      placeholder="https://media.simpli.fi/..."
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem'
                      }}
                    />
                    <button
                      onClick={testImageProxy}
                      disabled={testingImage || !testImageUrl}
                      style={{
                        padding: '0.5rem 1rem',
                        background: testingImage ? '#9ca3af' : '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: testingImage ? 'wait' : 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      {testingImage ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  {imageTestResult && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: imageTestResult.status === 'ok' ? '#dcfce7' : '#fee2e2',
                      borderRadius: '0.25rem',
                      fontSize: '0.8125rem'
                    }}>
                      <strong>Result:</strong> {imageTestResult.message}
                      {imageTestResult.proxyUrl && (
                        <div style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>
                          <strong>Proxy URL:</strong> <code>{imageTestResult.proxyUrl}</code>
                        </div>
                      )}
                      
                      {/* Live Image Preview */}
                      {imageTestResult.status === 'ok' && imageTestResult.proxyUrl && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <strong>Live Preview:</strong>
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem', 
                            background: '#f3f4f6', 
                            borderRadius: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60px'
                          }}>
                            {!previewLoaded && !previewError && (
                              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Loading preview...</span>
                            )}
                            {previewError && (
                              <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>❌ Preview failed to load</span>
                            )}
                            <img 
                              src={`${API_BASE}${imageTestResult.proxyUrl}`}
                              alt="Preview"
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '150px', 
                                objectFit: 'contain',
                                display: previewLoaded ? 'block' : 'none'
                              }}
                              onLoad={() => setPreviewLoaded(true)}
                              onError={() => setPreviewError(true)}
                            />
                          </div>
                          {previewLoaded && (
                            <div style={{ marginTop: '0.25rem', color: '#166534', fontSize: '0.75rem' }}>
                              ✅ Image loads successfully through proxy!
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Section>

              {/* Admin-only sections */}
              {!isPublic && diagnostics?.database && (
                <Section title="🗄️ Database">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>Connection:</span>
                    <StatusBadge status={diagnostics.database.status} />
                  </div>
                  {diagnostics.database.clients !== undefined && (
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                      Clients: {diagnostics.database.clients} | Users: {diagnostics.database.users}
                    </div>
                  )}
                </Section>
              )}

              {!isPublic && diagnostics?.simplifiApi && (
                <Section title="🔌 Simpli.fi API">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>API Status:</span>
                    <StatusBadge status={diagnostics.simplifiApi.status} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                    {diagnostics.simplifiApi.message}
                  </div>
                </Section>
              )}

              {!isPublic && diagnostics?.clients && (
                <Section title="👥 Client Configuration" defaultOpen={diagnostics.clients.withIssues > 0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>Status:</span>
                    <StatusBadge status={diagnostics.clients.status} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Total: {diagnostics.clients.total} | With Issues: {diagnostics.clients.withIssues}
                  </div>
                  {diagnostics.clients.issues?.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {diagnostics.clients.issues.map((client, i) => (
                        <div key={i} style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '0.25rem', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                          <strong>{client.name}:</strong> {client.issues.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Known Fixes Reference */}
              <Section title="🔧 Mobile Compatibility Fixes" defaultOpen={false}>
                <div style={{ fontSize: '0.8125rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong>Safari Image Loading</strong>
                    <div style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                      Images from media.simpli.fi are proxied through our server to avoid Safari's cross-origin blocking.
                      Affected components: TopAdCard, AdPerformanceCard
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong>Video Autoplay</strong>
                    <div style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                      Videos use muted, playsinline, and loop attributes for Safari autoplay compatibility.
                    </div>
                  </div>
                  <div>
                    <strong>Text Overflow</strong>
                    <div style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                      Long campaign names use word-break and flex-wrap to prevent overflow on mobile.
                      Fixed areas: Paused campaigns, Campaign headers, Public URL box
                    </div>
                  </div>
                </div>
              </Section>

              {/* Cache Management - Admin only */}
              {!isPublic && (
                <Section title="🗑️ Cache Management" defaultOpen={false}>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    Clear cached data if you're seeing stale information.
                  </div>
                  <button
                    onClick={() => clearCache()}
                    disabled={clearingCache}
                    style={{
                      padding: '0.5rem 1rem',
                      background: clearingCache ? '#9ca3af' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: clearingCache ? 'wait' : 'pointer',
                      fontSize: '0.8125rem'
                    }}
                  >
                    {clearingCache ? 'Clearing...' : 'Clear All Cache'}
                  </button>
                </Section>
              )}

              {/* Refresh Button */}
              <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={runDiagnostics}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCw size={14} />
                  Refresh Diagnostics
                </button>
                <button
                  onClick={copyDiagnosticsReport}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: reportCopied ? '#dcfce7' : '#f3f4f6',
                    border: `1px solid ${reportCopied ? '#86efac' : '#d1d5db'}`,
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: reportCopied ? '#166534' : 'inherit'
                  }}
                >
                  {reportCopied ? <Check size={14} /> : <Copy size={14} />}
                  {reportCopied ? 'Copied!' : 'Copy Full Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Global Styles */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          /* Responsive utilities */
          html, body, #root {
            overflow-x: hidden;
            max-width: 100vw;
            width: 100%;
          }
          
          * {
            box-sizing: border-box;
          }
          
          /* Responsive grid classes */
          .responsive-grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }
          .responsive-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
          }
          .responsive-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
          
          /* Table responsiveness */
          .responsive-table-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          /* Mobile: Force EVERYTHING to single column (under 768px) */
          @media (max-width: 767px) {
            /* Force ALL grids to single column */
            [style*="grid"] {
              grid-template-columns: 1fr !important;
            }
            
            /* Force flex containers to column */
            .header-content {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            
            /* Hide less important columns on mobile */
            .hide-mobile {
              display: none !important;
            }
            
            /* Smaller padding on mobile */
            .section-padding {
              padding: 0.75rem !important;
            }
            
            /* Stack header elements */
            .header-actions {
              flex-direction: column;
              gap: 0.5rem;
            }
            
            /* Smaller fonts on mobile */
            h1, h2 {
              font-size: 1.125rem !important;
            }
            
            /* Hide table on mobile - show cards instead */
            .desktop-table {
              display: none !important;
            }
            .mobile-cards {
              display: flex !important;
              flex-direction: column !important;
            }
          }
          
          /* Show table on desktop, hide cards */
          @media (min-width: 768px) {
            .desktop-table {
              display: block !important;
            }
            .mobile-cards {
              display: none !important;
            }
          }
            
            /* Table minimum width for scroll */
            .data-table {
              min-width: 500px;
            }
          }
          
          /* Tablet: 2 columns */
          @media (min-width: 641px) and (max-width: 1024px) {
            .responsive-grid-4 {
              grid-template-columns: repeat(2, 1fr);
            }
            .responsive-grid-3 {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .hide-tablet {
              display: none !important;
            }
            
            .section-padding {
              padding: 1rem !important;
            }
          }
          
          /* Desktop: Full grids */
          @media (min-width: 1025px) {
            .responsive-grid-4 {
              grid-template-columns: repeat(4, 1fr);
            }
            .responsive-grid-3 {
              grid-template-columns: repeat(3, 1fr);
            }
            
            .section-padding {
              padding: 1.5rem !important;
            }
          }
        `}</style>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/report/:token" element={<PublicReportPage />} />
          <Route path="/client/:slug/report" element={<ClientDetailPage publicMode={true} />} />
          <Route path="/client/:slug/report/campaign/:campaignId" element={<CampaignDetailPage publicMode={true} />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/client/:slug" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
          <Route path="/client/:slug/campaign/:campaignId" element={<ProtectedRoute><CampaignDetailPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><ProductManagement /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
          <Route path="/orders/new" element={<ProtectedRoute><OrderForm /></ProtectedRoute>} />
          <Route path="/orders/:id/edit" element={<ProtectedRoute><OrderForm /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Redirect old ID-based URLs to dashboard */}
          <Route path="/clients/:id" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
