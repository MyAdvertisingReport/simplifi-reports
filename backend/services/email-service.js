/**
 * Email Service - Postmark Integration
 * Handles all transactional emails for the advertising platform
 * 
 * Emails sent from:
 * - orders@myadvertisingreport.com - Order confirmations, signature requests
 * - billing@myadvertisingreport.com - Invoices, payment receipts
 * - noreply@myadvertisingreport.com - System notifications
 */

const postmark = require('postmark');

// Initialize Postmark client with defensive check
let client = null;
if (process.env.POSTMARK_API_KEY) {
  client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  console.log('✓ Postmark email client initialized');
} else {
  console.warn('⚠ POSTMARK_API_KEY not set - email functionality disabled');
}

// Email addresses
const FROM_ADDRESSES = {
  orders: 'WSIC Advertising <orders@myadvertisingreport.com>',
  billing: 'WSIC Billing <billing@myadvertisingreport.com>',
  noreply: 'WSIC <noreply@myadvertisingreport.com>'
};

// Base URL for links in emails
const BASE_URL = process.env.BASE_URL || 'https://myadvertisingreport.com';

/**
 * Send an email via Postmark
 */
async function sendEmail({ to, from = FROM_ADDRESSES.orders, subject, htmlBody, textBody, tag, metadata }) {
  // Check if client is initialized
  if (!client) {
    console.error('Email send failed: Postmark client not initialized (missing API key)');
    return { 
      success: false, 
      error: 'Email service not configured - POSTMARK_API_KEY is missing'
    };
  }

  try {
    const result = await client.sendEmail({
      From: from,
      To: to,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody || stripHtml(htmlBody),
      Tag: tag,
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
      Metadata: metadata || {}
    });
    
    console.log(`[Email] ✓ Sent successfully: ${result.MessageID} to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('[Email] ✗ Failed to send:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Email template wrapper with consistent styling
 */
function emailTemplate({ title, preheader, content, footerText }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background-color: #1e3a8a; padding: 32px; text-align: center; }
    .header h1 { color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600; }
    .header p { color: #e0e7ff !important; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; background-color: #ffffff; color: #1f2937; }
    .body p { color: #374151; line-height: 1.6; }
    .footer { padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #6b7280; }
    .button { display: inline-block; padding: 14px 32px; background-color: #1e3a8a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .button:hover { background-color: #1e40af; }
    .button-secondary { background-color: #059669; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; }
    .details-table td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #374151; }
    .details-table td:first-child { color: #6b7280; font-size: 14px; }
    .details-table td:last-child { text-align: right; font-weight: 500; color: #1f2937; }
    .amount { font-size: 28px; font-weight: 700; color: #1e3a8a; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-signed { background: #dbeafe; color: #1e40af; }
    .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
    .text-muted { color: #6b7280; font-size: 14px; }
    .text-small { font-size: 13px; }
    a { color: #3b82f6; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
  </style>
</head>
<body>
  <div class="preheader">${preheader || ''}</div>
  <div class="container">
    <div class="card">
      ${content}
    </div>
    <div style="text-align: center; padding: 24px; font-size: 12px; color: #9ca3af;">
      ${footerText || '© ' + new Date().getFullYear() + ' WSIC Media Group. All rights reserved.'}
      <br><br>
      <a href="${BASE_URL}/terms" style="color: #9ca3af;">Terms of Service</a> · 
      <a href="${BASE_URL}/privacy" style="color: #9ca3af;">Privacy Policy</a>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// ORDER WORKFLOW EMAILS
// ============================================================

// Category color mapping for visual indicators
const CATEGORY_COLORS = {
  'Print': { bg: '#dbeafe', color: '#1e40af', icon: '📰' },
  'Broadcast': { bg: '#fce7f3', color: '#9d174d', icon: '📻' },
  'Podcast': { bg: '#f3e8ff', color: '#7c3aed', icon: '🎙️' },
  'Digital': { bg: '#dcfce7', color: '#166534', icon: '💻' },
  'Programmatic': { bg: '#dcfce7', color: '#166534', icon: '📊' },
  'Events': { bg: '#fef3c7', color: '#92400e', icon: '🎪' },
  'Web': { bg: '#e0e7ff', color: '#3730a3', icon: '🌐' },
  'Social': { bg: '#ffe4e6', color: '#be123c', icon: '📱' },
  'Default': { bg: '#f3f4f6', color: '#374151', icon: '📋' }
};

// Get category info with fallback
function getCategoryStyle(category) {
  if (!category) return CATEGORY_COLORS.Default;
  const normalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  return CATEGORY_COLORS[normalized] || CATEGORY_COLORS.Default;
}

// Build product category bubbles HTML
function buildCategoryBubbles(items) {
  if (!items || items.length === 0) return '';
  
  const categories = {};
  items.forEach(item => {
    const cat = item.category || item.product_category || 'Other';
    if (!categories[cat]) {
      categories[cat] = { count: 0, total: 0 };
    }
    categories[cat].count++;
    categories[cat].total += parseFloat(item.line_total || item.monthly_price || 0);
  });
  
  const bubbles = Object.entries(categories).map(([cat, data]) => {
    const style = getCategoryStyle(cat);
    return `
      <div style="display: inline-block; background: ${style.bg}; color: ${style.color}; padding: 8px 16px; border-radius: 20px; margin: 4px; font-size: 13px; font-weight: 600;">
        ${style.icon} ${cat} <span style="opacity: 0.7;">(${data.count})</span>
      </div>
    `;
  }).join('');
  
  return `<div style="margin: 16px 0; text-align: center;">${bubbles}</div>`;
}

// Build brand logo bubbles
function buildBrandBubbles(items) {
  if (!items || items.length === 0) return '';
  
  const brands = {};
  items.forEach(item => {
    const brand = item.entity_name || 'WSIC';
    if (!brands[brand]) {
      brands[brand] = { logo: item.entity_logo, count: 0 };
    }
    brands[brand].count++;
  });
  
  const bubbles = Object.entries(brands).map(([brand, data]) => {
    if (data.logo) {
      return `
        <div style="display: inline-block; background: white; border: 2px solid #e5e7eb; padding: 8px 16px; border-radius: 12px; margin: 4px;">
          <img src="${data.logo}" alt="${brand}" style="height: 32px; max-width: 100px; object-fit: contain; vertical-align: middle;" />
        </div>
      `;
    }
    return `
      <div style="display: inline-block; background: #1e3a8a; color: white; padding: 10px 20px; border-radius: 12px; margin: 4px; font-weight: 600;">
        ${brand}
      </div>
    `;
  }).join('');
  
  return `<div style="margin: 16px 0; text-align: center;">${bubbles}</div>`;
}

/**
 * Send order confirmation to internal team when order is submitted
 */
async function sendOrderSubmittedInternal({ order, submittedBy }) {
  // Build visual elements
  const brandBubbles = buildBrandBubbles(order.items);
  const categoryBubbles = buildCategoryBubbles(order.items);
  
  // Get brand names for subject line
  const brandNames = [];
  const seenBrands = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_name && !seenBrands.has(item.entity_name)) {
        seenBrands.add(item.entity_name);
        brandNames.push(item.entity_name);
      }
    });
  }
  const brandText = brandNames.length > 0 ? brandNames.join(' + ') : 'WSIC';
  
  // Check if WSIC is included (for Bill notification)
  const includesWSIC = brandNames.some(b => b.toLowerCase().includes('wsic'));
  
  // Status styling
  const statusConfig = {
    'pending_approval': { bg: '#fef3c7', color: '#92400e', text: 'Needs Approval', icon: '⏳' },
    'approved': { bg: '#d1fae5', color: '#065f46', text: 'Approved', icon: '✓' },
    'pending': { bg: '#dbeafe', color: '#1e40af', text: 'Processing', icon: '📋' },
    'sent_to_client': { bg: '#e0e7ff', color: '#3730a3', text: 'Sent to Client', icon: '📧' },
  };
  const status = statusConfig[order.status] || statusConfig['pending'];
  
  // Subject with client name and brands
  const subject = `New Order Submitted - ${order.client_name} - ${brandText}`;
  
  // Calculate setup fees
  const setupFees = order.items 
    ? order.items.reduce((sum, item) => sum + parseFloat(item.setup_fee || 0), 0)
    : 0;
  
  // Build product details table
  const productRows = order.items ? order.items.map(item => {
    const style = getCategoryStyle(item.category || item.product_category);
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; background: ${style.bg}; color: ${style.color}; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-right: 6px;">${style.icon}</span>
          <strong>${item.product_name}</strong>
          <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${item.entity_name || ''}</div>
        </td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #1e293b; font-weight: 500;">
          $${parseFloat(item.line_total || item.monthly_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; color: ${parseFloat(item.setup_fee || 0) > 0 ? '#1e293b' : '#94a3b8'};">
          ${parseFloat(item.setup_fee || 0) > 0 ? '$' + parseFloat(item.setup_fee).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
        </td>
      </tr>
    `;
  }).join('') : '';
  
  // Format dates
  const startDate = order.contract_start_date 
    ? new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';
  const endDate = order.contract_end_date 
    ? new Date(order.contract_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600;">📋 New Order Submitted</h1>
      <p style="color: #e0e7ff !important; margin: 8px 0 0; font-size: 14px;">by ${submittedBy.name}</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      
      <!-- Client Name - Hero -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 28px;">${order.client_name}</h2>
        <span style="display: inline-block; background: ${status.bg}; color: ${status.color}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
          ${status.icon} ${status.text}
        </span>
      </div>
      
      <!-- Brand Logos -->
      ${brandBubbles}
      
      <!-- Product Categories -->
      ${categoryBubbles}
      
      <!-- Contract Period -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: center; flex: 1;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Start</div>
          <div style="color: #1e293b; font-weight: 600;">${startDate}</div>
        </div>
        <div style="color: #cbd5e1; font-size: 20px;">→</div>
        <div style="text-align: center; flex: 1;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">End</div>
          <div style="color: #1e293b; font-weight: 600;">${endDate}</div>
        </div>
        <div style="color: #cbd5e1; font-size: 20px;">|</div>
        <div style="text-align: center; flex: 1;">
          <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Term</div>
          <div style="color: #1e293b; font-weight: 600;">${order.term_months} months</div>
        </div>
      </div>
      
      <!-- Product Details Table -->
      <h3 style="color: #1e293b; margin: 24px 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Products</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 12px; text-align: left; color: #64748b; font-weight: 500; font-size: 12px;">PRODUCT</th>
            <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 500; font-size: 12px;">MONTHLY</th>
            <th style="padding: 12px; text-align: right; color: #64748b; font-weight: 500; font-size: 12px;">SETUP</th>
          </tr>
        </thead>
        <tbody>
          ${productRows}
        </tbody>
      </table>
      
      <!-- Totals Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr ${setupFees > 0 ? '1fr' : ''}; gap: 12px; margin: 24px 0;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Monthly Total</div>
          <div style="color: #1e3a8a; font-size: 22px; font-weight: 700;">$${parseFloat(order.monthly_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        ${setupFees > 0 ? `
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Setup Fees</div>
          <div style="color: #1e293b; font-size: 22px; font-weight: 700;">$${setupFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        ` : ''}
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #166534; font-size: 12px; margin-bottom: 4px;">Contract Value</div>
          <div style="color: #166534; font-size: 22px; font-weight: 700;">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      
      ${order.status === 'pending_approval' ? `
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: center;">
          <span style="color: #92400e; font-weight: 600;">⚠️ Price adjustments require management approval</span>
        </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/clients/${order.client_id}" class="button" style="background: #1e3a8a; color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">View Client</a>
      </div>
    </div>
    <div class="footer" style="padding: 20px; background: #f9fafb; text-align: center; color: #64748b; font-size: 13px;">
      ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  `;

  // Build recipient list
  // Always: Justin, Mamie, Lalaine
  // Conditional: Bill (if WSIC included)
  const recipients = [
    'justin@wsicnews.com',
    'mamie@wsicnews.com', 
    'admin@wsicnews.com'  // Lalaine
  ];
  
  if (includesWSIC) {
    recipients.push('bill@wsicnews.com');
  }

  return sendEmail({
    to: recipients.join(', '),
    from: FROM_ADDRESSES.noreply,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `${order.client_name} - ${brandText} - $${parseFloat(order.contract_total || 0).toLocaleString()} contract`, content }),
    tag: 'order-submitted',
    metadata: { orderId: order.id, orderNumber: order.order_number }
  });
}

/**
 * Send approval request to manager when price adjustments need approval
 */
async function sendApprovalRequest({ order, submittedBy, adjustments }) {
  const brandBubbles = buildBrandBubbles(order.items);
  
  const subject = `⚠️ Approval Needed: ${order.client_name} - $${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  
  const adjustmentsList = adjustments.map(adj => {
    const style = getCategoryStyle(adj.category || adj.product_category);
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; background: ${style.bg}; color: ${style.color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px;">${style.icon}</span>
          ${adj.product_name}
        </td>
        <td style="padding: 12px; text-decoration: line-through; color: #9ca3af; text-align: right; border-bottom: 1px solid #e5e7eb;">$${adj.original_price}</td>
        <td style="padding: 12px; color: #dc2626; font-weight: 600; text-align: right; border-bottom: 1px solid #e5e7eb;">$${adj.adjusted_price}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
          <span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${adj.discount_percent ? `-${adj.discount_percent}%` : 'Custom'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const content = `
    <div class="header" style="background: linear-gradient(135deg, #92400e 0%, #f59e0b 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px;">⚠️ Approval Required</h1>
      <p style="color: #fef3c7 !important; margin: 8px 0 0;">Price adjustments need your review</p>
    </div>
    <div class="body" style="padding: 32px; background: white;">
      
      <!-- Client Hero -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 28px;">${order.client_name}</h2>
        <p style="color: #64748b; margin: 0;">Submitted by ${submittedBy.name}</p>
      </div>
      
      ${brandBubbles}
      
      <!-- Contract Value -->
      <div style="background: #fef3c7; border: 2px solid #fcd34d; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="color: #92400e; font-size: 13px; margin-bottom: 4px;">Adjusted Contract Value</div>
        <div style="color: #92400e; font-size: 32px; font-weight: 700;">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      
      <!-- Adjustments Table -->
      <h3 style="color: #1e293b; margin: 24px 0 12px 0; font-size: 16px;">Price Adjustments</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #f8fafc; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #1e293b;">
            <th style="padding: 12px; text-align: left; color: white; font-weight: 500;">Product</th>
            <th style="padding: 12px; text-align: right; color: white; font-weight: 500;">Book</th>
            <th style="padding: 12px; text-align: right; color: white; font-weight: 500;">Adjusted</th>
            <th style="padding: 12px; text-align: right; color: white; font-weight: 500;">Discount</th>
          </tr>
        </thead>
        <tbody style="background: white;">
          ${adjustmentsList}
        </tbody>
      </table>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="${BASE_URL}/approvals" class="button" style="background: #f59e0b; color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">Review & Approve</a>
      </div>
    </div>
    <div class="footer" style="padding: 20px; background: #f9fafb; text-align: center; color: #64748b; font-size: 13px;">
      ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  `;

  return sendEmail({
    to: process.env.MANAGER_EMAIL || process.env.ADMIN_EMAIL || 'justin@wsicnews.com',
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `${order.client_name} - Price adjustments need approval`, content }),
    tag: 'approval-required',
    metadata: { orderId: order.id, orderNumber: order.order_number }
  });
}

/**
 * Send order approved notification
 */
async function sendOrderApproved({ order, approvedBy }) {
  const brandBubbles = buildBrandBubbles(order.items);
  const categoryBubbles = buildCategoryBubbles(order.items);
  
  const subject = `✓ Approved: ${order.client_name} - Ready to Send`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px;">✓ Order Approved</h1>
      <p style="color: #d1fae5 !important; margin: 8px 0 0;">Ready to send to client</p>
    </div>
    <div class="body" style="padding: 32px; background: white;">
      
      <!-- Client Hero -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 28px;">${order.client_name}</h2>
        <span style="display: inline-block; background: #d1fae5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
          ✓ Approved by ${approvedBy.name}
        </span>
      </div>
      
      ${brandBubbles}
      ${categoryBubbles}
      
      <!-- Contract Value -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="color: #166534; font-size: 13px; margin-bottom: 4px;">Contract Value</div>
        <div style="color: #166534; font-size: 32px; font-weight: 700;">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <a href="${BASE_URL}/clients/${order.client_id}" class="button button-secondary" style="background: #059669; color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">Send to Client</a>
      </div>
    </div>
    <div class="footer" style="padding: 20px; background: #f9fafb; text-align: center; color: #64748b; font-size: 13px;">
      ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  `;

  return sendEmail({
    to: order.submitted_by_email || process.env.ADMIN_EMAIL,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `${order.client_name} order is approved and ready to send`, content }),
    tag: 'order-approved',
    metadata: { orderId: order.id, orderNumber: order.order_number }
  });
}

