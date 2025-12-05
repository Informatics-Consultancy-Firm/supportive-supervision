// ============================================
// MALARIA SUPPORTIVE SUPERVISION
// Google Apps Script Backend
// ============================================

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  // Anthropic API Key for AI Reports
  ANTHROPIC_API_KEY: 'YOUR_ANTHROPIC_API_KEY_HERE',
  
  // Sheet names
  SHEET_NAME: 'Supervisions',
  REPORT_SHEET: 'Reports',
  
  // Email Settings
  SCHEDULED_EMAILS: [
    'sillahmohamedkanu@gmail.com'
    // Add more emails as needed
  ],
  
  // Company Information
  COMPANY_NAME: 'NMCP - Ministry of Health, Sierra Leone',
  COMPANY_EMAIL: 'sillahmohamedkanu@gmail.com',
  COMPANY_LOGO: 'https://github.com/mohamedsillahkanu/gdp-dashboard-2/raw/6c7463b0d5c3be150aafae695a4bcbbd8aeb1499/ICF-SL.jpg'
};

// ============================================
// COLUMN HEADERS
// ============================================
const HEADERS = [
  'Timestamp',
  'Submitted By',
  'Supervision Date',
  'Region',
  'District',
  'Chiefdom',
  'Facility Name',
  'Facility UID',
  'Hospital Head Name',
  'Hospital Head Title',
  'Guidelines Available',
  'RDTs Available',
  'Microscopy Available',
  'Microscopy Issue Reason',
  'Stains Issue Reason',
  'ACTs Available',
  'IV Artesunate Available',
  'IPTp LLINs Available',
  'Supportive Drugs Available',
  'Oxygen Suction Available',
  'Readiness Quality',
  'Testing Protocol',
  'Treatment Protocol',
  'Differential Rx',
  'Severe Mgmt',
  'Patient Education',
  'Data Completeness',
  'Reporting Accuracy',
  'Stock Record Match',
  'Data Use',
  'Clinical Data Quality',
  'Timely Diagnosis Met',
  'Timely Diagnosis Delay',
  'First Dose Met',
  'First Dose Delay',
  'Supportive Care Met',
  'Supportive Care Delay',
  'Monitoring Met',
  'Monitoring Delay',
  'Death Preventable',
  'Death Audit Quality',
  'Stockout Occurred',
  'Competency Lacking',
  'Access Barriers',
  'Systemic Quality',
  'Strengths',
  'Weaknesses',
  'Opportunities',
  'Threats',
  'Action Plan',
  'Supervisors',
  'GPS Latitude',
  'GPS Longitude',
  'Additional Notes'
];

