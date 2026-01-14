// Professional PDF Report Generator
// Uses puppeteer to render HTML to high-quality PDF

const puppeteer = require('puppeteer');

/**
 * Generate a professionally designed PDF report
 * @param {Object} reportData - All the data needed for the report
 * @returns {Buffer} - PDF buffer
 */
async function generateProfessionalPDF(reportData) {
  const {
    client,
    dateRange,
    summary,
    campaigns,
    campaignStats,
    history,
    dailyStats,
    showSpendData = false
  } = reportData;

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n?.toLocaleString() || '0';
  };

  const formatCurrency = (n) => '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  const primaryColor = client.primary_color || '#1e3a8a';
  const secondaryColor = client.secondary_color || '#3b82f6';
  const accentColor = '#10b981';
  
  // Calculate totals from campaignStats
  let totalImpressions = 0, totalClicks = 0, totalSpend = 0;
  Object.values(campaignStats || {}).forEach(s => {
    totalImpressions += s.impressions || 0;
    totalClicks += s.clicks || 0;
    totalSpend += s.total_spend || 0;
  });
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

  // Generate SVG line chart for daily performance
  const generateDailyChartSVG = (dailyData) => {
    if (!dailyData || dailyData.length === 0) return '<div style="text-align: center; color: #9ca3af; padding: 40px;">No daily data available</div>';
    
    const width = 680;
    const height = 200;
    const padding = { top: 30, right: 30, bottom: 50, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxImp = Math.max(...dailyData.map(d => d.impressions || 0), 1);
    const maxClicks = Math.max(...dailyData.map(d => d.clicks || 0), 1);
    
    const impPoints = dailyData.map((d, i) => {
      const x = padding.left + (i / Math.max(dailyData.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.impressions || 0) / maxImp) * chartHeight;
      return x + ',' + y;
    }).join(' ');
    
    const impAreaPath = 'M' + padding.left + ',' + (padding.top + chartHeight) + ' L' + impPoints + ' L' + (padding.left + chartWidth) + ',' + (padding.top + chartHeight) + ' Z';
    
    const clicksPoints = dailyData.map((d, i) => {
      const x = padding.left + (i / Math.max(dailyData.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.clicks || 0) / maxClicks) * chartHeight;
      return x + ',' + y;
    });
    
    const xLabelInterval = Math.max(1, Math.floor(dailyData.length / 6));
    const xLabels = dailyData.map((d, i) => {
      if (i % xLabelInterval !== 0 && i !== dailyData.length - 1) return '';
      const x = padding.left + (i / Math.max(dailyData.length - 1, 1)) * chartWidth;
      const date = new Date(d.date);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return '<text x="' + x + '" y="' + (height - 15) + '" text-anchor="middle" font-size="9" fill="#6b7280">' + label + '</text>';
    }).join('');
    
    const yLabels = [0, 0.5, 1].map((pct) => {
      const val = maxImp * pct;
      const y = padding.top + chartHeight - (pct * chartHeight);
      return '<text x="' + (padding.left - 10) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#6b7280">' + formatNumber(val) + '</text>';
    }).join('');
    
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const y = padding.top + chartHeight - (pct * chartHeight);
      return '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" stroke="#f3f4f6" stroke-width="1"/>';
    }).join('');
    
    return '<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="impGradient" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + accentColor + '" stop-opacity="0.4"/>' +
      '<stop offset="100%" stop-color="' + accentColor + '" stop-opacity="0.05"/></linearGradient></defs>' +
      '<rect width="' + width + '" height="' + height + '" fill="white"/>' +
      gridLines +
      '<path d="' + impAreaPath + '" fill="url(#impGradient)"/>' +
      '<polyline points="' + impPoints + '" fill="none" stroke="' + accentColor + '" stroke-width="2.5"/>' +
      '<polyline points="' + clicksPoints.join(' ') + '" fill="none" stroke="' + secondaryColor + '" stroke-width="2" stroke-dasharray="5,3"/>' +
      yLabels + xLabels +
      '<rect x="' + padding.left + '" y="' + (height - 40) + '" width="12" height="12" fill="' + accentColor + '" rx="2"/>' +
      '<text x="' + (padding.left + 18) + '" y="' + (height - 31) + '" font-size="10" fill="#374151">Impressions</text>' +
      '<line x1="' + (padding.left + 100) + '" y1="' + (height - 34) + '" x2="' + (padding.left + 125) + '" y2="' + (height - 34) + '" stroke="' + secondaryColor + '" stroke-width="2" stroke-dasharray="5,3"/>' +
      '<text x="' + (padding.left + 132) + '" y="' + (height - 31) + '" font-size="10" fill="#374151">Clicks</text></svg>';
  };

  // Generate monthly trend bar chart
  const generateMonthlyChartSVG = (monthlyData) => {
    if (!monthlyData || monthlyData.length === 0) return '';
    
    const width = 680;
    const height = 220;
    const padding = { top: 30, right: 30, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxVal = Math.max(...monthlyData.map(d => d.impressions || 0), 1);
    const barWidth = Math.min(60, (chartWidth / monthlyData.length) - 15);
    const barGap = (chartWidth - (barWidth * monthlyData.length)) / (monthlyData.length + 1);
    
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const y = padding.top + chartHeight - (pct * chartHeight);
      return '<line x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '" stroke="#f3f4f6" stroke-width="1"/>';
    }).join('');
    
    const yLabels = [0, 0.5, 1].map((pct) => {
      const val = maxVal * pct;
      const y = padding.top + chartHeight - (pct * chartHeight);
      return '<text x="' + (padding.left - 10) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#6b7280">' + formatNumber(val) + '</text>';
    }).join('');
    
    const bars = monthlyData.map((d, i) => {
      const barHeight = ((d.impressions || 0) / maxVal) * chartHeight;
      const x = padding.left + barGap + (i * (barWidth + barGap));
      const y = padding.top + chartHeight - barHeight;
      const monthLabel = d.month.split(' ')[0];
      const yearLabel = d.month.split(' ')[1] || '';
      
      return '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + '" fill="' + primaryColor + '" rx="4"/>' +
        '<text x="' + (x + barWidth/2) + '" y="' + (height - 30) + '" text-anchor="middle" font-size="10" font-weight="500" fill="#374151">' + monthLabel + '</text>' +
        '<text x="' + (x + barWidth/2) + '" y="' + (height - 15) + '" text-anchor="middle" font-size="8" fill="#9ca3af">' + yearLabel + '</text>' +
        '<text x="' + (x + barWidth/2) + '" y="' + (y - 8) + '" text-anchor="middle" font-size="9" fill="' + primaryColor + '" font-weight="600">' + formatNumber(d.impressions) + '</text>';
    }).join('');
    
    return '<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="' + width + '" height="' + height + '" fill="white"/>' +
      gridLines + bars + yLabels + '</svg>';
  };

  const activeCampaigns = (campaigns || []).filter(c => c.status?.toLowerCase() === 'active');
  const pausedCampaigns = (campaigns || []).filter(c => c.status?.toLowerCase() === 'paused');
  
  const sortedCampaigns = activeCampaigns
    .map(c => ({ ...c, stats: campaignStats[c.id] || {} }))
    .sort((a, b) => (b.stats.impressions || 0) - (a.stats.impressions || 0));

  const html = generateHTML(client, dateRange, totalImpressions, totalClicks, avgCTR, totalSpend, 
    showSpendData, activeCampaigns, pausedCampaigns, sortedCampaigns, campaignStats, 
    dailyStats, history, primaryColor, secondaryColor, accentColor, formatNumber, formatCurrency,
    generateDailyChartSVG, generateMonthlyChartSVG);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function generateHTML(client, dateRange, totalImpressions, totalClicks, avgCTR, totalSpend, 
  showSpendData, activeCampaigns, pausedCampaigns, sortedCampaigns, campaignStats, 
  dailyStats, history, primaryColor, secondaryColor, accentColor, formatNumber, formatCurrency,
  generateDailyChartSVG, generateMonthlyChartSVG) {
  
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    getStyles(primaryColor, secondaryColor, accentColor, showSpendData) +
    '</style></head><body>' +
    getCoverPage(client, dateRange, primaryColor) +
    getExecutiveSummaryPage(client, dateRange, totalImpressions, totalClicks, avgCTR, totalSpend, 
      showSpendData, activeCampaigns, dailyStats, history, primaryColor, formatNumber, formatCurrency, generateDailyChartSVG) +
    getCampaignPage(client, dateRange, showSpendData, activeCampaigns, pausedCampaigns, 
      sortedCampaigns, campaignStats, primaryColor, formatNumber, formatCurrency) +
    (history && history.length > 1 ? getHistoryPage(client, dateRange, showSpendData, history, 
      primaryColor, formatNumber, formatCurrency, generateMonthlyChartSVG) : '') +
    '</body></html>';
}

