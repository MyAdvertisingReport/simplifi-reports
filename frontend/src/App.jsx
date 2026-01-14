import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, FileText, Settings, LogOut, 
  Menu, X, BarChart3, Calendar, TrendingUp, MousePointer, DollarSign,
  Eye, Target, ArrowLeft, ExternalLink, Copy, Check, Smartphone, Monitor,
  Tablet, Tv, MapPin, Image, Percent, Play, Pause, StopCircle, ChevronRight,
  GripVertical, Save, MessageSquare, Pin, Trash2, Edit3, Video, Radio, Code,
  CheckCircle, AlertCircle, Clock, Bookmark, Flag, Download, History, Award,
  TrendingDown, Zap, Star, ChevronUp, ChevronDown, FileDown, Search, Globe
} from 'lucide-react';
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
        const userData = await res.json();
        setUser(userData);
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
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return new Intl.NumberFormat().format(Math.round(num));
};

const formatNumberFull = (num) => {
  if (num === null || num === undefined) return '—';
  return new Intl.NumberFormat().format(Math.round(num));
};

const formatCurrency = (num) => {
  if (num === null || num === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

const formatPercent = (num) => {
  if (num === null || num === undefined) return '—';
  return (num * 100).toFixed(2) + '%';
};

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
const parseAdSize = (adName) => {
  if (!adName) return 'Unknown';
  const sizeMatch = adName.match(/(\d{2,4}x\d{2,4})/i);
  if (sizeMatch) return sizeMatch[1];
  if (adName.toLowerCase().includes('.mp4') || adName.toLowerCase().includes('ott')) return 'Video/OTT';
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
  if (user?.role === 'admin') {
    navItems.push({ path: '/users', icon: Users, label: 'Users' });
    navItems.push({ path: '/settings', icon: Settings, label: 'Settings' });
  }

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
      
      <nav style={{ flex: 1 }}>
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

      // Load data for all clients
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

      const clientPromises = clientsData.filter(c => c.simplifi_org_id).map(async (client) => {
        try {
          const [stats, dailyStats, campaigns, pixelData] = await Promise.all([
            api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${startDate}&endDate=${endDate}&byCampaign=true`),
            api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${startDate}&endDate=${endDate}&byDay=true`),
            api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/campaigns`),
            api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/pixels`).catch(() => ({ first_party_segments: [] }))
          ]);

          // Check pixel status
          const pixels = pixelData.first_party_segments || pixelData.retargeting_segments || [];
          const hasActivePixel = pixels.some(p => p.active === true || p.status === 'Active' || (p.user_count || p.segment_size || 0) > 0);
          
          if (!hasActivePixel) {
            pixelsNeedingAttention.push({
              clientId: client.id,
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
            name: client.name,
            impressions: clientImpressions,
            clicks: clientClicks,
            spend: clientSpend,
            activeCampaigns: active.length,
            primaryColor: client.primary_color
          });

          allCampaigns = [...allCampaigns, ...clientCampaigns.map(c => ({ ...c, clientName: client.name, clientId: client.id }))];

        } catch (err) {
          console.error(`Failed to load data for ${client.name}:`, err);
        }
      });

      await Promise.all(clientPromises);

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

  const formatCurrency = (n) => '$' + (n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

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
                  to={`/clients/${client.id}`}
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
                    {client.ctr.toFixed(2)}%
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
                  to={`/clients/${client.id}`}
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
                  to={`/clients/${client.id}`}
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
                            to={`/clients/${camp.clientId}/campaigns/${camp.id}`}
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
                            to={`/clients/${client.clientId}`}
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
                              {camp.ctr.toFixed(3)}% CTR
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                              {camp.clicks.toLocaleString()} clicks / {camp.impressions.toLocaleString()} impr
                            </div>
                          </div>
                          <Link 
                            to={`/clients/${camp.clientId}/campaigns/${camp.id}`}
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
      const data = await api.get('/api/simplifi/organizations');
      setOrganizations(data.organizations || []);
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

  const formatCurrency = (n) => '$' + (n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

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
        ) : (
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
                        to={`/clients/${c.id}`} 
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
// PDF REPORT GENERATION HELPER
// ============================================
function generatePDFHTML(data, client, campaigns, campaignStats, showSpendData) {
  const activeCampaigns = campaigns.filter(c => c.status?.toLowerCase() === 'active');
  
  // Calculate totals
  let totalImpressions = 0, totalClicks = 0, totalSpend = 0;
  Object.values(campaignStats).forEach(s => {
    totalImpressions += s.impressions || 0;
    totalClicks += s.clicks || 0;
    totalSpend += s.total_spend || 0;
  });
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00';

  const formatNum = (n) => n?.toLocaleString() || '0';
  const formatCur = (n) => '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  const history = data?.history;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${client?.name || 'Client'} - Advertising Report</title>
      <style>
        @page { 
          size: letter; 
          margin: 0.5in; 
        }
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          color: #1f2937; 
          line-height: 1.4; 
          padding: 0; 
          max-width: 8in; 
          margin: 0 auto; 
          font-size: 12px;
        }
        
        /* Header */
        .header { 
          text-align: center; 
          margin-bottom: 24px; 
          padding-bottom: 16px; 
          border-bottom: 4px solid #1e3a8a; 
        }
        .header h1 { 
          font-size: 32px; 
          color: #1e3a8a; 
          margin-bottom: 4px; 
          font-weight: 700;
        }
        .header .subtitle { 
          color: #6b7280; 
          font-size: 14px; 
          margin-bottom: 12px;
        }
        .header .date-range { 
          background-color: #f3f4f6; 
          padding: 8px 20px; 
          border-radius: 20px; 
          display: inline-block; 
          font-size: 12px;
          font-weight: 500;
        }
        
        /* Sections */
        .section { 
          margin-bottom: 24px; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-size: 16px; 
          font-weight: 700; 
          color: #1e3a8a; 
          margin-bottom: 12px; 
          padding-bottom: 8px; 
          border-bottom: 2px solid #e5e7eb; 
        }
        
        /* Stats Grid */
        .stats-grid { 
          display: table;
          width: 100%;
          margin-bottom: 20px; 
        }
        .stat-card { 
          display: table-cell;
          width: ${showSpendData ? '25%' : '33.33%'};
          text-align: center;
          padding: 16px 8px;
          border: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .stat-card:first-child {
          background-color: #1e3a8a !important;
          color: white !important;
        }
        .stat-card:first-child .label,
        .stat-card:first-child .value { 
          color: white !important; 
        }
        .stat-card .label { 
          font-size: 10px; 
          text-transform: uppercase; 
          color: #6b7280; 
          letter-spacing: 0.5px; 
          margin-bottom: 4px;
          font-weight: 600;
        }
        .stat-card .value { 
          font-size: 28px; 
          font-weight: 700; 
          color: #111827; 
        }
        
        /* History Section */
        .history-section { 
          background-color: #eff6ff !important; 
          border: 2px solid #bfdbfe; 
          border-radius: 8px; 
          padding: 20px; 
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .history-title { 
          font-size: 14px; 
          font-weight: 700; 
          color: #1e40af; 
          margin-bottom: 16px; 
        }
        .highlights-grid { 
          display: table;
          width: 100%;
          margin-bottom: 16px;
        }
        .highlight-card { 
          display: table-cell;
          width: 33.33%;
          background-color: white !important; 
          border-radius: 8px; 
          padding: 16px; 
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .highlight-card .icon { 
          font-size: 28px; 
          margin-bottom: 8px; 
        }
        .highlight-card .title { 
          font-size: 9px; 
          text-transform: uppercase; 
          color: #6b7280; 
          margin-bottom: 4px;
          font-weight: 600;
        }
        .highlight-card .value { 
          font-size: 22px; 
          font-weight: 700; 
          color: #1e3a8a; 
        }
        .highlight-card .subtitle { 
          font-size: 10px; 
          color: #6b7280; 
        }
        
        /* Monthly Chart */
        .monthly-chart { 
          margin-top: 12px; 
        }
        .monthly-chart-title {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .monthly-bar { 
          display: table;
          width: 100%;
          margin-bottom: 4px; 
        }
        .monthly-bar .month { 
          display: table-cell;
          width: 60px; 
          font-size: 10px; 
          color: #6b7280;
          vertical-align: middle;
        }
        .monthly-bar .bar-container { 
          display: table-cell;
          vertical-align: middle;
          padding: 0 8px;
        }
        .monthly-bar .bar-bg {
          height: 16px; 
          background-color: #e5e7eb !important; 
          border-radius: 4px; 
          overflow: hidden;
          position: relative;
        }
        .monthly-bar .bar { 
          height: 16px; 
          background-color: #3b82f6 !important; 
          border-radius: 4px; 
        }
        .monthly-bar .value { 
          display: table-cell;
          width: 70px; 
          text-align: right; 
          font-size: 10px; 
          font-weight: 600;
          vertical-align: middle;
        }
        
        /* Growth Indicator */
        .growth-positive { 
          display: inline-block;
          padding: 4px 10px; 
          border-radius: 4px; 
          font-size: 14px; 
          font-weight: 700;
          background-color: #d1fae5 !important;
          color: #065f46 !important;
        }
        .growth-negative { 
          display: inline-block;
          padding: 4px 10px; 
          border-radius: 4px; 
          font-size: 14px; 
          font-weight: 700;
          background-color: #fee2e2 !important;
          color: #991b1b !important;
        }
        
        /* Table */
        table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 11px; 
        }
        th { 
          background-color: #f3f4f6 !important; 
          text-align: left; 
          padding: 10px 8px; 
          font-weight: 600; 
          color: #374151; 
          border-bottom: 2px solid #d1d5db;
          font-size: 10px;
          text-transform: uppercase;
        }
        td { 
          padding: 10px 8px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        tr:nth-child(even) td { 
          background-color: #f9fafb !important; 
        }
        .status { 
          display: inline-block; 
          padding: 3px 10px; 
          border-radius: 4px; 
          font-size: 10px; 
          font-weight: 600; 
        }
        .status-active { 
          background-color: #d1fae5 !important; 
          color: #065f46 !important; 
        }
        
        /* Footer */
        .footer { 
          margin-top: 30px; 
          padding-top: 16px; 
          border-top: 1px solid #e5e7eb; 
          text-align: center; 
          color: #9ca3af; 
          font-size: 10px; 
        }
        
        @media print {
          body { 
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .section { 
            page-break-inside: avoid; 
          }
          .history-section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${client?.name || 'Client'}</h1>
        <div class="subtitle">Digital Advertising Performance Report</div>
        <div class="date-range">
          ${new Date(data?.dateRange?.start || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – 
          ${new Date(data?.dateRange?.end || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Performance Summary</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Total Impressions</div>
            <div class="value">${formatNum(totalImpressions)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Total Clicks</div>
            <div class="value">${formatNum(totalClicks)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Click-Through Rate</div>
            <div class="value">${avgCTR}%</div>
          </div>
          ${showSpendData ? `
          <div class="stat-card">
            <div class="label">Total Spend</div>
            <div class="value">${formatCur(totalSpend)}</div>
          </div>
          ` : ''}
        </div>
      </div>

      ${history ? `
      <div class="section">
        <div class="history-section">
          <div class="history-title">12-Month Campaign History</div>
          
          <div class="highlights-grid">
            <div class="highlight-card">
              <div class="icon">🏆</div>
              <div class="title">All-Time High Impressions</div>
              <div class="value">${formatNum(history.allTimeHighs?.impressions)}</div>
              <div class="subtitle">${history.allTimeHighs?.bestMonth?.month || ''}</div>
            </div>
            <div class="highlight-card">
              <div class="icon">📊</div>
              <div class="title">12-Month Total</div>
              <div class="value">${formatNum(history.totalImpressions)}</div>
              <div class="subtitle">${formatNum(history.totalClicks)} clicks</div>
            </div>
            <div class="highlight-card">
              <div class="icon">${history.growth?.impressions >= 0 ? '📈' : '📉'}</div>
              <div class="title">Month-over-Month</div>
              <div class="value">
                <span class="${history.growth?.impressions >= 0 ? 'growth-positive' : 'growth-negative'}">
                  ${history.growth?.impressions >= 0 ? '↑' : '↓'} ${Math.abs(history.growth?.impressions || 0).toFixed(1)}%
                </span>
              </div>
              <div class="subtitle">Impressions growth</div>
            </div>
          </div>

          <div class="monthly-chart">
            <div class="monthly-chart-title">Monthly Impressions Trend</div>
            ${(history.monthlyBreakdown || []).map(m => {
              const maxVal = Math.max(...(history.monthlyBreakdown || []).map(x => x.impressions));
              const pct = maxVal > 0 ? (m.impressions / maxVal * 100) : 0;
              return `
                <div class="monthly-bar">
                  <div class="month">${m.month}</div>
                  <div class="bar-container">
                    <div class="bar-bg">
                      <div class="bar" style="width: ${pct}%;"></div>
                    </div>
                  </div>
                  <div class="value">${formatNum(m.impressions)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Active Campaigns (${activeCampaigns.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Campaign</th>
              <th style="width: 10%;">Status</th>
              <th style="width: 15%; text-align: right;">Impressions</th>
              <th style="width: 12%; text-align: right;">Clicks</th>
              <th style="width: 10%; text-align: right;">CTR</th>
              ${showSpendData ? '<th style="width: 18%; text-align: right;">Spend</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${activeCampaigns.map(c => {
              const s = campaignStats[c.id] || {};
              const ctr = s.impressions > 0 ? (s.clicks / s.impressions * 100).toFixed(2) : '0.00';
              return `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td><span class="status status-active">Active</span></td>
                  <td style="text-align: right; font-family: monospace;">${formatNum(s.impressions)}</td>
                  <td style="text-align: right; font-family: monospace;">${formatNum(s.clicks)}</td>
                  <td style="text-align: right;">${ctr}%</td>
                  ${showSpendData ? `<td style="text-align: right; font-family: monospace;">${formatCur(s.total_spend)}</td>` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Report generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString()}</p>
        <p style="margin-top: 4px;">Powered by Digital Advertising Reports</p>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// CLIENT DETAIL PAGE (Main Report View)
// ============================================
function ClientDetailPage() {
  const { id } = useParams();
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
  const [reportLink, setReportLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();
  
  // Persist client view mode to localStorage when it changes
  const toggleClientViewMode = () => {
    const newValue = !clientViewMode;
    setClientViewMode(newValue);
    localStorage.setItem('clientViewMode', newValue.toString());
  };
  
  // Determine if we should show spend data (only for logged-in users NOT in client view mode)
  const showSpendData = user && !clientViewMode;

  // Default section order for main client page
  const defaultMainSectionOrder = ['active', 'charts', 'history', 'topads', 'pixel', 'paused'];
  const [sectionOrder, setSectionOrder] = useState(() => {
    const saved = localStorage.getItem('clientMainSectionOrder');
    // Filter out 'device' from any saved order since it's not available via API
    const order = saved ? JSON.parse(saved) : defaultMainSectionOrder;
    return order.filter(s => s !== 'device');
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

  useEffect(() => { loadClient(); }, [id]);
  useEffect(() => { if (client?.simplifi_org_id) { loadData(); loadHistoryData(); } }, [client]);

  const loadClient = async () => {
    try {
      const data = await api.get(`/api/clients/${id}`);
      setClient(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadData = async () => {
    if (!client?.simplifi_org_id) return;
    setStatsLoading(true);
    try {
      // Get all campaigns WITH ADS INCLUDED (using include parameter)
      const campaignsData = await api.get(`/api/simplifi/organizations/${client.simplifi_org_id}/campaigns-with-ads`);
      const allCampaigns = campaignsData.campaigns || [];
      setCampaigns(allCampaigns);

      // Build a map of all ads from all campaigns
      const adDetailsMap = {};
      allCampaigns.forEach(campaign => {
        (campaign.ads || []).forEach(ad => {
          // Parse dimensions from original_width/original_height (e.g., "1920 px" -> 1920)
          const width = ad.original_width ? parseInt(ad.original_width) : null;
          const height = ad.original_height ? parseInt(ad.original_height) : null;
          const adFileType = ad.ad_file_types?.[0]?.name || '';
          
          adDetailsMap[ad.id] = {
            ...ad,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            // primary_creative_url is the actual media file (image or video)
            preview_url: ad.primary_creative_url,
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
      
      // Create a map of campaign stats by ID
      const statsMap = {};
      (statsData.campaign_stats || []).forEach(s => {
        statsMap[s.campaign_id] = s;
      });
      setCampaignStats(statsMap);

      // Get daily stats for the charts (aggregated across all campaigns)
      const dailyData = await api.get(
        `/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&byDay=true`
      );
      setDailyStats((dailyData.campaign_stats || []).sort((a, b) => new Date(a.stat_date) - new Date(b.stat_date)));

      // Get ad stats for active campaigns only (for top 3 ad sizes)
      const activeCampaigns = allCampaigns.filter(c => c.status?.toLowerCase() === 'active');
      const activeCampaignIds = activeCampaigns.map(c => c.id);
      
      if (activeCampaignIds.length > 0) {
        // Get ad stats
        const adStatsData = await api.get(
          `/api/simplifi/organizations/${client.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&byAd=true`
        );
        
        // Merge ad stats with ad details from campaigns
        const enrichedAdStats = (adStatsData.campaign_stats || [])
          .filter(ad => activeCampaignIds.includes(ad.campaign_id))
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

    } catch (err) { console.error(err); }
    setStatsLoading(false);
  };

  // Load 12-month campaign history
  const loadHistoryData = async () => {
    if (!client?.simplifi_org_id) return;
    setHistoryLoading(true);
    try {
      const data = await api.get(`/api/clients/${id}/report/pdf?includeHistory=true`);
      setHistoryData(data.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setHistoryLoading(false);
  };

  // Show the static share link for this client
  const showShareLink = () => {
    if (client?.share_token) {
      setReportLink({ token: client.share_token });
    } else {
      alert('Share link not available. Please contact support.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/report/${client?.share_token || reportLink?.token}`);
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
    const size = parseAdSize(ad.name);
    if (!acc[size]) {
      acc[size] = { 
        impressions: 0, 
        clicks: 0, 
        preview_url: ad.preview_url, // Use first ad's preview
        is_video: ad.is_video,
        width: ad.width,
        height: ad.height
      };
    }
    acc[size].impressions += ad.impressions || 0;
    acc[size].clicks += ad.clicks || 0;
    // Keep the preview from the ad with most impressions for this size
    if (!acc[size].preview_url && ad.preview_url) {
      acc[size].preview_url = ad.preview_url;
      acc[size].is_video = ad.is_video;
      acc[size].width = ad.width;
      acc[size].height = ad.height;
    }
    return acc;
  }, {});
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
    <div>
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
        <div style={{ padding: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {/* Client Logo */}
              {client?.logo_path ? (
                <img 
                  src={client.logo_path} 
                  alt={client.name} 
                  style={{ height: '64px', width: 'auto', borderRadius: '0.5rem', background: 'white', padding: '0.5rem' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '0.5rem', 
                  background: 'rgba(255,255,255,0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 700
                }}>
                  {client?.name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{client?.name}</h2>
                {client?.campaign_goal && (
                  <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.9375rem' }}>
                    {client.campaign_goal}
                  </p>
                )}
              </div>
            </div>
            
            {/* Date Range Picker - Combined with Report Period */}
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.5rem' }}>Report Period</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  disabled={statsLoading}
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
                  {statsLoading ? '...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Stats Row - Only show if we have data */}
          {(client?.monthly_budget || client?.start_date || client?.contact_name) && (
            <div style={{ 
              display: 'flex', 
              gap: '2rem', 
              marginTop: '1.25rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid rgba(255,255,255,0.2)' 
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
          padding: '0.75rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Link to="/clients" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to Clients
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Edit Layout Button */}
            {user && !clientViewMode && (
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
            {/* Edit Client Button - Admin only */}
            {user?.role === 'admin' && !clientViewMode && (
              <button 
                onClick={() => setShowEditModal(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.5rem 0.875rem', 
                  background: '#f3f4f6', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem', 
                  fontSize: '0.8125rem', 
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                <Edit3 size={14} />
                Edit Client
              </button>
            )}
            {user?.role === 'admin' && (
              <button onClick={showShareLink} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', background: '#0d9488', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <ExternalLink size={14} /> Share
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

      {reportLink && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Check size={18} color="#10b981" />
          <code style={{ flex: 1, fontSize: '0.8125rem', color: '#065f46' }}>{window.location.origin}/report/{reportLink.token}</code>
          <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Collapsible Internal Notes - just below header for admins */}
      {user && !clientViewMode && (
        <InternalNotesSection clientId={id} isCollapsible={true} />
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
                    <div style={{ display: 'grid', gridTemplateColumns: showSpendData ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                      <StatCardWithSparkline label="Impressions" value={formatNumber(activeTotals.impressions)} data={dailyStats} dataKey="impressions" color="#0d9488" />
                      <StatCardWithSparkline label="Clicks" value={formatNumber(activeTotals.clicks)} data={dailyStats} dataKey="clicks" color="#3b82f6" />
                      <StatCardWithSparkline label="CTR" value={formatPercent(activeTotals.ctr)} data={dailyStats} dataKey="ctr" color="#8b5cf6" showTrend={false} />
                      {showSpendData && <StatCardWithSparkline label="Spend" value={formatCurrency(activeTotals.spend)} data={dailyStats} dataKey="total_spend" color="#f59e0b" />}
                    </div>

                    {/* Active Campaigns Table */}
                    {activeCampaigns.length === 0 ? (
                      <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No active campaigns</p>
                    ) : (
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
                                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{campaign.name}</td>
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
                                  <Link to={`/clients/${id}/campaigns/${campaign.id}`} style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                                    <ChevronRight size={18} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
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
                      padding: '1rem 1.25rem', 
                      background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)', 
                      borderRadius: '0.75rem',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <BarChart3 size={18} color="#059669" />
                          <span style={{ fontWeight: 600, color: '#065f46', fontSize: '0.875rem' }}>Date Range Totals</span>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impressions</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0d9488' }}>{formatNumber(chartTotals.impressions)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clicks</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#3b82f6' }}>{formatNumber(chartTotals.clicks)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CTR</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#8b5cf6' }}>{chartCTR.toFixed(2)}%</div>
                          </div>
                          {showSpendData && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spend</div>
                              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(chartTotals.spend)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </DraggableReportSection>
                );
              
              case 'history':
                if (!historyData || historyLoading) {
                  if (historyLoading) {
                    return (
                      <DraggableReportSection {...sectionProps} title="12-Month Campaign History" icon={History} iconColor="#8b5cf6">
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading historical data...</div>
                      </DraggableReportSection>
                    );
                  }
                  return null;
                }
                return (
                  <DraggableReportSection {...sectionProps} title="12-Month Campaign History" icon={History} iconColor="#8b5cf6">
                    <CampaignHistorySection data={historyData} showSpendData={showSpendData} />
                  </DraggableReportSection>
                );
              
              // Note: Device breakdown not available via Simpli.fi API
              
              case 'topads':
                if (topAdSizes.length === 0) return null;
                return (
                  <DraggableReportSection {...sectionProps} title="Top 3 Ads by Size (Active Campaigns)" icon={Image} iconColor="#6366f1">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {topAdSizes.map((ad, i) => (
                        <div key={ad.size} style={{ 
                          padding: '1.25rem', 
                          background: i === 0 ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : '#f9fafb', 
                          borderRadius: '0.75rem',
                          color: i === 0 ? 'white' : 'inherit'
                        }}>
                          {/* Ad Preview Image/Video */}
                          {ad.preview_url && (
                            <div style={{ 
                              marginBottom: '0.75rem', 
                              borderRadius: '0.5rem', 
                              overflow: 'hidden',
                              background: i === 0 ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '80px'
                            }}>
                              {ad.is_video ? (
                                <video 
                                  src={ad.preview_url} 
                                  style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
                                  muted
                                />
                              ) : (
                                <img 
                                  src={ad.preview_url} 
                                  alt={ad.size}
                                  style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{ad.size}</span>
                            <span style={{ 
                              padding: '0.25rem 0.5rem', 
                              background: i === 0 ? 'rgba(255,255,255,0.2)' : '#e5e7eb', 
                              borderRadius: '0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 600 
                            }}>
                              #{i + 1}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                            <div>
                              <div style={{ opacity: 0.7, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Impressions</div>
                              <div style={{ fontWeight: 600 }}>{formatNumber(ad.impressions)}</div>
                            </div>
                            <div>
                              <div style={{ opacity: 0.7, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Clicks</div>
                              <div style={{ fontWeight: 600 }}>{formatNumber(ad.clicks)}</div>
                            </div>
                            <div>
                              <div style={{ opacity: 0.7, fontSize: '0.6875rem', textTransform: 'uppercase' }}>CTR</div>
                              <div style={{ fontWeight: 600 }}>{formatPercent(ad.ctr)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DraggableReportSection>
                );
              
              case 'paused':
                if (inactiveCampaigns.length === 0) return null;
                return (
                  <DraggableReportSection {...sectionProps} title={`Paused & Stopped Campaigns (${inactiveCampaigns.length})`} icon={Pause} iconColor="#f59e0b">
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
                                <Link to={`/clients/${id}/campaigns/${campaign.id}`} style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                                  <ChevronRight size={18} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                const updated = await api.put(`/api/clients/${id}`, updates);
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
    </div>
  );
}

// ============================================
// CAMPAIGN DETAIL PAGE (Sub-page for individual campaign)
// ============================================
function CampaignDetailPage() {
  const { id, campaignId } = useParams();
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
  
  // Default section order - can be customized (device stats shown only on main client page)
  const defaultSectionOrder = ['performance', 'vcr', 'conversions', 'charts', 'geo', 'keywords', 'keywordPerformance', 'ads', 'geofences', 'domains', 'daily'];
  const [sectionOrder, setSectionOrder] = useState(() => {
    // Try to load saved order from localStorage
    const saved = localStorage.getItem('campaignSectionOrder');
    if (saved) {
      let order = JSON.parse(saved);
      // Filter out 'device' from any saved order since it's now client-level only
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
  
  // Determine if we should show spend data
  const showSpendData = user && !clientViewMode;
  
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

  useEffect(() => { loadData(); }, [id, campaignId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get client
      const clientData = await api.get(`/api/clients/${id}`);
      setClient(clientData);

      // Get campaign details WITH ADS INCLUDED
      const campaignsData = await api.get(`/api/simplifi/organizations/${clientData.simplifi_org_id}/campaigns-with-ads`);
      const campaignData = (campaignsData.campaigns || []).find(c => c.id === parseInt(campaignId));
      setCampaign(campaignData);

      // Build ad details map from the campaign's nested ads
      const adDetailsMap = {};
      (campaignData?.ads || []).forEach(ad => {
        const width = ad.original_width ? parseInt(ad.original_width) : null;
        const height = ad.original_height ? parseInt(ad.original_height) : null;
        const adFileType = ad.ad_file_types?.[0]?.name || '';
        
        adDetailsMap[ad.id] = {
          ...ad,
          preview_url: ad.primary_creative_url,
          width: width,
          height: height,
          is_video: adFileType.toLowerCase() === 'video' || ad.name?.toLowerCase().includes('.mp4'),
          file_type: adFileType
        };
      });

      // Get campaign stats
      const statsData = await api.get(
        `/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}`
      );
      setStats(statsData.campaign_stats?.[0] || null);

      // Get daily stats for this campaign
      const dailyData = await api.get(
        `/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}&byDay=true`
      );
      console.log('Daily stats raw response:', dailyData);
      if (dailyData.campaign_stats && dailyData.campaign_stats.length > 0) {
        console.log('Daily stats sample record keys:', Object.keys(dailyData.campaign_stats[0]));
        console.log('Daily stats sample record:', dailyData.campaign_stats[0]);
      }
      setDailyStats((dailyData.campaign_stats || []).sort((a, b) => new Date(a.stat_date || a.date) - new Date(b.stat_date || b.date)));

      // Get ad stats for this campaign
      const adData = await api.get(
        `/api/simplifi/organizations/${clientData.simplifi_org_id}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}&byAd=true`
      );
      
      // Merge ad stats with details from campaign
      const enrichedAds = (adData.campaign_stats || []).map(stat => {
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
      setAdStats(enrichedAds);

      // Note: Device stats removed from individual campaigns - shown only on main client page

      // Get geo/location stats
      try {
        const geoData = await api.get(
          `/api/simplifi/organizations/${clientData.simplifi_org_id}/geo-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&campaignId=${campaignId}`
        );
        setGeoStats(geoData.campaign_stats || []);
      } catch (e) { console.error('Could not fetch geo stats:', e); }

      // Get geo-fences if this is a geo-fence campaign - improved detection
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

      // Get keywords if this is a keyword campaign - improved detection
      const isKeyword = campNameLower.includes('keyword') || campNameLower.includes('_kw');
      if (isKeyword) {
        try {
          const keywordsData = await api.get(`/api/simplifi/campaigns/${campaignId}/keywords`);
          console.log('Keywords API response:', keywordsData);
          setKeywords(keywordsData.keywords || keywordsData || []);
        } catch (e) { console.error('Could not fetch keywords:', e); }
      }
      
      // Fetch Report Center enhanced data (async, don't block initial load)
      loadEnhancedData(clientData.simplifi_org_id, campaignId, campaignData);
      
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  // Load enhanced data from Report Center (runs in background)
  const loadEnhancedData = async (orgId, campId, campaignData) => {
    setEnhancedDataLoading(true);
    try {
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;
      
      // Determine what enhanced data to fetch based on campaign type - improved detection
      const campaignName = campaignData?.name?.toLowerCase() || '';
      const isGeoFence = campaignName.includes('_gf') || 
                         campaignName.includes('geofence') || campaignName.includes('geo_fence') || campaignName.includes('geo-fence') ||
                         campaignName.includes('geocomp') || campaignName.includes('geo_comp') || campaignName.includes('geo-comp') ||
                         campaignName.includes('geotarget') || campaignName.includes('geo_target') ||
                         campaignName.includes('_geo_');
      const isOTT = campaignName.includes('ott') ||
                    campaignName.includes('ctv') ||
                    campaignName.includes('streaming');
      const isKeyword = campaignName.includes('keyword') || campaignName.includes('_kw');
      
      console.log(`Campaign "${campaignData?.name}" - isGeoFence: ${isGeoFence}, isOTT: ${isOTT}, isKeyword: ${isKeyword}`);
      
      const promises = [];
      
      // Always fetch location performance and conversions
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/location-performance?startDate=${startDate}&endDate=${endDate}`)
          .then(data => {
            // Deduplicate locations by combining city+region+country
            const locations = data.location_performance || [];
            const locationMap = new Map();
            locations.forEach(loc => {
              const key = `${loc.city || ''}-${loc.metro || ''}-${loc.region || ''}-${loc.country || ''}`;
              if (locationMap.has(key)) {
                const existing = locationMap.get(key);
                existing.impressions += loc.impressions || 0;
                existing.clicks += loc.clicks || 0;
                existing.spend += loc.spend || 0;
                existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions * 100) : 0;
              } else {
                locationMap.set(key, { ...loc });
              }
            });
            setLocationPerformance(Array.from(locationMap.values()));
          })
          .catch(e => console.log('Location performance not available:', e.message))
      );
      
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/conversions?startDate=${startDate}&endDate=${endDate}`)
          .then(data => setConversionData(data.conversions))
          .catch(e => console.log('Conversion data not available:', e.message))
      );
      
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/device-breakdown?startDate=${startDate}&endDate=${endDate}`)
          .then(data => setEnhancedDeviceStats(data.device_breakdown || []))
          .catch(e => console.log('Device breakdown not available:', e.message))
      );
      
      promises.push(
        api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/viewability?startDate=${startDate}&endDate=${endDate}`)
          .then(data => setViewabilityData(data.viewability))
          .catch(e => console.log('Viewability data not available:', e.message))
      );
      
      // Always fetch geo-fence performance for geo-fence campaigns
      if (isGeoFence) {
        promises.push(
          api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/geofence-performance?startDate=${startDate}&endDate=${endDate}`)
            .then(data => setGeoFencePerformance(data.geofence_performance || []))
            .catch(e => console.log('Geo-fence performance not available:', e.message))
        );
      }
      
      // Fetch domain performance for OTT campaigns
      if (isOTT) {
        promises.push(
          api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/domain-performance?startDate=${startDate}&endDate=${endDate}`)
            .then(data => setDomainPerformance(data.domain_performance || []))
            .catch(e => console.log('Domain performance not available:', e.message))
        );
      }
      
      // Fetch keyword performance for keyword campaigns
      if (isKeyword) {
        promises.push(
          api.get(`/api/simplifi/organizations/${orgId}/campaigns/${campId}/keyword-performance?startDate=${startDate}&endDate=${endDate}`)
            .then(data => setKeywordPerformance(data.keyword_performance || []))
            .catch(e => console.log('Keyword performance not available:', e.message))
        );
      }
      
      await Promise.all(promises);
      
    } catch (err) {
      console.error('Error loading enhanced data:', err);
    }
    setEnhancedDataLoading(false);
  };

  const statusStyle = getStatusStyle(campaign?.status);
  const StatusIcon = statusStyle.icon;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      {/* Campaign Header - Branded */}
      <div style={{ 
        background: `linear-gradient(135deg, ${client?.primary_color || '#1e3a8a'} 0%, ${client?.secondary_color || '#3b82f6'} 100%)`,
        borderRadius: '0.75rem', 
        marginBottom: '1.5rem', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        {/* Top section with campaign info */}
        <div style={{ padding: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{campaign?.name || 'Campaign'}</h2>
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
            <div style={{ textAlign: 'right' }}>
              {/* Campaign Flight Dates */}
              {(campaign?.start_date || campaign?.end_date) && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '0.375rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.8125rem'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          <Link to={`/clients/${id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to {client?.name}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Edit Layout Button - only for logged-in users */}
            {user && !clientViewMode && (
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
      {user && !clientViewMode && (
        <InternalNotesSection clientId={id} isCollapsible={true} />
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
                <div style={{ display: 'grid', gridTemplateColumns: showSpendData ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
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
            if (keywords.length === 0) return null;
            return (
              <DraggableReportSection {...sectionProps} title={`Keywords (${keywords.length})`} icon={Target} iconColor="#8b5cf6">
                <KeywordsTable keywords={keywords} />
              </DraggableReportSection>
            );
          
          case 'keywordPerformance':
            // Show for keyword campaigns - check campaign strategy
            if (!isKeywordCampaign && keywordPerformance.length === 0) return null;
            
            // Show loading state for keyword campaigns
            if (isKeywordCampaign && keywordPerformance.length === 0) {
              return (
                <DraggableReportSection {...sectionProps} title="Keyword Performance" icon={Target} iconColor="#8b5cf6">
                  {enhancedDataLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                      <p style={{ fontSize: '0.875rem' }}>Loading keyword performance from Report Center...</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <Target size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                      <p style={{ fontSize: '0.875rem' }}>No keyword performance data available for this date range</p>
                    </div>
                  )}
                </DraggableReportSection>
              );
            }
            
            // Check if spend data is actually available
            const hasKwSpendData = keywordPerformance.some(kw => (kw.spend || 0) > 0);
            const showKwSpend = showSpendData && hasKwSpendData;
            
            return (
              <DraggableReportSection {...sectionProps} title={`Keyword Performance (${keywordPerformance.length})`} icon={Target} iconColor="#8b5cf6">
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Keyword</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>CTR</th>
                        {showKwSpend && <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {keywordPerformance.map((kw, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Target size={14} color="#8b5cf6" />
                              <span style={{ fontWeight: 500 }}>{kw.keyword}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(kw.impressions)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(kw.clicks)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{kw.ctr?.toFixed(2) || '0.00'}%</td>
                          {showKwSpend && <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(kw.spend)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
            if (geoFences.length === 0 && geoFencePerformance.length === 0) return null;
            
            // Merge geo-fence definitions with performance data
            const mergedGeoFences = geoFences.map(fence => {
              const perf = geoFencePerformance.find(p => 
                p.geoFenceId === fence.id || 
                p.geoFenceName?.toLowerCase() === fence.name?.toLowerCase()
              );
              return {
                ...fence,
                impressions: perf?.impressions || 0,
                clicks: perf?.clicks || 0,
                ctr: perf?.ctr || 0,
                spend: perf?.spend || 0
              };
            }).sort((a, b) => b.impressions - a.impressions);
            
            // If we have performance data but no fence definitions, use performance data
            const displayFences = mergedGeoFences.length > 0 ? mergedGeoFences : 
              geoFencePerformance.map(p => ({
                id: p.geoFenceId,
                name: p.geoFenceName,
                impressions: p.impressions,
                clicks: p.clicks,
                ctr: p.ctr,
                spend: p.spend
              })).sort((a, b) => b.impressions - a.impressions);
            
            return (
              <DraggableReportSection {...sectionProps} title={`Geo-Fence Locations (${displayFences.length})`} icon={MapPin} iconColor="#0d9488">
                {enhancedDataLoading && geoFencePerformance.length === 0 && (
                  <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Loading performance data from Report Center...</span>
                  </div>
                )}
                <ExpandableGeoFenceList 
                  fences={displayFences} 
                  formatNumber={formatNumberFull}
                />
              </DraggableReportSection>
            );
          
          case 'conversions':
            if (!conversionData || conversionData.totalConversions === 0) return null;
            return (
              <DraggableReportSection {...sectionProps} title="Conversion Tracking" icon={Target} iconColor="#10b981">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#15803d', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Conversions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{formatNumberFull(conversionData.totalConversions)}</div>
                  </div>
                  <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Click Conversions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{formatNumberFull(conversionData.clickConversions)}</div>
                  </div>
                  <div style={{ background: '#fdf4ff', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#a21caf', textTransform: 'uppercase', marginBottom: '0.25rem' }}>View Conversions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#86198f' }}>{formatNumberFull(conversionData.viewConversions)}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Conversion Rate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#374151' }}>{conversionData.conversionRate?.toFixed(2) || '0.00'}%</div>
                  </div>
                </div>
              </DraggableReportSection>
            );
          
          case 'domains':
            if (domainPerformance.length === 0) return null;
            return (
              <DraggableReportSection {...sectionProps} title={`Domain/Placement Performance (${domainPerformance.length})`} icon={Globe} iconColor="#6366f1">
                <div style={{ maxHeight: '350px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Domain/App</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>CTR</th>
                        {showSpendData && <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {domainPerformance.slice(0, 20).map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Globe size={14} color="#6366f1" />
                              {d.domain}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(d.impressions)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumberFull(d.clicks)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{d.ctr?.toFixed(2) || '0.00'}%</td>
                          {showSpendData && <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(d.spend)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {domainPerformance.length > 20 && (
                  <div style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280', fontSize: '0.75rem' }}>
                    Showing top 20 of {domainPerformance.length} domains
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
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
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
                        // Handle different field names from Simpli.fi API
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
                src={mediaUrl} 
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
  
  const sortedLocations = [...locations].sort((a, b) => b.impressions - a.impressions);
  const displayLocations = expanded ? sortedLocations : sortedLocations.slice(0, 3);
  const hasMore = sortedLocations.length > 3;
  
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Impressions</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Clicks</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>CTR</th>
            {showSpend && <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spend</th>}
          </tr>
        </thead>
        <tbody>
          {displayLocations.map((loc, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 500 }}>{loc.city || loc.metro || 'Unknown'}</div>
                    {loc.region && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{loc.region}, {loc.country}</div>}
                  </div>
                </div>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(loc.impressions)}</td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatNumber(loc.clicks)}</td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{loc.ctr?.toFixed(2) || '0.00'}%</td>
              {showSpend && <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(loc.spend)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            marginTop: '0.75rem',
            padding: '0.5rem',
            background: '#f0fdf4',
            border: '1px solid #a7f3d0',
            borderRadius: '0.5rem',
            color: '#065f46',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {expanded ? (
            <>Show Less <ChevronUp size={16} /></>
          ) : (
            <>View All {sortedLocations.length} Locations <ChevronDown size={16} /></>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================
// EXPANDABLE GEO-FENCE LIST - Shows top 3 with View All
// ============================================
function ExpandableGeoFenceList({ fences, formatNumber }) {
  const [expanded, setExpanded] = useState(false);
  
  const displayFences = expanded ? fences : fences.slice(0, 4);
  const hasMore = fences.length > 4;
  
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {displayFences.map((fence, i) => (
          <div key={fence.id || i} style={{ 
            padding: '1rem', 
            background: '#f9fafb', 
            borderRadius: '0.5rem', 
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MapPin size={18} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827', marginBottom: '0.25rem' }}>
                  {fence.name || 'Unnamed Location'}
                </div>
                {fence.address && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>{fence.address}</div>
                )}
                {fence.impressions > 0 && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase' }}>Impressions</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d9488', fontFamily: 'monospace' }}>
                        {formatNumber(fence.impressions)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase' }}>Clicks</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6', fontFamily: 'monospace' }}>
                        {formatNumber(fence.clicks)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase' }}>CTR</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', fontFamily: 'monospace' }}>
                        {fence.ctr?.toFixed(2) || '0.00'}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            marginTop: '0.75rem',
            padding: '0.5rem',
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '0.5rem',
            color: '#0f766e',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {expanded ? (
            <>Show Less <ChevronUp size={16} /></>
          ) : (
            <>View All {fences.length} Geo-Fences <ChevronDown size={16} /></>
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
  const percentage = vcr ? (vcr * 100).toFixed(1) : 0;
  const isGood = vcr >= 0.8; // 80%+ is considered good
  const color = isGood ? '#10b981' : vcr >= 0.6 ? '#f59e0b' : '#ef4444';
  
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'sales' });

  useEffect(() => { api.get('/api/users').then(setUsers).catch(console.error).finally(() => setLoading(false)); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users', newUser);
      setShowModal(false);
      setUsers(await api.get('/api/users'));
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div><h1>Users</h1><p style={{ color: '#6b7280' }}>Manage team members</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: '0.625rem 1.25rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Add User</button>
      </div>
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <option value="sales">Sales (View Only)</option>
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
      const response = await fetch(`/api/public/client/${token}`);
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
      const response = await fetch(`/api/public/client/${token}/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      
      setCampaigns(data.campaigns || []);
      
      // Create stats map by campaign id
      const statsMap = {};
      (data.campaignStats || []).forEach(s => {
        statsMap[s.campaign_id] = s;
      });
      setCampaignStats(statsMap);
      setDailyStats(data.dailyStats || []);
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '0.75rem', padding: '1.5rem', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Total Impressions</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{formatNumber(totalStats.impressions)}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>Total Clicks</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{formatNumber(totalStats.clicks)}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280' }}>Click-Through Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{formatPercent(totalStats.ctr)}</div>
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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/report/:token" element={<PublicReportPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
          <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
          <Route path="/clients/:id/campaigns/:campaignId" element={<ProtectedRoute><CampaignDetailPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
