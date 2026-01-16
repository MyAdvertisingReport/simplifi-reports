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
│   ├── server.js              # Main Express server (1496 lines)
│   ├── simplifi-client.js     # Simpli.fi API wrapper
│   ├── report-center-service.js
│   ├── database.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.jsx            # Main React app (8164 lines)
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
- Public reports: https://myadvertisingreport.com/public/{slug}

## Key Features

### 1. Client Management
- Multi-client support with unique slugs
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

### Image Proxy (NEW)
- `GET /api/proxy/image?url=<simpli.fi-url>` - Proxies images from media.simpli.fi to avoid Safari cross-origin blocking

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

## Current Issues & Status

### ACTIVE ISSUE: Safari Mobile Image Loading
**Problem**: GIF/image ads load on desktop and Chrome mobile emulation, but not on actual iOS Safari. Video/OTT ads load fine.

**Root Cause**: Safari's strict cross-origin resource blocking for images from `media.simpli.fi` domain.

**Solution Implemented**: Image proxy endpoint (`/api/proxy/image`) that:
1. Fetches images from media.simpli.fi on the server
2. Serves them from our own domain with proper CORS headers
3. Frontend uses proxy URL instead of direct simpli.fi URL

**Status**: 
- Proxy endpoint added to server.js (line 1402-1449)
- Frontend TopAdCard component updated to use `getProxiedUrl()` helper
- Need to verify Railway deployed the latest server.js

**To Test**:
1. Visit: `https://simplifi-reports-production.up.railway.app/api/proxy/image?url=test`
2. Should return: `{"error":"Only Simpli.fi URLs allowed"}`
3. If 404, backend hasn't deployed the new code

### Other Known Issues
- Notes endpoint returns 500 (`dbHelper.getNotesByClient is not a function`)
- Header spacing on desktop was fixed

## Key Code Sections

### TopAdCard Component (App.jsx ~line 269)
```jsx
function TopAdCard({ ad, rank }) {
  const [imageError, setImageError] = useState(false);
  const isFirst = rank === 0;
  const hasValidPreview = ad.preview_url && !imageError;
  
  // Proxy image URL through our backend for Safari compatibility
  const getProxiedUrl = (url) => {
    if (!url) return null;
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
  };
  // ... renders image or video based on ad.is_video
}
```

### Image Proxy Endpoint (server.js ~line 1402)
```javascript
app.get('/api/proxy/image', async (req, res) => {
  // Validates URL is from simpli.fi
  // Fetches image and pipes to response
  // Sets proper CORS and content-type headers
});
```

### Ad Size Aggregation (App.jsx ~line 2480)
```javascript
const adSizeStats = adStats.reduce((acc, ad) => {
  const size = parseAdSize(ad.name, ad.width, ad.height);
  // Aggregates impressions, clicks by size
  // Captures preview_url from first ad with one
}, {});
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

### Console Logging (Frontend)
- `window.debugAdStats` - Raw ad statistics array
- `window.debugAdSizeStats` - Aggregated stats by size
- Console logs show ad preview URL status

### Backend Logs
- Railway dashboard shows server logs
- Look for `[CAMPAIGNS]`, `[AD STRUCTURE]`, `Image proxy error` messages

## Recent Changes (This Session)
1. Fixed TopAdCard placeholder height for banner ads (320x50)
2. Fixed desktop header spacing (client name + date picker)
3. Added debug logging for ad preview URLs
4. Implemented image proxy endpoint for Safari compatibility
5. Updated TopAdCard to use proxied URLs for images

## Planned Features

### Troubleshooting Utility Tool
After the Safari image loading fix is complete, we plan to add a troubleshooting utility that will help diagnose issues with:
- API connectivity to Simpli.fi
- Image/asset loading from media.simpli.fi
- Database connections
- Client configuration validation
- Cache status and clearing

This will be an admin-only tool accessible from the dashboard to help quickly identify and resolve issues without needing to check server logs directly.
