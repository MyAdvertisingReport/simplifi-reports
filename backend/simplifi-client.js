/**
 * Simpli.fi API Client
 * Handles all communication with the Simpli.fi API
 */

const axios = require('axios');

const BASE_URL = 'https://app.simpli.fi/api';

class SimplifiClient {
  constructor(appKey, userKey) {
    this.appKey = appKey;
    this.userKey = userKey;
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'X-App-Key': appKey,
        'X-User-Key': userKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all organizations the user has access to
   */
  async getOrganizations() {
    try {
      const response = await this.client.get('/organizations');
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get all campaigns for an organization
   * @param {number} orgId - Organization ID
   * @param {object} options - Optional filters (page, size, status)
   */
  async getCampaigns(orgId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.size) params.append('size', options.size || 50);
      if (options.include) params.append('include', options.include);
      
      const url = `/organizations/${orgId}/campaigns${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get campaigns with ads included (for ad details with names and sizes)
   * @param {number} orgId - Organization ID
   */
  async getCampaignsWithAds(orgId) {
    try {
      // Use include parameter to nest ads with their file types and sizes
      const params = new URLSearchParams();
      params.append('include', 'ads,ad_file_types,ad_sizes');
      params.append('size', '100');

      const url = `/organizations/${orgId}/campaigns?${params.toString()}`;
      console.log('Fetching campaigns with ads:', url);
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get a single campaign by ID
   * @param {number} orgId - Organization ID
   * @param {number} campaignId - Campaign ID
   */
  async getCampaign(orgId, campaignId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get campaign statistics
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options
   * @param {string} options.startDate - Start date (YYYY-MM-DD)
   * @param {string} options.endDate - End date (YYYY-MM-DD)
   * @param {number} options.campaignId - Filter to specific campaign
   * @param {boolean} options.byCampaign - Group results by campaign
   * @param {boolean} options.byDay - Group results by day
   * @param {boolean} options.byAd - Group results by ad
   * @param {number} options.page - Page number for pagination
   */
  async getCampaignStats(orgId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.campaignId) params.append('campaign_id', options.campaignId);
      if (options.byCampaign) params.append('by_campaign', 'true');
      if (options.byDay) params.append('by_day', 'true');
      if (options.byAd) params.append('by_ad', 'true');
      if (options.page) params.append('page', options.page);

      const url = `/organizations/${orgId}/campaign_stats${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get all campaign stats with pagination handled automatically
   * @param {number} orgId - Organization ID
   * @param {object} options - Same as getCampaignStats
   */
  async getAllCampaignStats(orgId, options = {}) {
    let allStats = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getCampaignStats(orgId, { ...options, page });
      allStats = allStats.concat(response.campaign_stats || []);
      
      if (response.paging && response.paging.next) {
        page++;
      } else {
        hasMore = false;
      }
    }

    return { campaign_stats: allStats };
  }

  /**
   * Get device types available
   */
  async getDeviceTypes() {
    try {
      const response = await this.client.get('/device_types');
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get device types for a specific campaign
   * @param {number} campaignId - Campaign ID
   */
  async getCampaignDeviceTypes(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/device_types`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get ads for a campaign
   * @param {number} campaignId - Campaign ID
   */
  async getCampaignAds(campaignId) {
    try {
      // Simpli.fi API endpoint for ads is /campaigns/{campaign_id}/ads
      const response = await this.client.get(`/campaigns/${campaignId}/ads`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get Report Center templates
   * @param {number} orgId - Organization ID
   */
  async getReportTemplates(orgId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/report_center/reports/templates`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get Report Center reports
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options (access, page, size)
   */
  async getReports(orgId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.access) params.append('access', options.access);
      if (options.page) params.append('page', options.page);
      if (options.size) params.append('size', options.size || 50);

      const url = `/organizations/${orgId}/report_center/reports${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get stats broken down by device type
   * Device data comes from Report Center reports - need to run report and get download
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options including campaignId, dates
   */
  async getDeviceBreakdown(orgId, options = {}) {
    // Device breakdown not available via public API - awaiting Simpli.fi response
    return { campaign_stats: [] };
  }

  /**
   * Get domain/placement performance stats
   * This shows which apps/sites are serving ads (Roku, Telly, etc.)
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options including campaignId, dates
   */
  async getDomainStats(orgId, options = {}) {
    try {
      // Try campaign_stats with by_domain parameter
      const params = new URLSearchParams();
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.campaignId) params.append('campaign_id', options.campaignId);
      params.append('by_domain', 'true');

      const url = `/organizations/${orgId}/campaign_stats?${params.toString()}`;
      console.log('Trying domain stats URL:', url);
      const response = await this.client.get(url);
      console.log('Domain stats response:', JSON.stringify(response.data, null, 2).substring(0, 2000));
      return response.data;
    } catch (error) {
      console.log('by_domain failed:', error.message);
      
      // Try alternate - placement_stats
      try {
        const params = new URLSearchParams();
        if (options.startDate) params.append('start_date', options.startDate);
        if (options.endDate) params.append('end_date', options.endDate);
        if (options.campaignId) params.append('campaign_id', options.campaignId);
        
        const url = `/organizations/${orgId}/placement_stats?${params.toString()}`;
        console.log('Trying placement stats URL:', url);
        const response = await this.client.get(url);
        console.log('Placement stats response:', JSON.stringify(response.data, null, 2).substring(0, 2000));
        return response.data;
      } catch (e2) {
        console.log('placement_stats failed:', e2.message);
      }
      
      // Try site_stats
      try {
        const params = new URLSearchParams();
        if (options.startDate) params.append('start_date', options.startDate);
        if (options.endDate) params.append('end_date', options.endDate);
        if (options.campaignId) params.append('campaign_id', options.campaignId);
        
        const url = `/organizations/${orgId}/site_stats?${params.toString()}`;
        console.log('Trying site stats URL:', url);
        const response = await this.client.get(url);
        console.log('Site stats response:', JSON.stringify(response.data, null, 2).substring(0, 2000));
        return response.data;
      } catch (e3) {
        console.log('site_stats failed:', e3.message);
      }
      
      return { campaign_stats: [] };
    }
  }

  /**
   * Get first party segments (retargeting pixels) for an organization
   * @param {number} orgId - Organization ID
   */
  async getRetargetingSegments(orgId) {
    try {
      // The correct endpoint is first_party_segments, not retargeting_segments
      const url = `/organizations/${orgId}/first_party_segments`;
      console.log('Fetching first party segments:', url);
      const response = await this.client.get(url);
      console.log('First party segments response:', JSON.stringify(response.data, null, 2).substring(0, 2000));
      return response.data;
    } catch (error) {
      console.log('First party segments error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get a specific first party segment details (includes pixel code)
   * @param {number} orgId - Organization ID
   * @param {number} segmentId - Segment ID
   */
  async getRetargetingSegmentDetails(orgId, segmentId) {
    try {
      const url = `/first_party_segments/${segmentId}`;
      console.log('Fetching segment details:', url);
      const response = await this.client.get(url);
      console.log('Segment details:', JSON.stringify(response.data, null, 2).substring(0, 2000));
      return response.data;
    } catch (error) {
      console.log('Segment details error:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get geo-fences for a campaign
   * @param {number} campaignId - Campaign ID
   */
  async getCampaignGeoFences(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/geo_fences`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get ads for a campaign with stats
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options including campaignId, dates, byAd
   */
  async getAdStats(orgId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.campaignId) params.append('campaign_id', options.campaignId);
      params.append('by_ad', 'true');

      const url = `/organizations/${orgId}/campaign_stats${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get stats by geo (DMA/Metro area)
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options including campaignId, dates
   */
  async getGeoStats(orgId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.campaignId) params.append('campaign_id', options.campaignId);
      
      // Try by_geo first (returns DMA/metro data)
      params.append('by_geo', 'true');

      const url = `/organizations/${orgId}/campaign_stats${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Geo Stats URL:', url);
      const response = await this.client.get(url);
      
      // Log the raw response to understand the data structure
      console.log('=== RAW GEO STATS RESPONSE ===');
      console.log(JSON.stringify(response.data, null, 2).substring(0, 2000));
      console.log('==============================');
      
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get stats by device type
   * @param {number} orgId - Organization ID
   * @param {object} options - Query options including campaignId, dates
   */
  async getDeviceStats(orgId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.campaignId) params.append('campaign_id', options.campaignId);
      params.append('by_device_type', 'true');

      const url = `/organizations/${orgId}/campaign_stats${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get keyword performance for a campaign
   * @param {number} campaignId - Campaign ID
   */
  async getCampaignKeywords(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/keywords`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get campaign targeting info (includes keywords, geo-fences, etc.)
   * @param {number} orgId - Organization ID
   * @param {number} campaignId - Campaign ID
   */
  async getCampaignWithTargeting(orgId, campaignId) {
    try {
      const params = new URLSearchParams();
      params.append('include', 'keywords,geo_fences,addresses');
      
      const url = `/organizations/${orgId}/campaigns/${campaignId}?${params.toString()}`;
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  // ============================================
  // REPORT CENTER API METHODS
  // ============================================

  /**
   * Get a specific report template details
   * @param {number} orgId - Organization ID
   * @param {number} templateId - Template ID
   */
  async getReportTemplate(orgId, templateId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/report_center/templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create a report model from a template
   * @param {number} orgId - Organization ID
   * @param {number} templateId - Template ID to base report on
   * @param {string} title - Optional custom title for the report
   */
  async createReportModel(orgId, templateId, title = null) {
    try {
      const body = { template_id: templateId };
      if (title) body.title = title;
      
      const response = await this.client.post(`/organizations/${orgId}/report_center/reports`, body);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get a specific report model
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   */
  async getReportModel(orgId, reportId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/report_center/reports/${reportId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update a report model (title, fields, filters)
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {object} updates - { title, fields, filters }
   */
  async updateReportModel(orgId, reportId, updates) {
    try {
      const response = await this.client.put(`/organizations/${orgId}/report_center/reports/${reportId}`, updates);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Delete a report model
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   */
  async deleteReportModel(orgId, reportId) {
    try {
      const response = await this.client.delete(`/organizations/${orgId}/report_center/reports/${reportId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create a report snapshot (one-time async report run)
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {object} options - { filters, format, webhookUrls, recipients }
   */
  async createReportSnapshot(orgId, reportId, options = {}) {
    try {
      const body = {
        scheduled_plan: {},
        destination_format: options.format || 'json',
        filters: options.filters || {}
      };
      
      if (options.webhookUrls) body.webhook_urls = options.webhookUrls;
      if (options.recipients) body.recipients = options.recipients;
      
      const response = await this.client.post(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/create_snapshot`,
        body
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get all snapshots for a report (last 7 days)
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   */
  async getReportSnapshots(orgId, reportId) {
    try {
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/snapshots`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get a specific snapshot
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {number} snapshotId - Snapshot ID
   */
  async getReportSnapshot(orgId, reportId, snapshotId) {
    try {
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/snapshots/${snapshotId}`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Download a snapshot report
   * @param {string} downloadUrl - Full download URL with code parameter
   */
  async downloadSnapshot(downloadUrl) {
    try {
      // Download URL already includes auth code, but we still need headers
      const response = await this.client.get(downloadUrl.replace(BASE_URL, ''));
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Create a scheduled report
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {object} options - { interval, onDay, format, filters, webhookUrls, recipients }
   */
  async createReportSchedule(orgId, reportId, options = {}) {
    try {
      const body = {
        scheduled_plan: {
          enabled: true,
          run_interval: options.interval || 'daily',
          on_day: options.onDay || (options.interval === 'weekly' ? 1 : 1)
        },
        destination_format: options.format || 'json'
      };
      
      if (options.filters) body.filters = options.filters;
      if (options.webhookUrls) body.webhook_urls = options.webhookUrls;
      if (options.recipients) body.recipients = options.recipients;
      
      const response = await this.client.post(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/`,
        body
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get all schedules for a report
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {boolean} includeChildren - Include child org schedules
   */
  async getReportSchedules(orgId, reportId, includeChildren = false) {
    try {
      const params = includeChildren ? '?children=true' : '';
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/${params}`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get a specific schedule with download history
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {number} scheduleId - Schedule ID
   */
  async getReportSchedule(orgId, reportId, scheduleId) {
    try {
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/${scheduleId}`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Update a report schedule
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {number} scheduleId - Schedule ID
   * @param {object} options - { interval, onDay, format, filters, webhookUrls, recipients, enabled }
   */
  async updateReportSchedule(orgId, reportId, scheduleId, options = {}) {
    try {
      const body = {};
      
      if (options.interval || options.onDay || options.enabled !== undefined) {
        body.scheduled_plan = {};
        if (options.interval) body.scheduled_plan.run_interval = options.interval;
        if (options.onDay) body.scheduled_plan.on_day = options.onDay;
        if (options.enabled !== undefined) body.scheduled_plan.enabled = options.enabled;
      }
      
      if (options.format) body.destination_format = options.format;
      if (options.filters) body.filters = options.filters;
      if (options.webhookUrls) body.webhook_urls = options.webhookUrls;
      if (options.recipients) body.recipients = options.recipients;
      
      const response = await this.client.put(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/${scheduleId}`,
        body
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Delete a report schedule
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {number} scheduleId - Schedule ID
   */
  async deleteReportSchedule(orgId, reportId, scheduleId) {
    try {
      const response = await this.client.delete(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/${scheduleId}`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Enable a report schedule
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {number} scheduleId - Schedule ID
   */
  async enableReportSchedule(orgId, reportId, scheduleId) {
    try {
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/${scheduleId}/enable`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Disable a report schedule
   * @param {number} orgId - Organization ID
   * @param {number} reportId - Report Model ID
   * @param {number} scheduleId - Schedule ID
   */
  async disableReportSchedule(orgId, reportId, scheduleId) {
    try {
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/${scheduleId}/disable`
      );
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error || data?.message || 'API request failed';
      
      if (status === 401) {
        return new Error('Authentication failed. Check your API keys.');
      }
      if (status === 429) {
        return new Error('Rate limit exceeded. Please wait and try again.');
      }
      if (status === 404) {
        return new Error('Resource not found.');
      }
      
      return new Error(`Simpli.fi API Error (${status}): ${message}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error('Could not connect to Simpli.fi API.');
    }
    
    return error;
  }
}

module.exports = SimplifiClient;
