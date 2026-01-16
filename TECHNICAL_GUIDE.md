# Simpli.fi Reports - Technical Guide

## Project Overview
Custom reporting dashboard for Simpli.fi programmatic advertising data. Provides client-facing reports with campaign performance metrics, ad statistics, and audience insights.

## Architecture

### Tech Stack
- **Frontend**: React + Vite, deployed on Vercel
- **Backend**: Node.js + Express, deployed on Railway
- **Database**: PostgreSQL (Railway)
- **API**: Simpli.fi REST API

### Repository Structure
```
simplifi-reports/
├── backend/
│   ├── server.js              # Main Express server (~1733 lines)
│   ├── simplifi-client.js     # Simpli.fi API wrapper
│   ├── report-center-service.js
│   ├── database.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.jsx            # Main React app (~8700 lines)
│   ├── public/
│   └── package.json
└── README.md
```

### Deployment
- **Frontend**: Vercel (auto-deploys from git push)
- **Backend**: Railway (auto-deploys from git push)
- **Domain**: myadvertisingreport.com

### URLs
- Production: https://myadvertisingreport.com
- Backend API: https://simplifi-reports-production.up.railway.app
- Public reports: https://myadvertisingreport.com/client/{slug}/report

## Key Features

### 1. Client Management
- Multi-client support with unique slugs (19 clients currently)
- Client branding (logo, colors)
- Public shareable report links

### 2. Campaign Dashboard
- Active/Paused campaign views
- Date range filtering
- Performance metrics (impressions, clicks, CTR, spend)
- Daily trend charts (Recharts)

### 3. Top Ads by Size
- Aggregates ad performance by creative size
- Shows top 3 ad sizes with preview images
- Supports Video/OTT, display ads (GIF, PNG, JPG)
- **Image Proxy**: `/api/proxy/image` endpoint for Safari cross-origin compatibility

### 4. Audience/Pixel Data
- First-party segment tracking
- User count metrics

### 5. Report Sections (Draggable)
- Performance chart
- Campaign breakdown
- Top ads by size
- Geo/location data
- Device breakdown
- Paused campaigns

### 6. System Diagnostics Tool (NEW)
- Admin and public report versions
- Tests API connectivity, database, image proxy
- Live image preview testing
- Copy full report to clipboard for support
- Access: Settings page or footer of client pages

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `GET /api/clients/by-slug/:slug` - Get client by public slug
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Stats (Simpli.fi)
- `GET /api/simplifi/organizations/:orgId/stats` - Campaign stats
- `GET /api/simplifi/organizations/:orgId/campaigns-with-ads` - Campaigns with ad details

### Public Reports
- `GET /api/public/:slug` - Get public report data (no auth required)

### Image Proxy
- `GET /api/proxy/image?url=<simpli.fi-url>` - Proxies images from media.simpli.fi to avoid Safari cross-origin blocking

### Diagnostics Endpoints
- `GET /api/diagnostics/public` - Public diagnostics (no auth, limited info)
- `GET /api/diagnostics/admin` - Full diagnostics (requires auth)
- `POST /api/diagnostics/clear-cache` - Clear cache (admin only)
- `GET /api/diagnostics/test-image?url=<url>` - Test if specific image can be proxied

## Database Schema

### clients
- id (UUID)
- name
- slug (unique, for public URLs)
- simplifi_org_id
- logo_path
- primary_color
- secondary_color
- created_at

### users
- id (UUID)
- email
- password_hash
- role

### notes
- id
- client_id
- content
- created_at

## Environment Variables

### Backend (.env)
```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
SIMPLIFI_APP_KEY=...
SIMPLIFI_USER_KEY=...
FRONTEND_URL=https://myadvertisingreport.com
```

### Frontend (.env)
```
VITE_API_URL=https://simplifi-reports-production.up.railway.app
```

## Resolved Issues

### ✅ RESOLVED: Safari Mobile Image Loading
**Problem**: GIF/image ads loaded on desktop and Chrome mobile emulation, but not on actual iOS Safari. Video/OTT ads worked fine.

**Root Cause**: Safari's strict cross-origin resource blocking for images from `media.simpli.fi` domain.

**Solution Implemented**: 
1. Image proxy endpoint (`/api/proxy/image`) added to server.js (line ~1387)
   - **IMPORTANT**: Endpoint must be defined BEFORE the 404 handler in Express
2. Fetches images from media.simpli.fi on the server
3. Serves them from our own domain with proper CORS headers
4. Frontend components use `getProxiedUrl()` helper

**Components Updated**:
- `TopAdCard` (App.jsx ~line 278) - Main client page ad previews
- `AdPerformanceCard` (App.jsx ~line 4605) - Campaign detail page ad list

**Verification**:
- Test URL: `https://simplifi-reports-production.up.railway.app/api/proxy/image?url=test`
- Should return: `{"error":"Only Simpli.fi URLs allowed"}`
- Use Diagnostics Panel to test specific image URLs with live preview

