import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertCircle, CheckCircle, FileText, DollarSign, Users, Clock, TrendingUp,
  Send, Edit2, AlertTriangle, XCircle, Calendar, Radio, Edit3, Play, ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// API helper
const api = {
  get: async (url) => {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  put: async (url, data) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }
};

// ============================================
// SHARED COMPONENTS
// ============================================
const categoryConfig = {
  'Print': { bg: '#dbeafe', color: '#1e40af', icon: '📰' },
  'Broadcast': { bg: '#fce7f3', color: '#9d174d', icon: '📻' },
  'Podcast': { bg: '#f3e8ff', color: '#7c3aed', icon: '🎙️' },
  'Digital': { bg: '#dcfce7', color: '#166534', icon: '💻' },
  'Events': { bg: '#fef3c7', color: '#92400e', icon: '🎪' },
  'Web': { bg: '#e0e7ff', color: '#3730a3', icon: '🌐' },
  'Social': { bg: '#ffe4e6', color: '#be123c', icon: '📱' },
};

function BrandBubble({ name }) {
  return (
    <span style={{ display: 'inline-block', padding: '0.25rem 0.625rem', background: '#1e3a8a', color: 'white', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, marginRight: '0.375rem', marginBottom: '0.25rem' }}>
      {name}
    </span>
  );
}

function CategoryBubble({ category }) {
  const style = categoryConfig[category] || { bg: '#f3f4f6', color: '#6b7280', icon: '📋' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: style.bg, color: style.color, borderRadius: '0.375rem', fontSize: '0.6875rem', fontWeight: 500, marginRight: '0.375rem' }}>
      <span>{style.icon}</span><span>{category}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    draft: { bg: '#f1f5f9', color: '#64748b' },
    pending_approval: { bg: '#fef3c7', color: '#92400e' },
    approved: { bg: '#dbeafe', color: '#1e40af' },
    sent: { bg: '#e0f2fe', color: '#0369a1' },
    signed: { bg: '#d1fae5', color: '#065f46' },
    active: { bg: '#dcfce7', color: '#166534' },
    pending: { bg: '#fef3c7', color: '#92400e' },
    overdue: { bg: '#fee2e2', color: '#991b1b' },
    paid: { bg: '#d1fae5', color: '#065f46' },
  };
  const style = styles[status] || styles.draft;
  return (
    <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: style.bg, color: style.color, borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'capitalize' }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function ActionCard({ title, count, icon: Icon, color, onClick, subtitle }) {
  return (
    <button onClick={onClick} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        {Icon && <Icon size={20} color={color} />}
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{title}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{count}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>{subtitle}</div>}
    </button>
  );
}

