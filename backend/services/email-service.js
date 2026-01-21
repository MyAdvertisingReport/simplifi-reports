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

// Initialize Postmark client
const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

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
    
    console.log(`Email sent successfully: ${result.MessageID} to ${to}`);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('Failed to send email:', error);
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
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .footer { padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #6b7280; }
    .button { display: inline-block; padding: 14px 32px; background: #1e3a8a; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .button:hover { background: #1e40af; }
    .button-secondary { background: #059669; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .details-table td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .details-table td:first-child { color: #6b7280; font-size: 14px; }
    .details-table td:last-child { text-align: right; font-weight: 500; }
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

/**
 * Send order confirmation to internal team when order is submitted
 */
async function sendOrderSubmittedInternal({ order, submittedBy }) {
  const subject = `New Order Submitted: ${order.order_number} - ${order.client_name}`;
  
  const content = `
    <div class="header">
      <h1>New Order Submitted</h1>
      <p>Order requires ${order.status === 'pending_approval' ? 'approval' : 'processing'}</p>
    </div>
    <div class="body">
      <p>A new order has been submitted by <strong>${submittedBy.name}</strong>.</p>
      
      <table class="details-table">
        <tr>
          <td>Order Number</td>
          <td><strong>${order.order_number}</strong></td>
        </tr>
        <tr>
          <td>Client</td>
          <td>${order.client_name}</td>
        </tr>
        <tr>
          <td>Status</td>
          <td><span class="status-badge ${order.status === 'pending_approval' ? 'status-pending' : 'status-approved'}">${order.status === 'pending_approval' ? 'Pending Approval' : 'Approved'}</span></td>
        </tr>
        <tr>
          <td>Contract Term</td>
          <td>${order.term_months} month${order.term_months !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td>Monthly Total</td>
          <td>$${parseFloat(order.monthly_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Contract Total</td>
          <td class="amount">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      
      ${order.status === 'pending_approval' ? `
        <p class="text-muted">⚠️ This order has price adjustments and requires management approval.</p>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/orders/${order.id}/edit" class="button">Review Order</a>
      </div>
    </div>
    <div class="footer">
      Submitted on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'justin@wsicnews.com',
    from: FROM_ADDRESSES.noreply,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Order ${order.order_number} from ${order.client_name}`, content }),
    tag: 'order-submitted',
    metadata: { orderId: order.id, orderNumber: order.order_number }
  });
}

/**
 * Send approval request to manager when price adjustments need approval
 */
async function sendApprovalRequest({ order, submittedBy, adjustments }) {
  const subject = `Approval Required: ${order.order_number} - Price Adjustments`;
  
  const adjustmentsList = adjustments.map(adj => `
    <tr>
      <td>${adj.product_name}</td>
      <td style="text-decoration: line-through; color: #9ca3af;">$${adj.original_price}</td>
      <td style="color: #dc2626; font-weight: 600;">$${adj.adjusted_price}</td>
      <td>${adj.discount_percent ? `-${adj.discount_percent}%` : 'Custom'}</td>
    </tr>
  `).join('');

  const content = `
    <div class="header" style="background: linear-gradient(135deg, #92400e 0%, #f59e0b 100%);">
      <h1>⚠️ Approval Required</h1>
      <p>Price adjustments need your review</p>
    </div>
    <div class="body">
      <p><strong>${submittedBy.name}</strong> has submitted an order with price adjustments that require approval.</p>
      
      <table class="details-table">
        <tr>
          <td>Order Number</td>
          <td><strong>${order.order_number}</strong></td>
        </tr>
        <tr>
          <td>Client</td>
          <td>${order.client_name}</td>
        </tr>
        <tr>
          <td>Contract Total</td>
          <td class="amount">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      
      <div class="divider"></div>
      
      <h3 style="margin-bottom: 12px;">Price Adjustments</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left;">Product</th>
            <th style="padding: 8px; text-align: left;">Book Price</th>
            <th style="padding: 8px; text-align: left;">Adjusted</th>
            <th style="padding: 8px; text-align: left;">Discount</th>
          </tr>
        </thead>
        <tbody>
          ${adjustmentsList}
        </tbody>
      </table>
      
      <div style="text-align: center; margin-top: 24px;">
        <a href="${BASE_URL}/orders/${order.id}/edit" class="button">Review & Approve</a>
      </div>
      
      <p class="text-muted text-small" style="margin-top: 24px;">
        You can approve or reject this order from the order details page.
      </p>
    </div>
    <div class="footer">
      Submitted by ${submittedBy.name} on ${new Date().toLocaleDateString()}
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
  const subject = `Order Approved: ${order.order_number}`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%);">
      <h1>✓ Order Approved</h1>
      <p>Ready to send to client</p>
    </div>
    <div class="body">
      <p>Great news! Order <strong>${order.order_number}</strong> has been approved by ${approvedBy.name}.</p>
      
      <table class="details-table">
        <tr>
          <td>Client</td>
          <td><strong>${order.client_name}</strong></td>
        </tr>
        <tr>
          <td>Contract Total</td>
          <td class="amount">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/orders/${order.id}/edit" class="button button-secondary">Send to Client</a>
      </div>
    </div>
    <div class="footer">
      Approved on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  `;

  // Notify the person who submitted the order
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
  const subject = `Order Requires Revision: ${order.order_number}`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);">
      <h1>Order Returned</h1>
      <p>Revisions required</p>
    </div>
    <div class="body">
      <p>Order <strong>${order.order_number}</strong> has been returned by ${rejectedBy.name} and requires revision.</p>
      
      <table class="details-table">
        <tr>
          <td>Client</td>
          <td><strong>${order.client_name}</strong></td>
        </tr>
        <tr>
          <td>Contract Total</td>
          <td>$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      
      ${reason ? `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <strong style="color: #991b1b;">Reason:</strong>
          <p style="margin: 8px 0 0; color: #991b1b;">${reason}</p>
        </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/orders/${order.id}/edit" class="button">Edit Order</a>
      </div>
    </div>
    <div class="footer">
      Returned on ${new Date().toLocaleDateString()}
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
  const subject = `Your Advertising Agreement from WSIC - ${order.order_number}`;
  
  const content = `
    <div class="header">
      <h1>Your Advertising Agreement</h1>
      <p>Please review and sign to get started</p>
    </div>
    <div class="body">
      <p>Hi ${contact.first_name || 'there'},</p>
      
      <p>Thank you for choosing WSIC for your advertising needs! Your agreement is ready for review.</p>
      
      <table class="details-table">
        <tr>
          <td>Business</td>
          <td><strong>${order.client_name}</strong></td>
        </tr>
        <tr>
          <td>Agreement #</td>
          <td>${order.order_number}</td>
        </tr>
        <tr>
          <td>Contract Term</td>
          <td>${order.term_months} month${order.term_months !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td>Start Date</td>
          <td>${new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td>Monthly Investment</td>
          <td>$${parseFloat(order.monthly_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Total Agreement Value</td>
          <td class="amount">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${signingUrl}" class="button button-secondary">Review & Sign Agreement</a>
      </div>
      
      <p class="text-muted text-small">
        By signing, you agree to our <a href="${BASE_URL}/terms">Terms of Service</a>. 
        This link will expire in 7 days. If you have any questions, simply reply to this email.
      </p>
    </div>
    <div class="footer">
      Questions? Contact us at billing@myadvertisingreport.com or call (704) 896-0094
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
  const subject = `Agreement Signed - ${order.order_number} | Welcome to WSIC!`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%);">
      <h1>🎉 Welcome Aboard!</h1>
      <p>Your agreement has been signed successfully</p>
    </div>
    <div class="body">
      <p>Hi ${contact.first_name || 'there'},</p>
      
      <p>Thank you for signing your advertising agreement! We're excited to partner with <strong>${order.client_name}</strong> and help grow your business.</p>
      
      <table class="details-table">
        <tr>
          <td>Agreement #</td>
          <td><strong>${order.order_number}</strong></td>
        </tr>
        <tr>
          <td>Start Date</td>
          <td>${new Date(order.contract_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td>Signed On</td>
          <td>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
        </tr>
      </table>
      
      ${pdfUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${pdfUrl}" class="button" style="background: #6b7280;">Download Signed Agreement (PDF)</a>
        </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <h3>What's Next?</h3>
      <ul style="color: #374151; line-height: 1.8;">
        <li>Our team will reach out within 1-2 business days to kick off your campaign</li>
        <li>We'll collect any creative assets needed</li>
        <li>Your campaign will launch on your scheduled start date</li>
        <li>You'll receive performance reports at your custom dashboard</li>
      </ul>
      
      <p class="text-muted">A copy of this signed agreement has been attached to this email for your records.</p>
    </div>
    <div class="footer">
      Questions? Contact your account representative or email billing@myadvertisingreport.com
    </div>
  `;

  return sendEmail({
    to: contact.email,
    from: FROM_ADDRESSES.orders,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `Welcome to WSIC! Your agreement ${order.order_number} is confirmed.`, content }),
    tag: 'contract-signed',
    metadata: { orderId: order.id, orderNumber: order.order_number, clientId: order.client_id }
  });
}

