import React from 'react';
import { useNavigate } from 'react-router-dom';

// Icons
const Icons = {
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  XCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
};

export default function OrderTypeSelector() {
  const navigate = useNavigate();

  const orderTypes = [
    {
      id: 'standard',
      title: 'New Order',
      subtitle: 'Electronic Signature',
      description: 'Create a new advertising order with electronic signing. Client will receive an email to review and sign the contract online.',
      icon: Icons.FileText,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      route: '/orders/new',
      badge: null,
    },
    {
      id: 'upload',
      title: 'Upload Order',
      subtitle: 'Pre-Signed Contract',
      description: 'Upload an already-signed contract PDF. Use this when the client has already signed a paper contract.',
      icon: Icons.Upload,
      color: '#10b981',
      bgColor: '#ecfdf5',
      route: '/orders/new/upload',
      badge: null,
    },
    {
      id: 'change',
      title: 'Change Order',
      subtitle: 'Electronic Signature',
      description: 'Modify an existing active order. Changes require client signature to take effect.',
      icon: Icons.Edit,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      route: '/orders/new/change',
      badge: null,
    },
    {
      id: 'change-upload',
      title: 'Change Order',
      subtitle: 'Upload Signed Document',
      description: 'Upload a pre-signed change order document for an existing contract.',
      icon: Icons.Edit,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      route: '/orders/new/change-upload',
      badge: 'Upload',
    },
    {
      id: 'kill',
      title: 'Kill Order',
      subtitle: 'Electronic Signature',
      description: 'Cancel an existing active order. Cancellation requires client signature to confirm.',
      icon: Icons.XCircle,
      color: '#ef4444',
      bgColor: '#fef2f2',
      route: '/orders/new/kill',
      badge: null,
    },
    {
      id: 'kill-upload',
      title: 'Kill Order',
      subtitle: 'Upload Signed Document',
      description: 'Upload a pre-signed cancellation document for an existing contract.',
      icon: Icons.XCircle,
      color: '#ef4444',
      bgColor: '#fef2f2',
      route: '/orders/new/kill-upload',
      badge: 'Upload',
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/orders')}
          style={styles.backButton}
        >
          <Icons.ArrowLeft />
          <span>Back to Orders</span>
        </button>
        <div>
          <h1 style={styles.title}>Create New Order</h1>
          <p style={styles.subtitle}>Select the type of order you want to create</p>
        </div>
      </div>

      {/* Order Type Cards */}
      <div style={styles.grid}>
        {orderTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => navigate(type.route)}
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = type.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {/* Badge */}
            {type.badge && (
              <span style={{
                ...styles.badge,
                backgroundColor: type.bgColor,
                color: type.color,
              }}>
                {type.badge}
              </span>
            )}

            {/* Icon */}
            <div style={{
              ...styles.iconWrapper,
              backgroundColor: type.bgColor,
              color: type.color,
            }}>
              <type.icon />
            </div>

            {/* Content */}
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{type.title}</h3>
              <p style={{
                ...styles.cardSubtitle,
                color: type.color,
              }}>
                {type.subtitle}
              </p>
              <p style={styles.cardDescription}>{type.description}</p>
            </div>

            {/* Arrow */}
            <div style={styles.arrow}>
              <Icons.ChevronRight />
            </div>
          </button>
        ))}
      </div>

      {/* Help Section */}
      <div style={styles.helpSection}>
        <h3 style={styles.helpTitle}>Need Help?</h3>
        <div style={styles.helpGrid}>
          <div style={styles.helpCard}>
            <strong>New Order</strong>
            <p>Use this for brand new client contracts that will be signed electronically.</p>
          </div>
          <div style={styles.helpCard}>
            <strong>Upload Order</strong>
            <p>Use when you have a physical signed contract that needs to be entered into the system.</p>
          </div>
          <div style={styles.helpCard}>
            <strong>Change Order</strong>
            <p>Modify pricing, products, or terms on an existing active contract.</p>
          </div>
          <div style={styles.helpCard}>
            <strong>Kill Order</strong>
            <p>Cancel an active contract before its natural end date.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
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
    transition: 'color 0.15s',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
    marginBottom: '48px',
  },
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '24px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  badge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '13px',
    fontWeight: '500',
    margin: '0 0 8px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
  arrow: {
    display: 'flex',
    alignItems: 'center',
    color: '#94a3b8',
    flexShrink: 0,
    marginTop: '16px',
  },
  helpSection: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  helpTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  helpGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  helpCard: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.6',
  },
};
