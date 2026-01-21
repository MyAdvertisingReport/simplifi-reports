/**
 * Email Routes
 * Handles email testing and order workflow email triggers
 * 
 * SETUP:
 * 1. Save this file as: routes/email.js
 * 2. Ensure services/email-service.js exists
 * 3. Set POSTMARK_API_KEY environment variable
 * 
 * Add to server.js:
 *   const emailRoutes = require('./routes/email');
 *   app.use('/api/email', authenticateToken, emailRoutes);
 */

const express = require('express');
const router = express.Router();

// Try to load email service with graceful fallback
let emailService;
try {
  emailService = require('../services/email-service');
  console.log('✓ Email service loaded successfully');
} catch (err) {
  console.error('⚠ Warning: email-service not found:', err.message);
  console.error('  Expected location: services/email-service.js');
  emailService = null;
}

// Helper: Check if email service is ready
const checkEmailService = (req, res, next) => {
  if (!emailService) {
    return res.status(503).json({ 
      error: 'Email service not loaded',
      hint: 'Ensure services/email-service.js exists and has no syntax errors'
    });
  }
  
  if (!process.env.POSTMARK_API_KEY) {
    return res.status(503).json({ 
      error: 'Postmark API key not configured',
      hint: 'Set POSTMARK_API_KEY environment variable'
    });
  }
  
  next();
};

// ============================================================
// TEST ENDPOINTS
// ============================================================

/**
 * POST /api/email/test
 * Send a test email to verify configuration
 */
router.post('/test', checkEmailService, async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address required in request body: { "to": "email@example.com" }' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    console.log(`[Email] Sending test email to: ${to}`);
    const result = await emailService.sendTestEmail(to);
    
    if (result.success) {
      console.log(`[Email] ✓ Test email sent successfully: ${result.messageId}`);
      res.json({ 
        success: true, 
        message: `Test email sent to ${to}`,
        messageId: result.messageId 
      });
    } else {
      console.error(`[Email] ✗ Test email failed:`, result.error);
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[Email] Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/email/status
 * Check if email service is configured
 */
router.get('/status', (req, res) => {
  const hasApiKey = !!process.env.POSTMARK_API_KEY;
  const serviceLoaded = !!emailService;
  
  res.json({
    configured: hasApiKey && serviceLoaded,
    provider: 'Postmark',
    serviceLoaded,
    apiKeyConfigured: hasApiKey,
    fromAddresses: (hasApiKey && emailService) ? emailService.FROM_ADDRESSES : null,
    status: hasApiKey && serviceLoaded ? 'ready' : 'not_configured'
  });
});

// ============================================================
// ORDER WORKFLOW EMAIL TRIGGERS
// ============================================================

/**
 * POST /api/email/order/submitted
 * Send internal notification when order is submitted
 */
router.post('/order/submitted', checkEmailService, async (req, res) => {
  try {
    const { order, submittedBy } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }
    if (!submittedBy) {
      return res.status(400).json({ error: 'submittedBy (user info) required' });
    }

    console.log(`[Email] Sending order submitted notification for: ${order.order_number}`);
    const result = await emailService.sendOrderSubmittedInternal({ order, submittedBy });
    
    res.json(result);
  } catch (error) {
    console.error('[Email] Order submitted email error:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/email/order/approval-request
 * Send approval request to manager
 */
router.post('/order/approval-request', checkEmailService, async (req, res) => {
  try {
    const { order, submittedBy, adjustments } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }
    if (!submittedBy) {
      return res.status(400).json({ error: 'submittedBy (user info) required' });
    }

    console.log(`[Email] Sending approval request for: ${order.order_number}`);
    const result = await emailService.sendApprovalRequest({ 
      order, 
      submittedBy, 
      adjustments: adjustments || [] 
    });
    
    res.json(result);
  } catch (error) {
    console.error('[Email] Approval request email error:', error);
    res.status(500).json({ 
      error: 'Failed to send approval request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/email/order/approved
 * Send notification when order is approved
 */
router.post('/order/approved', checkEmailService, async (req, res) => {
  try {
    const { order, approvedBy } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }
    if (!approvedBy) {
      return res.status(400).json({ error: 'approvedBy (user info) required' });
    }

    console.log(`[Email] Sending order approved notification for: ${order.order_number}`);
    const result = await emailService.sendOrderApproved({ order, approvedBy });
    
    res.json(result);
  } catch (error) {
    console.error('[Email] Order approved email error:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/email/order/rejected
 * Send notification when order is rejected
 */
router.post('/order/rejected', checkEmailService, async (req, res) => {
  try {
    const { order, rejectedBy, reason } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }
    if (!rejectedBy) {
      return res.status(400).json({ error: 'rejectedBy (user info) required' });
    }

    console.log(`[Email] Sending order rejected notification for: ${order.order_number}`);
    const result = await emailService.sendOrderRejected({ order, rejectedBy, reason });
    
    res.json(result);
  } catch (error) {
    console.error('[Email] Order rejected email error:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/email/order/send-to-client
 * Send contract to client for signature
 */
router.post('/order/send-to-client', checkEmailService, async (req, res) => {
  try {
    const { order, contact, signingUrl } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }
    if (!contact) {
      return res.status(400).json({ error: 'Contact info required' });
    }
    if (!signingUrl) {
      return res.status(400).json({ error: 'Signing URL required' });
    }

    console.log(`[Email] Sending contract to client: ${contact.email} for order ${order.order_number}`);
    const result = await emailService.sendContractToClient({ order, contact, signingUrl });
    
    res.json(result);
  } catch (error) {
    console.error('[Email] Send to client email error:', error);
    res.status(500).json({ 
      error: 'Failed to send contract',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/email/order/signed
 * Send confirmations when contract is signed
 */
router.post('/order/signed', checkEmailService, async (req, res) => {
  try {
    const { order, contact, pdfUrl } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }
    if (!contact) {
      return res.status(400).json({ error: 'Contact info required' });
    }

    console.log(`[Email] Sending signature confirmations for: ${order.order_number}`);
    
    // Send both client confirmation and internal notification
    const [clientResult, internalResult] = await Promise.all([
      emailService.sendSignatureConfirmation({ order, contact, pdfUrl }),
      emailService.sendContractSignedInternal({ order, contact })
    ]);

    res.json({
      clientEmail: clientResult,
      internalEmail: internalResult
    });
  } catch (error) {
    console.error('[Email] Contract signed email error:', error);
    res.status(500).json({ 
      error: 'Failed to send confirmations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================
// CATCH-ALL FOR DEBUGGING
// ============================================================

// This catches any undefined routes under /api/email/*
router.all('*', (req, res) => {
  console.log(`[Email] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Email route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET  /api/email/status',
      'POST /api/email/test',
      'POST /api/email/order/submitted',
      'POST /api/email/order/approval-request',
      'POST /api/email/order/approved',
      'POST /api/email/order/rejected',
      'POST /api/email/order/send-to-client',
      'POST /api/email/order/signed'
    ]
  });
});

module.exports = router;
