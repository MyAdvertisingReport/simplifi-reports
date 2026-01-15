# Simpli.fi Reports - Improved Data Architecture

## Current Problems

1. **Every page load hits the API directly** - No shared cache
2. **Report Center is slow** - Creates snapshots that take 15-30 seconds
3. **Rate limits** - Too many concurrent requests
4. **No data persistence** - Everything re-fetched on navigation
5. **No background sync** - Data only updates when user visits page

## Proposed Architecture

### 1. PostgreSQL as Primary Data Store

```sql
-- Core cached data tables
CREATE TABLE cached_campaigns (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  campaign_data JSONB NOT NULL,
  last_synced TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, campaign_id)
);

CREATE TABLE cached_campaign_stats (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  stat_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(10,6) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  total_spend DECIMAL(12,4) DEFAULT 0,
  vcr DECIMAL(10,6) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  raw_data JSONB,
  UNIQUE(client_id, campaign_id, stat_date)
);

CREATE TABLE cached_ads (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  ad_id INTEGER NOT NULL,
  ad_data JSONB NOT NULL,
  last_synced TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, ad_id)
);

CREATE TABLE cached_ad_stats (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  ad_id INTEGER NOT NULL,
  stat_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12,4) DEFAULT 0,
  raw_data JSONB,
  UNIQUE(client_id, campaign_id, ad_id, stat_date)
);

CREATE TABLE cached_keywords (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  max_bid DECIMAL(10,4),
  last_synced TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, keyword)
);

CREATE TABLE cached_keyword_stats (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  stat_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12,4) DEFAULT 0,
  UNIQUE(client_id, campaign_id, keyword, stat_date)
);

CREATE TABLE cached_geo_fences (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  geo_fence_id INTEGER NOT NULL,
  geo_fence_data JSONB NOT NULL,
  last_synced TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, geo_fence_id)
);

CREATE TABLE cached_geo_fence_stats (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  geo_fence_id INTEGER NOT NULL,
  stat_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(12,4) DEFAULT 0,
  UNIQUE(client_id, campaign_id, geo_fence_id, stat_date)
);

CREATE TABLE cached_location_stats (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  city TEXT,
  metro TEXT,
  region TEXT,
  stat_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12,4) DEFAULT 0,
  UNIQUE(client_id, campaign_id, city, metro, region, stat_date)
);

CREATE TABLE cached_device_stats (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  campaign_id INTEGER NOT NULL,
  device_type TEXT NOT NULL,
  stat_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12,4) DEFAULT 0,
  UNIQUE(client_id, campaign_id, device_type, stat_date)
);

-- Sync tracking
CREATE TABLE sync_status (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  sync_type TEXT NOT NULL, -- 'campaigns', 'stats', 'ads', 'keywords', 'geo_fences', 'report_center'
  last_sync_start TIMESTAMP,
  last_sync_end TIMESTAMP,
  last_sync_status TEXT, -- 'success', 'partial', 'error'
  last_error TEXT,
  records_synced INTEGER DEFAULT 0,
  UNIQUE(client_id, sync_type)
);

-- Indexes for fast queries
CREATE INDEX idx_campaign_stats_client_date ON cached_campaign_stats(client_id, stat_date);
CREATE INDEX idx_campaign_stats_campaign ON cached_campaign_stats(campaign_id);
CREATE INDEX idx_ad_stats_campaign_date ON cached_ad_stats(campaign_id, stat_date);
CREATE INDEX idx_keyword_stats_campaign ON cached_keyword_stats(campaign_id);
CREATE INDEX idx_geo_fence_stats_campaign ON cached_geo_fence_stats(campaign_id);
```

### 2. Background Sync Service

```javascript
// sync-service.js - Runs as a background job

class SyncService {
  constructor(simplifiClient, reportCenterService, dbHelper) {
    this.simplifi = simplifiClient;
    this.reportCenter = reportCenterService;
    this.db = dbHelper;
  }

  // Main sync entry point - called by cron or on-demand
  async syncClient(clientId) {
    const client = await this.db.getClientById(clientId);
    if (!client?.simplifi_org_id) return;

    // Sync in order of dependency
    await this.syncCampaigns(client);
    await this.syncCampaignStats(client);
    await this.syncAds(client);
    await this.syncKeywords(client);
    await this.syncGeoFences(client);
    
    // Report Center data (slower, do last)
    await this.syncReportCenterData(client);
  }

  async syncCampaigns(client) {
    // Fetch all campaigns
    // Upsert into cached_campaigns
    // Update sync_status
  }

  async syncCampaignStats(client) {
    // Get last synced date from sync_status
    // Only fetch stats from last_sync_date to today
    // Upsert into cached_campaign_stats
  }

  // ... more sync methods
}
```

### 3. API Endpoints - Read from Cache

