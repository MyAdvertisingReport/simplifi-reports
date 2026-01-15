/**
 * Sync Service - Background data synchronization
 * 
 * This service handles:
 * - Fetching data from Simpli.fi API
 * - Storing in PostgreSQL cache
 * - Incremental updates (only fetch new data)
 * - Rate limiting and error handling
 */

class SyncService {
  constructor(simplifiClient, reportCenterService, dbHelper) {
    this.simplifi = simplifiClient;
    this.reportCenter = reportCenterService;
    this.db = dbHelper;
    
    // Track active syncs to prevent duplicates
    this.activeSyncs = new Set();
  }

  /**
   * Main sync entry point - syncs all data for a client
   */
  async syncClient(clientId, options = {}) {
    if (this.activeSyncs.has(clientId)) {
      console.log(`[SYNC] Sync already in progress for client ${clientId}`);
      return { status: 'already_running' };
    }

    this.activeSyncs.add(clientId);
    const results = {
      clientId,
      startTime: new Date(),
      campaigns: { synced: 0, errors: [] },
      stats: { synced: 0, errors: [] },
      ads: { synced: 0, errors: [] },
      keywords: { synced: 0, errors: [] },
      geoFences: { synced: 0, errors: [] },
      reportCenter: { synced: 0, errors: [] }
    };

    try {
      const client = await this.db.getClientById(clientId);
      if (!client?.simplifi_org_id) {
        throw new Error('Client not found or no Simpli.fi org linked');
      }

      console.log(`[SYNC] Starting sync for ${client.name} (org: ${client.simplifi_org_id})`);

      // Sync in order of dependency
      // 1. Campaigns first (we need campaign IDs for everything else)
      const campaigns = await this.syncCampaigns(client, results);
      
      // 2. For each active campaign, sync its data
      const activeCampaigns = campaigns.filter(c => c.status === 'Active' || c.status === 'Serving');
      
      for (const campaign of activeCampaigns) {
        await this.syncCampaignData(client, campaign, results, options);
        
        // Small delay between campaigns to avoid rate limits
        await this.delay(500);
      }

      results.endTime = new Date();
      results.status = 'success';
      console.log(`[SYNC] Completed sync for ${client.name} in ${(results.endTime - results.startTime) / 1000}s`);

    } catch (error) {
      results.endTime = new Date();
      results.status = 'error';
      results.error = error.message;
      console.error(`[SYNC] Error syncing client ${clientId}:`, error.message);
    } finally {
      this.activeSyncs.delete(clientId);
    }

    return results;
  }

  /**
   * Sync campaigns for a client
   */
  async syncCampaigns(client, results) {
    try {
      console.log(`[SYNC] Fetching campaigns for org ${client.simplifi_org_id}`);
      
      const response = await this.simplifi.getCampaignsWithAds(client.simplifi_org_id);
      const campaigns = response.campaigns || [];
      
      const count = await this.db.cacheCampaigns(client.id, campaigns);
      results.campaigns.synced = count;
      
      await this.db.updateSyncStatus(client.id, 'campaigns', null, 'success', count);
      console.log(`[SYNC] Cached ${count} campaigns`);
      
      return campaigns;
    } catch (error) {
      results.campaigns.errors.push(error.message);
      await this.db.updateSyncStatus(client.id, 'campaigns', null, 'error', 0, error.message);
      console.error(`[SYNC] Error syncing campaigns:`, error.message);
      return [];
    }
  }

