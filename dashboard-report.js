// ============================================
// DASHBOARD & REPORT FUNCTIONS
// ============================================

// ============================================
// DASHBOARD
// ============================================
function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    const body = document.getElementById('dashboardBody');
    
    const submissions = state.submissions || [];
    
    if (submissions.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                <h3 style="color: #666; margin-bottom: 10px;">No Data Yet</h3>
                <p style="color: #999;">Complete and submit supervisions to see dashboard analytics</p>
            </div>
        `;
        modal.classList.add('show');
        return;
    }
    
    // Calculate statistics
    const stats = calculateStats(submissions);
    
    body.innerHTML = `
        <!-- Summary Cards -->
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h3>Total Supervisions</h3>
                <div class="value">${submissions.length}</div>
            </div>
            <div class="dashboard-card">
                <h3>Facilities Visited</h3>
                <div class="value">${stats.uniqueFacilities}</div>
            </div>
            <div class="dashboard-card">
                <h3>Districts Covered</h3>
                <div class="value">${stats.uniqueDistricts}</div>
            </div>
            <div class="dashboard-card">
                <h3>Avg Readiness Score</h3>
                <div class="value">${stats.avgReadinessScore}%</div>
                <div class="trend ${stats.avgReadinessScore >= 80 ? 'up' : 'down'}">
                    ${stats.avgReadinessScore >= 80 ? '✓ Good' : '⚠ Needs attention'}
                </div>
            </div>
        </div>
        
        <!-- Charts -->
        <div class="dashboard-grid">
            <div class="chart-container">
                <h3 class="chart-title">Quality Distribution - Readiness</h3>
                <canvas id="readinessChart" height="200"></canvas>
            </div>
            <div class="chart-container">
                <h3 class="chart-title">Quality Distribution - Clinical</h3>
                <canvas id="clinicalChart" height="200"></canvas>
            </div>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Supervisions by Region</h3>
            <canvas id="regionChart" height="150"></canvas>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Key Indicators Summary</h3>
            <canvas id="indicatorsChart" height="200"></canvas>
        </div>
        
        <!-- Recent Submissions Table -->
        <div class="chart-container">
            <h3 class="chart-title">Recent Supervisions</h3>
            <table class="data-table" style="margin-top: 15px;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Facility</th>
                        <th>District</th>
                        <th>Readiness</th>
                        <th>Clinical</th>
                    </tr>
                </thead>
                <tbody>
                    ${submissions.slice(-10).reverse().map(s => `
                        <tr>
                            <td>${formatDate(s.supervision_date || s.timestamp)}</td>
                            <td>${s.facility_name || '-'}</td>
                            <td>${s.district || '-'}</td>
                            <td><span style="color: ${getQualityColor(s.readiness_quality)}">${s.readiness_quality || '-'}</span></td>
                            <td><span style="color: ${getQualityColor(s.clinical_data_quality)}">${s.clinical_data_quality || '-'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Render charts after modal is shown
    setTimeout(() => {
        renderReadinessChart(stats);
        renderClinicalChart(stats);
        renderRegionChart(stats);
        renderIndicatorsChart(stats);
    }, 100);
}

function closeDashboard() {
    document.getElementById('dashboardModal').classList.remove('show');
}

function calculateStats(submissions) {
    const stats = {
        uniqueFacilities: new Set(submissions.map(s => s.facility_name).filter(Boolean)).size,
        uniqueDistricts: new Set(submissions.map(s => s.district).filter(Boolean)).size,
        avgReadinessScore: 0,
        readinessQuality: { Excellent: 0, Acceptable: 0, 'Needs Improvement': 0 },
        clinicalQuality: { Excellent: 0, Acceptable: 0, 'Needs Improvement': 0 },
        regionCounts: {},
        indicators: {
            guidelinesAvailable: 0,
            rdtsAvailable: 0,
            actsAvailable: 0,
            ivArtesunateAvailable: 0,
            oxygenAvailable: 0,
            dataUse: 0
        }
    };
    
    submissions.forEach(s => {
        // Quality counts
        if (s.readiness_quality) stats.readinessQuality[s.readiness_quality]++;
        if (s.clinical_data_quality) stats.clinicalQuality[s.clinical_data_quality]++;
        
        // Region counts
        if (s.region) {
            stats.regionCounts[s.region] = (stats.regionCounts[s.region] || 0) + 1;
        }
        
        // Indicator counts (Yes answers)
        if (s.guidelines_available === 'Yes') stats.indicators.guidelinesAvailable++;
        if (s.rdts_available === 'Yes') stats.indicators.rdtsAvailable++;
        if (s.acts_available === 'Yes') stats.indicators.actsAvailable++;
        if (s.iv_artesunate_available === 'Yes') stats.indicators.ivArtesunateAvailable++;
        if (s.oxygen_suction_available === 'Yes') stats.indicators.oxygenAvailable++;
        if (s.data_use === 'Yes') stats.indicators.dataUse++;
    });
    
    // Calculate average readiness score (based on quality ratings)
    const qualityScores = { Excellent: 100, Acceptable: 75, 'Needs Improvement': 50 };
    let totalScore = 0;
    let scoreCount = 0;
    
    Object.keys(stats.readinessQuality).forEach(q => {
        totalScore += stats.readinessQuality[q] * qualityScores[q];
        scoreCount += stats.readinessQuality[q];
    });
    
    stats.avgReadinessScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    
    return stats;
}

function renderReadinessChart(stats) {
    const ctx = document.getElementById('readinessChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Excellent', 'Acceptable', 'Needs Improvement'],
            datasets: [{
                data: [
                    stats.readinessQuality.Excellent,
                    stats.readinessQuality.Acceptable,
                    stats.readinessQuality['Needs Improvement']
                ],
                backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderClinicalChart(stats) {
    const ctx = document.getElementById('clinicalChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Excellent', 'Acceptable', 'Needs Improvement'],
            datasets: [{
                data: [
                    stats.clinicalQuality.Excellent,
                    stats.clinicalQuality.Acceptable,
                    stats.clinicalQuality['Needs Improvement']
                ],
                backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderRegionChart(stats) {
    const ctx = document.getElementById('regionChart');
    if (!ctx) return;
    
    const labels = Object.keys(stats.regionCounts);
    const data = Object.values(stats.regionCounts);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Supervisions',
                data: data,
                backgroundColor: '#1a5276'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderIndicatorsChart(stats) {
    const ctx = document.getElementById('indicatorsChart');
    if (!ctx) return;
    
    const total = state.submissions.length || 1;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Guidelines', 'RDTs', 'ACTs', 'IV Artesunate', 'Oxygen', 'Data Use'],
            datasets: [{
                label: '% Available',
                data: [
                    Math.round((stats.indicators.guidelinesAvailable / total) * 100),
                    Math.round((stats.indicators.rdtsAvailable / total) * 100),
                    Math.round((stats.indicators.actsAvailable / total) * 100),
                    Math.round((stats.indicators.ivArtesunateAvailable / total) * 100),
                    Math.round((stats.indicators.oxygenAvailable / total) * 100),
                    Math.round((stats.indicators.dataUse / total) * 100)
                ],
                backgroundColor: ['#3498db', '#3498db', '#3498db', '#e74c3c', '#e74c3c', '#27ae60']
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { 
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

function getQualityColor(quality) {
    const colors = {
        'Excellent': '#27ae60',
        'Acceptable': '#f39c12',
        'Needs Improvement': '#e74c3c'
    };
    return colors[quality] || '#666';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

// ============================================
// REPORT GENERATION
// ============================================
function openReportModal() {
    const modal = document.getElementById('reportModal');
    const select = document.getElementById('reportSubmissionSelect');
    
    // Populate submission dropdown
    select.innerHTML = '<option value="">Select a submission...</option>';
    
    (state.submissions || []).forEach((s, i) => {
        const label = `${s.facility_name || 'Unknown'} - ${formatDate(s.supervision_date || s.timestamp)}`;
        select.innerHTML += `<option value="${i}">${label}</option>`;
    });
    
    // Add option for all submissions
    if (state.submissions && state.submissions.length > 0) {
        select.innerHTML += `<option value="all">📊 Generate Summary Report (All Submissions)</option>`;
    }
    
    document.getElementById('reportContent').style.display = 'none';
    modal.classList.add('show');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('show');
}

async function generateReport() {
    const apiKey = document.getElementById('claudeApiKey').value.trim();
    const selectValue = document.getElementById('reportSubmissionSelect').value;
    
    if (!apiKey) {
        showNotification('Please enter your Claude API key', 'error');
        return;
    }
    
    if (!selectValue && selectValue !== '0') {
        showNotification('Please select a submission', 'error');
        return;
    }
    
    showNotification('Generating AI report...', 'info');
    
    let dataForReport;
    let reportType;
    
    if (selectValue === 'all') {
        dataForReport = state.submissions;
        reportType = 'summary';
    } else {
        dataForReport = state.submissions[parseInt(selectValue)];
        reportType = 'individual';
    }
    
    const prompt = reportType === 'summary' 
        ? generateSummaryPrompt(dataForReport)
        : generateIndividualPrompt(dataForReport);
    
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const reportText = data.content[0].text;
        
        document.getElementById('reportText').textContent = reportText;
        document.getElementById('reportContent').style.display = 'block';
        
        // Store for email/download
        state.currentReport = {
            text: reportText,
            type: reportType,
            generatedAt: new Date().toISOString()
        };
        
        showNotification('Report generated!', 'success');
        
    } catch (error) {
        console.error('Report error:', error);
        showNotification('Failed to generate report: ' + error.message, 'error');
    }
}

function generateIndividualPrompt(data) {
    return `You are a public health expert specializing in malaria control. Generate a comprehensive supervision report based on the following data from a health facility supervision visit.

SUPERVISION DATA:
${JSON.stringify(data, null, 2)}

Please generate a professional report with the following sections:

# MALARIA SUPPORTIVE SUPERVISION REPORT

## EXECUTIVE SUMMARY
Brief overview of the facility visited and key findings (2-3 sentences)

## FACILITY INFORMATION
- Facility Name, District, Region
- Date of Supervision
- Supervisors

## KEY FINDINGS

### Health Facility Readiness
Analyze the availability of essential resources (guidelines, RDTs, ACTs, IV Artesunate, etc.)
Quality Rating: [from data]

### Clinical Competency (Test & Treat)
Analyze adherence to T3 protocols
Quality Rating: [from data]

### Data Quality and Use
Analyze data completeness, accuracy, and usage
Quality Rating: [from data]

## GAPS IDENTIFIED
List key gaps found during supervision

## RECOMMENDATIONS
Specific, actionable recommendations

## ACTION PLAN SUMMARY
From the collaborative action plan in the data

## CONCLUSION
Overall assessment and next steps

Format the report professionally with clear headers and bullet points where appropriate.`;
}

function generateSummaryPrompt(data) {
    return `You are a public health expert specializing in malaria control. Generate a comprehensive summary report analyzing multiple supervision visits.

SUPERVISION DATA (${data.length} visits):
${JSON.stringify(data, null, 2)}

Please generate an analytical summary report:

# MALARIA SUPPORTIVE SUPERVISION - SUMMARY REPORT

## EXECUTIVE SUMMARY
Overview of all supervisions conducted, key trends, and critical findings

## COVERAGE STATISTICS
- Total supervisions conducted
- Districts covered
- Facilities visited
- Time period

## QUALITY ASSESSMENT OVERVIEW

### Health Facility Readiness
- % Excellent / Acceptable / Needs Improvement
- Common gaps in readiness
- Most critical supply issues

### Clinical Competency
- % Excellent / Acceptable / Needs Improvement
- Common protocol deviations
- Training needs identified

### Data Quality
- % Excellent / Acceptable / Needs Improvement
- Common data issues

## KEY FINDINGS BY INDICATOR
Analyze availability rates for:
- Guidelines
- RDTs
- ACTs
- IV Artesunate
- Oxygen/Suction
- Data Use practices

## SYSTEMIC ISSUES IDENTIFIED
Common systemic barriers found across facilities

## PRIORITY RECOMMENDATIONS
Top 5 priority actions based on the data

## CONCLUSION
Overall program performance and strategic recommendations

Format professionally with statistics and percentages where relevant.`;
}

function downloadReport() {
    if (!state.currentReport) {
        showNotification('No report to download', 'error');
        return;
    }
    
    const blob = new Blob([state.currentReport.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supervision_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report downloaded', 'success');
}

function emailReport() {
    document.getElementById('emailModal').classList.add('show');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('show');
}

function sendEmailNow() {
    const recipients = document.getElementById('emailRecipients').value.trim();
    const subject = document.getElementById('emailSubject').value.trim();
    
    if (!recipients) {
        showNotification('Please enter recipient email(s)', 'error');
        return;
    }
    
    if (!state.currentReport) {
        showNotification('No report to send', 'error');
        return;
    }
    
    // For client-side, use mailto
    const body = encodeURIComponent(state.currentReport.text);
    const mailtoLink = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${body}`;
    
    window.open(mailtoLink, '_blank');
    
    closeEmailModal();
    showNotification('Email client opened', 'success');
}