function getStyles(primaryColor, secondaryColor, accentColor, showSpendData) {
  return '@page{size:letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#1f2937;line-height:1.6;font-size:11px;background:white}' +
    '.cover-page{height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(145deg,' + primaryColor + ' 0%,' + secondaryColor + ' 50%,' + accentColor + ' 100%);color:white;text-align:center;padding:60px;page-break-after:always;position:relative;overflow:hidden}' +
    '.cover-page::before{content:"";position:absolute;top:-50%;right:-50%;width:100%;height:100%;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%);transform:rotate(-15deg)}' +
    '.cover-logo{width:140px;height:140px;border-radius:28px;background:white;display:flex;align-items:center;justify-content:center;margin-bottom:50px;box-shadow:0 25px 60px rgba(0,0,0,0.3);position:relative;z-index:1}' +
    '.cover-logo img{max-width:110px;max-height:110px;object-fit:contain}' +
    '.cover-logo-text{font-size:56px;font-weight:800;color:' + primaryColor + '}' +
    '.cover-content{position:relative;z-index:1}' +
    '.cover-label{font-size:14px;text-transform:uppercase;letter-spacing:4px;opacity:0.9;margin-bottom:15px}' +
    '.cover-title{font-size:48px;font-weight:800;margin-bottom:15px;text-shadow:0 4px 20px rgba(0,0,0,0.3);letter-spacing:-1px}' +
    '.cover-subtitle{font-size:20px;opacity:0.95;margin-bottom:50px;font-weight:300}' +
    '.cover-date-box{display:inline-block;padding:16px 40px;background:rgba(255,255,255,0.2);border-radius:50px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3)}' +
    '.cover-date{font-size:18px;font-weight:500;letter-spacing:0.5px}' +
    '.cover-brand{position:absolute;bottom:40px;left:0;right:0;text-align:center;font-size:13px;opacity:0.8;letter-spacing:1px;z-index:1}' +
    '.page{padding:50px 55px;min-height:100vh;page-break-after:always;position:relative}' +
    '.page:last-child{page-break-after:avoid}' +
    '.page-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;margin-bottom:35px;border-bottom:3px solid ' + primaryColor + '}' +
    '.page-header-left h2{font-size:26px;color:' + primaryColor + ';font-weight:700;margin-bottom:4px}' +
    '.page-header-left p{font-size:12px;color:#6b7280}' +
    '.page-header-right{text-align:right}' +
    '.page-header-right .client-name{font-size:14px;font-weight:600;color:#374151}' +
    '.page-header-right .date-range{font-size:11px;color:#6b7280;margin-top:2px}' +
    '.executive-summary{background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-radius:16px;padding:30px;margin-bottom:35px;border:1px solid #e2e8f0}' +
    '.summary-title{font-size:14px;font-weight:700;color:' + primaryColor + ';text-transform:uppercase;letter-spacing:1.5px;margin-bottom:25px;display:flex;align-items:center;gap:10px}' +
    '.summary-title::after{content:"";flex:1;height:1px;background:linear-gradient(to right,' + primaryColor + '40,transparent)}' +
    '.kpi-grid{display:grid;grid-template-columns:repeat(' + (showSpendData ? 4 : 3) + ',1fr);gap:20px}' +
    '.kpi-card{background:white;padding:24px;border-radius:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid #e5e7eb;position:relative;overflow:hidden}' +
    '.kpi-card::before{content:"";position:absolute;top:0;left:0;right:0;height:4px;background:' + primaryColor + '}' +
    '.kpi-card.impressions::before{background:' + accentColor + '}' +
    '.kpi-card.clicks::before{background:' + secondaryColor + '}' +
    '.kpi-card.ctr::before{background:#8b5cf6}' +
    '.kpi-card.spend::before{background:#f59e0b}' +
    '.kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px;font-weight:600}' +
    '.kpi-value{font-size:32px;font-weight:800;color:#111827;letter-spacing:-1px}' +
    '.kpi-subtext{font-size:10px;color:#9ca3af;margin-top:6px}' +
    '.section{margin-bottom:35px}' +
    '.section-title{font-size:16px;font-weight:700;color:#111827;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;display:flex;align-items:center;gap:10px}' +
    '.section-title .icon{width:28px;height:28px;background:' + primaryColor + '15;border-radius:8px;display:flex;align-items:center;justify-content:center;color:' + primaryColor + '}' +
    '.chart-container{background:white;border-radius:12px;padding:25px;border:1px solid #e5e7eb;box-shadow:0 2px 10px rgba(0,0,0,0.03)}' +
    'table{width:100%;border-collapse:collapse;font-size:11px}' +
    'thead tr{background:linear-gradient(135deg,' + primaryColor + ' 0%,' + secondaryColor + ' 100%)}' +
    'th{padding:14px 16px;text-align:left;font-weight:600;color:white;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}' +
    'th:first-child{border-radius:8px 0 0 0}th:last-child{border-radius:0 8px 0 0}' +
    'tbody tr{border-bottom:1px solid #f3f4f6}' +
    'tbody tr:nth-child(even){background:#f9fafb}' +
    'tbody tr:last-child{border-bottom:none}' +
    'tbody tr:last-child td:first-child{border-radius:0 0 0 8px}' +
    'tbody tr:last-child td:last-child{border-radius:0 0 8px 0}' +
    'td{padding:14px 16px;color:#374151}' +
    '.mono{font-family:"SF Mono",Monaco,Inconsolata,"Fira Code",monospace;font-size:11px}' +
    '.status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}' +
    '.status-active{background:#dcfce7;color:#166534}' +
    '.status-paused{background:#fef3c7;color:#92400e}' +
    '.campaign-rank{width:26px;height:26px;border-radius:50%;background:' + primaryColor + ';color:white;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin-right:10px}' +
    '.page-footer{position:absolute;bottom:30px;left:55px;right:55px;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af;padding-top:15px;border-top:1px solid #e5e7eb}' +
    '.campaign-name{font-weight:600;color:#111827}' +
    '.campaign-dates{font-size:9px;color:#9ca3af;margin-top:2px}' +
    '.callout{background:linear-gradient(135deg,' + primaryColor + '10 0%,' + secondaryColor + '10 100%);border-left:4px solid ' + primaryColor + ';padding:20px 25px;border-radius:0 12px 12px 0;margin:25px 0}' +
    '.callout-title{font-size:12px;font-weight:700;color:' + primaryColor + ';margin-bottom:8px}' +
    '.callout-text{font-size:11px;color:#4b5563;line-height:1.6}';
}

