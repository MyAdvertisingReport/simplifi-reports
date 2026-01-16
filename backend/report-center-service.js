/**
 * Report Center Service
 * 
 * Handles fetching enhanced data from Simpli.fi Report Center
 * This service creates report models, runs snapshots, and retrieves data
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://app.simpli.fi/api';

// Template IDs for the reports we need
const TEMPLATES = {
  GEO_FENCE_BY_CAMPAIGN: 53617,           // Geo Fencing by Campaign - impressions per geo-fence
  LOCATION_BY_CAMPAIGN: 53634,            // Location Performance by Campaign - city/metro/region
  CONVERSION_BY_CAMPAIGN: 26573,          // Account Conversion by Campaign
  DEVICE_BY_CAMPAIGN: 53593,              // Device Type by Campaign
  VIEWABILITY_BY_CAMPAIGN: 105322,        // Viewability Average by Campaign
  DOMAIN_BY_CAMPAIGN: 53602,              // Domain Performance by Campaign
  DOMAIN_VIDEO_INTERACTION: 177969,       // Domain Video Interaction - includes completion rate for OTT
  KEYWORD_BY_CAMPAIGN: 53622,             // Keyword Performance by Campaign
};

class ReportCenterService {
  /**
   * Constructor - accepts either a SimplifiClient instance OR separate keys
   * @param {SimplifiClient|string} clientOrAppKey - SimplifiClient instance or App Key
   * @param {string} [userKey] - User Key (only needed if first param is appKey)
   */
  constructor(clientOrAppKey, userKey) {
    let appKey, userKeyFinal;
    
    // Check if first argument is a SimplifiClient instance
    if (clientOrAppKey && typeof clientOrAppKey === 'object' && clientOrAppKey.appKey) {
      // It's a SimplifiClient instance
      appKey = clientOrAppKey.appKey;
      userKeyFinal = clientOrAppKey.userKey;
    } else {
      // It's separate keys
      appKey = clientOrAppKey;
      userKeyFinal = userKey;
    }
    
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'X-App-Key': appKey,
        'X-User-Key': userKeyFinal,
        'Content-Type': 'application/json'
      }
    });
    
    // Cache for report model IDs (so we don't recreate them every time)
    this.reportModelCache = new Map();
  }

  /**
   * Get or create a report model for a template
   */
  async getOrCreateReportModel(orgId, templateId, title) {
    const cacheKey = `${orgId}-${templateId}`;
    
    // Check cache first
    if (this.reportModelCache.has(cacheKey)) {
      return this.reportModelCache.get(cacheKey);
    }
    
    // Check if we're already creating this report (prevent race conditions)
    if (!this.pendingCreations) {
      this.pendingCreations = new Map();
    }
    
    if (this.pendingCreations.has(cacheKey)) {
      // Wait for the pending creation to complete
      console.log(`[REPORT CENTER] Waiting for pending creation of template ${templateId}`);
      return await this.pendingCreations.get(cacheKey);
    }

    // Create a promise for this creation
    const creationPromise = (async () => {
      try {
        // Check if report model already exists
        const existingResponse = await this.client.get(
          `/organizations/${orgId}/report_center/reports?size=100`
        );
        
        // template_id in the response might be string or number, so compare loosely
        const existing = (existingResponse.data.reports || []).find(
          r => String(r.template_id) === String(templateId)
        );
        
        if (existing) {
          console.log(`[REPORT CENTER] Found existing report model ${existing.id} for template ${templateId}`);
          this.reportModelCache.set(cacheKey, existing.id);
          return existing.id;
        }

        // Create new report model - ensure template_id is an integer
        console.log(`[REPORT CENTER] Creating new report model for template ${templateId} in org ${orgId}`);
        const createResponse = await this.client.post(
          `/organizations/${orgId}/report_center/reports`,
          { template_id: parseInt(templateId, 10), title }
        );
        
        const reportId = createResponse.data.reports?.[0]?.id;
        if (reportId) {
          console.log(`[REPORT CENTER] Created report model ${reportId} for template ${templateId}`);
          this.reportModelCache.set(cacheKey, reportId);
        }
        return reportId;
        
      } catch (error) {
        // If creation failed, check if it exists now (might have been created by another request)
        try {
          const retryResponse = await this.client.get(
            `/organizations/${orgId}/report_center/reports?size=100`
          );
          const existing = (retryResponse.data.reports || []).find(
            r => String(r.template_id) === String(templateId)
          );
          if (existing) {
            console.log(`[REPORT CENTER] Found report model ${existing.id} on retry for template ${templateId}`);
            this.reportModelCache.set(cacheKey, existing.id);
            return existing.id;
          }
        } catch (retryError) {
          // Ignore retry errors
        }
        
        // Log more details about the error
        const errorDetails = error.response?.data || error.message;
        console.error(`[REPORT CENTER] Error getting/creating report model for template ${templateId}:`, 
          typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails);
        return null;
      } finally {
        // Clean up pending creation
        this.pendingCreations.delete(cacheKey);
      }
    })();
    
    this.pendingCreations.set(cacheKey, creationPromise);
    return await creationPromise;
  }

  /**
   * Run a snapshot and wait for it to complete
   */
  async runSnapshotAndWait(orgId, reportId, filters = {}, maxWaitMs = 60000) {
    try {
      // Create snapshot
      console.log(`[REPORT CENTER] Creating snapshot for report ${reportId} with filters:`, JSON.stringify(filters));
      const snapshotResponse = await this.client.post(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/create_snapshot`,
        {
          scheduled_plan: {},
          destination_format: 'json',
          filters
        }
      );
      
      const snapshotId = snapshotResponse.data.snapshots?.[0]?.id;
      if (!snapshotId) {
        console.log('[REPORT CENTER] No snapshot ID returned, response:', JSON.stringify(snapshotResponse.data).substring(0, 300));
        throw new Error('No snapshot ID returned');
      }
      
      console.log(`[REPORT CENTER] Snapshot ${snapshotId} created, polling for completion...`);

      // Poll for completion
      const startTime = Date.now();
      let pollCount = 0;
      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        pollCount++;
        
        const statusResponse = await this.client.get(
          `/organizations/${orgId}/report_center/reports/${reportId}/schedules/snapshots/${snapshotId}`
        );
        
        const snapshot = statusResponse.data.snapshots?.[0];
        const status = snapshot?.status || 'unknown';
        
        if (pollCount % 3 === 0) {
          console.log(`[REPORT CENTER] Snapshot ${snapshotId} status: ${status} (poll ${pollCount})`);
        }
        
        if (snapshot?.download_link) {
          console.log(`[REPORT CENTER] Snapshot ${snapshotId} ready, downloading data...`);
          // Download the data
          const dataResponse = await this.client.get(
            snapshot.download_link.replace(BASE_URL, '')
          );
          console.log(`[REPORT CENTER] Snapshot ${snapshotId} data downloaded, ${Array.isArray(dataResponse.data) ? dataResponse.data.length : 'non-array'} rows`);
          return dataResponse.data;
        }
        
        if (snapshot?.status === 'failed') {
          console.log(`[REPORT CENTER] Snapshot ${snapshotId} failed`);
          throw new Error('Snapshot generation failed');
        }
      }
      
      console.log(`[REPORT CENTER] Snapshot ${snapshotId} timed out after ${maxWaitMs}ms`);
      throw new Error('Snapshot generation timed out');
      
    } catch (error) {
      console.error('[REPORT CENTER] Error running snapshot:', error.message);
      return null;
    }
  }

  /**
   * Get geo-fence performance data for a campaign
   * Returns impressions, clicks per geo-fence location
   */
  async getGeoFencePerformance(orgId, campaignId, startDate, endDate) {
    try {
      console.log(`[REPORT CENTER] Getting geo-fence performance for org ${orgId}, campaign ${campaignId}, ${startDate} to ${endDate}`);
      
      // Try the main Geo Fencing by Campaign template first
      let reportId = await this.getOrCreateReportModel(
        orgId, 
        TEMPLATES.GEO_FENCE_BY_CAMPAIGN,
        'Geo-Fence Performance'
      );
      
      console.log(`[REPORT CENTER] Geo-fence report ID: ${reportId}`);
      
      if (!reportId) {
        console.log('[REPORT CENTER] No report ID for geo-fence performance');
        return [];
      }

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      let data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      // If no data, try the Target and Conversion Fence template (63550)
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('[REPORT CENTER] No data from primary geo-fence template, trying alternate...');
        const altReportId = await this.getOrCreateReportModel(
          orgId, 
          63550,  // Geo Fencing by Campaign by Target and Conversion Fence
          'Geo-Fence Target Performance'
        );
        if (altReportId) {
          data = await this.runSnapshotAndWait(orgId, altReportId, filters);
        }
      }
      
      if (!data || !Array.isArray(data)) {
        console.log('[REPORT CENTER] No data returned from geo-fence snapshot');
        return [];
      }
      
      console.log(`[REPORT CENTER] Geo-fence snapshot returned ${data.length} rows`);
      if (data.length > 0) {
        console.log(`[REPORT CENTER] Geo-fence first row keys:`, Object.keys(data[0]));
        console.log(`[REPORT CENTER] Geo-fence first row sample:`, JSON.stringify(data[0]).substring(0, 500));
      }
      
      // Filter by campaign ID on our end (in case API filter wasn't applied)
      const targetCampaignId = parseInt(campaignId, 10);
      const filteredData = data.filter(row => {
        const rowCampaignId = row['summary_delivery_events.campaign_id'];
        if (!rowCampaignId) return true;
        return parseInt(rowCampaignId, 10) === targetCampaignId;
      });
      
      console.log(`[REPORT CENTER] Geo-fence filtered from ${data.length} to ${filteredData.length} rows for campaign ${campaignId}`);
      
      // Transform the data - try multiple field name patterns
      const result = filteredData.map(row => {
        // Try to find geo-fence ID - prefer conversion fence over target fence
        let geoFenceId = row['summary_delivery_events.conversion_geo_fence_id'] ||
                    row['summary_delivery_events.target_geo_fence_id'] || 
                    row['summary_delivery_events.geo_fence_id'] ||
                    row['dim_geo_fence.geo_fence_id'] ||
                    row['dim_target_geo_fence.geo_fence_id'] ||
                    row['dim_geo_fence.id'];
        
        // Try to find geo-fence name - prefer conversion fence over target fence (target is often "Unknown")
        let geoFenceName = row['summary_delivery_events.conversion_geo_fence_name'] ||
                      row['summary_delivery_events.target_geo_fence_name'] ||
                      row['summary_delivery_events.geo_fence_name'] ||
                      row['dim_geo_fence.geo_fence_name'] ||
                      row['dim_geo_fence.name'] ||
                      row['dim_target_geo_fence.name'] ||
                      row['dim_target_geo_fence.geo_fence_name'] ||
                      row['summary_delivery_events.geo_fence_reporting_name'] ||
                      row['geo_fence_name'] ||
                      row['target_geo_fence_name'];
        
        // Skip if name is literally "Unknown" and we have a conversion fence name
        if (geoFenceName === 'Unknown' && row['summary_delivery_events.conversion_geo_fence_name']) {
          geoFenceName = row['summary_delivery_events.conversion_geo_fence_name'];
        }
        
        // If still no name, look for any key containing 'geo_fence' and 'name'
        if (!geoFenceName || geoFenceName === 'Unknown') {
          const keys = Object.keys(row);
          const nameKey = keys.find(k => 
            k.toLowerCase().includes('geo') && 
            k.toLowerCase().includes('name') &&
            row[k] && 
            row[k] !== 'Unknown'
          );
          if (nameKey && typeof row[nameKey] === 'string') {
            geoFenceName = row[nameKey];
            console.log(`[REPORT CENTER] Found geo-fence name in field '${nameKey}': ${geoFenceName}`);
          }
        }
        
        // If still no ID or ID is -1, try to find one
        if (!geoFenceId || geoFenceId === -1) {
          const keys = Object.keys(row);
          const idKey = keys.find(k => k.toLowerCase().includes('geo') && k.toLowerCase().includes('id') && row[k] && row[k] !== -1);
          if (idKey) {
            geoFenceId = row[idKey];
          }
        }
        
        return {
          geoFenceId,
          geoFenceName,
          impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
          clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
          ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
          spend: parseFloat(row['summary_delivery_events.total_cust'] || row['summary_delivery_events.spend'] || 0)
        };
      }).filter(r => (r.geoFenceId && r.geoFenceId !== -1) || (r.geoFenceName && r.geoFenceName !== 'Unknown') || r.impressions > 0);
      
      console.log(`[REPORT CENTER] Processed ${result.length} geo-fences`);
      if (result.length > 0) {
        console.log(`[REPORT CENTER] First geo-fence:`, JSON.stringify(result[0]));
      }
      
      return result;
      
    } catch (error) {
      console.error('[REPORT CENTER] Error getting geo-fence performance:', error.message);
      return [];
    }
  }

  /**
   * Get location performance data (city, metro, region)
   */
  async getLocationPerformance(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.LOCATION_BY_CAMPAIGN,
        'Location Performance'
      );
      
      if (!reportId) return [];

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      return data.map(row => ({
        city: row['summary_delivery_events.location_city_name'],
        metro: row['summary_delivery_events.location_dma_name'],
        region: row['summary_delivery_events.location_region_name'],
        country: row['summary_delivery_events.location_country_name'],
        impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
        clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
        ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
        spend: parseFloat(row['summary_delivery_events.spend'] || 0)
      })).filter(r => r.city || r.metro || r.region);
      
    } catch (error) {
      console.error('Error getting location performance:', error.message);
      return [];
    }
  }

  /**
   * Get conversion data by campaign
   * Note: This method is called as both getConversionData and getConversions by server
   */
  async getConversionData(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.CONVERSION_BY_CAMPAIGN,
        'Conversion Performance'
      );
      
      if (!reportId) return [];

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      // Aggregate conversion data
      let totalConversions = 0;
      let totalViewConversions = 0;
      let totalClickConversions = 0;
      
      data.forEach(row => {
        totalConversions += parseInt(row['summary_delivery_events.conversions'] || 0);
        totalViewConversions += parseInt(row['summary_delivery_events.view_conversions'] || 0);
        totalClickConversions += parseInt(row['summary_delivery_events.click_conversions'] || 0);
      });

      return {
        total: totalConversions,
        viewThrough: totalViewConversions,
        clickThrough: totalClickConversions,
        raw: data
      };
      
    } catch (error) {
      console.error('Error getting conversion data:', error.message);
      return [];
    }
  }

  /**
   * Alias for getConversionData - server calls this as getConversions
   */
  async getConversions(orgId, campaignId, startDate, endDate) {
    return this.getConversionData(orgId, campaignId, startDate, endDate);
  }

  /**
   * Get device breakdown by campaign
   */
  async getDeviceBreakdown(orgId, campaignId, startDate, endDate) {
    try {
      console.log(`[REPORT CENTER] Getting device breakdown for org ${orgId}, campaign ${campaignId}, ${startDate} to ${endDate}`);
      
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.DEVICE_BY_CAMPAIGN,
        'Device Breakdown'
      );
      
      console.log(`[REPORT CENTER] Device breakdown report ID: ${reportId}`);
      
      if (!reportId) {
        console.log('[REPORT CENTER] No report ID for device breakdown');
        return [];
      }

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };
      
      console.log('[REPORT CENTER] Running device breakdown snapshot...');
      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) {
        console.log('[REPORT CENTER] No data returned from device breakdown snapshot');
        return [];
      }
      
      console.log(`[REPORT CENTER] Device breakdown returned ${data.length} rows`);
      if (data.length > 0) {
        console.log(`[REPORT CENTER] Device first row keys:`, Object.keys(data[0]));
        console.log(`[REPORT CENTER] Device first row sample:`, JSON.stringify(data[0]).substring(0, 500));
      }
      
      // Filter by campaign ID on our end (in case API filter wasn't applied)
      const targetCampaignId = parseInt(campaignId, 10);
      const filteredData = data.filter(row => {
        const rowCampaignId = row['summary_delivery_events.campaign_id'];
        if (!rowCampaignId) return true;
        return parseInt(rowCampaignId, 10) === targetCampaignId;
      });
      
      console.log(`[REPORT CENTER] Device filtered from ${data.length} to ${filteredData.length} rows for campaign ${campaignId}`);
      
      const result = filteredData.map(row => {
        // Try many possible field names for device type
        let deviceType = row['summary_delivery_events.device_type_name'] || 
                         row['dim_device_type.device_type_name'] || 
                         row['summary_delivery_events.device_type'] ||
                         row['device_type_name'] ||
                         row['device_type'];
        
        // If still not found, look for any key containing 'device'
        if (!deviceType) {
          const keys = Object.keys(row);
          const deviceKey = keys.find(k => k.toLowerCase().includes('device'));
          if (deviceKey) {
            deviceType = row[deviceKey];
            console.log(`[REPORT CENTER] Found device type in field '${deviceKey}': ${deviceType}`);
          }
        }
        
        return {
          device_type: deviceType,
          impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
          clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
          ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
          spend: parseFloat(row['summary_delivery_events.total_cust'] || row['summary_delivery_events.spend'] || 0)
        };
      }).filter(r => r.device_type);
      
      console.log(`[REPORT CENTER] Processed ${result.length} device types`);
      if (result.length > 0) {
        console.log(`[REPORT CENTER] First device result:`, JSON.stringify(result[0]));
      }
      
      return result;
      
    } catch (error) {
      console.error('[REPORT CENTER] Error getting device breakdown:', error.message);
      return [];
    }
  }

  /**
   * Get viewability metrics
   */
  async getViewabilityMetrics(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.VIEWABILITY_BY_CAMPAIGN,
        'Viewability Metrics'
      );
      
      if (!reportId) return null;

      const filters = {
        'summary_viewability_events.event_date': `${startDate} to ${endDate}`,
        'summary_viewability_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data) || data.length === 0) return null;
      
      const row = data[0];
      return {
        viewabilityRate: parseFloat(row['summary_viewability_events.viewability_rate'] || 0),
        measuredImpressions: parseInt(row['summary_viewability_events.measured_impressions'] || 0),
        viewableImpressions: parseInt(row['summary_viewability_events.viewable_impressions'] || 0),
        avgViewTime: parseFloat(row['summary_viewability_events.avg_view_time'] || 0)
      };
      
    } catch (error) {
      console.error('Error getting viewability metrics:', error.message);
      return null;
    }
  }

  /**
   * Get domain/placement performance (for OTT campaigns includes completion rate)
   */
  async getDomainPerformance(orgId, campaignId, startDate, endDate) {
    try {
      console.log(`[REPORT CENTER] Getting domain performance for org ${orgId}, campaign ${campaignId}, ${startDate} to ${endDate}`);
      
      // Try the regular Domain Performance report first (more reliable)
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.DOMAIN_BY_CAMPAIGN,
        'Domain Performance'
      );
      
      console.log(`[REPORT CENTER] Domain Performance report ID: ${reportId}`);
      
      if (!reportId) {
        console.log('[REPORT CENTER] No report ID for domain performance');
        return [];
      }

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };
      
      console.log('[REPORT CENTER] Running Domain Performance snapshot...');
      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) {
        console.log('[REPORT CENTER] No data returned from domain snapshot');
        return [];
      }
      
      console.log(`[REPORT CENTER] Domain Performance returned ${data.length} rows`);
      if (data.length > 0) {
        console.log(`[REPORT CENTER] First row keys:`, Object.keys(data[0]));
        console.log(`[REPORT CENTER] First row sample:`, JSON.stringify(data[0]).substring(0, 500));
      }
      
      // Filter by campaign ID on our end (in case API filter wasn't applied)
      const targetCampaignId = parseInt(campaignId, 10);
      const filteredData = data.filter(row => {
        const rowCampaignId = row['summary_delivery_events.campaign_id'];
        if (!rowCampaignId) return true;
        return parseInt(rowCampaignId, 10) === targetCampaignId;
      });
      
      console.log(`[REPORT CENTER] Domain filtered from ${data.length} to ${filteredData.length} rows for campaign ${campaignId}`);
      
      const result = filteredData.map(row => ({
        domain: row['summary_delivery_events.domain_name'] ||  // This is the actual field name!
                row['summary_delivery_events.domain_reporting_name'] ||
                row['summary_delivery_events.domain'] || 
                row['dim_domain.domain_name'] ||
                row['dim_domain.domain_reporting_name'],
        impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
        clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
        ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
        spend: parseFloat(row['summary_delivery_events.total_cust'] || row['summary_delivery_events.spend'] || 0),
        // Try to get completion rate if available in this report
        complete_rate: parseFloat(
          row['summary_delivery_events.video_complete_rate'] ||
          row['summary_delivery_events.vcr'] ||
          0
        ) * 100
      })).filter(r => r.domain).sort((a, b) => b.impressions - a.impressions);
      
      console.log(`[REPORT CENTER] Processed ${result.length} domains`);
      if (result.length > 0) {
        console.log(`[REPORT CENTER] First domain:`, JSON.stringify(result[0]));
      }
      
      return result;
      
    } catch (error) {
      console.error('[REPORT CENTER] Error getting domain performance:', error.message);
      return [];
    }
  }

  /**
   * Get keyword performance data
   */
  async getKeywordPerformance(orgId, campaignId, startDate, endDate) {
    try {
      console.log(`[REPORT CENTER] Getting keyword performance for org ${orgId}, campaign ${campaignId}, ${startDate} to ${endDate}`);
      
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.KEYWORD_BY_CAMPAIGN,
        'Keyword Performance'
      );
      
      console.log(`[REPORT CENTER] Keyword report model ID: ${reportId}`);
      
      if (!reportId) {
        console.log('[REPORT CENTER] No report ID returned for keyword performance');
        return [];
      }

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };
      
      console.log(`[REPORT CENTER] Running keyword snapshot with filters:`, JSON.stringify(filters));

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      console.log(`[REPORT CENTER] Keyword snapshot response type: ${typeof data}`);
      console.log(`[REPORT CENTER] Keyword snapshot is array: ${Array.isArray(data)}`);
      console.log(`[REPORT CENTER] Keyword snapshot length: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log(`[REPORT CENTER] Keyword snapshot first row keys:`, Object.keys(data[0]));
        console.log(`[REPORT CENTER] Keyword snapshot first row:`, JSON.stringify(data[0]));
      }
      
      if (!data || !Array.isArray(data)) return [];
      
      // Filter by campaign ID on our end (in case API filter wasn't applied)
      const targetCampaignId = parseInt(campaignId, 10);
      const filteredData = data.filter(row => {
        const rowCampaignId = row['summary_delivery_events.campaign_id'];
        // If no campaign_id in row, include it. Otherwise, must match target.
        if (!rowCampaignId) return true;
        return parseInt(rowCampaignId, 10) === targetCampaignId;
      });
      
      console.log(`[REPORT CENTER] Filtered from ${data.length} to ${filteredData.length} rows for campaign ${campaignId}`);
      
      // Map the data using the correct field names from Simpli.fi Report Center
      const result = filteredData.map(row => ({
        keyword: row['summary_delivery_events.keyword_reporting_name'] ||  // This is the correct field!
                 row['dim_keyword.keyword'] || 
                 row['summary_delivery_events.keyword'] || 
                 row['keyword'],
        impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
        clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
        ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
        spend: parseFloat(row['summary_delivery_events.total_cust'] || row['summary_delivery_events.spend'] || 0),  // total_cust is the spend field
        ecpm: parseFloat(row['summary_delivery_events.ecpm'] || 0),
        ecpc: parseFloat(row['summary_delivery_events.ecpc'] || 0)
      })).filter(r => r.keyword).sort((a, b) => b.impressions - a.impressions);
      
      console.log(`[REPORT CENTER] Processed ${result.length} keywords with performance data`);
      if (result.length > 0) {
        console.log(`[REPORT CENTER] First keyword result:`, JSON.stringify(result[0]));
      }
      
      return result;
      
    } catch (error) {
      console.error('[REPORT CENTER] Error getting keyword performance:', error.message);
      console.error('[REPORT CENTER] Full error:', error);
      return [];
    }
  }

  /**
   * Get all enhanced data for a campaign in one call
   */
  async getEnhancedCampaignData(orgId, campaignId, startDate, endDate, options = {}) {
    const results = {
      geoFencePerformance: null,
      locationPerformance: null,
      conversions: null,
      deviceBreakdown: null,
      viewability: null,
      domainPerformance: null
    };

    const promises = [];

    if (options.includeGeoFence !== false) {
      promises.push(
        this.getGeoFencePerformance(orgId, campaignId, startDate, endDate)
          .then(data => { results.geoFencePerformance = data; })
      );
    }

    if (options.includeLocation !== false) {
      promises.push(
        this.getLocationPerformance(orgId, campaignId, startDate, endDate)
          .then(data => { results.locationPerformance = data; })
      );
    }

    if (options.includeConversions !== false) {
      promises.push(
        this.getConversionData(orgId, campaignId, startDate, endDate)
          .then(data => { results.conversions = data; })
      );
    }

    if (options.includeDevices !== false) {
      promises.push(
        this.getDeviceBreakdown(orgId, campaignId, startDate, endDate)
          .then(data => { results.deviceBreakdown = data; })
      );
    }

    if (options.includeViewability !== false) {
      promises.push(
        this.getViewabilityMetrics(orgId, campaignId, startDate, endDate)
          .then(data => { results.viewability = data; })
      );
    }

    if (options.includeDomains !== false) {
      promises.push(
        this.getDomainPerformance(orgId, campaignId, startDate, endDate)
          .then(data => { results.domainPerformance = data; })
      );
    }

    await Promise.all(promises);
    return results;
  }
}

