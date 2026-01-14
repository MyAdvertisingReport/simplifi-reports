/**
 * Report Center Setup Script
 * 
 * This script helps set up Report Center report models for enhanced reporting.
 * Run with: node setup-report-center.js
 * 
 * Prerequisites:
 * - SIMPLIFI_APP_KEY and SIMPLIFI_USER_KEY in .env
 * - At least one client with a simplifi_org_id
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://app.simpli.fi/api';

class ReportCenterSetup {
  constructor(appKey, userKey) {
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
   * Get all available report templates for an organization
   */
  async getTemplates(orgId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/report_center/reports/templates`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Error fetching templates:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get template details including available fields
   */
  async getTemplateDetails(orgId, templateId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/report_center/templates/${templateId}`);
      return response.data.templates?.[0] || null;
    } catch (error) {
      console.error('Error fetching template details:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create a report model from a template
   */
  async createReportModel(orgId, templateId, title = null) {
    try {
      const body = { template_id: templateId };
      if (title) body.title = title;
      
      const response = await this.client.post(`/organizations/${orgId}/report_center/reports`, body);
      return response.data.reports?.[0] || null;
    } catch (error) {
      console.error('Error creating report model:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create a snapshot (run report once)
   */
  async createSnapshot(orgId, reportId, filters = {}, format = 'json') {
    try {
      const body = {
        scheduled_plan: {},
        destination_format: format,
        filters: filters
      };
      
      const response = await this.client.post(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/create_snapshot`,
        body
      );
      return response.data.snapshots?.[0] || null;
    } catch (error) {
      console.error('Error creating snapshot:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get snapshots for a report
   */
  async getSnapshots(orgId, reportId) {
    try {
      const response = await this.client.get(
        `/organizations/${orgId}/report_center/reports/${reportId}/schedules/snapshots`
      );
      return response.data.snapshots || [];
    } catch (error) {
      console.error('Error fetching snapshots:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Download snapshot data
   */
  async downloadSnapshot(downloadUrl) {
    try {
      const response = await this.client.get(downloadUrl.replace(BASE_URL, ''));
      return response.data;
    } catch (error) {
      console.error('Error downloading snapshot:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * List existing report models
   */
  async getReportModels(orgId) {
    try {
      const response = await this.client.get(`/organizations/${orgId}/report_center/reports?size=50`);
      return response.data.reports || [];
    } catch (error) {
      console.error('Error fetching report models:', error.response?.data || error.message);
      return [];
    }
  }
}

async function main() {
  const appKey = process.env.SIMPLIFI_APP_KEY;
  const userKey = process.env.SIMPLIFI_USER_KEY;

  if (!appKey || !userKey) {
    console.error('ERROR: SIMPLIFI_APP_KEY and SIMPLIFI_USER_KEY must be set in .env');
    process.exit(1);
  }

  const setup = new ReportCenterSetup(appKey, userKey);

  // Get first organization to use for template discovery
  console.log('Fetching organizations...');
  try {
    const orgsResponse = await setup.client.get('/organizations');
    const orgs = orgsResponse.data.organizations || [];
    
    if (orgs.length === 0) {
      console.error('No organizations found');
      process.exit(1);
    }

    // Use first org that has resources
    const org = orgs.find(o => o.resources) || orgs[0];
    const orgId = org.id;
    console.log(`Using organization: ${org.name} (ID: ${orgId})\n`);

    // Fetch all templates
    console.log('Fetching available report templates...\n');
    const templates = await setup.getTemplates(orgId);

    if (templates.length === 0) {
      console.log('No templates found. You may not have Report Center access.');
      process.exit(1);
    }

    // Group templates by category
    const byCategory = {};
    templates.forEach(t => {
      const cat = t.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(t);
    });

    console.log('='.repeat(80));
    console.log('AVAILABLE REPORT TEMPLATES');
    console.log('='.repeat(80));

    // Print templates organized by category
    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n📁 ${category}`);
      console.log('-'.repeat(40));
      byCategory[category].forEach(t => {
        console.log(`   [${t.template_id}] ${t.title}`);
      });
    });

    // Highlight templates we're interested in
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDED TEMPLATES FOR OUR USE CASE');
    console.log('='.repeat(80));

    const keywords = ['geo', 'location', 'conversion', 'viewability', 'performance', 'ad ', 'campaign'];
    const recommended = templates.filter(t => {
      const title = t.title.toLowerCase();
      return keywords.some(kw => title.includes(kw));
    });

    if (recommended.length > 0) {
      recommended.forEach(t => {
        console.log(`\n✅ [${t.template_id}] ${t.title}`);
        console.log(`   Category: ${t.category}`);
      });
    }

    // Look for specific geo-fence related templates
    console.log('\n' + '='.repeat(80));
    console.log('GEO-FENCE SPECIFIC TEMPLATES');
    console.log('='.repeat(80));

    const geoTemplates = templates.filter(t => {
      const title = t.title.toLowerCase();
      return title.includes('geo') || title.includes('location') || title.includes('fence');
    });

    if (geoTemplates.length > 0) {
      for (const t of geoTemplates) {
        console.log(`\n📍 [${t.template_id}] ${t.title}`);
        
        // Get details for this template
        const details = await setup.getTemplateDetails(orgId, t.template_id);
        if (details) {
          console.log('   Fields:');
          (details.current_fields || []).slice(0, 10).forEach(f => {
            console.log(`     - ${f.label_short || f.label} (${f.name})`);
          });
          if ((details.current_fields || []).length > 10) {
            console.log(`     ... and ${details.current_fields.length - 10} more fields`);
          }
        }
      }
    } else {
      console.log('\nNo geo-fence specific templates found.');
      console.log('You may need to check with Simpli.fi about geo-fence reporting options.');
    }

    // Save template list to file for reference
    const fs = require('fs');
    const templateList = {
      orgId,
      orgName: org.name,
      fetchedAt: new Date().toISOString(),
      totalTemplates: templates.length,
      categories: byCategory,
      recommended: recommended.map(t => ({ id: t.template_id, title: t.title, category: t.category })),
      geoTemplates: geoTemplates.map(t => ({ id: t.template_id, title: t.title, category: t.category }))
    };
    
    fs.writeFileSync('report-templates.json', JSON.stringify(templateList, null, 2));
    console.log('\n✅ Template list saved to report-templates.json');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
