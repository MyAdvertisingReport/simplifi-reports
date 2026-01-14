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
  KEYWORD_BY_CAMPAIGN: 53622,             // Keyword Performance by Campaign
};

class ReportCenterService {
  constructor(appKey, userKey) {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'X-App-Key': appKey,
        'X-User-Key': userKey,
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

    try {
      // Check if report model already exists
      const existingResponse = await this.client.get(
        `/organizations/${orgId}/report_center/reports?size=100`
      );
      const existing = (existingResponse.data.reports || []).find(
        r => r.template_id === templateId
      );
      
      if (existing) {
        this.reportModelCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create new report model
      const createResponse = await this.client.post(
        `/organizations/${orgId}/report_center/reports`,
        { template_id: templateId, title }
      );
      
      const reportId = createResponse.data.reports?.[0]?.id;
      if (reportId) {
        this.reportModelCache.set(cacheKey, reportId);
      }
      return reportId;
      
    } catch (error) {
      console.error(`Error getting/creating report model for template ${templateId}:`, error.message);
      return null;
    }
  }

  /**
   * Run a snapshot and wait for it to complete
   */
  async runSnapshotAndWait(orgId, reportId, filters = {}, maxWaitMs = 60000) {
    try {
      // Create snapshot
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
        throw new Error('No snapshot ID returned');
      }

      // Poll for completion
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const statusResponse = await this.client.get(
          `/organizations/${orgId}/report_center/reports/${reportId}/schedules/snapshots/${snapshotId}`
        );
        
        const snapshot = statusResponse.data.snapshots?.[0];
        if (snapshot?.download_link) {
          // Download the data
          const dataResponse = await this.client.get(
            snapshot.download_link.replace(BASE_URL, '')
          );
          return dataResponse.data;
        }
        
        if (snapshot?.status === 'failed') {
          throw new Error('Snapshot generation failed');
        }
      }
      
      throw new Error('Snapshot generation timed out');
      
    } catch (error) {
      console.error('Error running snapshot:', error.message);
      return null;
    }
  }

  /**
   * Get geo-fence performance data for a campaign
   * Returns impressions, clicks per geo-fence location
   */
  async getGeoFencePerformance(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId, 
        TEMPLATES.GEO_FENCE_BY_CAMPAIGN,
        'Geo-Fence Performance'
      );
      
      if (!reportId) return null;

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      // Transform the data
      return data.map(row => ({
        geoFenceId: row['summary_delivery_events.target_geo_fence_id'],
        geoFenceName: row['summary_delivery_events.target_geo_fence_name'],
        impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
        clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
        ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
        spend: parseFloat(row['summary_delivery_events.spend'] || 0)
      })).filter(r => r.geoFenceId);
      
    } catch (error) {
      console.error('Error getting geo-fence performance:', error.message);
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
      
      if (!reportId) return null;

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      // Log first row to see actual field names
      if (data.length > 0) {
        console.log('Location performance sample row keys:', Object.keys(data[0]));
      }
      
      return data.map(row => {
        const impressions = parseInt(row['summary_delivery_events.impressions'] || 0);
        const ecpm = parseFloat(row['summary_delivery_events.ecpm'] || 0);
        // Calculate spend from impressions and eCPM
        const calculatedSpend = (impressions / 1000) * ecpm;
        
        return {
          city: row['summary_delivery_events.location_city_name'],
          metro: row['summary_delivery_events.location_dma_name'],
          region: row['summary_delivery_events.location_region_name'],
          country: row['summary_delivery_events.location_country_name'],
          impressions: impressions,
          clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
          ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
          spend: calculatedSpend
        };
      }).filter(r => r.city || r.metro || r.region);
      
    } catch (error) {
      console.error('Error getting location performance:', error.message);
      return [];
    }
  }

  /**
   * Get conversion data by campaign
   */
  async getConversionData(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.CONVERSION_BY_CAMPAIGN,
        'Conversion Performance'
      );
      
      if (!reportId) return null;

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return null;
      
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
        totalConversions,
        viewConversions: totalViewConversions,
        clickConversions: totalClickConversions,
        conversionRate: data[0] ? parseFloat(data[0]['summary_delivery_events.conversion_rate'] || 0) : 0
      };
      
    } catch (error) {
      console.error('Error getting conversion data:', error.message);
      return null;
    }
  }

  /**
   * Get device type breakdown
   */
  async getDeviceBreakdown(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.DEVICE_BY_CAMPAIGN,
        'Device Performance'
      );
      
      if (!reportId) return null;

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      return data.map(row => ({
        deviceType: row['dim_device_type.device_type_name'] || row['summary_delivery_events.device_type'],
        impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
        clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
        ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
        spend: parseFloat(row['summary_delivery_events.spend'] || 0)
      })).filter(r => r.deviceType);
      
    } catch (error) {
      console.error('Error getting device breakdown:', error.message);
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
   * Get domain/placement performance (for OTT campaigns)
   */
  async getDomainPerformance(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.DOMAIN_BY_CAMPAIGN,
        'Domain Performance'
      );
      
      if (!reportId) return null;

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      return data.map(row => ({
        domain: row['summary_delivery_events.domain'] || row['dim_domain.domain_name'],
        impressions: parseInt(row['summary_delivery_events.impressions'] || 0),
        clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
        ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
        spend: parseFloat(row['summary_delivery_events.spend'] || 0)
      })).filter(r => r.domain).sort((a, b) => b.impressions - a.impressions);
      
    } catch (error) {
      console.error('Error getting domain performance:', error.message);
      return [];
    }
  }

  /**
   * Get keyword performance data
   */
  async getKeywordPerformance(orgId, campaignId, startDate, endDate) {
    try {
      const reportId = await this.getOrCreateReportModel(
        orgId,
        TEMPLATES.KEYWORD_BY_CAMPAIGN,
        'Keyword Performance'
      );
      
      if (!reportId) return null;

      const filters = {
        'summary_delivery_events.event_date': `${startDate} to ${endDate}`,
        'summary_delivery_events.campaign_id': campaignId.toString()
      };

      const data = await this.runSnapshotAndWait(orgId, reportId, filters);
      
      if (!data || !Array.isArray(data)) return [];
      
      // Log first row to see actual field names
      if (data.length > 0) {
        console.log('Keyword performance sample row keys:', Object.keys(data[0]));
      }
      
      return data.map(row => {
        const impressions = parseInt(row['summary_delivery_events.impressions'] || 0);
        const ecpm = parseFloat(row['summary_delivery_events.ecpm'] || 0);
        // Calculate spend from impressions and eCPM
        const calculatedSpend = (impressions / 1000) * ecpm;
        
        return {
          // Use keyword_reporting_name which is the actual field name
          keyword: row['summary_delivery_events.keyword_reporting_name'] || row['dim_keyword.keyword'] || row['summary_delivery_events.keyword'],
          impressions: impressions,
          clicks: parseInt(row['summary_delivery_events.clicks'] || 0),
          ctr: parseFloat(row['summary_delivery_events.ctr'] || 0),
          spend: calculatedSpend
        };
      }).filter(r => r.keyword).sort((a, b) => b.impressions - a.impressions);
      
    } catch (error) {
      console.error('Error getting keyword performance:', error.message);
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
    console.log('  - getDeviceBreakdown(orgId, campaignId, startDate, endDate)');
    console.log('  - getViewabilityMetrics(orgId, campaignId, startDate, endDate)');
    console.log('  - getDomainPerformance(orgId, campaignId, startDate, endDate)');
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
