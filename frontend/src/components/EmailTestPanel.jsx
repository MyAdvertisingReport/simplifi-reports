/**
 * EmailTestPanel.jsx
 * Admin component for testing email functionality
 * 
 * Add to your Settings or Admin page
 */

import React, { useState, useEffect } from 'react';
import { api } from '../App'; // Adjust import path as needed
import { Mail, CheckCircle, XCircle, Loader2, AlertCircle, Send } from 'lucide-react';

export default function EmailTestPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Check email status on mount
  useEffect(() => {
    checkEmailStatus();
  }, []);

  const checkEmailStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/email/status');
      setStatus(response);
    } catch (error) {
      console.error('Failed to check email status:', error);
      setStatus({ 
        configured: false, 
        error: error.message,
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (e) => {
    e.preventDefault();
    
    if (!testEmail) {
      setResult({ success: false, error: 'Please enter an email address' });
      return;
    }

    try {
      setSending(true);
      setResult(null);
      
      const response = await api.post('/api/email/test', { to: testEmail });
      setResult(response);
    } catch (error) {
      console.error('Test email failed:', error);
      setResult({ 
        success: false, 
        error: error.message || 'Failed to send test email'
      });
    } finally {
      setSending(false);
    }
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  };

  const statusBadge = (configured) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: '500',
    background: configured ? '#dcfce7' : '#fef2f2',
    color: configured ? '#166534' : '#991b1b'
  });

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Loader2 size={20} className="spin" />
          <span>Checking email configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mail size={24} style={{ color: '#1e3a8a' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Email Configuration</h3>
        </div>
        <span style={statusBadge(status?.configured)}>
          {status?.configured ? (
            <>
              <CheckCircle size={14} />
              Ready
            </>
          ) : (
            <>
              <XCircle size={14} />
              Not Configured
            </>
          )}
        </span>
      </div>

      {/* Status Details */}
      <div style={{ 
        background: '#f9fafb', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Provider:</span>
            <span style={{ fontWeight: '500' }}>{status?.provider || 'Unknown'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Service Loaded:</span>
            <span style={{ fontWeight: '500', color: status?.serviceLoaded ? '#166534' : '#991b1b' }}>
              {status?.serviceLoaded ? 'Yes' : 'No'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>API Key:</span>
            <span style={{ fontWeight: '500', color: status?.apiKeyConfigured ? '#166534' : '#991b1b' }}>
              {status?.apiKeyConfigured ? 'Configured' : 'Missing'}
            </span>
          </div>
        </div>
        
        {status?.fromAddresses && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ color: '#6b7280', marginBottom: '8px' }}>From Addresses:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
              {Object.entries(status.fromAddresses).map(([key, value]) => (
                <div key={key}>
                  <span style={{ color: '#6b7280' }}>{key}:</span>{' '}
                  <span style={{ fontWeight: '500' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status?.error && (
          <div style={{ 
            marginTop: '12px', 
            padding: '12px', 
            background: '#fef2f2', 
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '13px'
          }}>
            <strong>Error:</strong> {status.error}
          </div>
        )}
      </div>

      {/* Test Email Form */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Send Test Email</h4>
        
        <form onSubmit={sendTestEmail}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Recipient Email</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              style={inputStyle}
              disabled={!status?.configured}
            />
          </div>

          <button
            type="submit"
            disabled={!status?.configured || sending}
            style={{
              ...buttonStyle,
              opacity: (!status?.configured || sending) ? 0.6 : 1,
              cursor: (!status?.configured || sending) ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? (
              <>
                <Loader2 size={16} className="spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Test Email
              </>
            )}
          </button>
        </form>

        {/* Result Message */}
        {result && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: result.success ? '#dcfce7' : '#fef2f2',
            color: result.success ? '#166534' : '#991b1b'
          }}>
            {result.success ? (
              <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div>
              <div style={{ fontWeight: '500' }}>
                {result.success ? 'Email Sent Successfully!' : 'Failed to Send Email'}
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                {result.success 
                  ? `Message ID: ${result.messageId}` 
                  : result.error}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      {!status?.configured && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#fffbeb',
          borderRadius: '8px',
          border: '1px solid #fcd34d'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px',
            color: '#92400e'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Configuration Required</div>
              <div style={{ fontSize: '14px' }}>
                To enable email functionality:
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li>Set up a <a href="https://postmark.com" target="_blank" rel="noopener" style={{ color: '#1e3a8a' }}>Postmark</a> account</li>
                  <li>Verify your sending domain (myadvertisingreport.com)</li>
                  <li>Add <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>POSTMARK_API_KEY</code> to your environment variables</li>
                  <li>Redeploy your server</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
