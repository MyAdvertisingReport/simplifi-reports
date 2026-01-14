# Simpli.fi Reports - Custom Advertising Reporting Tool

A custom-built reporting tool for programmatic advertising campaigns managed through Simpli.fi. This replaces Agency Analytics with a branded solution you own and control.

## Features

- **Multi-brand support** - WSIC and Lake Norman Woman logos pre-configured
- **Client branding** - Each client gets their own colors and logo on reports
- **Static shareable links** - Clients can view reports without login, with date range selection
- **Role-based access** - Admins can edit, Sales associates can view
- **Real-time data** - Pulls directly from Simpli.fi Campaign Stats API
- **Caching** - 15-minute cache reduces API calls and improves performance

## Tech Stack

- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + Vite
- **Database**: SQLite via sql.js (pure JavaScript, no compilation needed)
- **API**: Simpli.fi Campaign Stats API

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Your Simpli.fi API credentials (App Key + User Key)

### 1. Clone/Download the Project

```bash
cd simplifi-reports
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env

# Edit .env and add your Simpli.fi credentials:
# SIMPLIFI_APP_KEY=your-app-key
# SIMPLIFI_USER_KEY=your-user-key
# JWT_SECRET=generate-a-random-string-here

# Start the backend server
npm start
```

The backend will run on http://localhost:3001

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on http://localhost:3000

### 4. Login

Open http://localhost:3000 in your browser.

Default admin credentials:
- **Email**: admin@example.com
- **Password**: changeme123

⚠️ **CHANGE THIS PASSWORD IMMEDIATELY** after first login!

## Project Structure

```
simplifi-reports/
├── backend/
│   ├── server.js           # Express API server
│   ├── simplifi-client.js  # Simpli.fi API wrapper
│   ├── database.js         # SQLite setup & helpers
│   ├── package.json
│   ├── .env.example        # Environment template
│   └── data/               # SQLite database (auto-created)
│       └── reports.db
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React app with all pages
│   │   ├── main.jsx        # Entry point
│   │   └── styles/
│   │       └── index.css   # Global styles
│   ├── public/
│   │   ├── wsic-logo.png   # Your brand logos
│   │   └── lnw-logo.png
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Configuration

### Simpli.fi API Keys

1. **App Key**: Contact your Simpli.fi client services rep
2. **User Key**: Generate in My Account at app.simpli.fi

Add both to `backend/.env`:

```env
SIMPLIFI_APP_KEY=xxxx-xx-xx-xx-xxxxxx
SIMPLIFI_USER_KEY=xxxx-xx-xx-xx-xxxxxx
JWT_SECRET=your-secure-random-string
PORT=3001
```

### Adding New Brands

Currently brands are seeded in the database. To add more, you can:

1. Use SQLite directly:
```sql
INSERT INTO brands (id, name, logo_path, primary_color, secondary_color)
VALUES ('uuid-here', 'New Brand', '/newbrand-logo.png', '#123456', '#789abc');
```

2. Or add a brand management UI (Phase 2 feature)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create client (Admin only)
- `PUT /api/clients/:id` - Update client (Admin only)

### Simpli.fi Data
- `GET /api/simplifi/organizations` - List orgs
- `GET /api/simplifi/organizations/:orgId/campaigns` - List campaigns
- `GET /api/simplifi/organizations/:orgId/stats` - Get campaign stats

### Reports
- `GET /api/clients/:clientId/reports` - List client reports
- `POST /api/clients/:clientId/reports` - Create report config
- `GET /api/reports/:id` - Get report details
- `POST /api/reports/:id/links` - Generate shareable link

### Public (No auth required)
- `GET /api/public/reports/:token` - Get report by share token
- `GET /api/public/reports/:token/stats` - Get stats for public report

## Deployment

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Connect Railway to your repo
3. Add environment variables in Railway dashboard
4. Deploy!

Estimated cost: ~$5-20/month

### Option 2: Render

Similar process to Railway. Free tier available with limitations.

### Option 3: VPS (DigitalOcean, Linode, etc.)

1. Set up a $6/month droplet
2. Install Node.js
3. Clone repo, configure .env
4. Use PM2 to keep server running
5. Set up nginx as reverse proxy
6. Add SSL with Let's Encrypt

## Roadmap

### Phase 1 (Current) ✅
- [x] Simpli.fi API integration
- [x] User authentication
- [x] Client management with branding
- [x] Basic dashboard

### Phase 2 (Next)
- [ ] Public report viewer with date picker
- [ ] Campaign selection per report
- [ ] Chart visualizations (line, bar, pie)
- [ ] Daily performance breakdown

### Phase 3 (Future)
- [ ] Report Center integration for device/placement breakdowns
- [ ] PDF export
- [ ] Email scheduling
- [ ] Multi-organization support
- [ ] Client login portal

## Troubleshooting

### "Simpli.fi API not configured"
- Check that `.env` file exists in backend/
- Verify your API keys are correct
- Restart the backend server after changing .env

### "Authentication failed"
- Verify your Simpli.fi keys are valid
- Check the rate limit (300 requests/minute)

### Database errors
- Delete `backend/data/reports.db` to reset
- Restart server to recreate tables

## Support

This is your custom tool - you own it! For help extending or modifying:
- Review the code comments
- Check Simpli.fi API docs at app.simpli.fi/apidocs
- Reach out for Claude Code assistance

---

Built with ❤️ for WSIC and Lake Norman Woman