function getCoverPage(client, dateRange, primaryColor) {
  const logoContent = client.logo_path 
    ? '<img src="' + client.logo_path + '" alt="' + client.name + '" />'
    : '<span class="cover-logo-text">' + (client.name || 'R')[0].toUpperCase() + '</span>';
  
  return '<div class="cover-page">' +
    '<div class="cover-logo">' + logoContent + '</div>' +
    '<div class="cover-content">' +
    '<div class="cover-label">Digital Advertising Report</div>' +
    '<h1 class="cover-title">' + client.name + '</h1>' +
    '<p class="cover-subtitle">Performance Report & Campaign Analytics</p>' +
    '<div class="cover-date-box">' +
    '<span class="cover-date">' + dateRange.start + ' – ' + dateRange.end + '</span>' +
    '</div></div>' +
    '<div class="cover-brand">Prepared by ' + (client.brand_name || 'Digital Advertising') + 
    ' • Generated ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '</div>' +
    '</div>';
}

function getExecutiveSummaryPage(client, dateRange, totalImpressions, totalClicks, avgCTR, totalSpend, 
  showSpendData, activeCampaigns, dailyStats, history, primaryColor, formatNumber, formatCurrency, generateDailyChartSVG) {
  
  const spendCard = showSpendData ? 
    '<div class="kpi-card spend"><div class="kpi-label">Total Investment</div><div class="kpi-value">' + formatCurrency(totalSpend) + '</div><div class="kpi-subtext">Media spend</div></div>' : '';
  
  const dailyChart = dailyStats && dailyStats.length > 0 ?
    '<div class="section"><div class="section-title"><span class="icon">📈</span>Daily Performance Trend</div>' +
    '<div class="chart-container">' + generateDailyChartSVG(dailyStats) + '</div></div>' : '';
  
  const historyCallout = history && history.length > 1 ?
    '<div class="callout"><div class="callout-title">📊 Historical Context</div>' +
    '<div class="callout-text">This report covers ' + history.length + ' months of campaign data.</div></div>' : '';
  
  return '<div class="page">' +
    '<div class="page-header">' +
    '<div class="page-header-left"><h2>Executive Summary</h2><p>Key performance metrics for the reporting period</p></div>' +
    '<div class="page-header-right"><div class="client-name">' + client.name + '</div>' +
    '<div class="date-range">' + dateRange.start + ' – ' + dateRange.end + '</div></div></div>' +
    '<div class="executive-summary"><div class="summary-title">Performance Overview</div>' +
    '<div class="kpi-grid">' +
    '<div class="kpi-card impressions"><div class="kpi-label">Total Impressions</div><div class="kpi-value">' + formatNumber(totalImpressions) + '</div><div class="kpi-subtext">' + activeCampaigns.length + ' active campaign' + (activeCampaigns.length !== 1 ? 's' : '') + '</div></div>' +
    '<div class="kpi-card clicks"><div class="kpi-label">Total Clicks</div><div class="kpi-value">' + formatNumber(totalClicks) + '</div><div class="kpi-subtext">User engagements</div></div>' +
    '<div class="kpi-card ctr"><div class="kpi-label">Click-Through Rate</div><div class="kpi-value">' + avgCTR.toFixed(2) + '%</div><div class="kpi-subtext">Average CTR</div></div>' +
    spendCard + '</div></div>' +
    dailyChart + historyCallout +
    '<div class="page-footer"><div>Page 2</div><div>Confidential – ' + client.name + '</div></div></div>';
}