// ============================================
// WEB APP ENDPOINTS
// ============================================
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = JSON.parse(e.postData.contents);
    
    const row = [
      data.timestamp || new Date().toISOString(),
      data.submittedBy || '',
      data.supervision_date || '',
      data.region || '',
      data.district || '',
      data.chiefdom || '',
      data.facility_name || '',
      data.facility_uid || '',
      data.hospital_head_name || '',
      data.hospital_head_title || '',
      data.guidelines_available || '',
      data.rdts_available || '',
      data.microscopy_available || '',
      data.microscopy_issue_reason || '',
      data.stains_issue_reason || '',
      data.acts_available || '',
      data.iv_artesunate_available || '',
      data.iptp_llins_available || '',
      data.supportive_drugs_available || '',
      data.oxygen_suction_available || '',
      data.readiness_quality || '',
      data.testing_protocol || '',
      data.treatment_protocol || '',
      data.differential_rx || '',
      data.severe_mgmt || '',
      data.patient_education || '',
      data.data_completeness || '',
      data.reporting_accuracy || '',
      data.stock_record_match || '',
      data.data_use || '',
      data.clinical_data_quality || '',
      data.timely_diagnosis_met || '',
      data.timely_diagnosis_delay || '',
      data.first_dose_met || '',
      data.first_dose_delay || '',
      data.supportive_care_met || '',
      data.supportive_care_delay || '',
      data.monitoring_met || '',
      data.monitoring_delay || '',
      data.death_preventable || '',
      data.death_audit_quality || '',
      data.stockout_occurred || '',
      data.competency_lacking || '',
      data.access_barriers || '',
      data.systemic_quality || '',
      formatSWOT(data, 'strength'),
      formatSWOT(data, 'weakness'),
      formatSWOT(data, 'opportunity'),
      formatSWOT(data, 'threat'),
      formatActionPlan(data),
      formatSupervisors(data),
      data.gps_latitude || '',
      data.gps_longitude || '',
      data.additional_notes || ''
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      message: 'Supervision data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('doPost error:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return getSupervisionData();
  } else if (action === 'getReport') {
    return generateAIReport(e.parameter.id);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    status: 'Malaria Supportive Supervision API Running',
    version: '1.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// SHEET MANAGEMENT
// ============================================
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1a5276')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function getSupervisionData() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      // Convert header to snake_case for consistency
      const key = headers[j].toLowerCase().replace(/\s+/g, '_');
      row[key] = data[i][j];
    }
    result.push(row);
  }
  
  // Return wrapped in { data: ... } format for dashboard.js compatibility
  return ContentService.createTextOutput(JSON.stringify({ data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatSWOT(data, type) {
  const items = [];
  for (let i = 1; i <= 3; i++) {
    const value = data[`${type}_${i}`];
    if (value) items.push(value);
  }
  return items.join('; ');
}

function formatActionPlan(data) {
  const gaps = [];
  for (let i = 1; i <= 3; i++) {
    const gap = data[`gap_${i}`];
    const action = data[`gap_${i}_action`];
    const responsible = data[`gap_${i}_responsible`];
    const dueDate = data[`gap_${i}_due_date`];
    
    if (gap) {
      gaps.push(`Gap ${i}: ${gap} | Action: ${action || 'N/A'} | Responsible: ${responsible || 'N/A'} | Due: ${dueDate || 'N/A'}`);
    }
  }
  return gaps.join(' || ');
}

function formatSupervisors(data) {
  const supervisors = [];
  for (let i = 1; i <= 2; i++) {
    const name = data[`supervisor_${i}_name`];
    const org = data[`supervisor_${i}_org`];
    
    if (name) {
      supervisors.push(`${name} (${org || 'N/A'})`);
    }
  }
  return supervisors.join('; ');
}

// ============================================
// CUSTOM MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('📊 Supervision Tools')
    .addItem('Generate Summary Report', 'generateSummaryReport')
    .addItem('Send Weekly Report Email', 'sendWeeklyReportEmail')
    .addSeparator()
    .addItem('Setup Email Trigger (Weekly)', 'setupWeeklyEmailTrigger')
    .addItem('Remove Email Triggers', 'removeEmailTriggers')
    .addSeparator()
    .addItem('View Statistics', 'viewStatistics')
    .addItem('Reset Sheet', 'resetSheet')
    .addToUi();
}

// ============================================
// AI REPORT GENERATION
// ============================================
function generateSummaryReport() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No supervision data to report on.');
    return;
  }
  
  const headers = data[0];
  const submissions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    submissions.push(row);
  }
  
  // Calculate statistics
  const stats = calculateStatistics(submissions);
  
  const prompt = `You are a public health expert specializing in malaria control in Sierra Leone. Generate a comprehensive supervision summary report.

SUPERVISION STATISTICS:
${JSON.stringify(stats, null, 2)}

RAW DATA (${submissions.length} supervisions):
${JSON.stringify(submissions.slice(-20), null, 2)}

Generate a professional report with:

# MALARIA SUPPORTIVE SUPERVISION - SUMMARY REPORT
## National Malaria Control Programme, Sierra Leone

### EXECUTIVE SUMMARY
Key findings and recommendations

### COVERAGE
- Total supervisions: ${submissions.length}
- Districts covered
- Time period analyzed

### FACILITY READINESS ASSESSMENT
- Quality distribution (Excellent/Acceptable/Needs Improvement)
- Key gaps in supplies and equipment
- Critical issues requiring immediate attention

### CLINICAL COMPETENCY FINDINGS
- T3 protocol adherence
- Training needs identified

### DATA QUALITY ASSESSMENT
- Completeness and accuracy findings
- Data use practices

### SYSTEMIC ISSUES
- Stock-outs reported
- Competency gaps
- Access barriers

### PRIORITY RECOMMENDATIONS
Top 5 actionable recommendations with responsible parties

### CONCLUSION
Overall assessment and next steps

Format professionally with statistics and percentages.`;

  try {
    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      throw new Error('API request failed: ' + response.getContentText());
    }

    const result = JSON.parse(response.getContentText());
    const reportText = result.content[0].text;
    
    // Save report to a new sheet
    saveReport(reportText);
    
    SpreadsheetApp.getUi().alert('Report generated and saved to "Reports" sheet!');
    
  } catch (error) {
    console.error('Report generation error:', error);
    SpreadsheetApp.getUi().alert('Error generating report: ' + error.message + '\n\nMake sure your API key is configured.');
  }
}

