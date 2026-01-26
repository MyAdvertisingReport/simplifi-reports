# WSIC Order Variants & Documents - Installation Guide

## Files Overview

### Frontend Components (`frontend/src/components/`)
- **OrderTypeSelector.jsx** - Entry point to select order type
- **UploadOrderForm.jsx** - Upload pre-signed contracts  
- **ChangeOrderForm.jsx** - Modify orders (electronic signature)
- **ChangeOrderUploadForm.jsx** - Modify orders (upload signed doc)
- **KillOrderForm.jsx** - Cancel orders (electronic signature)
- **KillOrderUploadForm.jsx** - Cancel orders (upload signed doc)
- **AdminDocumentsPage.jsx** - View all documents with filters

### Backend Files (`backend/`)
- **server.js** - Updated with document routes
- **routes/order.js** - Updated with variant endpoints (upload, change, kill)
- **routes/document.js** - Document upload/download/list API
- **services/pdf-generator.py** - Python script for generating PDF contracts
- **migrations/add-documents-and-order-types.sql** - Database migration

---

## Installation Steps

### 1. Run Database Migration

In Supabase SQL Editor, run the contents of:
```
backend/migrations/add-documents-and-order-types.sql
```

This creates:
- `documents` table for storing uploaded PDFs
- New columns on `orders` table (order_type, parent_order_id, etc.)

### 2. Create Supabase Storage Bucket

In Supabase Dashboard → Storage:
1. Create a new bucket named `documents`
2. Set to **Private** (not public)
3. File size limit: 10MB
4. Allowed MIME types: `application/pdf`

### 3. Install Backend Dependencies

Add `multer` for file uploads:

```bash
cd backend
npm install multer
```

### 4. Copy Files to Your Project

**Frontend:**
```bash
# Copy all component files to your components folder
cp frontend/src/components/*.jsx your-project/frontend/src/components/

# Replace App.jsx with updated version
cp frontend/src/App.jsx your-project/frontend/src/App.jsx
```

**Backend:**
```bash
# Replace server.js and order.js with updated versions
cp backend/server.js your-project/backend/server.js
cp backend/routes/order.js your-project/backend/routes/order.js

# Add new document routes
cp backend/routes/document.js your-project/backend/routes/document.js

# Add PDF generator (optional - for generating PDFs server-side)
cp backend/services/pdf-generator.py your-project/backend/services/
```

### 5. Deploy to Railway

After pushing your changes, Railway will automatically rebuild.

---

## Installing Python Dependencies on Railway

Railway runs Node.js by default. To also run Python scripts (for PDF generation), you have two options:

### Option A: Use a Nixpacks Configuration (Recommended)

Create a `nixpacks.toml` file in your backend root:

```toml
[phases.setup]
nixPkgs = ["python311", "python311Packages.pip"]

[phases.install]
cmds = ["npm install", "pip install reportlab"]
```

### Option B: Use a Custom Dockerfile

Create a `Dockerfile` in your backend folder:

```dockerfile
FROM node:18

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

# Install Python dependencies
RUN pip3 install reportlab --break-system-packages

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy rest of application
COPY . .

# Start the server
CMD ["node", "server.js"]
```

Then in Railway settings, set Build Command to use Docker.

### Option C: Skip Python (Use Node.js PDF Library)

If you'd rather not deal with Python, you can use a Node.js PDF library like `pdfkit` or `pdf-lib` instead. I can convert the PDF generator to JavaScript if needed.

---

## New Routes Summary

### Frontend Routes (in App.jsx)
| Path | Component | Description |
|------|-----------|-------------|
| `/orders/new/select` | OrderTypeSelector | Choose order type |
| `/orders/new/upload` | UploadOrderForm | Upload pre-signed contract |
| `/orders/new/change` | ChangeOrderForm | Electronic change order |
| `/orders/new/change-upload` | ChangeOrderUploadForm | Upload signed change order |
| `/orders/new/kill` | KillOrderForm | Electronic kill order |
| `/orders/new/kill-upload` | KillOrderUploadForm | Upload signed kill order |
| `/admin/documents` | AdminDocumentsPage | View all documents |

### Backend API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:id` | Get document details |
| POST | `/api/documents/upload` | Upload new document |
| GET | `/api/documents/:id/download` | Download document |
| POST | `/api/orders/upload` | Create order from uploaded contract |
| POST | `/api/orders/change` | Create electronic change order |
| POST | `/api/orders/change-upload` | Create change order from uploaded doc |
| POST | `/api/orders/kill` | Create electronic kill order |
| POST | `/api/orders/kill-upload` | Create kill order from uploaded doc |

---

## Usage Flow

### Creating a New Order
1. Go to `/orders` → Click "New Order"
2. You'll see the Order Type Selector with 6 options
3. Choose the appropriate type:
   - **New Order (Electronic)** - Standard flow with e-signature
   - **Upload Order** - For pre-signed contracts
   - **Change Order (Electronic)** - Modify existing order
   - **Change Order (Upload)** - Upload signed change order
   - **Kill Order (Electronic)** - Cancel with e-signature
   - **Kill Order (Upload)** - Upload signed cancellation

### Management Approval
Change Orders and Kill Orders require checking:
> "I have discussed with Management and received approval to proceed."

This ensures proper authorization before modifications or cancellations.

### Viewing Documents
Go to `/admin/documents` to see all uploaded documents with:
- Filter by type (Contract, Change Order, Kill Order)
- Filter by client, brand, date range
- Search by filename or order number
- Download documents

---

## Questions?

If you need help with:
- Converting the PDF generator to JavaScript
- Customizing the PDF templates
- Adding additional features

Just let me know!