/**
 * Send order rejected notification
 */
async function sendOrderRejected({ order, rejectedBy, reason }) {
  const brandBubbles = buildBrandBubbles(order.items);
  
  const subject = `⚠️ Revision Needed: ${order.client_name}`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px;">Order Returned</h1>
      <p style="color: #fecaca !important; margin: 8px 0 0;">Revisions required</p>
    </div>
    <div class="body" style="padding: 32px; background: white;">
      
      <!-- Client Hero -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 28px;">${order.client_name}</h2>
        <span style="display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
          ↩️ Returned by ${rejectedBy.name}
        </span>
      </div>
      
      ${brandBubbles}
      
      ${reason ? `
        <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <div style="color: #991b1b; font-weight: 600; margin-bottom: 8px;">📝 Reason for Return:</div>
          <p style="margin: 0; color: #7f1d1d; line-height: 1.6;">${reason}</p>
        </div>
      ` : ''}
      
      <!-- Contract Value -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="color: #64748b; font-size: 13px; margin-bottom: 4px;">Contract Value</div>
        <div style="color: #1e293b; font-size: 24px; font-weight: 700;">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <a href="${BASE_URL}/clients/${order.client_id}" class="button" style="background: #1e3a8a; color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">Edit Order</a>
      </div>
    </div>
    <div class="footer" style="padding: 20px; background: #f9fafb; text-align: center; color: #64748b; font-size: 13px;">
      ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  `;

  return sendEmail({
    to: order.submitted_by_email || process.env.ADMIN_EMAIL,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Revisions needed for ${order.client_name}`, content }),
    tag: 'order-rejected',
    metadata: { orderId: order.id, orderNumber: order.order_number }
  });
}

