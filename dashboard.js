// ============================================
// DASHBOARD MODULE
// Fetches and displays supervision data from Google Sheets
// ============================================

const Dashboard = {
    // Dashboard state
    data: [],
    isLoading: false,
    
    // Initialize dashboard
    init: function() {
        console.log('Dashboard module initialized');
    },
    
    // Fetch data from Google Sheets using Apps Script
    fetchData: async function() {
        this.isLoading = true;
        
        try {
            // Option 1: Fetch via Google Apps Script endpoint
            const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getData`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            const result = await response.json();
            this.data = result.data || [];
            this.isLoading = false;
            return this.data;
            
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            this.isLoading = false;
            throw error;
        }
    },
    
    // Calculate summary statistics
    calculateStats: function() {
        if (!this.data || this.data.length === 0) {
            return {
                totalSupervisions: 0,
                facilitiesVisited: 0,
                avgReadinessScore: 0,
                avgClinicalScore: 0,
                avgDataQualityScore: 0,
                byRegion: {},
                byDistrict: {},
                byMonth: {},
                qualityBreakdown: {
                    excellent: 0,
                    acceptable: 0,
                    needsImprovement: 0
                }
            };
        }
        
        const stats = {
            totalSupervisions: this.data.length,
            facilitiesVisited: new Set(this.data.map(d => d.facility_phu)).size,
            avgReadinessScore: 0,
            avgClinicalScore: 0,
            avgDataQualityScore: 0,
            byRegion: {},
            byDistrict: {},
            byMonth: {},
            qualityBreakdown: {
                excellent: 0,
                acceptable: 0,
                needsImprovement: 0
            }
        };
        
        // Process each record
        this.data.forEach(record => {
            // Count by region
            const region = record.region || 'Unknown';
            stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
            
            // Count by district
            const district = record.district || 'Unknown';
            stats.byDistrict[district] = (stats.byDistrict[district] || 0) + 1;
            
            // Count by month
            if (record.supervision_date) {
                const month = record.supervision_date.substring(0, 7); // YYYY-MM
                stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
            }
            
            // Quality breakdown
            const readiness = record.readiness_quality || '';
            if (readiness.toLowerCase().includes('excellent')) {
                stats.qualityBreakdown.excellent++;
            } else if (readiness.toLowerCase().includes('acceptable')) {
                stats.qualityBreakdown.acceptable++;
            } else if (readiness.toLowerCase().includes('needs')) {
                stats.qualityBreakdown.needsImprovement++;
            }
        });
        
        return stats;
    },
    
    // Generate HTML for dashboard modal
    generateDashboardHTML: function() {
        const stats = this.calculateStats();
        
        return `
            <div class="dashboard-container">
                <!-- Summary Cards -->
                <div class="dashboard-summary">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalSupervisions}</div>
                        <div class="stat-label">Total Supervisions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.facilitiesVisited}</div>
                        <div class="stat-label">Facilities Visited</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.qualityBreakdown.excellent}</div>
                        <div class="stat-label">Excellent Ratings</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.qualityBreakdown.needsImprovement}</div>
                        <div class="stat-label">Needs Improvement</div>
                    </div>
                </div>
                
                <!-- Regional Breakdown -->
                <div class="dashboard-section">
                    <h3>Supervisions by Region</h3>
                    <div class="region-bars">
                        ${Object.entries(stats.byRegion).map(([region, count]) => `
                            <div class="bar-row">
                                <span class="bar-label">${region}</span>
                                <div class="bar-container">
                                    <div class="bar-fill" style="width: ${(count / stats.totalSupervisions * 100) || 0}%"></div>
                                </div>
                                <span class="bar-value">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- District Breakdown -->
                <div class="dashboard-section">
                    <h3>Supervisions by District</h3>
                    <div class="district-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>District</th>
                                    <th>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(stats.byDistrict)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 10)
                                    .map(([district, count]) => `
                                        <tr>
                                            <td>${district}</td>
                                            <td>${count}</td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Quality Breakdown -->
                <div class="dashboard-section">
                    <h3>Quality Assessment</h3>
                    <div class="quality-chart">
                        <div class="quality-bar excellent" style="flex: ${stats.qualityBreakdown.excellent}">
                            ${stats.qualityBreakdown.excellent > 0 ? `Excellent (${stats.qualityBreakdown.excellent})` : ''}
                        </div>
                        <div class="quality-bar acceptable" style="flex: ${stats.qualityBreakdown.acceptable}">
                            ${stats.qualityBreakdown.acceptable > 0 ? `Acceptable (${stats.qualityBreakdown.acceptable})` : ''}
                        </div>
                        <div class="quality-bar needs-improvement" style="flex: ${stats.qualityBreakdown.needsImprovement}">
                            ${stats.qualityBreakdown.needsImprovement > 0 ? `Needs Improvement (${stats.qualityBreakdown.needsImprovement})` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Recent Supervisions -->
                <div class="dashboard-section">
                    <h3>Recent Supervisions</h3>
                    <div class="recent-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Facility</th>
                                    <th>District</th>
                                    <th>Quality</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.data
                                    .sort((a, b) => new Date(b.supervision_date) - new Date(a.supervision_date))
                                    .slice(0, 10)
                                    .map(record => `
                                        <tr>
                                            <td>${record.supervision_date || '-'}</td>
                                            <td>${record.facility_phu || '-'}</td>
                                            <td>${record.district || '-'}</td>
                                            <td>${record.readiness_quality || '-'}</td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Show dashboard modal
    show: async function() {
        // Create modal if doesn't exist
        let modal = document.getElementById('dashboardModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dashboardModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h2>SUPERVISION DASHBOARD</h2>
                        <button class="modal-close" onclick="Dashboard.hide()">&times;</button>
                    </div>
                    <div class="modal-body" id="dashboardContent">
                        <div class="loading-spinner">Loading data...</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Dashboard.refresh()">REFRESH DATA</button>
                        <button class="btn btn-primary" onclick="Dashboard.hide()">CLOSE</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
        
        // Fetch and display data
        try {
            await this.fetchData();
            document.getElementById('dashboardContent').innerHTML = this.generateDashboardHTML();
        } catch (error) {
            document.getElementById('dashboardContent').innerHTML = `
                <div class="error-message">
                    <p>Failed to load dashboard data.</p>
                    <p>Error: ${error.message}</p>
                    <p>Make sure your Google Apps Script is configured correctly.</p>
                </div>
            `;
        }
    },
    
    // Hide dashboard modal
    hide: function() {
        const modal = document.getElementById('dashboardModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Refresh dashboard data
    refresh: async function() {
        document.getElementById('dashboardContent').innerHTML = '<div class="loading-spinner">Refreshing data...</div>';
        await this.show();
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
}
