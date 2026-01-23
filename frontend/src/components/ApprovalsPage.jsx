/**
 * ApprovalsPage.jsx
 * Manager view for pending order approvals
 * Matches existing app styling patterns
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, FileText, 
  User, Building2, DollarSign, Calendar, ChevronRight,
  Eye, MessageSquare
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Auth helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Spinner Icon
const Loader2 = ({ size = 24, style = {} }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={style}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/orders/pending-approvals`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch pending approvals');
      
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error loading approvals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/${selectedOrder.id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes: approvalNotes })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to approve order');
      }
      
      // Remove from list and close modal
      setOrders(orders.filter(o => o.id !== selectedOrder.id));
      setShowApproveModal(false);
      setSelectedOrder(null);
      setApprovalNotes('');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/${selectedOrder.id}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: rejectionReason })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reject order');
      }
      
      // Remove from list and close modal
      setOrders(orders.filter(o => o.id !== selectedOrder.id));
      setShowRejectModal(false);
      setSelectedOrder(null);
      setRejectionReason('');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Styles matching existing app patterns
  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '28px',
      height: '28px',
      padding: '0 8px',
      borderRadius: '9999px',
      background: '#fef3c7',
      color: '#92400e',
      fontSize: '14px',
      fontWeight: '600',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      marginBottom: '16px',
    },
    orderCard: {
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      marginBottom: '16px',
      border: '1px solid #e2e8f0',
      transition: 'box-shadow 0.2s',
    },
    orderHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '20px',
      borderBottom: '1px solid #f1f5f9',
    },
    orderNumber: {
      fontSize: '13px',
      color: '#64748b',
      fontFamily: 'monospace',
    },
    clientName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
      marginTop: '4px',
    },
    submittedBy: {
      fontSize: '14px',
      color: '#64748b',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    orderBody: {
      padding: '20px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
    },
    stat: {
      display: 'flex',
      flexDirection: 'column',
    },
    statLabel: {
      fontSize: '12px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '4px',
    },
    statValue: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
    },
    warningBox: {
      margin: '0 20px 20px',
      padding: '14px 16px',
      background: '#fffbeb',
      border: '1px solid #fcd34d',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e',
    },
    orderFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      background: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.15s',
    },
    approveButton: {
      background: '#10b981',
      color: 'white',
    },
    rejectButton: {
      background: 'white',
      color: '#dc2626',
      border: '1px solid #dc2626',
    },
    viewButton: {
      background: 'white',
      color: '#3b82f6',
      border: '1px solid #e2e8f0',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
    },
    emptyIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      background: '#f0fdf4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '8px',
    },
    emptyText: {
      fontSize: '14px',
      color: '#64748b',
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      background: 'white',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '480px',
      maxHeight: '90vh',
      overflow: 'auto',
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
    },
    modalBody: {
      padding: '24px',
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      background: '#f8fafc',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      fontFamily: 'inherit',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px',
    },
    cancelButton: {
      background: 'white',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Clock size={28} style={{ color: '#f59e0b' }} />
          Pending Approvals
          {orders.length > 0 && (
            <span style={styles.badge}>{orders.length}</span>
          )}
        </h1>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ ...styles.card, padding: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && orders.length === 0 && (
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <CheckCircle size={32} color="#10b981" />
            </div>
            <h2 style={styles.emptyTitle}>All Caught Up!</h2>
            <p style={styles.emptyText}>No orders pending approval. Nice work! 🎉</p>
          </div>
        </div>
      )}

      {/* Order Cards */}
      {orders.map(order => (
        <div key={order.id} style={styles.orderCard}>
          {/* Header */}
          <div style={styles.orderHeader}>
            <div>
              <div style={styles.orderNumber}>{order.order_number}</div>
              <div style={styles.clientName}>{order.client_name}</div>
              <div style={styles.submittedBy}>
                <User size={14} />
                Submitted by {order.submitted_by_name || 'Unknown'} · {getTimeAgo(order.created_at)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={styles.statLabel}>Contract Value</div>
              <div style={{ ...styles.statValue, color: '#10b981', fontSize: '24px' }}>
                {formatCurrency(order.total_value || order.contract_total)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={styles.orderBody}>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Monthly Total</div>
              <div style={styles.statValue}>{formatCurrency(order.monthly_total)}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Term</div>
              <div style={styles.statValue}>
                {order.term_months === 1 ? 'One-Time' : `${order.term_months} Months`}
              </div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Start Date</div>
              <div style={styles.statValue}>{formatDate(order.contract_start_date)}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Items</div>
              <div style={styles.statValue}>{order.item_count} products</div>
            </div>
          </div>

          {/* Price Adjustment Warning */}
          {order.has_price_adjustments && (
            <div style={styles.warningBox}>
              <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ ...styles.warningText, fontWeight: '600', marginBottom: '4px' }}>
                  Price Adjustments Detected
                </div>
                <div style={styles.warningText}>
                  This order contains products priced differently from book value. 
                  Please review before approving.
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={styles.orderFooter}>
            <button
              onClick={() => navigate(`/orders/${order.id}/edit`)}
              style={{ ...styles.button, ...styles.viewButton }}
            >
              <Eye size={16} />
              View Details
            </button>
            <div style={styles.buttonGroup}>
              <button
                onClick={() => {
                  setSelectedOrder(order);
                  setShowRejectModal(true);
                }}
                style={{ ...styles.button, ...styles.rejectButton }}
              >
                <XCircle size={16} />
                Reject
              </button>
              <button
                onClick={() => {
                  setSelectedOrder(order);
                  setShowApproveModal(true);
                }}
                style={{ ...styles.button, ...styles.approveButton }}
              >
                <CheckCircle size={16} />
                Approve
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Approve Modal */}
      {showApproveModal && selectedOrder && (
        <div style={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <CheckCircle size={24} color="#10b981" />
              <span style={styles.modalTitle}>Approve Order</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '16px', color: '#374151' }}>
                You are about to approve order <strong>{selectedOrder.order_number}</strong> for{' '}
                <strong>{selectedOrder.client_name}</strong>.
              </p>
              <p style={{ marginBottom: '20px', color: '#374151' }}>
                Contract value: <strong>{formatCurrency(selectedOrder.total_value || selectedOrder.contract_total)}</strong>
              </p>
              <label style={styles.label}>Notes (optional)</label>
              <textarea
                value={approvalNotes}
                onChange={e => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                style={styles.textarea}
              />
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalNotes('');
                }}
                style={{ ...styles.button, ...styles.cancelButton }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                style={{ ...styles.button, ...styles.approveButton }}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Approve Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <XCircle size={24} color="#dc2626" />
              <span style={styles.modalTitle}>Reject Order</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '16px', color: '#374151' }}>
                You are about to reject order <strong>{selectedOrder.order_number}</strong> for{' '}
                <strong>{selectedOrder.client_name}</strong>.
              </p>
              <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
                The order will be returned to draft status and the sales rep will be notified.
              </p>
              <label style={styles.label}>Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Please explain why this order is being rejected..."
                style={{ ...styles.textarea, borderColor: !rejectionReason.trim() ? '#fca5a5' : '#e2e8f0' }}
                required
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                This reason will be shared with the submitter so they can make corrections.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                style={{ ...styles.button, ...styles.cancelButton }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                style={{ ...styles.button, background: '#dc2626', color: 'white' }}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Reject Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