/**
 * Send contract to client for signature
 */
async function sendContractToClient({ order, contact, signingUrl }) {
  // Get unique brand names from items
  const brandNames = [];
  const seenBrands = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_name && !seenBrands.has(item.entity_name)) {
        seenBrands.add(item.entity_name);
        brandNames.push(item.entity_name);
      }
    });
  }
  
  // Get unique logos from items
  const logos = [];
  const seenLogos = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_logo && !seenLogos.has(item.entity_logo)) {
        seenLogos.add(item.entity_logo);
        logos.push({ url: item.entity_logo, name: item.entity_name });
      }
    });
  }

  // Build logo HTML for header
  const logoHtml = logos.length > 0 
    ? logos.map(logo => 
        `<img src="${logo.url}" alt="${logo.name}" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 12px;" />`
      ).join('')
    : '';

  const brandText = brandNames.length > 0 ? brandNames.join(' + ') : 'WSIC';
  
  // Calculate setup fees
  const setupFees = order.items 
    ? order.items.reduce((sum, item) => sum + parseFloat(item.setup_fee || 0), 0)
    : 0;
  const firstMonthTotal = parseFloat(order.monthly_total || 0) + setupFees;

  const subject = `${order.client_name} - Your ${brandText} Advertising Agreement`;
  
  const content = `
    <div class="header" style="background-color: #1e3a8a; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px; text-align: center;">
      ${logoHtml ? `<div style="margin-bottom: 16px;">${logoHtml}</div>` : ''}
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600;">Your Advertising Agreement</h1>
      <p style="color: #e0e7ff !important; margin: 8px 0 0; font-size: 14px;">Ready for your review and signature</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      <p style="color: #374151;">Hi ${contact.first_name || 'there'},</p>
      
      <p style="color: #374151;">Great news! Your advertising agreement with <strong>${brandText}</strong> is ready. Please review the details below and sign electronically to get started.</p>
      
      <table class="details-table" style="background-color: #ffffff; width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Business</td>
          <td style="color: #1f2937; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${order.client_name}</strong></td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Contract Term</td>
          <td style="color: #1f2937; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${order.term_months} month${order.term_months !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Start Date</td>
          <td style="color: #1f2937; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Monthly Investment</td>
          <td style="color: #1f2937;">$${parseFloat(order.monthly_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        ${setupFees > 0 ? `
        <tr>
          <td style="color: #6b7280;">Setup Fees</td>
          <td style="color: #1f2937;">$${setupFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">First Month Total</td>
          <td style="color: #1f2937;"><strong>$${firstMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #6b7280;">Total Agreement Value</td>
          <td class="amount" style="color: #1e3a8a;">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${signingUrl}" class="button button-secondary" style="background: #059669; color: #ffffff !important;">Review & Sign Agreement</a>
      </div>
      
      <p class="text-muted text-small" style="color: #6b7280;">
        This link will expire in 7 days. Please reach out to your Sales Associate directly if you have any questions.
      </p>
    </div>
    <div class="footer" style="color: #6b7280;">
      Thank you for choosing us as your advertising partner!
    </div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Your ${order.term_months}-month advertising agreement is ready to sign`, content }),
    tag: 'contract-sent',
    metadata: { orderId: order.id, orderNumber: order.order_number, clientId: order.client_id }
  });
}

/**
 * Send signature confirmation to client
 */
async function sendSignatureConfirmation({ order, contact, pdfUrl }) {
  // Get brand names from items
  const brandNames = [];
  const seenBrands = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_name && !seenBrands.has(item.entity_name)) {
        seenBrands.add(item.entity_name);
        brandNames.push(item.entity_name);
      }
    });
  }
  const brandText = brandNames.length > 0 ? brandNames.join(' & ') : 'us';

  // Get logos
  const logos = [];
  const seenLogos = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_logo && !seenLogos.has(item.entity_logo)) {
        seenLogos.add(item.entity_logo);
        logos.push({ url: item.entity_logo, name: item.entity_name });
      }
    });
  }
  const logoHtml = logos.length > 0 
    ? logos.map(logo => 
        `<img src="${logo.url}" alt="${logo.name}" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 12px;" />`
      ).join('')
    : '';

  // Build product table
  let productRows = '';
  let monthlyTotal = 0;
  let setupTotal = 0;
  if (order.items && order.items.length > 0) {
    order.items.forEach(item => {
      const monthly = parseFloat(item.line_total || item.monthly_rate || 0);
      const setup = parseFloat(item.setup_fee || 0);
      monthlyTotal += monthly;
      setupTotal += setup;
      productRows += `
        <tr>
          <td style="color: #374151; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${item.product_name}</td>
          <td style="color: #374151; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${item.entity_name || ''}</td>
          <td style="color: #1f2937; padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">$${monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
  }
  const contractTotal = parseFloat(order.contract_total || 0);

  const subject = `Welcome to the Family, ${order.client_name}! 🎉`;
  
  const content = `
    <div class="header" style="background-color: #065f46; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 32px; text-align: center;">
      ${logoHtml ? `<div style="margin-bottom: 16px;">${logoHtml}</div>` : ''}
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600;">🎉 Welcome Aboard!</h1>
      <p style="color: #d1fae5 !important; margin: 8px 0 0; font-size: 14px;">We're thrilled to have you as a partner</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      <p style="color: #374151;">Hi ${contact.first_name || 'there'},</p>
      
      <p style="color: #374151;">
        <strong style="color: #065f46;">Thank you for trusting ${brandText} with your advertising!</strong> 
        We truly appreciate the opportunity to partner with <strong>${order.client_name}</strong>. 
        Our entire team is committed to helping you grow your business and reach your goals.
      </p>
      
      <!-- Your Package -->
      <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #065f46; margin: 0 0 16px 0; font-size: 16px;">📦 Your Advertising Package</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="color: #6b7280; font-weight: 500; font-size: 12px; text-align: left; padding-bottom: 8px; border-bottom: 2px solid #d1fae5;">PRODUCT</th>
              <th style="color: #6b7280; font-weight: 500; font-size: 12px; text-align: left; padding-bottom: 8px; border-bottom: 2px solid #d1fae5;">BRAND</th>
              <th style="color: #6b7280; font-weight: 500; font-size: 12px; text-align: right; padding-bottom: 8px; border-bottom: 2px solid #d1fae5;">MONTHLY</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="color: #065f46; font-weight: 600; padding-top: 12px;">Monthly Investment</td>
              <td style="color: #065f46; font-weight: 700; padding-top: 12px; text-align: right;">$${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${setupTotal > 0 ? `
            <tr>
              <td colspan="2" style="color: #6b7280; padding-top: 4px;">One-Time Setup</td>
              <td style="color: #6b7280; padding-top: 4px; text-align: right;">$${setupTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="color: #065f46; font-weight: 600; padding-top: 4px;">${order.term_months}-Month Contract Total</td>
              <td style="color: #065f46; font-weight: 700; padding-top: 4px; text-align: right;">$${contractTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Your Campaign Starts</td>
          <td style="color: #1f2937; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 12px 0;">Agreement Signed</td>
          <td style="color: #1f2937; padding: 12px 0; text-align: right;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
      </table>
      
      ${pdfUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${pdfUrl}" style="display: inline-block; padding: 14px 32px; background: #6b7280; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600;">Download Your Agreement (PDF)</a>
        </div>
      ` : ''}
      
      <div style="border-top: 1px solid #e5e7eb; margin: 24px 0;"></div>
      
      <h3 style="color: #1f2937;">What's Next?</h3>
      <ul style="color: #374151; line-height: 1.8; padding-left: 20px;">
        <li>Your dedicated Sales Associate will be in touch within 1-2 business days</li>
        <li>We'll work with you to gather any creative assets needed</li>
        <li>Your campaign launches on your scheduled start date</li>
        <li>You'll have access to performance reports through your personalized dashboard</li>
      </ul>
      
      <p style="color: #6b7280; font-size: 14px;">We've attached a copy of your signed agreement for your records.</p>
    </div>
    <div class="footer" style="padding: 24px 32px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 13px;">
      Questions? Your Sales Associate is always just a call or email away. We're here to help!
    </div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Thank you for partnering with ${brandText}! We're excited to help grow your business.`, content }),
    tag: 'contract-signed',
    metadata: { orderId: order.id, orderNumber: order.order_number, clientId: order.client_id }
  });
}

/**
 * Send ACH setup email - sent when client selects ACH but needs to complete bank verification
 */
async function sendAchSetupEmail({ order, contact, achSetupUrl }) {
  // Get brand names
  const brandNames = [];
  const seenBrands = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_name && !seenBrands.has(item.entity_name)) {
        seenBrands.add(item.entity_name);
        brandNames.push(item.entity_name);
      }
    });
  }
  const brandText = brandNames.length > 0 ? brandNames.join(' & ') : 'us';

  // Get logos
  const logos = [];
  const seenLogos = new Set();
  if (order.items) {
    order.items.forEach(item => {
      if (item.entity_logo && !seenLogos.has(item.entity_logo)) {
        seenLogos.add(item.entity_logo);
        logos.push({ url: item.entity_logo, name: item.entity_name });
      }
    });
  }
  const logoHtml = logos.length > 0 
    ? logos.map(logo => 
        `<img src="${logo.url}" alt="${logo.name}" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 12px;" />`
      ).join('')
    : '';

  const subject = `${order.client_name} - Complete Your Bank Account Setup`;
  
  const content = `
    <div class="header" style="background-color: #1e3a8a; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px; text-align: center;">
      ${logoHtml ? `<div style="margin-bottom: 16px;">${logoHtml}</div>` : ''}
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600;">📬 One More Step!</h1>
      <p style="color: #e0e7ff !important; margin: 8px 0 0; font-size: 14px;">Complete your bank account setup</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      <p style="color: #374151;">Hi ${contact.first_name || 'there'},</p>
      
      <p style="color: #374151;">
        Thank you for signing your advertising agreement with <strong>${brandText}</strong>! 
        To complete your setup and confirm your package, please connect your bank account using the secure link below.
      </p>
      
      <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px;">⚠️ Action Required</h3>
        <p style="color: #a16207; margin: 0; line-height: 1.6;">
          Your agreement is signed, but your package is <strong>not confirmed</strong> until you complete the bank account setup. 
          This ensures we can process your payments securely with no processing fees.
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${achSetupUrl || '#'}" style="display: inline-block; padding: 16px 40px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 18px;">Connect Bank Account</a>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr>
          <td style="color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Business</td>
          <td style="color: #1f2937; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>${order.client_name}</strong></td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">Campaign Starts</td>
          <td style="color: #1f2937; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 12px 0;">Payment Method</td>
          <td style="color: #1f2937; padding: 12px 0; text-align: right;">ACH Bank Transfer (No Fee)</td>
        </tr>
      </table>
      
      <p style="color: #6b7280; font-size: 14px;">
        This link is secure and powered by Stripe. Your bank credentials are never shared with us. 
        If you have any questions, please reach out to your Sales Associate.
      </p>
    </div>
    <div class="footer" style="padding: 24px 32px; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 13px;">
      Questions? Your Sales Associate is here to help!
    </div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Complete your bank account setup to confirm your ${brandText} advertising package.`, content }),
    tag: 'ach-setup',
    metadata: { orderId: order.id, orderNumber: order.order_number, clientId: order.client_id }
  });
}

