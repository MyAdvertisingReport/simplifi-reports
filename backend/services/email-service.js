// ============================================================================
// EMAIL SERVICE MODULE
// ============================================================================
// 
// Handles all email sending via AWS SES
// Includes templates for transactional emails (invoices, signatures, etc.)
//
// ============================================================================

const { SESClient, SendEmailCommand, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');

// Initialize SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create nodemailer transporter using SES
const transporter = nodemailer.createTransport({
  SES: { ses: sesClient, aws: require('@aws-sdk/client-ses') },
});

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

const EMAIL_CONFIG = {
  defaultFrom: {
    name: 'My Advertising Report',
    email: 'billing@myadvertisingreport.com',
  },
  replyTo: 'billing@myadvertisingreport.com',
  
  // Entity-specific from addresses
  entities: {
    wsic: {
      name: 'WSIC',
      email: 'billing@myadvertisingreport.com',
      legalName: 'Real Talk Studios, LLC',
    },
    lkn: {
      name: 'Lake Norman Woman',
      email: 'billing@myadvertisingreport.com',
      legalName: 'Real Talk Publications, LLC',
    },
  },
};

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const templates = {
  // ==========================================================================
  // SIGNATURE REQUEST - Sent to client to sign agreement
  // ==========================================================================
  signatureRequest: {
    subject: (data) => `Your Advertising Agreement with ${data.entityName} - Ready for Signature`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agreement Ready for Signature</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${data.entityName}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Hi ${data.clientContactName},
              </p>
              
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                ${data.salesAssociateName} has prepared your advertising agreement and it's ready for your review and signature.
              </p>
              
              <!-- Package Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px; color: #1e3a5f; font-size: 16px; font-weight: 600;">
                      Package Summary
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Products:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">
                          ${data.products}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Monthly Rate:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">
                          $${data.monthlyRate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Term:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">
                          ${data.termMonths} months
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.signatureUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      Review &amp; Sign Agreement
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                Questions? Reply to this email or contact ${data.salesAssociateName} directly at ${data.salesAssociateEmail}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                ${data.entityLegalName}<br>
                This email was sent from a notification-only address. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (data) => `
Hi ${data.clientContactName},

${data.salesAssociateName} has prepared your advertising agreement and it's ready for your review and signature.

PACKAGE SUMMARY
Products: ${data.products}
Monthly Rate: $${data.monthlyRate}
Term: ${data.termMonths} months

Click here to review and sign: ${data.signatureUrl}

Questions? Contact ${data.salesAssociateName} at ${data.salesAssociateEmail}.

${data.entityLegalName}
    `,
  },

  // ==========================================================================
  // SIGNATURE COMPLETE - Confirmation to both parties
  // ==========================================================================
  signatureComplete: {
    subject: (data) => `Agreement Signed - ${data.clientBusinessName}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ✓ Agreement Signed
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Great news! The advertising agreement with <strong>${data.clientBusinessName}</strong> has been signed by all parties.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Number:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 600;">
                          ${data.orderNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Signed By:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">
                          ${data.signerName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Signed At:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">
                          ${data.signedAt}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;">Monthly Rate:</td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 600;">
                          $${data.monthlyRate}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 15px; color: #333; font-size: 14px; line-height: 1.6;">
                A copy of the signed agreement is attached to this email.
              </p>
              
              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                The campaign will begin processing and you'll receive updates as setup is completed.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                ${data.entityLegalName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (data) => `
Agreement Signed Successfully!

The advertising agreement with ${data.clientBusinessName} has been signed.

Order Number: ${data.orderNumber}
Signed By: ${data.signerName}
Signed At: ${data.signedAt}
Monthly Rate: $${data.monthlyRate}

A copy of the signed agreement is attached.

${data.entityLegalName}
    `,
  },

  // ==========================================================================
  // INVOICE - Monthly billing
  // ==========================================================================
  invoice: {
    subject: (data) => `Invoice ${data.invoiceNumber} - ${data.entityName}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      ${data.entityName}
                    </h1>
                  </td>
                  <td style="text-align: right;">
                    <span style="color: #93c5fd; font-size: 14px;">INVOICE</span><br>
                    <span style="color: #ffffff; font-size: 18px; font-weight: 600;">${data.invoiceNumber}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0 0 5px; color: #666; font-size: 12px; text-transform: uppercase;">Bill To</p>
                    <p style="margin: 0; color: #333; font-size: 14px; font-weight: 600;">${data.clientBusinessName}</p>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${data.clientAddress || ''}</p>
                  </td>
                  <td style="width: 50%; vertical-align: top; text-align: right;">
                    <p style="margin: 0 0 5px; color: #666; font-size: 12px;">Invoice Date</p>
                    <p style="margin: 0 0 15px; color: #333; font-size: 14px; font-weight: 500;">${data.invoiceDate}</p>
                    <p style="margin: 0 0 5px; color: #666; font-size: 12px;">Due Date</p>
                    <p style="margin: 0; color: #333; font-size: 14px; font-weight: 500;">${data.dueDate}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Line Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Description</td>
                  <td style="padding: 12px; font-size: 12px; color: #666; text-transform: uppercase; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</td>
                </tr>
                ${data.lineItems.map(item => `
                <tr>
                  <td style="padding: 15px 12px; font-size: 14px; color: #333; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
                  <td style="padding: 15px 12px; font-size: 14px; color: #333; text-align: right; border-bottom: 1px solid #e5e7eb;">$${item.amount}</td>
                </tr>
                `).join('')}
                ${data.processingFee ? `
                <tr>
                  <td style="padding: 15px 12px; font-size: 14px; color: #666; border-bottom: 1px solid #e5e7eb;">Credit Card Processing Fee (3.5%)</td>
                  <td style="padding: 15px 12px; font-size: 14px; color: #666; text-align: right; border-bottom: 1px solid #e5e7eb;">$${data.processingFee}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 15px 12px; font-size: 16px; color: #333; font-weight: 600;">Total Due</td>
                  <td style="padding: 15px 12px; font-size: 20px; color: #1e3a5f; text-align: right; font-weight: 700;">$${data.totalAmount}</td>
                </tr>
              </table>
              
              ${data.paymentUrl ? `
              <!-- Pay Now Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.paymentUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      Pay Now - $${data.totalAmount}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${data.autoPayEnabled ? `
              <p style="margin: 20px 0 0; padding: 15px; background-color: #f0fdf4; border-radius: 8px; color: #166534; font-size: 14px; text-align: center;">
                ✓ Auto-pay is enabled. This invoice will be charged to your ${data.paymentMethodDescription} on ${data.dueDate}.
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                ${data.entityLegalName}<br>
                Questions? Contact us at billing@myadvertisingreport.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (data) => `
INVOICE ${data.invoiceNumber}
${data.entityName}

Bill To: ${data.clientBusinessName}
Invoice Date: ${data.invoiceDate}
Due Date: ${data.dueDate}

${data.lineItems.map(item => `${item.description}: $${item.amount}`).join('\n')}
${data.processingFee ? `Processing Fee: $${data.processingFee}` : ''}

TOTAL DUE: $${data.totalAmount}

${data.paymentUrl ? `Pay online: ${data.paymentUrl}` : ''}
${data.autoPayEnabled ? `Auto-pay is enabled and will be charged on ${data.dueDate}.` : ''}

${data.entityLegalName}
Questions? Contact billing@myadvertisingreport.com
    `,
  },

  // ==========================================================================
  // PAYMENT RECEIPT
  // ==========================================================================
  paymentReceipt: {
    subject: (data) => `Payment Received - Receipt ${data.receiptNumber}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ✓ Payment Received
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 25px; color: #333; font-size: 16px; line-height: 1.6;">
                Thank you for your payment! Here's your receipt:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Receipt Number:</td>
                        <td style="padding: 10px 0; color: #333; font-size: 14px; text-align: right; font-weight: 600;">${data.receiptNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Payment Date:</td>
                        <td style="padding: 10px 0; color: #333; font-size: 14px; text-align: right;">${data.paymentDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Payment Method:</td>
                        <td style="padding: 10px 0; color: #333; font-size: 14px; text-align: right;">${data.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Invoice:</td>
                        <td style="padding: 10px 0; color: #333; font-size: 14px; text-align: right;">${data.invoiceNumber}</td>
                      </tr>
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding: 15px 0 10px; color: #333; font-size: 16px; font-weight: 600;">Amount Paid:</td>
                        <td style="padding: 15px 0 10px; color: #059669; font-size: 24px; text-align: right; font-weight: 700;">$${data.amountPaid}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0; color: #666; font-size: 14px; text-align: center;">
                A PDF receipt is attached to this email for your records.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                ${data.entityLegalName}<br>
                Thank you for your business!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (data) => `
PAYMENT RECEIVED

Receipt Number: ${data.receiptNumber}
Payment Date: ${data.paymentDate}
Payment Method: ${data.paymentMethod}
Invoice: ${data.invoiceNumber}
Amount Paid: $${data.amountPaid}

A PDF receipt is attached.

${data.entityLegalName}
Thank you for your business!
    `,
  },

  // ==========================================================================
  // PAYMENT FAILED
  // ==========================================================================
  paymentFailed: {
    subject: (data) => `Action Required: Payment Failed - ${data.invoiceNumber}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Payment Failed
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Hi ${data.clientContactName},
              </p>
              
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                We were unable to process your payment for invoice <strong>${data.invoiceNumber}</strong>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #991b1b; font-size: 14px; font-weight: 600;">
                      Reason: ${data.failureReason}
                    </p>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      Amount: $${data.amount}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 25px; color: #333; font-size: 16px; line-height: 1.6;">
                Please update your payment method or try again:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.paymentUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Update Payment Method
                    </a>
                  </td>
                </tr>
              </table>
              
              ${data.backupChargeDate ? `
              <p style="margin: 20px 0 0; padding: 15px; background-color: #fef9c3; border-radius: 8px; color: #854d0e; font-size: 14px;">
                ⚠️ If not resolved, your backup payment method will be charged on ${data.backupChargeDate}.
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                ${data.entityLegalName}<br>
                Questions? Contact billing@myadvertisingreport.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (data) => `
PAYMENT FAILED

Hi ${data.clientContactName},

We were unable to process your payment for invoice ${data.invoiceNumber}.

Reason: ${data.failureReason}
Amount: $${data.amount}

Please update your payment method: ${data.paymentUrl}

${data.backupChargeDate ? `If not resolved, your backup payment method will be charged on ${data.backupChargeDate}.` : ''}

${data.entityLegalName}
Questions? Contact billing@myadvertisingreport.com
    `,
  },

  // ==========================================================================
  // PAYMENT REMINDER
  // ==========================================================================
  paymentReminder: {
    subject: (data) => `Payment Reminder - Invoice ${data.invoiceNumber} Due ${data.dueDate}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Payment Reminder
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                Hi ${data.clientContactName},
              </p>
              
              <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                This is a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> for <strong>$${data.amount}</strong> is due on <strong>${data.dueDate}</strong>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.paymentUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Pay Now - $${data.amount}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0; color: #666; font-size: 14px; text-align: center;">
                Already paid? Please disregard this reminder.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                ${data.entityLegalName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (data) => `
PAYMENT REMINDER

Hi ${data.clientContactName},

This is a friendly reminder that invoice ${data.invoiceNumber} for $${data.amount} is due on ${data.dueDate}.

Pay now: ${data.paymentUrl}

Already paid? Please disregard this reminder.

${data.entityLegalName}
    `,
  },
};

// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================

class EmailService {
  constructor() {
    this.config = EMAIL_CONFIG;
    this.templates = templates;
  }

  /**
   * Get entity configuration
   */
  getEntityConfig(entityCode) {
    return this.config.entities[entityCode] || this.config.entities.wsic;
  }

  /**
   * Send an email using a template
   */
  async sendTemplateEmail(templateName, data, options = {}) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const entityConfig = this.getEntityConfig(data.entityCode || 'wsic');
    
    // Merge entity data into template data
    const templateData = {
      ...data,
      entityName: entityConfig.name,
      entityLegalName: entityConfig.legalName,
    };

    const mailOptions = {
      from: `"${entityConfig.name}" <${entityConfig.email}>`,
      to: options.to || data.to,
      subject: template.subject(templateData),
      html: template.html(templateData),
      text: template.text(templateData),
      replyTo: this.config.replyTo,
    };

    // Add CC if specified
    if (options.cc) {
      mailOptions.cc = options.cc;
    }

    // Add attachments if specified
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Sent '${templateName}' to ${mailOptions.to}`);
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error(`[EMAIL] Failed to send '${templateName}' to ${mailOptions.to}:`, error);
      throw error;
    }
  }

  /**
   * Send signature request email
   */
  async sendSignatureRequest(data) {
    return this.sendTemplateEmail('signatureRequest', data, {
      to: data.clientEmail,
    });
  }

  /**
   * Send signature complete confirmation
   */
  async sendSignatureComplete(data, options = {}) {
    return this.sendTemplateEmail('signatureComplete', data, {
      to: data.to,
      cc: options.cc,
      attachments: options.attachments,
    });
  }

  /**
   * Send invoice
   */
  async sendInvoice(data, options = {}) {
    return this.sendTemplateEmail('invoice', data, {
      to: data.billingEmail,
      attachments: options.attachments,
    });
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(data, options = {}) {
    return this.sendTemplateEmail('paymentReceipt', data, {
      to: data.billingEmail,
      attachments: options.attachments,
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(data) {
    return this.sendTemplateEmail('paymentFailed', data, {
      to: data.billingEmail,
    });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(data) {
    return this.sendTemplateEmail('paymentReminder', data, {
      to: data.billingEmail,
    });
  }

  /**
   * Send a custom email (no template)
   */
  async sendCustomEmail({ to, subject, html, text, from, attachments }) {
    const mailOptions = {
      from: from || `"${this.config.defaultFrom.name}" <${this.config.defaultFrom.email}>`,
      to,
      subject,
      html,
      text,
      replyTo: this.config.replyTo,
    };

    if (attachments) {
      mailOptions.attachments = attachments;
    }

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Sent custom email to ${to}`);
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error(`[EMAIL] Failed to send custom email to ${to}:`, error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

const emailService = new EmailService();

module.exports = {
  emailService,
  EmailService,
  EMAIL_CONFIG,
  templates,
};
