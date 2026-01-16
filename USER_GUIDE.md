# Simpli.fi Reports - User Guide

## Overview
A custom reporting dashboard that displays Simpli.fi programmatic advertising data for clients. Features include campaign performance tracking, ad creative previews, audience insights, and shareable public reports.

## Accessing the Dashboard

### Admin Login
1. Go to https://myadvertisingreport.com
2. Enter your email and password
3. Select a client from the dashboard

### Public Reports
- Each client has a unique public URL: `https://myadvertisingreport.com/public/{client-slug}`
- Example: `https://myadvertisingreport.com/wsic`
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

#### 4. Audience Data
- First-party pixel/segment information
- User counts and activity

#### 5. Paused Campaigns
- List of inactive/stopped campaigns
- Historical performance data

### Customizing the Layout
1. Click "Edit Layout" button
2. Drag sections to reorder
3. Toggle section visibility
4. Click "Save Layout" when done

### Sharing Reports
1. Click "Share" button
2. Copy the public URL
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
- Click "Go" to refresh data
- All sections update with new date range

## Troubleshooting

### Images Not Loading on Mobile Safari
- This is a known issue being worked on
- Video ads should still display
- Desktop and Chrome mobile work normally

### Data Not Updating
- Check date range selection
- Refresh the page
- Data may have a short cache delay (5-10 minutes)

### Campaign Shows No Data
- Verify campaign is active in Simpli.fi
- Check date range includes campaign flight dates
- New campaigns may take 24 hours to show data

## Browser Support
- **Recommended**: Chrome, Firefox, Edge (desktop)
- **Mobile**: Chrome mobile works best
- **Safari**: Some image loading issues on iOS (being fixed)

## Support
For technical issues or feature requests, contact your administrator.
