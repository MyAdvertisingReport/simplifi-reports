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
      // Use include parameter to nest ads with their file types, sizes, and creative URLs
      const params = new URLSearchParams();
      params.append('include', 'ads,ad_file_types,ad_sizes,primary_creative');
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
   * @param {number} orgId - Organization ID (may be parent org - we'll find actual owner)
   * @param {number} campaignId - Campaign ID
   */
  async getCampaignAds(orgId, campaignId) {
    try {
      // First, get the campaign to find its actual organization_id
      // The passed orgId might be a parent org, but ads endpoint needs the campaign's direct org
      let actualOrgId = orgId;
      
      try {
        const campaignResponse = await this.client.get(`/campaigns/${campaignId}`);
        const campaign = campaignResponse.data?.campaigns?.[0] || campaignResponse.data;
        if (campaign?.organization_id) {
          actualOrgId = campaign.organization_id;
          console.log(`[SIMPLIFI CLIENT] Campaign ${campaignId} belongs to org ${actualOrgId} (requested org was ${orgId})`);
        }
      } catch (e) {
        console.log(`[SIMPLIFI CLIENT] Could not fetch campaign details, using provided orgId: ${orgId}`);
      }
      
      // Use the actual organization ID that owns this campaign
      const url = `/organizations/${actualOrgId}/campaigns/${campaignId}/ads`;
      console.log(`[SIMPLIFI CLIENT] Fetching ads from: ${url}`);
      const response = await this.client.get(url);
      console.log(`[SIMPLIFI CLIENT] Ads response status: ${response.status}`);
      console.log(`[SIMPLIFI CLIENT] Ads count: ${response.data?.ads?.length || 0}`);
      if (response.data?.ads?.[0]) {
        console.log(`[SIMPLIFI CLIENT] First ad sample:`, JSON.stringify(response.data.ads[0], null, 2).substring(0, 500));
      }
      return response.data;
    } catch (error) {
      console.error(`[SIMPLIFI CLIENT] Error fetching ads for org ${orgId}, campaign ${campaignId}:`, error.response?.status, error.response?.data || error.message);
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
   * Get retargeting segments (pixels) for an organization
   * Tries multiple endpoints as the API structure varies
   * @param {number} orgId - Organization ID
   */
  async getRetargetingSegments(orgId) {
    // Try first_party_segments endpoint first (more common for pixels)
    try {
      const url = `/organizations/${orgId}/first_party_segments`;
      console.log('Trying first_party_segments:', url);
      const response = await this.client.get(url);
      console.log('First party segments response:', JSON.stringify(response.data, null, 2).substring(0, 500));
      return response.data;
    } catch (error) {
      console.log('first_party_segments failed:', error.message);
    }
    
    // Try retargeting_segments
    try {
      const url = `/organizations/${orgId}/retargeting_segments`;
      console.log('Trying retargeting_segments:', url);
      const response = await this.client.get(url);
      console.log('Retargeting segments response:', JSON.stringify(response.data, null, 2).substring(0, 500));
      return response.data;
    } catch (error) {
      console.log('retargeting_segments failed:', error.message);
    }
    
    // Try segments endpoint
    try {
      const url = `/organizations/${orgId}/segments`;
      console.log('Trying segments:', url);
      const response = await this.client.get(url);
      console.log('Segments response:', JSON.stringify(response.data, null, 2).substring(0, 500));
      return response.data;
    } catch (error) {
      console.log('segments failed:', error.message);
    }
    
    // Try audiences endpoint
    try {
      const url = `/organizations/${orgId}/audiences`;
      console.log('Trying audiences:', url);
      const response = await this.client.get(url);
      console.log('Audiences response:', JSON.stringify(response.data, null, 2).substring(0, 500));
      return response.data;
    } catch (error) {
      console.log('audiences failed:', error.message);
    }
    
    // Return empty if none work
    console.log('No pixel endpoints available for org', orgId);
    return { first_party_segments: [], retargeting_segments: [] };
  }

  /**
   * Get a specific retargeting segment details (includes pixel code)
   * @param {number} orgId - Organization ID
   * @param {number} segmentId - Segment ID
   */
  async getRetargetingSegmentDetails(orgId, segmentId) {
    try {
      const url = `/organizations/${orgId}/retargeting_segments/${segmentId}`;
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
  // WRAPPER METHODS FOR SERVER COMPATIBILITY
  // ============================================

  /**
   * Get organization stats (wrapper for getCampaignStats)
   * This method is called by the server with a different signature
   */
  async getOrganizationStats(orgId, startDate, endDate, byDay = false, byCampaign = false) {
    try {
      const options = {
        startDate,
        endDate,
        byDay,
        byCampaign
      };
      return await this.getCampaignStats(orgId, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get retargeting pixels (wrapper for getRetargetingSegments)
   */
  async getRetargetingPixels(orgId) {
    try {
      return await this.getRetargetingSegments(orgId);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get campaign details by campaign ID
   */
  async getCampaignDetails(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get ad stats for a campaign (for the server's getCampaignAdStats call)
   */
  async getCampaignAdStats(campaignId, startDate, endDate) {
    try {
      // Need to get the org ID first, then call ad stats
      // For now, return empty - this endpoint needs the orgId
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('by_ad', 'true');
      params.append('campaign_id', campaignId);
      
      // Try to get campaign first to find orgId
      const campaignResponse = await this.client.get(`/campaigns/${campaignId}`);
      const campaign = campaignResponse.data?.campaigns?.[0] || campaignResponse.data;
      const orgId = campaign?.organization_id;
      
      if (orgId) {
        const url = `/organizations/${orgId}/campaign_stats?${params.toString()}`;
        const response = await this.client.get(url);
        return response.data;
      }
      
      return { campaign_stats: [] };
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
