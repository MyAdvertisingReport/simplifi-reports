# Simpli.fi Reports - User Guide

## Overview
A custom reporting dashboard that displays Simpli.fi programmatic advertising data for clients. Features include campaign performance tracking, ad creative previews, audience insights, shareable public reports, and built-in diagnostics tools.

## Accessing the Dashboard

### Admin Login
1. Go to https://myadvertisingreport.com
2. Enter your email and password
3. Select a client from the dashboard

### Public Reports
- Each client has a unique public URL: `https://myadvertisingreport.com/client/{client-slug}/report`
- Example: `https://myadvertisingreport.com/client/wsic/report`
- No login required for public reports

## Dashboard Features

### Client Header
- Displays client logo and name
- Date range picker to filter report data
- "Edit Layout", "Edit Client", and "Share" buttons (admin only)

### Report Sections

#### 1. Performance Chart
- Line chart showing daily impressions, clicks, and CTR
- Toggleable metrics
- Date range totals displayed below chart

#### 2. Active Campaigns
- Table of all active campaigns
- Shows: Campaign name, Status, Impressions, Clicks, CTR, Spend
- Click campaign name for detailed view

#### 3. Top 3 Ads by Size
- Shows best performing ad sizes (by impressions)
- Displays actual ad creative preview (image/video)
- Metrics: Impressions, Clicks, CTR
- Video/OTT ads autoplay muted
- Images work on all browsers including Safari

#### 4. Audience Data
- First-party pixel/segment information
- User counts and activity

#### 5. Paused Campaigns
- List of inactive/stopped campaigns
- Historical performance data

### Campaign Detail View
- Click any campaign to see detailed performance
- Shows all individual ads with previews
- Metrics per ad: Impressions, Clicks, CTR, Spend, CPM, CPC
- Campaign flight dates and report period selector

### Customizing the Layout
1. Click "Edit Layout" button
2. Drag sections to reorder
3. Toggle section visibility
4. Click "Save Layout" when done

### Sharing Reports
1. Click "Share" button
2. Copy the public URL (shown in green box)
3. Anyone with the link can view (no login needed)

## Managing Clients (Admin)

### Add New Client
1. Click "Add Client" on main dashboard
2. Enter client name
3. Enter Simpli.fi Organization ID
4. Optionally upload logo and set brand colors
5. Save

### Edit Client
1. Navigate to client dashboard
2. Click "Edit Client"
3. Update name, logo, colors, or Simpli.fi org ID
4. Save changes

### Client Settings
- **Name**: Display name for the client
- **Slug**: URL-friendly identifier (auto-generated, can customize)
- **Simpli.fi Org ID**: Links to Simpli.fi account
- **Logo**: Displayed in header
- **Primary/Secondary Colors**: Brand colors for header gradient

## Date Range Selection
- Default: Last 30 days
- Click date inputs to select custom range
- Click "Go" or "Update" to refresh data
- All sections update with new date range

## System Diagnostics Tool

### For Admins
Access the diagnostics panel from:
- **Settings page**: Click "Open Diagnostics Panel" button
- **Any client page**: Scroll to bottom, click "System Diagnostics" button

### For Public Report Viewers
- Scroll to bottom of any public report
- Click "Report Diagnostics" button in footer

### What It Shows
1. **Your Device**: Detects if you're on Safari, iOS, or mobile
2. **Server Status**: Backend health and uptime
3. **Image Proxy**: Status of Safari image fix
4. **Database**: Connection status (admin only)
5. **Simpli.fi API**: API connection status (admin only)
6. **Client Configuration**: Validates all client setups (admin only)
7. **Mobile Compatibility Fixes**: Reference for known fixes

### Diagnostic Features
- **Test Image URL**: Paste any Simpli.fi image URL to test if it loads
- **Live Preview**: See the actual image when test succeeds
- **Copy Full Report**: Copies all diagnostic info to clipboard for support tickets
- **Clear Cache**: Force refresh cached data (admin only)

## Troubleshooting

### Images Not Loading
1. Open the Diagnostics Panel
2. Check "Image Proxy" status is OK
3. Try testing a specific image URL
4. If issues persist, copy the full report and contact support

### Data Not Updating
- Check date range selection
- Refresh the page
- Use Diagnostics Panel → Clear Cache (admin)
- Data may have a short cache delay (5-10 minutes)

### Campaign Shows No Data
- Verify campaign is active in Simpli.fi
- Check date range includes campaign flight dates
- New campaigns may take 24 hours to show data

### Mobile Display Issues
- Text should wrap properly on all screens
- If something looks cut off, try rotating device
- Report the issue via Diagnostics Panel → Copy Full Report

## Browser Support
- **Fully Supported**: Chrome, Firefox, Edge, Safari (desktop and mobile)
- **Mobile**: All modern mobile browsers work correctly
- **Safari/iOS**: Images now load correctly via proxy server

## Support
For technical issues:
1. Open the Diagnostics Panel
2. Click "Copy Full Report"
3. Send the report to your administrator