### ✅ RESOLVED: Mobile UI Overflow Issues
**Problems Fixed**:
1. Paused campaigns card - "Paused" badge was cut off on mobile
2. Campaign detail header - Long campaign names overflowed
3. Public URL box - URL text was cut off on mobile

**Solutions**:
- Added `wordBreak: 'break-word'`, `overflowWrap: 'break-word'` to text elements
- Added `flexWrap: 'wrap'` to flex containers
- Added `flexShrink: 0` to badges/buttons that shouldn't shrink
- Reduced font sizes on mobile for campaign headers

### Other Known Issues
- Notes endpoint returns 500 (`dbHelper.getNotesByClient is not a function`) - not critical

## Key Code Sections

### TopAdCard Component (App.jsx ~line 271)
```jsx
function TopAdCard({ ad, rank }) {
  const [imageError, setImageError] = useState(false);
  
  // Proxy image URL through our backend for Safari compatibility
  const getProxiedUrl = (url) => {
    if (!url) return null;
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
  };
  
  // Uses getProxiedUrl(ad.preview_url) for <img> src
}
```

### AdPerformanceCard Component (App.jsx ~line 4586)
```jsx
function AdPerformanceCard({ ad, showSpendData = true }) {
  // Also has getProxiedUrl() helper for Safari compatibility
  // Used on campaign detail pages
}
```

### Image Proxy Endpoint (server.js ~line 1387)
```javascript
// MUST be placed BEFORE the 404 handler!
app.get('/api/proxy/image', async (req, res) => {
  // Validates URL contains 'simpli.fi'
  // Fetches image and pipes to response
  // Sets CORS headers: Access-Control-Allow-Origin: *
  // Sets Cache-Control: public, max-age=86400
});

// 404 handler comes AFTER
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
```

### DiagnosticsPanel Component (App.jsx ~line 8100)
```jsx
function DiagnosticsPanel({ isPublic = false, onClose }) {
  // Sections: Device Info, Server Status, Image Proxy, Database, 
  //           Simpli.fi API, Client Config, Mobile Fixes, Cache
  // Features: Live image preview, Copy full report to clipboard
}
```

### Diagnostics Endpoints (server.js ~line 1383)
```javascript
app.get('/api/diagnostics/public', ...)   // No auth required
app.get('/api/diagnostics/admin', ...)    // Requires Bearer token
app.post('/api/diagnostics/clear-cache', ...) // Admin only
app.get('/api/diagnostics/test-image', ...)   // Test specific URL
```

## Git Workflow
```bash
# Frontend changes
git add frontend/src/App.jsx
git commit -m "description"
git push

# Backend changes
git add backend/server.js
git commit -m "description"
git push

# Both auto-deploy to Vercel/Railway
```

## Debug Tools

### System Diagnostics Panel (Recommended)
- **Admin Access**: Settings page → "Open Diagnostics Panel" button, or bottom of any client page
- **Public Access**: Footer of public report pages → "Report Diagnostics" button
- **Features**:
  - Device/browser detection (Safari, iOS, mobile)
  - Server health check with uptime
  - Image proxy status + live test with preview
  - Database connection + client/user counts
  - Simpli.fi API status
  - Client configuration validation
  - Copy full report to clipboard

### Console Logging (Frontend)
- `window.debugAdStats` - Raw ad statistics array
- `window.debugAdSizeStats` - Aggregated stats by size

### Backend Logs
- Railway dashboard shows server logs
- Look for `[CAMPAIGNS]`, `[AD STRUCTURE]`, `Image proxy error` messages

## Recent Changes (January 2026 Session)

### Safari Image Fix
1. Added `/api/proxy/image` endpoint to server.js
2. **Fixed endpoint placement** - moved BEFORE 404 handler (was returning 404)
3. Updated `TopAdCard` component to use proxy for images
4. Updated `AdPerformanceCard` component to use proxy for campaign detail images

### Mobile UI Fixes
1. Fixed paused campaigns card overflow - badge stays visible
2. Fixed campaign detail header - name wraps properly, smaller font on mobile
3. Fixed public URL box - URL wraps instead of being cut off
4. Fixed campaign flight dates section - centers on mobile, wraps properly

### Diagnostics Tool (NEW)
1. Added 4 backend endpoints for diagnostics
2. Created `DiagnosticsPanel` component with collapsible sections
3. Added to Settings page, client detail pages (admin), and public report footer
4. Features: live image preview, copy report to clipboard
5. Fixed database queries to use `dbHelper` instead of `pool`

## Current System Status
As of last check:
- ✅ Server Status: OK
- ✅ Image Proxy: OK  
- ✅ Database: OK (19 clients, 3 users)
- ✅ Simpli.fi API: OK
- ✅ Client Configuration: OK (0 issues)

## File Sizes Reference
- `server.js`: ~1733 lines
- `App.jsx`: ~8700 lines
