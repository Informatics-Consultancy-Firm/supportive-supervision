// ============================================
// CONFIGURATION FILE
// Update these values with your actual credentials
// ============================================

const CONFIG = {
    // Google Apps Script Web App URL (for form submissions)
    SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL',
    
    // Google Sheet URL (for viewing data)
    GOOGLE_SHEET_URL: 'YOUR_GOOGLE_SHEET_URL',
    
    // Google Sheet ID (extracted from URL)
    // Example: If URL is https://docs.google.com/spreadsheets/d/ABC123/edit
    // Then SHEET_ID is ABC123
    SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
    
    // Sheet name where form data is stored
    SHEET_NAME: 'Submissions',
    
    // Claude API Key for report generation
    CLAUDE_API_KEY: 'YOUR_CLAUDE_API_KEY',
    
    // Login credentials
    LOGIN_USERNAME: 'admin',
    LOGIN_PASSWORD: 'admin'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