/**
 * Send internal notification when contract is signed
 */
async function sendContractSignedInternal({ order, contact }) {
  const brandBubbles = buildBrandBubbles(order.items);
  const categoryBubbles = buildCategoryBubbles(order.items);
  
  const subject = `🎉 Signed: ${order.client_name} - $${parseFloat(order.monthly_total || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}/mo`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 28px;">🎉 Contract Signed!</h1>
      <p style="color: #d1fae5 !important; margin: 8px 0 0; font-size: 16px;">${order.client_name} is now a client</p>
    </div>
    <div class="body" style="padding: 32px; background: white;">
      
      <!-- Success Celebration -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 40px;">✓</span>
        </div>
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 24px;">${order.client_name}</h2>
        <p style="color: #64748b; margin: 0;">Signed by ${contact.first_name} ${contact.last_name}</p>
      </div>
      
      ${brandBubbles}
      ${categoryBubbles}
      
      <!-- Key Metrics Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 24px 0;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Monthly</div>
          <div style="color: #1e3a8a; font-size: 18px; font-weight: 700;">$${parseFloat(order.monthly_total || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Term</div>
          <div style="color: #1e293b; font-size: 18px; font-weight: 700;">${order.term_months} mo</div>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Start</div>
          <div style="color: #1e293b; font-size: 14px; font-weight: 600;">${new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
      </div>
      
      <!-- Contract Total - Big Celebration -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="color: #166534; font-size: 14px; margin-bottom: 8px;">🎯 Total Contract Value</div>
        <div style="color: #166534; font-size: 36px; font-weight: 700;">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      
      <!-- Contact Info -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="color: #64748b; font-size: 12px; margin-bottom: 8px;">SIGNER</div>
        <div style="color: #1e293b; font-weight: 600;">${contact.first_name} ${contact.last_name}</div>
        <div style="color: #64748b; font-size: 14px;">${contact.email}</div>
      </div>
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/clients/${order.client_id}" class="button" style="background: #1e3a8a; color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">View Client</a>
      </div>
    </div>
    <div class="footer" style="padding: 20px; background: #f9fafb; text-align: center; color: #64748b; font-size: 13px;">
      Signed ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </div>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'justin@wsicnews.com',
    from: FROM_ADDRESSES.noreply,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `${order.client_name} signed - $${parseFloat(order.contract_total || 0).toLocaleString()} contract`, content }),
    tag: 'contract-signed-internal',
    metadata: { orderId: order.id, orderNumber: order.order_number }
  });
}