/**
 * Send internal notification when contract is signed
 */
async function sendContractSignedInternal({ order, contact }) {
  const subject = `🎉 Contract Signed: ${order.order_number} - ${order.client_name}`;
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%);">
      <h1>Contract Signed!</h1>
      <p>${order.client_name} is now a client</p>
    </div>
    <div class="body">
      <p><strong>${contact.first_name} ${contact.last_name}</strong> from <strong>${order.client_name}</strong> has signed their advertising agreement.</p>
      
      <table class="details-table">
        <tr>
          <td>Order Number</td>
          <td><strong>${order.order_number}</strong></td>
        </tr>
        <tr>
          <td>Contract Term</td>
          <td>${order.term_months} months</td>
        </tr>
        <tr>
          <td>Start Date</td>
          <td>${new Date(order.contract_start_date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td>Contract Total</td>
          <td class="amount">$${parseFloat(order.contract_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Signed By</td>
          <td>${contact.first_name} ${contact.last_name} (${contact.email})</td>
        </tr>
      </table>
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/orders/${order.id}/edit" class="button">View Order</a>
        <a href="${BASE_URL}/client/${order.client_slug}" class="button button-secondary" style="margin-left: 8px;">View Client</a>
      </div>
    </div>
    <div class="footer">
      Signed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
    </div>
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'justin@wsicnews.com',
    from: FROM_ADDRESSES.noreply,
    subject,
    htmlBody: emailTemplate({ title: subject, preheader: `${order.client_name} signed - $${order.contract_total} contract`, content }),
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

module.exports = {
  sendEmail,
  sendTestEmail,
  sendOrderSubmittedInternal,
  sendApprovalRequest,
  sendOrderApproved,
  sendOrderRejected,
  sendContractToClient,
  sendSignatureConfirmation,
  sendContractSignedInternal,
  FROM_ADDRESSES
};