function calculateStatistics(submissions) {
  const stats = {
    total: submissions.length,
    byRegion: {},
    byDistrict: {},
    readinessQuality: { Excellent: 0, Acceptable: 0, 'Needs Improvement': 0, '': 0 },
    clinicalQuality: { Excellent: 0, Acceptable: 0, 'Needs Improvement': 0, '': 0 },
    indicators: {
      guidelinesAvailable: 0,
      rdtsAvailable: 0,
      actsAvailable: 0,
      ivArtesunateAvailable: 0,
      oxygenAvailable: 0,
      dataUse: 0,
      stockouts: 0,
      competencyGaps: 0,
      accessBarriers: 0
    }
  };
  
  submissions.forEach(s => {
    // Region counts
    const region = s['Region'] || 'Unknown';
    stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
    
    // District counts
    const district = s['District'] || 'Unknown';
    stats.byDistrict[district] = (stats.byDistrict[district] || 0) + 1;
    
    // Quality counts
    const readiness = s['Readiness Quality'] || '';
    stats.readinessQuality[readiness] = (stats.readinessQuality[readiness] || 0) + 1;
    
    const clinical = s['Clinical Data Quality'] || '';
    stats.clinicalQuality[clinical] = (stats.clinicalQuality[clinical] || 0) + 1;
    
    // Indicator counts
    if (s['Guidelines Available'] === 'Yes') stats.indicators.guidelinesAvailable++;
    if (s['RDTs Available'] === 'Yes') stats.indicators.rdtsAvailable++;
    if (s['ACTs Available'] === 'Yes') stats.indicators.actsAvailable++;
    if (s['IV Artesunate Available'] === 'Yes') stats.indicators.ivArtesunateAvailable++;
    if (s['Oxygen Suction Available'] === 'Yes') stats.indicators.oxygenAvailable++;
    if (s['Data Use'] === 'Yes') stats.indicators.dataUse++;
    if (s['Stockout Occurred'] === 'Yes') stats.indicators.stockouts++;
    if (s['Competency Lacking'] === 'Yes') stats.indicators.competencyGaps++;
    if (s['Access Barriers'] === 'Yes') stats.indicators.accessBarriers++;
  });
  
  return stats;
}

function saveReport(reportText) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let reportSheet = ss.getSheetByName(CONFIG.REPORT_SHEET);
  
  if (!reportSheet) {
    reportSheet = ss.insertSheet(CONFIG.REPORT_SHEET);
    reportSheet.appendRow(['Generated Date', 'Report Type', 'Report Content']);
    reportSheet.getRange(1, 1, 1, 3)
      .setFontWeight('bold')
      .setBackground('#1a5276')
      .setFontColor('#ffffff');
  }
  
  reportSheet.appendRow([
    new Date().toISOString(),
    'Summary Report',
    reportText
  ]);
}

// ============================================
// EMAIL FUNCTIONS
// ============================================
function sendWeeklyReportEmail() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    console.log('No data to report');
    return;
  }
  
  const headers = data[0];
  const submissions = [];
  
  // Get last 7 days of submissions
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  for (let i = 1; i < data.length; i++) {
    const timestamp = new Date(data[i][0]);
    if (timestamp >= weekAgo) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      submissions.push(row);
    }
  }
  
  if (submissions.length === 0) {
    console.log('No supervisions this week');
    return;
  }
  
  const stats = calculateStatistics(submissions);
  
  // Generate email HTML
  const emailHtml = generateEmailHtml(stats, submissions);
  
  // Send email
  CONFIG.SCHEDULED_EMAILS.forEach(email => {
    try {
      GmailApp.sendEmail(email, 
        'Weekly Malaria Supervision Report - ' + new Date().toLocaleDateString(),
        'Please view this email in HTML format.',
        {
          htmlBody: emailHtml,
          name: CONFIG.COMPANY_NAME,
          replyTo: CONFIG.COMPANY_EMAIL
        }
      );
      console.log('Email sent to: ' + email);
    } catch (e) {
      console.error('Failed to send email to ' + email + ': ' + e);
    }
  });
}