function TaskRow({ task, onComplete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, color: '#111827', marginBottom: '0.25rem' }}>{task.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {task.client_name && <span>{task.client_name} • </span>}
          {task.due_date && <span style={{ color: new Date(task.due_date) < new Date() ? '#dc2626' : '#6b7280' }}>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
        </div>
      </div>
      {onComplete && task.status !== 'completed' && (
        <button onClick={() => onComplete(task.id)} style={{ padding: '0.375rem 0.75rem', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}>✓ Done</button>
      )}
    </div>
  );
}

function OrderRow({ order, onAction }) {
  const items = order.items || [];
  const brands = [...new Set(items?.map(i => i.entity_name || i.e_name).filter(Boolean))];
  const categories = [...new Set(items?.map(i => i.product_category).filter(Boolean))];
  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>{order.client_name}</span>
          <StatusBadge status={order.status} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.25rem' }}>
          {brands.map(b => <BrandBubble key={b} name={b} />)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {categories.map(c => <CategoryBubble key={c} category={c} />)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
          ${parseFloat(order.monthly_total || 0).toLocaleString()}/mo • {order.term_months || 0} months
        </div>
      </div>
      {onAction && <button onClick={() => onAction(order)} style={{ padding: '0.5rem 1rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>View</button>}
    </div>
  );
}

// ============================================
// SUPER ADMIN DASHBOARD
// ============================================
export function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const result = await api.get('/api/dashboard/super-admin'); setData(result); } catch (err) { console.error('Dashboard error:', err); }
    setLoading(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  const ordersByStatus = data?.orderStats?.reduce((acc, s) => { acc[s.status] = { count: parseInt(s.count), value: parseFloat(s.contract_value) }; return acc; }, {}) || {};

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Overview of all operations</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <ActionCard title="Pending Approvals" count={data?.pendingApprovals || 0} icon={AlertCircle} color="#f59e0b" onClick={() => navigate('/orders')} subtitle="Orders needing review" />
        <ActionCard title="Active Orders" count={ordersByStatus.active?.count || 0} icon={CheckCircle} color="#059669" onClick={() => navigate('/orders')} subtitle={`$${(ordersByStatus.active?.value || 0).toLocaleString()} value`} />
        <ActionCard title="Outstanding Invoices" count={parseInt(data?.invoiceStats?.sent || 0) + parseInt(data?.invoiceStats?.overdue || 0)} icon={FileText} color="#3b82f6" onClick={() => navigate('/billing')} subtitle={`$${parseFloat(data?.invoiceStats?.outstanding_balance || 0).toLocaleString()}`} />
        <ActionCard title="Pending Commissions" count={data?.pendingCommissions?.count || 0} icon={DollarSign} color="#8b5cf6" onClick={() => navigate('/commissions')} subtitle={`$${parseFloat(data?.pendingCommissions?.total || 0).toLocaleString()}`} />
        <ActionCard title="Team Members" count={data?.teamActivity?.length || 0} icon={Users} color="#1e3a8a" onClick={() => navigate('/users')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Revenue by Brand</h3></div>
          <div style={{ padding: '0.5rem 0' }}>
            {data?.revenueByEntity?.map((entity, i) => (
              <div key={entity.entity_code || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: i < data.revenueByEntity.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BrandBubble name={entity.entity_code || entity.entity_name} />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{entity.order_count} orders</span>
                </div>
                <span style={{ fontWeight: 600, color: '#059669' }}>${parseFloat(entity.revenue || 0).toLocaleString()}</span>
              </div>
            ))}
            {(!data?.revenueByEntity?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No data</div>}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Orders</h3><Link to="/orders" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none' }}>View All →</Link></div>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {data?.recentOrders?.slice(0, 5).map(order => (
              <div key={order.id} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{order.client_name}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>${parseFloat(order.monthly_total || 0).toLocaleString()}/mo • {order.submitted_by_name}</div>
              </div>
            ))}
            {(!data?.recentOrders?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No recent orders</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// OPERATIONS DASHBOARD (Lalaine)
// ============================================
export function OperationsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const result = await api.get('/api/dashboard/operations'); setData(result); } catch (err) { console.error('Dashboard error:', err); }
    setLoading(false);
  };

  const completeTask = async (taskId) => {
    try { await api.put(`/api/tasks/${taskId}`, { status: 'completed' }); loadData(); } catch (err) { console.error('Task error:', err); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  const summary = data?.summary || {};

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Operations Dashboard</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Your action items and processing queue</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <ActionCard title="Pending Approval" count={summary.pendingApproval || 0} icon={AlertCircle} color="#f59e0b" onClick={() => setActiveTab('orders')} />
        <ActionCard title="Ready to Send" count={summary.readyToSend || 0} icon={Send} color="#3b82f6" onClick={() => setActiveTab('orders')} />
        <ActionCard title="Awaiting Signature" count={summary.awaitingSignature || 0} icon={Edit2} color="#8b5cf6" onClick={() => setActiveTab('orders')} />
        <ActionCard title="Overdue Invoices" count={summary.overdueInvoices || 0} icon={AlertTriangle} color="#dc2626" onClick={() => setActiveTab('invoices')} />
        <ActionCard title="Failed Payments" count={summary.failedPayments || 0} icon={XCircle} color="#dc2626" onClick={() => setActiveTab('invoices')} />
        <ActionCard title="Commissions" count={summary.pendingCommissions || 0} icon={DollarSign} color="#059669" onClick={() => setActiveTab('commissions')} />
        <ActionCard title="My Tasks" count={summary.openTasks || 0} icon={CheckCircle} color="#1e3a8a" onClick={() => setActiveTab('tasks')} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['orders', 'invoices', 'commissions', 'tasks'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.5rem 1rem', background: activeTab === tab ? '#1e3a8a' : 'white', color: activeTab === tab ? 'white' : '#374151', border: '1px solid ' + (activeTab === tab ? '#1e3a8a' : '#e5e7eb'), borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>{tab}</button>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        {activeTab === 'orders' && (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {data?.ordersToProcess?.map(order => <OrderRow key={order.id} order={order} onAction={() => navigate('/orders')} />)}
            {(!data?.ordersToProcess?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}><CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} /><div>All caught up!</div></div>}
          </div>
        )}
        {activeTab === 'invoices' && (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {data?.invoicesNeedingAction?.map(inv => (
              <div key={inv.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{inv.client_name} <StatusBadge status={inv.status} /></div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{inv.invoice_number} • ${parseFloat(inv.balance_due || 0).toLocaleString()} due</div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>Action: {inv.action_needed}</div>
                </div>
                <button onClick={() => navigate('/billing')} style={{ padding: '0.5rem 1rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>View</button>
              </div>
            ))}
            {(!data?.invoicesNeedingAction?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>All invoices in good standing!</div>}
          </div>
        )}
        {activeTab === 'commissions' && (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {data?.pendingCommissions?.map(comm => (
              <div key={comm.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                <div><div style={{ fontWeight: 500 }}>{comm.user_name}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{comm.client_name}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600, color: '#059669' }}>${parseFloat(comm.commission_amount || 0).toLocaleString()}</div></div>
              </div>
            ))}
            {(!data?.pendingCommissions?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No pending commissions</div>}
          </div>
        )}
        {activeTab === 'tasks' && (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {data?.tasks?.map(task => <TaskRow key={task.id} task={task} onComplete={completeTask} />)}
            {(!data?.tasks?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No open tasks</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// RADIO DASHBOARD (Bill)
// ============================================
export function RadioDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const result = await api.get('/api/dashboard/radio'); setData(result); } catch (err) { console.error('Dashboard error:', err); }
    setLoading(false);
  };

  const completeTask = async (taskId) => {
    try { await api.put(`/api/tasks/${taskId}`, { status: 'completed' }); loadData(); } catch (err) { console.error('Task error:', err); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Radio size={28} color="#1e3a8a" /><h1 style={{ margin: 0 }}>Radio & Production</h1></div>
        <p style={{ color: '#6b7280', margin: 0 }}>WSIC Broadcast orders and production queue</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '0.75rem', padding: '1.25rem', color: 'white' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>WSIC Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${parseFloat(data?.wsicRevenue?.monthly_revenue || 0).toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{data?.wsicRevenue?.order_count || 0} active orders</div>
        </div>
        <ActionCard title="Active Broadcast" count={data?.summary?.activeOrders || 0} icon={Radio} color="#059669" />
        <ActionCard title="Production Queue" count={data?.summary?.pendingProduction || 0} icon={Play} color="#f59e0b" />
        <ActionCard title="Starting Soon" count={data?.summary?.upcomingStarts || 0} icon={Calendar} color="#8b5cf6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Production Queue</h3></div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {data?.productionTasks?.map(task => <TaskRow key={task.id} task={task} onComplete={completeTask} />)}
            {(!data?.productionTasks?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No pending tasks</div>}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Active Broadcast Orders</h3></div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {data?.broadcastOrders?.map(order => <OrderRow key={order.id} order={order} onAction={() => navigate('/orders')} />)}
            {(!data?.broadcastOrders?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No active orders</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATIVE DASHBOARD (Leslie)
// ============================================
export function CreativeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const result = await api.get('/api/dashboard/creative'); setData(result); } catch (err) { console.error('Dashboard error:', err); }
    setLoading(false);
  };

  const completeTask = async (taskId) => {
    try { await api.put(`/api/tasks/${taskId}`, { status: 'completed' }); loadData(); } catch (err) { console.error('Task error:', err); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Edit3 size={28} color="#ec4899" /><h1 style={{ margin: 0 }}>Creative & Editorial</h1></div>
        <p style={{ color: '#6b7280', margin: 0 }}>Lake Norman Woman print ads and creative briefs</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <ActionCard title="Open Tasks" count={data?.summary?.openTasks || 0} icon={CheckCircle} color="#ec4899" />
        <ActionCard title="Print Orders" count={data?.summary?.activePrintOrders || 0} icon={FileText} color="#1e40af" />
        <ActionCard title="Needs Creative Brief" count={data?.summary?.needsCreativeBrief || 0} icon={Edit3} color="#f59e0b" subtitle="For Bill's production" />
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>📰 Ad Breakdown</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {data?.adBreakdown?.slice(0, 4).map(ad => <span key={ad.product_name} style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', background: '#f3f4f6', borderRadius: '0.25rem' }}>{ad.product_name}: {ad.count}</span>)}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>My Tasks</h3></div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {data?.tasks?.map(task => <TaskRow key={task.id} task={task} onComplete={completeTask} />)}
            {(!data?.tasks?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No open tasks</div>}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>📻 Needs Creative Brief → Bill</h3></div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {data?.broadcastNeedingCreative?.map(order => (
              <div key={order.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{order.client_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{order.primary_contact_email}</div>
                <CategoryBubble category="Broadcast" />
              </div>
            ))}
            {(!data?.broadcastNeedingCreative?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>All briefs complete</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EVENTS DASHBOARD (Erin)
// ============================================
export function EventsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const result = await api.get('/api/dashboard/events'); setData(result); } catch (err) { console.error('Dashboard error:', err); }
    setLoading(false);
  };

  const completeTask = async (taskId) => {
    try { await api.put(`/api/tasks/${taskId}`, { status: 'completed' }); loadData(); } catch (err) { console.error('Task error:', err); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ fontSize: '1.75rem' }}>🎪</span><h1 style={{ margin: 0 }}>Events Dashboard</h1></div>
        <p style={{ color: '#6b7280', margin: 0 }}>Manage event orders and client relationships</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <ActionCard title="Total Event Orders" count={data?.summary?.totalEvents || 0} icon={Calendar} color="#92400e" />
        <ActionCard title="Upcoming Events" count={data?.summary?.upcomingCount || 0} icon={Clock} color="#059669" />
        <ActionCard title="Event Clients" count={data?.summary?.totalClients || 0} icon={Users} color="#1e3a8a" />
        <ActionCard title="My Tasks" count={data?.summary?.openTasks || 0} icon={CheckCircle} color="#8b5cf6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>🎪 Event Orders</h3></div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {data?.eventOrders?.map(order => <OrderRow key={order.id} order={order} onAction={() => navigate('/orders')} />)}
            {(!data?.eventOrders?.length) && <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No event orders</div>}
          </div>
        </div>
        <div>
          <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>My Tasks</h3></div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {data?.tasks?.slice(0, 5).map(task => <TaskRow key={task.id} task={task} onComplete={completeTask} />)}
              {(!data?.tasks?.length) && <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No tasks</div>}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ margin: 0, fontSize: '1rem' }}>Top Event Clients</h3></div>
            {data?.eventClients?.slice(0, 5).map((client, i) => (
              <div key={client.id} style={{ padding: '0.75rem 1.25rem', borderBottom: i < 4 ? '1px solid #f9fafb' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                <div><div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{client.business_name}</div><div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{client.order_count} orders</div></div>
                <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.875rem' }}>${parseFloat(client.total_revenue || 0).toLocaleString()}</span>
              </div>
            ))}
            {(!data?.eventClients?.length) && <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No clients yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SALES DASHBOARD
// ============================================
export function SalesDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const result = await api.get('/api/dashboard/sales'); setData(result); } catch (err) { console.error('Dashboard error:', err); }
    setLoading(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  const pipeline = data?.pipelineSummary || {};
  const commissions = data?.commissions || {};

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>My Dashboard</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderRadius: '0.75rem', padding: '1.25rem', color: 'white' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>YTD Commissions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${parseFloat(commissions.ytd_approved || 0).toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>${parseFloat(commissions.pending || 0).toLocaleString()} pending</div>
        </div>
        <ActionCard title="My Clients" count={data?.summary?.totalClients || 0} icon={Users} color="#1e3a8a" onClick={() => setActiveTab('clients')} />
        <ActionCard title="Pipeline" count={data?.summary?.pipelineOrders || 0} icon={TrendingUp} color="#f59e0b" onClick={() => setActiveTab('pipeline')} subtitle={`$${parseFloat(data?.pipelineValue || 0).toLocaleString()}`} />
        <ActionCard title="Active Orders" count={data?.summary?.activeOrders || 0} icon={CheckCircle} color="#059669" />
        <ActionCard title="Pending Approval" count={pipeline.pending_approval || 0} icon={Clock} color="#8b5cf6" />
      </div>
      
      {/* Pipeline Funnel */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Pipeline Funnel</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { status: 'draft', label: 'Draft', color: '#94a3b8' },
            { status: 'pending_approval', label: 'Pending', color: '#f59e0b' },
            { status: 'approved', label: 'Approved', color: '#3b82f6' },
            { status: 'sent', label: 'Sent', color: '#8b5cf6' },
            { status: 'signed', label: 'Signed', color: '#10b981' },
            { status: 'active', label: 'Active', color: '#059669' }
          ].map((stage, i) => (
            <div key={stage.status} style={{ flex: 1, textAlign: 'center', padding: '0.75rem 0.5rem', background: stage.color + '15', borderRadius: '0.5rem', position: 'relative' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stage.color }}>{pipeline[stage.status] || 0}</div>
              <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{stage.label}</div>
              {i < 5 && <div style={{ position: 'absolute', right: '-0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#d1d5db', zIndex: 1 }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['pipeline', 'clients', 'commissions'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.5rem 1rem', background: activeTab === tab ? '#1e3a8a' : 'white', color: activeTab === tab ? 'white' : '#374151', border: '1px solid ' + (activeTab === tab ? '#1e3a8a' : '#e5e7eb'), borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
            {tab === 'pipeline' ? 'My Orders' : tab === 'clients' ? 'My Clients' : 'My Commissions'}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        {activeTab === 'pipeline' && (
          <>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>My Orders</h3>
              <Link to="/orders/new" style={{ padding: '0.5rem 1rem', background: '#1e3a8a', color: 'white', borderRadius: '0.5rem', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 500 }}>+ New Order</Link>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {data?.myOrders?.map(order => <OrderRow key={order.id} order={order} onAction={() => navigate('/orders')} />)}
              {(!data?.myOrders?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No orders yet</div>}
            </div>
          </>
        )}
        {activeTab === 'clients' && (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {data?.myClients?.map(client => (
              <Link key={client.id} to={`/clients/${client.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: 'inherit' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{client.business_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{client.active_orders} active orders • ${parseFloat(client.total_contract_value || 0).toLocaleString()}</div>
                </div>
                <ChevronRight size={18} color="#9ca3af" />
              </Link>
            ))}
            {(!data?.myClients?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No clients assigned</div>}
          </div>
        )}
        {activeTab === 'commissions' && (
          <>
            <div style={{ padding: '1rem 1.25rem', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div><div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>YTD Approved</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>${parseFloat(commissions.ytd_approved || 0).toLocaleString()}</div></div>
                <div><div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>Pending</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>${parseFloat(commissions.pending || 0).toLocaleString()}</div></div>
                <div><div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>YTD Paid</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>${parseFloat(commissions.ytd_paid || 0).toLocaleString()}</div></div>
              </div>
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {commissions.recent?.map(comm => (
                <div key={comm.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                  <div><div style={{ fontWeight: 500 }}>{comm.client_name}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{comm.rate_type} @ {comm.commission_rate}%</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600, color: '#059669' }}>${parseFloat(comm.commission_amount || 0).toLocaleString()}</div><StatusBadge status={comm.status} /></div>
                </div>
              ))}
              {(!commissions.recent?.length) && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No commissions yet</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD ROUTER (Main Export)
// ============================================
export default function RoleDashboardRouter({ user, SimplifiDashboard }) {
  const [dashboardType, setDashboardType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectDashboard = async () => {
      try {
        const data = await api.get('/api/dashboard/my-type');
        setDashboardType(data.dashboardType);
      } catch (err) {
        // Fallback to client-side detection
        const email = user?.email?.toLowerCase();
        if (email === 'bill@wsicnews.com') setDashboardType('radio');
        else if (email === 'admin@wsicnews.com') setDashboardType('operations');
        else if (email === 'leslie@lakenormanwoman.com') setDashboardType('creative');
        else if (email === 'erin@lakenormanwoman.com') setDashboardType('events');
        else if (user?.is_super_admin) setDashboardType('super_admin');
        else if (user?.is_sales) setDashboardType('sales');
        else setDashboardType('simpli');
      }
      setLoading(false);
    };
    detectDashboard();
  }, [user]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>;

  switch (dashboardType) {
    case 'super_admin': return <SuperAdminDashboard />;
    case 'operations': return <OperationsDashboard />;
    case 'radio': return <RadioDashboard />;
    case 'creative': return <CreativeDashboard />;
    case 'events': return <EventsDashboard />;
    case 'sales': return <SalesDashboard user={user} />;
    default: return SimplifiDashboard ? <SimplifiDashboard /> : <SuperAdminDashboard />;
  }
}
