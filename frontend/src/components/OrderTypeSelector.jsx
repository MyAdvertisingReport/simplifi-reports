import React from 'react';
import { useNavigate } from 'react-router-dom';

// Icons
const Icons = {
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  XCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  ),
  PenLine: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
};

export default function OrderTypeSelector() {
  const navigate = useNavigate();

  const columns = [
    {
      title: 'New Order',
      description: 'Create a new advertising contract',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      options: [
        {
          id: 'standard',
          label: 'For Electronic Signature',
          sublabel: 'Client signs digitally via email',
          icon: Icons.PenLine,
          route: '/orders/new',
        },
        {
          id: 'upload',
          label: 'Form Already Signed',
          sublabel: 'Upload pre-signed PDF',
          icon: Icons.Upload,
          route: '/orders/new/upload',
        },
      ],
    },
    {
      title: 'Change Order',
      description: 'Modify an existing contract',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      options: [
        {
          id: 'change',
          label: 'For Electronic Signature',
          sublabel: 'Client signs digitally via email',
          icon: Icons.PenLine,
          route: '/orders/new/change',
        },
        {
          id: 'change-upload',
          label: 'Form Already Signed',
          sublabel: 'Upload pre-signed PDF',
          icon: Icons.Upload,
          route: '/orders/new/change-upload',
        },
      ],
    },
    {
      title: 'Kill Order',
      description: 'Cancel an existing contract',
      color: '#ef4444',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      options: [
        {
          id: 'kill',
          label: 'For Electronic Signature',
          sublabel: 'Client signs digitally via email',
          icon: Icons.PenLine,
          route: '/orders/new/kill',
        },
        {
          id: 'kill-upload',
          label: 'Form Already Signed',
          sublabel: 'Upload pre-signed PDF',
          icon: Icons.Upload,
          route: '/orders/new/kill-upload',
        },
      ],
    },
  ];

  const getColumnIcon = (title) => {
    if (title === 'New Order') return <Icons.FileText />;
    if (title === 'Change Order') return <Icons.Edit />;
    return <Icons.XCircle />;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/orders')} style={styles.backButton}>
          <Icons.ArrowLeft />
          <span>Back to Orders</span>
        </button>
        <div>
          <h1 style={styles.title}>Create New Order</h1>
          <p style={styles.subtitle}>Select the type of order you want to create</p>
        </div>
      </div>

      {/* Three Column Layout */}
      <div style={styles.columnsGrid}>
        {columns.map((column) => (
          <div key={column.title} style={styles.column}>
            {/* Column Header */}
            <div style={{
              ...styles.columnHeader,
              backgroundColor: column.bgColor,
              borderColor: column.borderColor,
            }}>
              <div style={{ ...styles.columnIcon, color: column.color }}>
                {getColumnIcon(column.title)}
              </div>
              <div>
                <h2 style={{ ...styles.columnTitle, color: column.color }}>{column.title}</h2>
                <p style={styles.columnDescription}>{column.description}</p>
              </div>
            </div>

            {/* Options */}
            <div style={styles.optionsContainer}>
              {column.options.map((option, idx) => (
                <button
                  key={option.id}
                  onClick={() => navigate(option.route)}
                  style={{
                    ...styles.optionCard,
                    borderTop: idx === 0 ? 'none' : '1px solid #e2e8f0',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = column.bgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{ ...styles.optionIcon, backgroundColor: column.bgColor, color: column.color }}>
                    <option.icon />
                  </div>
                  <div style={styles.optionContent}>
                    <span style={styles.optionLabel}>{option.label}</span>
                    <span style={styles.optionSublabel}>{option.sublabel}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div style={styles.helpSection}>
        <h3 style={styles.helpTitle}>Quick Guide</h3>
        <div style={styles.helpGrid}>
          <div style={styles.helpCard}>
            <div style={{ ...styles.helpDot, backgroundColor: '#3b82f6' }}></div>
            <div>
              <strong>New Order</strong>
              <p>For brand new client contracts</p>
            </div>
          </div>
          <div style={styles.helpCard}>
            <div style={{ ...styles.helpDot, backgroundColor: '#f59e0b' }}></div>
            <div>
              <strong>Change Order</strong>
              <p>Modify pricing, products, or terms</p>
            </div>
          </div>
          <div style={styles.helpCard}>
            <div style={{ ...styles.helpDot, backgroundColor: '#ef4444' }}></div>
            <div>
              <strong>Kill Order</strong>
              <p>Cancel before contract end date</p>
            </div>
          </div>
          <div style={styles.helpCard}>
            <div style={{ ...styles.helpDot, backgroundColor: '#8b5cf6' }}></div>
            <div>
              <strong>Electronic vs Upload</strong>
              <p>Use upload when form is already signed</p>
            </div>
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
  columnsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    marginBottom: '48px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderBottom: '1px solid',
  },
  columnIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    flexShrink: 0,
  },
  columnTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  columnDescription: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 20px',
    background: 'white',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    width: '100%',
  },
  optionIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  optionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  optionLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  optionSublabel: {
    fontSize: '13px',
    color: '#64748b',
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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  helpCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  helpDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '6px',
    flexShrink: 0,
  },
};

// Add responsive styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 900px) {
    .order-type-columns { grid-template-columns: 1fr !important; }
  }
`;
document.head.appendChild(styleSheet);