function getCampaignPage(client, dateRange, showSpendData, activeCampaigns, pausedCampaigns, 
  sortedCampaigns, campaignStats, primaryColor, formatNumber, formatCurrency) {
  
  const spendHeader = showSpendData ? '<th style="width:18%;text-align:right;">Spend</th>' : '';
  
  let activeRows = '';
  sortedCampaigns.slice(0, 12).forEach((c, i) => {
    const s = c.stats;
    const ctr = s.impressions > 0 ? (s.clicks / s.impressions * 100).toFixed(2) : '0.00';
    const spendCell = showSpendData ? '<td style="text-align:right;" class="mono">' + formatCurrency(s.total_spend || 0) + '</td>' : '';
    const dateInfo = c.start_date ? '<div class="campaign-dates">' + new Date(c.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + (c.end_date ? new Date(c.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Ongoing') + '</div>' : '';
    
    activeRows += '<tr><td><span class="campaign-rank">' + (i + 1) + '</span></td>' +
      '<td><div class="campaign-name">' + c.name + '</div>' + dateInfo + '</td>' +
      '<td><span class="status-badge status-active">Active</span></td>' +
      '<td style="text-align:right;" class="mono">' + formatNumber(s.impressions || 0) + '</td>' +
      '<td style="text-align:right;" class="mono">' + formatNumber(s.clicks || 0) + '</td>' +
      '<td style="text-align:right;"><strong>' + ctr + '%</strong></td>' + spendCell + '</tr>';
  });
  
  const activeSection = activeCampaigns.length > 0 ?
    '<div class="section"><div class="section-title"><span class="icon">🚀</span>Active Campaigns (' + activeCampaigns.length + ')</div>' +
    '<table><thead><tr><th style="width:5%">#</th><th style="width:' + (showSpendData ? '30' : '40') + '%">Campaign</th><th style="width:10%">Status</th><th style="width:15%;text-align:right;">Impressions</th><th style="width:12%;text-align:right;">Clicks</th><th style="width:10%;text-align:right;">CTR</th>' + spendHeader + '</tr></thead><tbody>' + activeRows + '</tbody></table>' +
    (activeCampaigns.length > 12 ? '<p style="margin-top:15px;color:#6b7280;font-size:10px;text-align:center;">+ ' + (activeCampaigns.length - 12) + ' additional active campaigns</p>' : '') + '</div>' : '';
  
  let pausedRows = '';
  pausedCampaigns.slice(0, 6).forEach(c => {
    const s = campaignStats[c.id] || {};
    const ctr = s.impressions > 0 ? (s.clicks / s.impressions * 100).toFixed(2) : '0.00';
    const spendCell = showSpendData ? '<td style="text-align:right;" class="mono">' + formatCurrency(s.total_spend || 0) + '</td>' : '';
    
    pausedRows += '<tr><td><div class="campaign-name">' + c.name + '</div></td>' +
      '<td><span class="status-badge status-paused">Paused</span></td>' +
      '<td style="text-align:right;" class="mono">' + formatNumber(s.impressions || 0) + '</td>' +
      '<td style="text-align:right;" class="mono">' + formatNumber(s.clicks || 0) + '</td>' +
      '<td style="text-align:right;">' + ctr + '%</td>' + spendCell + '</tr>';
  });
  
  const pausedSection = pausedCampaigns.length > 0 ?
    '<div class="section" style="margin-top:35px"><div class="section-title"><span class="icon">⏸️</span>Paused Campaigns (' + pausedCampaigns.length + ')</div>' +
    '<table><thead><tr><th style="width:' + (showSpendData ? '35' : '45') + '%">Campaign</th><th style="width:10%">Status</th><th style="width:15%;text-align:right;">Impressions</th><th style="width:12%;text-align:right;">Clicks</th><th style="width:10%;text-align:right;">CTR</th>' + spendHeader + '</tr></thead><tbody>' + pausedRows + '</tbody></table>' +
    (pausedCampaigns.length > 6 ? '<p style="margin-top:10px;color:#6b7280;font-size:10px;">+ ' + (pausedCampaigns.length - 6) + ' more paused campaigns</p>' : '') + '</div>' : '';
  
  return '<div class="page">' +
    '<div class="page-header">' +
    '<div class="page-header-left"><h2>Campaign Performance</h2><p>Detailed breakdown by campaign</p></div>' +
    '<div class="page-header-right"><div class="client-name">' + client.name + '</div>' +
    '<div class="date-range">' + dateRange.start + ' – ' + dateRange.end + '</div></div></div>' +
    activeSection + pausedSection +
    '<div class="page-footer"><div>Generated on ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '</div>' +
    '<div>Powered by ' + (client.brand_name || 'Digital Advertising Reports') + '</div></div></div>';
}

function getHistoryPage(client, dateRange, showSpendData, history, primaryColor, formatNumber, formatCurrency, generateMonthlyChartSVG) {
  const spendHeader = showSpendData ? '<th style="width:25%;text-align:right;">Spend</th>' : '';
  
  let historyRows = '';
  history.slice().reverse().forEach(h => {
    const ctr = h.impressions > 0 ? (h.clicks / h.impressions * 100).toFixed(2) : '0.00';
    const spendCell = showSpendData ? '<td style="text-align:right;" class="mono">' + formatCurrency(h.spend || 0) + '</td>' : '';
    
    historyRows += '<tr><td><strong>' + h.month + '</strong></td>' +
      '<td style="text-align:right;" class="mono">' + formatNumber(h.impressions || 0) + '</td>' +
      '<td style="text-align:right;" class="mono">' + formatNumber(h.clicks || 0) + '</td>' +
      '<td style="text-align:right;">' + ctr + '%</td>' + spendCell + '</tr>';
  });
  
  return '<div class="page">' +
    '<div class="page-header">' +
    '<div class="page-header-left"><h2>Historical Performance</h2><p>Month-over-month trends</p></div>' +
    '<div class="page-header-right"><div class="client-name">' + client.name + '</div>' +
    '<div class="date-range">Last ' + history.length + ' Months</div></div></div>' +
    '<div class="section"><div class="section-title"><span class="icon">📊</span>Monthly Impressions Trend</div>' +
    '<div class="chart-container">' + generateMonthlyChartSVG(history) + '</div></div>' +
    '<div class="section" style="margin-top:35px"><div class="section-title"><span class="icon">📋</span>Monthly Performance Data</div>' +
    '<table><thead><tr><th style="width:25%">Month</th><th style="width:20%;text-align:right;">Impressions</th><th style="width:15%;text-align:right;">Clicks</th><th style="width:15%;text-align:right;">CTR</th>' + spendHeader + '</tr></thead><tbody>' + historyRows + '</tbody></table></div>' +
    '<div class="page-footer"><div>Generated on ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '</div>' +
    '<div>Powered by ' + (client.brand_name || 'Digital Advertising Reports') + '</div></div></div>';
}

module.exports = { generateProfessionalPDF };