```javascript
// New cached endpoints that read from PostgreSQL

// Get all data for a campaign (single call from frontend)
app.get('/api/clients/:clientId/campaigns/:campaignId/cached-data', async (req, res) => {
  const { clientId, campaignId } = req.params;
  const { startDate, endDate } = req.query;

  // All these read from PostgreSQL cache - FAST!
  const [
    campaign,
    stats,
    dailyStats,
    ads,
    adStats,
    keywords,
    keywordStats,
    geoFences,
    geoFenceStats,
    locationStats,
    deviceStats
  ] = await Promise.all([
    db.getCachedCampaign(clientId, campaignId),
    db.getCachedCampaignStats(clientId, campaignId, startDate, endDate),
    db.getCachedDailyStats(clientId, campaignId, startDate, endDate),
    db.getCachedAds(clientId, campaignId),
    db.getCachedAdStats(clientId, campaignId, startDate, endDate),
    db.getCachedKeywords(clientId, campaignId),
    db.getCachedKeywordStats(clientId, campaignId, startDate, endDate),
    db.getCachedGeoFences(clientId, campaignId),
    db.getCachedGeoFenceStats(clientId, campaignId, startDate, endDate),
    db.getCachedLocationStats(clientId, campaignId, startDate, endDate),
    db.getCachedDeviceStats(clientId, campaignId, startDate, endDate)
  ]);

  res.json({
    campaign,
    stats: aggregateStats(stats),
    dailyStats,
    ads: mergeAdStats(ads, adStats),
    keywords: mergeKeywordStats(keywords, keywordStats),
    geoFences: mergeGeoFenceStats(geoFences, geoFenceStats),
    locationStats,
    deviceStats,
    lastSynced: await db.getLastSyncTime(clientId)
  });
});

// Trigger a sync (admin only)
app.post('/api/clients/:clientId/sync', authenticateToken, requireAdmin, async (req, res) => {
  // Queue a background sync job
  syncQueue.add({ clientId: req.params.clientId });
  res.json({ status: 'queued' });
});
```

### 4. React Context for Shared Data

```javascript
// DataContext.jsx - Shared data store for all components

const DataContext = createContext();

export function DataProvider({ children }) {
  const [clientsData, setClientsData] = useState({});
  const [loading, setLoading] = useState({});
  const [lastFetch, setLastFetch] = useState({});

  // Load client data ONCE, share across all components
  const loadClientData = async (clientId, campaignId, dateRange) => {
    const cacheKey = `${clientId}-${campaignId}-${dateRange.start}-${dateRange.end}`;
    
    // Check if we have fresh data (less than 5 min old)
    if (clientsData[cacheKey] && Date.now() - lastFetch[cacheKey] < 5 * 60 * 1000) {
      return clientsData[cacheKey];
    }

    // Fetch from our cached endpoint (reads from PostgreSQL)
    setLoading(prev => ({ ...prev, [cacheKey]: true }));
    
    try {
      const data = await api.get(`/api/clients/${clientId}/campaigns/${campaignId}/cached-data`, {
        params: { startDate: dateRange.start, endDate: dateRange.end }
      });
      
      setClientsData(prev => ({ ...prev, [cacheKey]: data }));
      setLastFetch(prev => ({ ...prev, [cacheKey]: Date.now() }));
      
      return data;
    } finally {
      setLoading(prev => ({ ...prev, [cacheKey]: false }));
    }
  };

  // Trigger background sync
  const triggerSync = async (clientId) => {
    await api.post(`/api/clients/${clientId}/sync`);
    // Clear cache for this client so next load fetches fresh
    setClientsData(prev => {
      const newData = { ...prev };
      Object.keys(newData).forEach(key => {
        if (key.startsWith(clientId)) delete newData[key];
      });
      return newData;
    });
  };

  return (
    <DataContext.Provider value={{ 
      loadClientData, 
      triggerSync, 
      loading,
      clientsData 
    }}>
      {children}
    </DataContext.Provider>
  );
}

// Hook for components
export function useClientData(clientId, campaignId, dateRange) {
  const { loadClientData, loading, clientsData } = useContext(DataContext);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    loadClientData(clientId, campaignId, dateRange).then(setData);
  }, [clientId, campaignId, dateRange.start, dateRange.end]);
  
  const cacheKey = `${clientId}-${campaignId}-${dateRange.start}-${dateRange.end}`;
  
  return {
    data,
    loading: loading[cacheKey],
    isFromCache: !!clientsData[cacheKey]
  };
}
```

### 5. Component Usage

```javascript
// CampaignDetail.jsx - Uses shared data context

function CampaignDetail({ clientId, campaignId }) {
  const { startDate, endDate } = useDateRange();
  
  // Single hook gets ALL data - no multiple API calls!
  const { data, loading } = useClientData(clientId, campaignId, { start: startDate, end: endDate });
  
  if (loading) return <LoadingSpinner />;
  
  // All data available immediately from cache
  const { 
    campaign, 
    stats, 
    dailyStats, 
    ads, 
    keywords, 
    geoFences, 
    locationStats, 
    deviceStats 
  } = data;

  return (
    <div>
      <PerformanceSummary stats={stats} />
      <DailyChart data={dailyStats} />
      <KeywordPerformance keywords={keywords} />
      <AdPerformance ads={ads} />
      <GeoFencePerformance geoFences={geoFences} />
      <LocationBreakdown locations={locationStats} />
      <DeviceBreakdown devices={deviceStats} />
    </div>
  );
}
```

## Migration Plan

### Phase 1: Database Schema
1. Add new cache tables to database.js
2. Create migration script
3. Deploy and run migration

### Phase 2: Sync Service  
1. Create sync-service.js
2. Add sync endpoints to server.js
3. Test manual sync

### Phase 3: Cached API Endpoints
1. Create `/cached-data` endpoint
2. Update existing endpoints to check cache first
3. Test with frontend

### Phase 4: React Context
1. Create DataProvider component
2. Create useClientData hook
3. Migrate CampaignDetail to use context

### Phase 5: Background Jobs
1. Set up cron for nightly sync
2. Add "Sync Now" button for admins
3. Show "Last synced" timestamp in UI

## Benefits

1. **Fast page loads** - Read from PostgreSQL, not Simpli.fi API
2. **No rate limits** - API only called during background sync
3. **Shared data** - Components share cache, no duplicate fetches
4. **Offline capability** - Data available even if Simpli.fi is down
5. **Historical data** - Keep all historical stats forever
6. **Better UX** - Instant navigation, no loading spinners