module.exports = { ReportCenterService, TEMPLATES };

// Test if run directly
if (require.main === module) {
  const service = new ReportCenterService(
    process.env.SIMPLIFI_APP_KEY,
    process.env.SIMPLIFI_USER_KEY
  );
  
  // Example test - replace with actual org and campaign IDs
  const testOrgId = process.argv[2];
  const testCampaignId = process.argv[3];
  
  if (!testOrgId || !testCampaignId) {
    console.log('Usage: node report-center-service.js <orgId> <campaignId>');
    console.log('\nThis service provides:');
    console.log('  - getGeoFencePerformance(orgId, campaignId, startDate, endDate)');
    console.log('  - getLocationPerformance(orgId, campaignId, startDate, endDate)');
    console.log('  - getConversionData(orgId, campaignId, startDate, endDate)');
    console.log('  - getConversions(orgId, campaignId, startDate, endDate) [alias]');
    console.log('  - getDeviceBreakdown(orgId, campaignId, startDate, endDate)');
    console.log('  - getViewabilityMetrics(orgId, campaignId, startDate, endDate)');
    console.log('  - getDomainPerformance(orgId, campaignId, startDate, endDate)');
    console.log('  - getKeywordPerformance(orgId, campaignId, startDate, endDate)');
    console.log('  - getEnhancedCampaignData(orgId, campaignId, startDate, endDate)');
    process.exit(0);
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`Testing Report Center Service`);
  console.log(`Org ID: ${testOrgId}`);
  console.log(`Campaign ID: ${testCampaignId}`);
  console.log(`Date Range: ${startDate} to ${endDate}`);
  console.log('');

  (async () => {
    console.log('Fetching geo-fence performance...');
    const geoData = await service.getGeoFencePerformance(testOrgId, testCampaignId, startDate, endDate);
    console.log('Geo-Fence Results:', JSON.stringify(geoData, null, 2));
  })();
}
