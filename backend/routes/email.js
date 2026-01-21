/**
 * Email Routes
 * Handles email testing and order workflow email triggers
 * 
 * Add to server.js:
 *   const emailRoutes = require('./routes/email');
 *   app.use('/api/email', authenticateToken, emailRoutes);
 */

const express = require('express');
const router = express.Router();
const emailService = require('../services/email-service');

// ============================================================
// TEST ENDPOINTS
// ============================================================

/**
 * POST /api/email/test
 * Send a test email to verify configuration
 */
router.post('/test', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const result = await emailService.sendTestEmail(to);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Test email sent to ${to}`,
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * GET /api/email/status
 * Check if email service is configured
 */
router.get('/status', (req, res) => {
  const configured = !!process.env.POSTMARK_API_KEY;
  res.json({
    configured,
    provider: 'Postmark',
    fromAddresses: configured ? emailService.FROM_ADDRESSES : null
  });
});

// ============================================================
// ORDER WORKFLOW EMAIL TRIGGERS
// ============================================================

/**
 * POST /api/email/order/submitted
 * Send internal notification when order is submitted
 */
router.post('/order/submitted', async (req, res) => {
  try {
    const { order, submittedBy } = req.body;
    
    if (!order || !submittedBy) {
      return res.status(400).json({ error: 'Order and submittedBy required' });
    }

    const result = await emailService.sendOrderSubmittedInternal({ order, submittedBy });
    res.json(result);
  } catch (error) {
    console.error('Order submitted email error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * POST /api/email/order/approval-request
 * Send approval request to manager
 */
router.post('/order/approval-request', async (req, res) => {
  try {
    const { order, submittedBy, adjustments } = req.body;
    
    if (!order || !submittedBy) {
      return res.status(400).json({ error: 'Order and submittedBy required' });
    }

    const result = await emailService.sendApprovalRequest({ order, submittedBy, adjustments: adjustments || [] });
    res.json(result);
  } catch (error) {
    console.error('Approval request email error:', error);
    res.status(500).json({ error: 'Failed to send approval request' });
  }
});

/**
 * POST /api/email/order/approved
 * Send notification when order is approved
 */
router.post('/order/approved', async (req, res) => {
  try {
    const { order, approvedBy } = req.body;
    
    if (!order || !approvedBy) {
      return res.status(400).json({ error: 'Order and approvedBy required' });
    }

    const result = await emailService.sendOrderApproved({ order, approvedBy });
    res.json(result);
  } catch (error) {
    console.error('Order approved email error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * POST /api/email/order/rejected
 * Send notification when order is rejected
 */
router.post('/order/rejected', async (req, res) => {
  try {
    const { order, rejectedBy, reason } = req.body;
    
    if (!order || !rejectedBy) {
      return res.status(400).json({ error: 'Order and rejectedBy required' });
    }

    const result = await emailService.sendOrderRejected({ order, rejectedBy, reason });
    res.json(result);
  } catch (error) {
    console.error('Order rejected email error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * POST /api/email/order/send-to-client
 * Send contract to client for signature
 */
router.post('/order/send-to-client', async (req, res) => {
  try {
    const { order, contact, signingUrl } = req.body;
    
    if (!order || !contact || !signingUrl) {
      return res.status(400).json({ error: 'Order, contact, and signingUrl required' });
    }

    const result = await emailService.sendContractToClient({ order, contact, signingUrl });
    res.json(result);
  } catch (error) {
    console.error('Send to client email error:', error);
    res.status(500).json({ error: 'Failed to send contract' });
  }
});

/**
 * POST /api/email/order/signed
 * Send confirmations when contract is signed
 */
router.post('/order/signed', async (req, res) => {
  try {
    const { order, contact, pdfUrl } = req.body;
    
    if (!order || !contact) {
      return res.status(400).json({ error: 'Order and contact required' });
    }

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
    console.error('Contract signed email error:', error);
    res.status(500).json({ error: 'Failed to send confirmations' });
  }
});

module.exports = router;
