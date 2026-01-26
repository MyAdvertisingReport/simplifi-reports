// ============================================================
// DOCUMENT ROUTES
// Handles document upload, retrieval, and management
// ============================================================

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Database pool
let pool = null;

// Initialize the pool
const initPool = (connectionString) => {
  if (!pool && connectionString) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Document routes connected to database');
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware to ensure pool is available
const ensurePool = (req, res, next) => {
  if (!pool) {
    const connString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (connString) initPool(connString);
  }
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  next();
};

router.use(ensurePool);

// ============================================================
// DOCUMENT ENDPOINTS
// ============================================================

// GET /api/documents - List all documents with filters
router.get('/', async (req, res) => {
  try {
    const { client_id, document_type, entity_id, order_id, limit = 100 } = req.query;

    let query = `
      SELECT 
        d.*,
        c.business_name as client_name,
        e.name as entity_name,
        o.order_number,
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM documents d
      LEFT JOIN advertising_clients c ON d.client_id = c.id
      LEFT JOIN entities e ON d.entity_id = e.id
      LEFT JOIN orders o ON d.order_id = o.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.status = 'active'
    `;
    const params = [];
    let paramCount = 0;

    if (client_id) {
      paramCount++;
      query += ` AND d.client_id = $${paramCount}`;
      params.push(client_id);
    }

    if (document_type) {
      paramCount++;
      query += ` AND d.document_type = $${paramCount}`;
      params.push(document_type);
    }

    if (entity_id) {
      paramCount++;
      query += ` AND d.entity_id = $${paramCount}`;
      params.push(entity_id);
    }

    if (order_id) {
      paramCount++;
      query += ` AND d.order_id = $${paramCount}`;
      params.push(order_id);
    }

    query += ` ORDER BY d.created_at DESC LIMIT ${parseInt(limit)}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id - Get single document
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, c.business_name as client_name, e.name as entity_name
       FROM documents d
       LEFT JOIN advertising_clients c ON d.client_id = c.id
       LEFT JOIN entities e ON d.entity_id = e.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/documents/upload - Upload new document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      client_id,
      document_type = 'other',
      order_id,
      entity_id,
      title,
      description,
      product_ids
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Get user ID from JWT if available
    let uploaded_by = null;
    if (req.user?.id) {
      uploaded_by = req.user.id;
    }

    const result = await pool.query(
      `INSERT INTO documents (
        client_id, document_type, file_name, original_file_name, file_path,
        file_size, mime_type, title, description, entity_id, product_ids,
        order_id, uploaded_by, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', NOW(), NOW()
      ) RETURNING *`,
      [
        client_id,
        document_type,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        title || req.file.originalname,
        description,
        entity_id || null,
        product_ids ? JSON.stringify(product_ids) : '[]',
        order_id || null,
        uploaded_by
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/documents/:id/download - Download document
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT file_path, original_file_name, mime_type FROM documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    
    if (!fs.existsSync(doc.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_file_name}"`);
    res.sendFile(doc.file_path);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// PUT /api/documents/:id - Update document metadata
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const result = await pool.query(
      `UPDATE documents SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [title, description, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id - Soft delete document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE documents SET status = 'deleted', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /api/documents/client/:clientId - Get documents for a specific client
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT d.*, e.name as entity_name, o.order_number
       FROM documents d
       LEFT JOIN entities e ON d.entity_id = e.id
       LEFT JOIN orders o ON d.order_id = o.id
       WHERE d.client_id = $1 AND d.status = 'active'
       ORDER BY d.created_at DESC`,
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching client documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

module.exports = router;
module.exports.initPool = initPool;