// ============================================================
// TEST EMAIL
// ============================================================

/**
 * Send a test email to verify configuration
 */
async function sendTestEmail(to) {
  const subject = 'Test Email from WSIC Advertising Platform';
  
  const content = `
    <div class="header">
      <h1>✓ Email Configuration Working!</h1>
      <p>Your Postmark integration is set up correctly</p>
    </div>
    <div class="body">
      <p>This is a test email from your WSIC Advertising Platform.</p>
      
      <p>If you're seeing this, your email configuration is working properly. You can now send:</p>
      
      <ul style="line-height: 1.8;">
        <li>Order confirmations</li>
        <li>Approval requests</li>
        <li>Contracts for signature</li>
        <li>Invoice notifications</li>
      </ul>
      
      <p class="text-muted">Sent via Postmark from orders@myadvertisingreport.com</p>
    </div>
    <div class="footer">
      Test sent on ${new Date().toLocaleString()}
    </div>
  `;

  return sendEmail({
    to,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: 'Your email integration is working!', content }),
    tag: 'test-email'
  });
}

// ============================================================
// INVOICE EMAILS
// ============================================================

/**
 * Send invoice to client
 */
async function sendInvoiceToClient({ invoice, contact }) {
  // Determine primary brand from invoice items (highest priced item's entity)
  let primaryBrand = 'WSIC'; // default
  let highestPrice = 0;
  
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach(item => {
      const itemPrice = parseFloat(item.amount || item.unit_price || 0);
      if (itemPrice > highestPrice) {
        highestPrice = itemPrice;
        // Determine brand from item description or entity
        const desc = (item.description || '').toLowerCase();
        if (desc.includes('lake norman') || desc.includes('lkn') || desc.includes('print')) {
          primaryBrand = 'Lake Norman Woman';
        } else if (desc.includes('liveworkplay') || desc.includes('lwp')) {
          primaryBrand = 'LiveWorkPlay LKN';
        } else {
          primaryBrand = 'WSIC';
        }
      }
    });
  }
  
  // Format invoice month for subject line
  const invoiceMonth = invoice.billing_period_start 
    ? new Date(invoice.billing_period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const subject = `${primaryBrand} - ${invoiceMonth} Invoice`;
  
  const itemsHtml = invoice.items?.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity || 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">$${parseFloat(item.unit_price).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1f2937; font-weight: 500;">$${parseFloat(item.amount).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Calculate auto-charge date (30 days after due date)
  const autoChargeDate = new Date(invoice.due_date);
  autoChargeDate.setDate(autoChargeDate.getDate() + 30);
  const autoChargeDateStr = autoChargeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const billingPeriod = invoice.billing_period_start && invoice.billing_period_end
    ? `${new Date(invoice.billing_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(invoice.billing_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  // Backup payment method info
  const paymentMethodDisplay = invoice.billing_preference === 'card' 
    ? `Credit Card ending in ${invoice.card_last4 || '••••'}` 
    : invoice.billing_preference === 'ach' 
      ? `ACH - ${invoice.bank_name || 'Bank Account'} ending in ${invoice.account_last4 || '••••'}`
      : 'payment method on file';

  // Check payable based on primary brand
  const checkPayableTo = primaryBrand === 'Lake Norman Woman' ? 'Lake Norman Woman' : 'WSIC';

  const content = `
    <div class="header" style="background-color: #1e3a8a; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px; text-align: center;">
      <!-- Brand Names -->
      <div style="margin-bottom: 16px;">
        <span style="color: #ffffff; font-weight: 600; font-size: 14px; margin: 0 12px; opacity: 0.9;">WSIC</span>
        <span style="color: #ffffff; opacity: 0.5;">•</span>
        <span style="color: #ffffff; font-weight: 600; font-size: 14px; margin: 0 12px; opacity: 0.9;">Lake Norman Woman</span>
        <span style="color: #ffffff; opacity: 0.5;">•</span>
        <span style="color: #ffffff; font-weight: 600; font-size: 14px; margin: 0 12px; opacity: 0.9;">LiveWorkPlay</span>
      </div>
      <h1 style="color: #ffffff !important; margin: 0; font-size: 26px; font-weight: 700;">Your Invoice is Ready</h1>
      <p style="color: #e0e7ff !important; margin: 12px 0 0; font-size: 16px;">${invoiceMonth}</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      <p style="color: #374151; font-size: 16px;">Hi ${contact.first_name || 'there'},</p>
      <p style="color: #374151;">Thank you for your continued partnership! Please find your invoice details below.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px;">
        <tr><td style="color: #6b7280; padding: 16px; border-bottom: 1px solid #e5e7eb;">Invoice Number</td><td style="color: #1f2937; padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${invoice.invoice_number}</td></tr>
        <tr><td style="color: #6b7280; padding: 16px; border-bottom: 1px solid #e5e7eb;">Business</td><td style="color: #1f2937; padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.client_name}</td></tr>
        ${billingPeriod ? `<tr><td style="color: #6b7280; padding: 16px; border-bottom: 1px solid #e5e7eb;">Service Period</td><td style="color: #1f2937; padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${billingPeriod}</td></tr>` : ''}
        <tr><td style="color: #6b7280; padding: 16px; border-bottom: 1px solid #e5e7eb;">Issue Date</td><td style="color: #1f2937; padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Date(invoice.issue_date || invoice.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>
        <tr><td style="color: #dc2626; padding: 16px; font-weight: 600;">Due Date</td><td style="color: #dc2626; padding: 16px; text-align: right; font-weight: 600;">${dueDate}</td></tr>
      </table>
      
      <h3 style="color: #1e293b; margin: 24px 0 12px 0; font-size: 16px;">Services</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead><tr style="background-color: #f8fafc;">
          <th style="padding: 12px; text-align: left; color: #64748b; font-size: 13px;">Description</th>
          <th style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Qty</th>
          <th style="padding: 12px; text-align: right; color: #64748b; font-size: 13px;">Price</th>
          <th style="padding: 12px; text-align: right; color: #64748b; font-size: 13px;">Amount</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      
      <table style="width: 100%; max-width: 300px; margin-left: auto; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280;">Subtotal</td><td style="padding: 8px 0; text-align: right; color: #374151;">$${parseFloat(invoice.subtotal).toFixed(2)}</td></tr>
        ${parseFloat(invoice.processing_fee) > 0 ? `<tr><td style="padding: 8px 0; color: #6b7280;">Processing Fee (3.5%)</td><td style="padding: 8px 0; text-align: right; color: #374151;">$${parseFloat(invoice.processing_fee).toFixed(2)}</td></tr>` : ''}
        <tr style="border-top: 2px solid #1e3a8a;"><td style="padding: 16px 0; color: #1e293b; font-weight: 700; font-size: 18px;">Total Due</td><td style="padding: 16px 0; text-align: right; color: #1e3a8a; font-weight: 700; font-size: 24px;">$${parseFloat(invoice.total).toFixed(2)}</td></tr>
      </table>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${invoice.stripe_invoice_url || `${BASE_URL}/pay/${invoice.id}`}" style="display: inline-block; padding: 18px 48px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px;">Pay Invoice Now</a>
      </div>
      
      <!-- Auto-Charge Notice -->
      <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">⚠️ Automatic Payment Notice</h4>
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
          If this invoice is not paid by <strong>${autoChargeDateStr}</strong>, 
          your ${paymentMethodDisplay} will be automatically charged.
        </p>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 24px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          <strong>Payment Options:</strong><br>
          • <strong>Online:</strong> Click the green button above to pay securely by card or bank transfer<br>
          • <strong>Check:</strong> Make payable to "<strong>${checkPayableTo}</strong>" and mail to:<br>
          &nbsp;&nbsp;&nbsp;PO Box 2071, Cornelius, NC 28031
        </p>
      </div>
    </div>
    <div class="footer" style="padding: 24px 32px; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 13px;">
      <p style="margin: 0 0 8px 0;">Thank you for being a valued partner!</p>
      <p style="margin: 0; font-size: 12px;">Any questions about this invoice? Please reach out directly to your Sales Associate.</p>
    </div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.billing,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Your ${invoiceMonth} invoice for $${parseFloat(invoice.total).toFixed(2)} is ready`, content }),
    tag: 'invoice',
    metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, clientId: invoice.client_id }
  });
}

/**
 * Send payment reminder
 */
async function sendPaymentReminder({ invoice, contact, reminder_type = 'friendly' }) {
  const daysOverdue = Math.max(0, Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)));
  
  const urgencyConfig = {
    friendly: { subject: `Reminder: Invoice ${invoice.invoice_number} Payment Due`, headerColor: '#1e3a8a', title: '📬 Payment Reminder', subtitle: 'Your invoice is due soon', message: "We wanted to send a friendly reminder that payment for your invoice is due.", urgency: false },
    '15_day': { subject: `Action Required: Invoice ${invoice.invoice_number} is Past Due`, headerColor: '#f59e0b', title: '⚠️ Payment Past Due', subtitle: `${daysOverdue} days overdue`, message: "Your invoice is now past due. Please arrange payment at your earliest convenience.", urgency: true },
    '25_day': { subject: `Urgent: Invoice ${invoice.invoice_number} - Immediate Action Required`, headerColor: '#ea580c', title: '🔔 Urgent Payment Notice', subtitle: `${daysOverdue} days overdue`, message: "Your invoice is significantly past due. To avoid service interruption, please submit payment immediately.", urgency: true },
    '30_day': { subject: `Final Notice: Invoice ${invoice.invoice_number} - Payment Required Today`, headerColor: '#dc2626', title: '🚨 Final Payment Notice', subtitle: 'Backup payment method will be charged', message: "This is your final notice. If payment is not received today, we will charge your backup payment method on file.", urgency: true }
  };

  const config = urgencyConfig[reminder_type] || urgencyConfig.friendly;

  const content = `
    <div class="header" style="background-color: ${config.headerColor}; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600;">${config.title}</h1>
      <p style="color: #ffffff !important; opacity: 0.9; margin: 8px 0 0; font-size: 14px;">${config.subtitle}</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      <p style="color: #374151;">Hi ${contact.first_name || 'there'},</p>
      <p style="color: #374151;">${config.message}</p>
      ${config.urgency ? `<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0;"><p style="color: #991b1b; margin: 0;"><strong>⏰ Time Sensitive</strong> - Please make payment immediately to avoid additional fees.</p></div>` : ''}
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px;">
        <tr><td style="padding: 16px; color: #6b7280;">Invoice Number</td><td style="padding: 16px; text-align: right; color: #1f2937; font-weight: 600;">${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 16px; color: #6b7280; border-top: 1px solid #e5e7eb;">Amount Due</td><td style="padding: 16px; text-align: right; color: #dc2626; font-weight: 700; font-size: 20px; border-top: 1px solid #e5e7eb;">$${parseFloat(invoice.balance_due || invoice.total).toFixed(2)}</td></tr>
        <tr><td style="padding: 16px; color: #6b7280; border-top: 1px solid #e5e7eb;">Due Date</td><td style="padding: 16px; text-align: right; color: ${daysOverdue > 0 ? '#dc2626' : '#1f2937'}; border-top: 1px solid #e5e7eb;">${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>
      </table>
      ${invoice.stripe_invoice_url ? `<div style="text-align: center; margin: 32px 0;"><a href="${invoice.stripe_invoice_url}" style="display: inline-block; padding: 16px 40px; background-color: ${config.headerColor}; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600;">Pay Invoice Now</a></div>` : ''}
    </div>
    <div class="footer" style="padding: 24px 32px; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 13px;">Questions? Reply to this email or call us.</div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.billing,
    subject: config.subject,
    htmlBody: emailTemplate({ title: config.subject, preheader: `Invoice ${invoice.invoice_number} - $${parseFloat(invoice.balance_due || invoice.total).toFixed(2)} due`, content }),
    tag: 'payment-reminder',
    metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, reminderType: reminder_type }
  });
}

