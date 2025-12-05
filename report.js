// ============================================
// REPORT MODULE
// Generates supervision reports using Claude API
// ============================================

const Report = {
    // Report state
    isGenerating: false,
    currentReport: null,
    
    // Initialize report module
    init: function() {
        console.log('Report module initialized');
    },
    
    // Fetch supervision data from Google Sheets
    fetchData: async function() {
        try {
            const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getData`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            const result = await response.json();
            return result.data || [];
            
        } catch (error) {
            console.error('Report fetch error:', error);
            throw error;
        }
    },
    
    // Generate report using Claude API
    generateReport: async function(reportType = 'summary', filters = {}) {
        this.isGenerating = true;
        
        try {
            // Fetch supervision data
            const data = await this.fetchData();
            
            if (!data || data.length === 0) {
                throw new Error('No supervision data available');
            }
            
            // Filter data if needed
            let filteredData = this.applyFilters(data, filters);
            
            // Prepare prompt based on report type
            const prompt = this.buildPrompt(reportType, filteredData, filters);
            
            // Call Claude API
            const report = await this.callClaudeAPI(prompt);
            
            this.currentReport = report;
            this.isGenerating = false;
            
            return report;
            
        } catch (error) {
            console.error('Report generation error:', error);
            this.isGenerating = false;
            throw error;
        }
    },
    
    // Apply filters to data
    applyFilters: function(data, filters) {
        let filtered = [...data];
        
        if (filters.region) {
            filtered = filtered.filter(d => d.region === filters.region);
        }
        
        if (filters.district) {
            filtered = filtered.filter(d => d.district === filters.district);
        }
        
        if (filters.startDate) {
            filtered = filtered.filter(d => d.supervision_date >= filters.startDate);
        }
        
        if (filters.endDate) {
            filtered = filtered.filter(d => d.supervision_date <= filters.endDate);
        }
        
        return filtered;
    },
    
    // Build prompt for Claude API
    buildPrompt: function(reportType, data, filters) {
        // Summarize data for the prompt (to reduce token usage)
        const summary = this.summarizeData(data);
        
        const prompts = {
            summary: `You are a public health expert analyzing malaria supervision data from Sierra Leone.

Based on the following supervision data summary, generate a comprehensive summary report:

DATA SUMMARY:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Executive Summary (2-3 paragraphs)
2. Key Findings
3. Health Facility Readiness Assessment
4. Clinical Competency Overview
5. Data Quality Assessment
6. Recommendations for Improvement
7. Priority Actions

Format the report professionally with clear headers and bullet points where appropriate.`,

            regional: `You are a public health expert analyzing malaria supervision data from Sierra Leone.

Generate a regional analysis report based on this data:

DATA SUMMARY:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Regional Overview
2. Performance Comparison by Region
3. Top Performing Districts
4. Districts Needing Attention
5. Regional Recommendations
6. Resource Allocation Suggestions`,

            facility: `You are a public health expert analyzing malaria supervision data from Sierra Leone.

Generate a facility-level analysis report based on this data:

DATA SUMMARY:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Facility Performance Overview
2. Facilities with Excellent Ratings (highlight best practices)
3. Facilities Needing Improvement (specific action items)
4. Common Gaps Across Facilities
5. Training Recommendations
6. Follow-up Priorities`,

            trends: `You are a public health expert analyzing malaria supervision data from Sierra Leone.

Generate a trends analysis report based on this data:

DATA SUMMARY:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Overall Trends Summary
2. Quality Improvement Trends
3. Areas of Consistent Concern
4. Seasonal Patterns (if applicable)
5. Year-over-Year Comparison (if applicable)
6. Predictive Insights
7. Strategic Recommendations`,

            gaps: `You are a public health expert analyzing malaria supervision data from Sierra Leone.

Generate a gap analysis report based on this data:

DATA SUMMARY:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Critical Gaps Summary
2. Systemic Issues Identified
3. Training Gaps
4. Supply Chain Issues
5. Data Quality Gaps
6. Infrastructure Challenges
7. Prioritized Action Plan
8. Resource Requirements`
        };
        
        return prompts[reportType] || prompts.summary;
    },
    
    // Summarize data to reduce token usage
    summarizeData: function(data) {
        const summary = {
            totalRecords: data.length,
            dateRange: {
                earliest: null,
                latest: null
            },
            regions: {},
            districts: {},
            qualityAssessments: {
                readiness: { excellent: 0, acceptable: 0, needsImprovement: 0 },
                clinical: { excellent: 0, acceptable: 0, needsImprovement: 0 },
                dataQuality: { excellent: 0, acceptable: 0, needsImprovement: 0 }
            },
            commonGaps: [],
            strengths: [],
            weaknesses: []
        };
        
        const gaps = {};
        const strengths = {};
        const weaknesses = {};
        
        data.forEach(record => {
            // Date range
            if (record.supervision_date) {
                if (!summary.dateRange.earliest || record.supervision_date < summary.dateRange.earliest) {
                    summary.dateRange.earliest = record.supervision_date;
                }
                if (!summary.dateRange.latest || record.supervision_date > summary.dateRange.latest) {
                    summary.dateRange.latest = record.supervision_date;
                }
            }
            
            // Regions
            if (record.region) {
                summary.regions[record.region] = (summary.regions[record.region] || 0) + 1;
            }
            
            // Districts
            if (record.district) {
                summary.districts[record.district] = (summary.districts[record.district] || 0) + 1;
            }
            
            // Quality assessments
            this.countQuality(record.readiness_quality, summary.qualityAssessments.readiness);
            this.countQuality(record.clinical_quality, summary.qualityAssessments.clinical);
            this.countQuality(record.data_quality, summary.qualityAssessments.dataQuality);
            
            // Collect gaps from action plan
            for (let i = 1; i <= 3; i++) {
                const gap = record[`gap_${i}_description`];
                if (gap) {
                    gaps[gap] = (gaps[gap] || 0) + 1;
                }
            }
            
            // Collect SWOT
            for (let i = 1; i <= 3; i++) {
                const strength = record[`strength_${i}`];
                const weakness = record[`weakness_${i}`];
                if (strength) strengths[strength] = (strengths[strength] || 0) + 1;
                if (weakness) weaknesses[weakness] = (weaknesses[weakness] || 0) + 1;
            }
        });
        
        // Get top gaps, strengths, weaknesses
        summary.commonGaps = Object.entries(gaps)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([gap, count]) => ({ gap, count }));
            
        summary.strengths = Object.entries(strengths)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));
            
        summary.weaknesses = Object.entries(weaknesses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count }));
        
        return summary;
    },
    
    // Helper to count quality ratings
    countQuality: function(value, counter) {
        if (!value) return;
        const lower = value.toLowerCase();
        if (lower.includes('excellent')) counter.excellent++;
        else if (lower.includes('acceptable')) counter.acceptable++;
        else if (lower.includes('needs') || lower.includes('improvement')) counter.needsImprovement++;
    },
    
    // Call Claude API
    callClaudeAPI: async function(prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CONFIG.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API request failed');
        }
        
        const result = await response.json();
        return result.content[0].text;
    },
    
    // Show report modal
    show: function() {
        // Create modal if doesn't exist
        let modal = document.getElementById('reportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reportModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h2>GENERATE SUPERVISION REPORT</h2>
                        <button class="modal-close" onclick="Report.hide()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Report Options -->
                        <div id="reportOptions" class="report-options">
                            <div class="form-group">
                                <label>REPORT TYPE</label>
                                <select id="reportType" class="form-control">
                                    <option value="summary">Summary Report</option>
                                    <option value="regional">Regional Analysis</option>
                                    <option value="facility">Facility Analysis</option>
                                    <option value="trends">Trends Analysis</option>
                                    <option value="gaps">Gap Analysis</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>REGION (OPTIONAL)</label>
                                <select id="reportRegion" class="form-control">
                                    <option value="">All Regions</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>DATE RANGE (OPTIONAL)</label>
                                <div class="date-range">
                                    <input type="date" id="reportStartDate" class="form-control" placeholder="Start Date">
                                    <span>to</span>
                                    <input type="date" id="reportEndDate" class="form-control" placeholder="End Date">
                                </div>
                            </div>
                            
                            <button class="btn btn-primary btn-block" onclick="Report.generate()">
                                GENERATE REPORT
                            </button>
                        </div>
                        
                        <!-- Report Output -->
                        <div id="reportOutput" class="report-output" style="display: none;">
                            <div id="reportContent"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Report.showOptions()">NEW REPORT</button>
                        <button class="btn btn-secondary" onclick="Report.download()">DOWNLOAD</button>
                        <button class="btn btn-primary" onclick="Report.hide()">CLOSE</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Populate region dropdown
        this.populateRegions();
        
        // Show options, hide output
        document.getElementById('reportOptions').style.display = 'block';
        document.getElementById('reportOutput').style.display = 'none';
        
        modal.style.display = 'flex';
    },
    
    // Populate regions dropdown
    populateRegions: function() {
        const select = document.getElementById('reportRegion');
        if (!select) return;
        
        // Clear existing options except first
        select.innerHTML = '<option value="">All Regions</option>';
        
        // Get regions from cascading data if available
        if (typeof parseCascadingData === 'function') {
            const { regionDistrictMap } = parseCascadingData();
            Object.keys(regionDistrictMap).sort().forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                select.appendChild(option);
            });
        }
    },
    
    // Generate report
    generate: async function() {
        const reportType = document.getElementById('reportType').value;
        const region = document.getElementById('reportRegion').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        const filters = {};
        if (region) filters.region = region;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        // Show loading state
        document.getElementById('reportOptions').style.display = 'none';
        document.getElementById('reportOutput').style.display = 'block';
        document.getElementById('reportContent').innerHTML = `
            <div class="loading-spinner">
                <p>Generating report with Claude AI...</p>
                <p class="loading-note">This may take a moment.</p>
            </div>
        `;
        
        try {
            const report = await this.generateReport(reportType, filters);
            
            // Format and display report
            document.getElementById('reportContent').innerHTML = `
                <div class="report-header">
                    <h3>${this.getReportTitle(reportType)}</h3>
                    <p class="report-meta">
                        Generated: ${new Date().toLocaleString()}<br>
                        ${region ? `Region: ${region}` : 'All Regions'}
                        ${startDate ? ` | From: ${startDate}` : ''}
                        ${endDate ? ` | To: ${endDate}` : ''}
                    </p>
                </div>
                <div class="report-body">
                    ${this.formatReport(report)}
                </div>
            `;
            
        } catch (error) {
            document.getElementById('reportContent').innerHTML = `
                <div class="error-message">
                    <h3>Report Generation Failed</h3>
                    <p>${error.message}</p>
                    <p>Please check:</p>
                    <ul>
                        <li>Your Claude API key is configured correctly</li>
                        <li>Your Google Apps Script is deployed and accessible</li>
                        <li>You have supervision data in your Google Sheet</li>
                    </ul>
                </div>
            `;
        }
    },
    
    // Get report title
    getReportTitle: function(reportType) {
        const titles = {
            summary: 'Malaria Supervision Summary Report',
            regional: 'Regional Analysis Report',
            facility: 'Facility Performance Report',
            trends: 'Trends Analysis Report',
            gaps: 'Gap Analysis Report'
        };
        return titles[reportType] || 'Supervision Report';
    },
    
    // Format report content (convert markdown-like to HTML)
    formatReport: function(text) {
        if (!text) return '';
        
        return text
            // Headers
            .replace(/^### (.+)$/gm, '<h5>$1</h5>')
            .replace(/^## (.+)$/gm, '<h4>$1</h4>')
            .replace(/^# (.+)$/gm, '<h3>$1</h3>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            // Wrap in paragraph
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            // Fix list items
            .replace(/<\/p><li>/g, '<ul><li>')
            .replace(/<\/li><p>/g, '</li></ul><p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '');
    },
    
    // Show options (for new report)
    showOptions: function() {
        document.getElementById('reportOptions').style.display = 'block';
        document.getElementById('reportOutput').style.display = 'none';
    },
    
    // Download report
    download: function() {
        if (!this.currentReport) {
            showNotification('No report to download', 'warning');
            return;
        }
        
        const reportType = document.getElementById('reportType').value;
        const title = this.getReportTitle(reportType);
        const date = new Date().toISOString().split('T')[0];
        
        // Create text file
        const content = `${title}\nGenerated: ${new Date().toLocaleString()}\n\n${this.currentReport}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `supervision-report-${reportType}-${date}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Report downloaded', 'success');
    },
    
    // Hide report modal
    hide: function() {
        const modal = document.getElementById('reportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.Report = Report;
}