  /**
   * Sync all data for a single campaign
   */
  async syncCampaignData(client, campaign, results, options = {}) {
    const campaignId = campaign.id;
    console.log(`[SYNC] Syncing data for campaign ${campaign.name} (${campaignId})`);

    // Calculate date range - last 90 days by default, or incremental from last sync
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;
    
    if (options.fullSync) {
      // Full sync - last 90 days
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      // Incremental sync - from last synced date
      const lastSync = await this.db.getLastCachedStatsDate(client.id, campaignId);
      if (lastSync) {
        const lastDate = new Date(lastSync);
        lastDate.setDate(lastDate.getDate() + 1);
        startDate = lastDate.toISOString().split('T')[0];
      } else {
        // No previous sync, do last 30 days
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    }

    // Skip if we're already up to date
    if (startDate > endDate) {
      console.log(`[SYNC] Campaign ${campaignId} already up to date`);
      return;
    }

    console.log(`[SYNC] Date range: ${startDate} to ${endDate}`);

    // Sync each data type
    await this.syncCampaignStats(client, campaignId, startDate, endDate, results);
    await this.syncAds(client, campaignId, results);
    await this.syncKeywords(client, campaignId, startDate, endDate, results);
    await this.syncGeoFences(client, campaignId, results);
    
    // Report Center data (slower, optional)
    if (options.includeReportCenter !== false) {
      await this.syncReportCenterData(client, campaignId, startDate, endDate, results);
    }
  }

  /**
   * Sync campaign stats
   */
  async syncCampaignStats(client, campaignId, startDate, endDate, results) {
    try {
      const response = await this.simplifi.getCampaignStats(client.simplifi_org_id, {
        campaignId,
        startDate,
        endDate,
        byDay: true
      });
      
      const stats = response.campaign_stats || [];
      if (stats.length > 0) {
        const count = await this.db.cacheCampaignStats(client.id, campaignId, stats);
        results.stats.synced += count;
        await this.db.updateSyncStatus(client.id, 'stats', campaignId, 'success', count);
      }
      
      await this.delay(200);
    } catch (error) {
      results.stats.errors.push(`Campaign ${campaignId}: ${error.message}`);
      console.error(`[SYNC] Error syncing stats for campaign ${campaignId}:`, error.message);
    }
  }

  /**
   * Sync ads for a campaign
   */
  async syncAds(client, campaignId, results) {
    try {
      const response = await this.simplifi.getCampaignAds(client.simplifi_org_id, campaignId);
      const ads = response.ads || [];
      
      if (ads.length > 0) {
        const count = await this.db.cacheAds(client.id, campaignId, ads);
        results.ads.synced += count;
        await this.db.updateSyncStatus(client.id, 'ads', campaignId, 'success', count);
      }
      
      await this.delay(200);
    } catch (error) {
      results.ads.errors.push(`Campaign ${campaignId}: ${error.message}`);
      console.error(`[SYNC] Error syncing ads for campaign ${campaignId}:`, error.message);
    }
  }

  /**
   * Sync keywords for a campaign
   */
  async syncKeywords(client, campaignId, startDate, endDate, results) {
    try {
      // First get the keyword list
      const keywordResponse = await this.simplifi.downloadCampaignKeywords(client.simplifi_org_id, campaignId);
      const keywords = keywordResponse.keywords || [];
      
      if (keywords.length > 0) {
        const count = await this.db.cacheKeywords(client.id, campaignId, keywords);
        results.keywords.synced += count;
      }
      
      await this.delay(200);
    } catch (error) {
      // Keywords not available for all campaigns, don't treat as error
      console.log(`[SYNC] Keywords not available for campaign ${campaignId}: ${error.message}`);
    }
  }

  /**
   * Sync geo-fences for a campaign
   */
  async syncGeoFences(client, campaignId, results) {
    try {
      const response = await this.simplifi.getCampaignGeoFences(campaignId);
      const geoFences = response.geo_fences || [];
      
      if (geoFences.length > 0) {
        const count = await this.db.cacheGeoFences(client.id, campaignId, geoFences);
        results.geoFences.synced += count;
        await this.db.updateSyncStatus(client.id, 'geo_fences', campaignId, 'success', count);
      }
      
      await this.delay(200);
    } catch (error) {
      // Geo-fences not available for all campaigns
      console.log(`[SYNC] Geo-fences not available for campaign ${campaignId}: ${error.message}`);
    }
  }

  /**
   * Sync Report Center data (slower - creates snapshots)
   */
  async syncReportCenterData(client, campaignId, startDate, endDate, results) {
    if (!this.reportCenter) return;

    try {
      console.log(`[SYNC] Fetching Report Center data for campaign ${campaignId}`);

      // Keyword performance
      try {
        const kwPerf = await this.reportCenter.getKeywordPerformance(
          client.simplifi_org_id, campaignId, startDate, endDate
        );
        if (kwPerf && kwPerf.length > 0) {
          await this.db.cacheKeywordStats(client.id, campaignId, startDate, endDate, kwPerf);
          results.reportCenter.synced += kwPerf.length;
        }
      } catch (e) { console.log(`[SYNC] Keyword perf not available:`, e.message); }

      await this.delay(500);

      // Location performance
      try {
        const locPerf = await this.reportCenter.getLocationPerformance(
          client.simplifi_org_id, campaignId, startDate, endDate
        );
        if (locPerf && locPerf.length > 0) {
          await this.db.cacheLocationStats(client.id, campaignId, startDate, endDate, locPerf);
          results.reportCenter.synced += locPerf.length;
        }
      } catch (e) { console.log(`[SYNC] Location perf not available:`, e.message); }

      await this.delay(500);

      // Device breakdown
      try {
        const deviceData = await this.reportCenter.getDeviceBreakdown(
          client.simplifi_org_id, campaignId, startDate, endDate
        );
        if (deviceData && deviceData.length > 0) {
          await this.db.cacheDeviceStats(client.id, campaignId, startDate, endDate, deviceData);
          results.reportCenter.synced += deviceData.length;
        }
      } catch (e) { console.log(`[SYNC] Device breakdown not available:`, e.message); }

      await this.delay(500);

      // Geo-fence performance
      try {
        const gfPerf = await this.reportCenter.getGeoFencePerformance(
          client.simplifi_org_id, campaignId, startDate, endDate
        );
        if (gfPerf && gfPerf.length > 0) {
          await this.db.cacheGeoFenceStats(client.id, campaignId, startDate, endDate, gfPerf);
          results.reportCenter.synced += gfPerf.length;
        }
      } catch (e) { console.log(`[SYNC] Geo-fence perf not available:`, e.message); }

      await this.delay(500);

      // Viewability
      try {
        const viewability = await this.reportCenter.getViewabilityMetrics(
          client.simplifi_org_id, campaignId, startDate, endDate
        );
        if (viewability) {
          await this.db.cacheViewability(client.id, campaignId, startDate, endDate, viewability);
          results.reportCenter.synced += 1;
        }
      } catch (e) { console.log(`[SYNC] Viewability not available:`, e.message); }

      await this.delay(500);

      // Conversions
      try {
        const conversions = await this.reportCenter.getConversions(
          client.simplifi_org_id, campaignId, startDate, endDate
        );
        if (conversions && conversions.length > 0) {
          await this.db.cacheConversions(client.id, campaignId, startDate, endDate, conversions);
          results.reportCenter.synced += conversions.length;
        }
      } catch (e) { console.log(`[SYNC] Conversions not available:`, e.message); }

      await this.db.updateSyncStatus(client.id, 'report_center', campaignId, 'success', results.reportCenter.synced);

    } catch (error) {
      results.reportCenter.errors.push(`Campaign ${campaignId}: ${error.message}`);
      console.error(`[SYNC] Error syncing Report Center data:`, error.message);
    }
  }

  /**
   * Sync all clients (for scheduled jobs)
   */
  async syncAllClients(options = {}) {
    const clients = await this.db.getAllClients();
    const results = [];

    for (const client of clients) {
      if (client.simplifi_org_id) {
        const result = await this.syncClient(client.id, options);
        results.push(result);
        
        // Longer delay between clients
        await this.delay(2000);
      }
    }

    return results;
  }

  /**
   * Helper to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { SyncService };