function generateEmailHtml(stats, submissions) {
  const total = stats.total;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1a5276, #2e86ab); color: #fff; padding: 30px; text-align: center; }
    .header img { width: 80px; border-radius: 8px; margin-bottom: 15px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1a5276; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    .section { margin-bottom: 25px; }
    .section h3 { color: #1a5276; border-bottom: 2px solid #1a5276; padding-bottom: 10px; font-size: 16px; }
    .quality-bar { display: flex; height: 30px; border-radius: 6px; overflow: hidden; margin: 10px 0; }
    .quality-excellent { background: #27ae60; }
    .quality-acceptable { background: #f39c12; }
    .quality-needs { background: #e74c3c; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .footer { background: #1a5276; color: #fff; padding: 20px; text-align: center; font-size: 12px; }
    .indicator-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .indicator-name { color: #333; }
    .indicator-value { font-weight: bold; }
    .indicator-value.good { color: #27ae60; }
    .indicator-value.warning { color: #f39c12; }
    .indicator-value.bad { color: #e74c3c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${CONFIG.COMPANY_LOGO}" alt="Logo">
      <h1>Weekly Supervision Report</h1>
      <p>National Malaria Control Programme - Sierra Leone</p>
      <p style="font-size: 12px;">Report Period: ${new Date(Date.now() - 7*24*60*60*1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${total}</div>
          <div class="stat-label">SUPERVISIONS</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Object.keys(stats.byDistrict).length}</div>
          <div class="stat-label">DISTRICTS</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round((stats.readinessQuality.Excellent / total) * 100) || 0}%</div>
          <div class="stat-label">EXCELLENT READINESS</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round((stats.indicators.guidelinesAvailable / total) * 100) || 0}%</div>
          <div class="stat-label">GUIDELINES AVAILABLE</div>
        </div>
      </div>
      
      <div class="section">
        <h3>📊 Readiness Quality Distribution</h3>
        <div class="quality-bar">
          <div class="quality-excellent" style="width: ${(stats.readinessQuality.Excellent / total) * 100}%"></div>
          <div class="quality-acceptable" style="width: ${(stats.readinessQuality.Acceptable / total) * 100}%"></div>
          <div class="quality-needs" style="width: ${(stats.readinessQuality['Needs Improvement'] / total) * 100}%"></div>
        </div>
        <div style="display: flex; justify-content: space-around; font-size: 12px;">
          <span>🟢 Excellent: ${stats.readinessQuality.Excellent}</span>
          <span>🟡 Acceptable: ${stats.readinessQuality.Acceptable}</span>
          <span>🔴 Needs Improvement: ${stats.readinessQuality['Needs Improvement']}</span>
        </div>
      </div>
      
      <div class="section">
        <h3>📋 Key Indicators</h3>
        <div class="indicator-row">
          <span class="indicator-name">RDTs Available</span>
          <span class="indicator-value ${getIndicatorClass(stats.indicators.rdtsAvailable, total)}">${Math.round((stats.indicators.rdtsAvailable / total) * 100)}%</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-name">ACTs Available</span>
          <span class="indicator-value ${getIndicatorClass(stats.indicators.actsAvailable, total)}">${Math.round((stats.indicators.actsAvailable / total) * 100)}%</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-name">IV Artesunate Available</span>
          <span class="indicator-value ${getIndicatorClass(stats.indicators.ivArtesunateAvailable, total)}">${Math.round((stats.indicators.ivArtesunateAvailable / total) * 100)}%</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-name">Oxygen/Suction Available</span>
          <span class="indicator-value ${getIndicatorClass(stats.indicators.oxygenAvailable, total)}">${Math.round((stats.indicators.oxygenAvailable / total) * 100)}%</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-name">Data Use Practices</span>
          <span class="indicator-value ${getIndicatorClass(stats.indicators.dataUse, total)}">${Math.round((stats.indicators.dataUse / total) * 100)}%</span>
        </div>
      </div>
      
      <div class="section">
        <h3>⚠️ Issues Identified</h3>
        <div class="indicator-row">
          <span class="indicator-name">Stock-outs Reported</span>
          <span class="indicator-value bad">${stats.indicators.stockouts} (${Math.round((stats.indicators.stockouts / total) * 100)}%)</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-name">Competency Gaps</span>
          <span class="indicator-value bad">${stats.indicators.competencyGaps} (${Math.round((stats.indicators.competencyGaps / total) * 100)}%)</span>
        </div>
        <div class="indicator-row">
          <span class="indicator-name">Access Barriers</span>
          <span class="indicator-value bad">${stats.indicators.accessBarriers} (${Math.round((stats.indicators.accessBarriers / total) * 100)}%)</span>
        </div>
      </div>
      
      <div class="section">
        <h3>🏥 Recent Supervisions</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Facility</th>
              <th>District</th>
              <th>Readiness</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.slice(-5).map(s => `
              <tr>
                <td>${new Date(s['Supervision Date'] || s['Timestamp']).toLocaleDateString()}</td>
                <td>${s['Facility Name'] || '-'}</td>
                <td>${s['District'] || '-'}</td>
                <td>${s['Readiness Quality'] || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>${CONFIG.COMPANY_NAME}</strong></p>
      <p>This is an automated weekly report.</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `;
}

function getIndicatorClass(value, total) {
  const percentage = (value / total) * 100;
  if (percentage >= 80) return 'good';
  if (percentage >= 60) return 'warning';
  return 'bad';
}

// ============================================
// TRIGGER MANAGEMENT
// ============================================
function setupWeeklyEmailTrigger() {
  // Remove existing triggers first
  removeEmailTriggers();
  
  // Create new weekly trigger (every Monday at 8 AM)
  ScriptApp.newTrigger('sendWeeklyReportEmail')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();
  
  SpreadsheetApp.getUi().alert('Weekly email trigger set for every Monday at 8 AM');
}

function removeEmailTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklyReportEmail') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

// ============================================
// STATISTICS VIEW
// ============================================
function viewStatistics() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No supervision data yet.');
    return;
  }
  
  const headers = data[0];
  const submissions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    submissions.push(row);
  }
  
  const stats = calculateStatistics(submissions);
  const total = stats.total;
  
  const message = `
📊 SUPERVISION STATISTICS
═══════════════════════════════

Total Supervisions: ${total}
Districts Covered: ${Object.keys(stats.byDistrict).length}
Regions Covered: ${Object.keys(stats.byRegion).length}

📋 READINESS QUALITY
───────────────────────────────
✓ Excellent: ${stats.readinessQuality.Excellent} (${Math.round((stats.readinessQuality.Excellent / total) * 100)}%)
⚠ Acceptable: ${stats.readinessQuality.Acceptable} (${Math.round((stats.readinessQuality.Acceptable / total) * 100)}%)
✗ Needs Improvement: ${stats.readinessQuality['Needs Improvement']} (${Math.round((stats.readinessQuality['Needs Improvement'] / total) * 100)}%)

📦 KEY INDICATORS
───────────────────────────────
Guidelines Available: ${Math.round((stats.indicators.guidelinesAvailable / total) * 100)}%
RDTs Available: ${Math.round((stats.indicators.rdtsAvailable / total) * 100)}%
ACTs Available: ${Math.round((stats.indicators.actsAvailable / total) * 100)}%
IV Artesunate: ${Math.round((stats.indicators.ivArtesunateAvailable / total) * 100)}%
Oxygen/Suction: ${Math.round((stats.indicators.oxygenAvailable / total) * 100)}%
Data Use: ${Math.round((stats.indicators.dataUse / total) * 100)}%

⚠️ ISSUES
───────────────────────────────
Stock-outs: ${stats.indicators.stockouts} facilities
Competency Gaps: ${stats.indicators.competencyGaps} facilities
Access Barriers: ${stats.indicators.accessBarriers} reported
  `;
  
  SpreadsheetApp.getUi().alert(message);
}

// ============================================
// RESET
// ============================================
function resetSheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⚠️ Reset Sheet',
    'This will delete ALL supervision data. Are you sure?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  
  getOrCreateSheet();
  
  ui.alert('Sheet reset successfully!');
}