/**
 * Send payment receipt/confirmation
 */
async function sendPaymentReceipt({ invoice, contact, payment }) {
  const subject = `Payment Received - Invoice ${invoice.invoice_number}`;
  
  const content = `
    <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff !important; margin: 0; font-size: 24px; font-weight: 600;">✓ Payment Received</h1>
      <p style="color: #ffffff !important; opacity: 0.9; margin: 8px 0 0; font-size: 14px;">Thank you for your payment!</p>
    </div>
    <div class="body" style="background-color: #ffffff; color: #374151; padding: 32px;">
      <p style="color: #374151;">Hi ${contact.first_name || 'there'},</p>
      <p style="color: #374151;">We've received your payment for invoice <strong>${invoice.invoice_number}</strong>. Thank you!</p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #166534; margin: 0 0 8px 0; font-size: 14px;">Amount Paid</p>
        <p style="color: #166534; margin: 0; font-size: 32px; font-weight: 700;">$${parseFloat(payment.amount || invoice.total).toFixed(2)}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr><td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Invoice Number</td><td style="padding: 12px 0; text-align: right; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Payment Date</td><td style="padding: 12px 0; text-align: right; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>
        ${payment.method ? `<tr><td style="padding: 12px 0; color: #6b7280;">Payment Method</td><td style="padding: 12px 0; text-align: right; color: #1f2937;">${payment.method}</td></tr>` : ''}
      </table>
      <p style="color: #6b7280; font-size: 14px;">This email serves as your receipt. Please keep it for your records.</p>
    </div>
    <div class="footer" style="padding: 24px 32px; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 13px;">Thank you for your business!</div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.billing,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Payment of $${parseFloat(payment.amount || invoice.total).toFixed(2)} received`, content }),
    tag: 'payment-receipt',
    metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }
  });
}

module.exports = {
  sendEmail,
  sendTestEmail,
  sendOrderSubmittedInternal,
  sendApprovalRequest,
  sendOrderApproved,
  sendOrderRejected,
  sendContractToClient,
  sendSignatureConfirmation,
  sendAchSetupEmail,
  sendContractSignedInternal,
  sendInvoiceToClient,
  sendPaymentReminder,
  sendPaymentReceipt,
  FROM_ADDRESSES
};
