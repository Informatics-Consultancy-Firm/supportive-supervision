// ============================================
// APP FUNCTIONS - Part 1: Initialization
// ============================================

// Initialize the application
function init() {
    // Parse cascading data
    state.cascading = parseCascadingData();
    
    // Load saved data from localStorage
    loadSavedData();
    
    // Check login status
    state.isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    
    if (state.isLoggedIn) {
        showMainContent();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Generate form sections
    generateFormSections();
    
    // Update online status
    updateOnlineStatus();
}

function loadSavedData() {
    try {
        const savedDrafts = localStorage.getItem('supervisionDrafts');
        if (savedDrafts) state.drafts = JSON.parse(savedDrafts);
        
        const savedPending = localStorage.getItem('supervisionPending');
        if (savedPending) state.pendingSubmissions = JSON.parse(savedPending);
        
        const savedSubmissions = localStorage.getItem('supervisionSubmissions');
        if (savedSubmissions) state.submissions = JSON.parse(savedSubmissions);
    } catch (e) {
        console.error('Error loading saved data:', e);
    }
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Control buttons
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
    document.getElementById('viewDataBtn').addEventListener('click', viewData);
    document.getElementById('viewDraftsBtn').addEventListener('click', openDraftsModal);
    document.getElementById('reportBtn').addEventListener('click', openReportModal);
    
    // Form submission
    document.getElementById('supervisionForm').addEventListener('submit', handleFormSubmit);
    
    // Online/offline events
    window.addEventListener('online', () => {
        state.isOnline = true;
        updateOnlineStatus();
        showNotification('Back online - Syncing data...', 'success');
        syncPendingSubmissions();
    });
    
    window.addEventListener('offline', () => {
        state.isOnline = false;
        updateOnlineStatus();
        showNotification('You are offline - Data will be saved locally', 'warning');
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// ============================================
// LOGIN / LOGOUT
// ============================================
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    if (username === CONFIG.LOGIN_USERNAME && password === CONFIG.LOGIN_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('username', username);
        state.isLoggedIn = true;
        errorDiv.classList.remove('show');
        showMainContent();
    } else {
        errorDiv.classList.add('show');
    }
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    state.isLoggedIn = false;
    document.getElementById('mainContent').classList.remove('show');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showMainContent() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').classList.add('show');
    updateOnlineStatus();
    updateCounts();
    
    if (state.isOnline && state.pendingSubmissions.length > 0) {
        syncPendingSubmissions();
    }
}

// ============================================
// FORM GENERATION
// ============================================
function generateFormSections() {
    const container = document.getElementById('formSections');
    let html = '';
    
    state.totalSections = FORM_SECTIONS.length;
    
    FORM_SECTIONS.forEach((section, index) => {
        const sectionNum = index + 1;
        const isActive = sectionNum === 1 ? 'active' : '';
        const isLast = index === FORM_SECTIONS.length - 1;
        
        html += `
            <div class="form-section ${isActive}" data-section="${sectionNum}">
                <div class="section-header">
                    <h2 class="section-title">${section.title}</h2>
                    <p class="section-description">${section.description}</p>
                </div>
                
                <div class="form-row">
                    ${generateFields(section.fields)}
                </div>
                
                <div class="navigation-buttons">
                    ${sectionNum > 1 ? '<button type="button" class="btn-nav btn-back" onclick="previousSection()">← Back</button>' : ''}
                    <button type="button" class="btn-nav btn-draft" onclick="saveDraft()">💾 Save Draft</button>
                    ${isLast ? 
                        '<button type="submit" class="btn-nav btn-submit">📤 Submit</button>' : 
                        '<button type="button" class="btn-nav btn-next" onclick="nextSection()">Next →</button>'
                    }
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateProgress();
    
    // Initialize cascading dropdowns
    setTimeout(() => {
        setupCascadingDropdowns();
        initializeSignaturePads();
    }, 100);
}

function generateFields(fields) {
    return fields.map(field => {
        let html = `<div class="form-group ${field.fullWidth ? 'full-width' : ''}">`;
        html += `<label class="form-label">${field.label} ${field.required ? '<span class="required">*</span>' : ''}</label>`;
        
        switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
                html += `<input type="${field.type}" class="form-input" name="${field.name}" 
                    ${field.required ? 'required' : ''} 
                    ${field.readonly ? 'readonly' : ''}
                    ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>`;
                break;
                
            case 'textarea':
                html += `<textarea class="form-textarea" name="${field.name}" ${field.required ? 'required' : ''}></textarea>`;
                break;
                
            case 'select':
                html += `<select class="form-select" name="${field.name}" ${field.required ? 'required' : ''}>
                    <option value="">Select...</option>
                    ${(field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>`;
                break;
                
            case 'cascading':
                html += generateCascadingSelect(field);
                break;
                
            case 'yesno':
                html += `
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="Yes" ${field.required ? 'required' : ''}>
                            <span>Yes</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="No">
                            <span>No</span>
                        </label>
                    </div>`;
                break;
                
            case 'yesnona':
                html += `
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="Yes" ${field.required ? 'required' : ''}>
                            <span>Yes</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="No">
                            <span>No</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="N/A">
                            <span>N/A</span>
                        </label>
                    </div>`;
                break;
                
            case 'compliant':
                html += `
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="Compliant" ${field.required ? 'required' : ''}>
                            <span>Compliant (1)</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="Non-Compliant">
                            <span>Non-Compliant (0)</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="N/A">
                            <span>N/A</span>
                        </label>
                    </div>`;
                break;
                
            case 'multiselect':
                html += `
                    <div class="checkbox-group">
                        ${(field.options || []).map(opt => `
                            <label class="checkbox-option">
                                <input type="checkbox" name="${field.name}" value="${opt}">
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>`;
                break;
                
            case 'quality':
                html += `
                    <div class="quality-buttons">
                        <button type="button" class="quality-btn excellent" data-field="${field.name}" data-value="Excellent">✓ Excellent (Pass)</button>
                        <button type="button" class="quality-btn acceptable" data-field="${field.name}" data-value="Acceptable">⚠ Acceptable (Conditional)</button>
                        <button type="button" class="quality-btn needs-improvement" data-field="${field.name}" data-value="Needs Improvement">✗ Needs Improvement (Fail)</button>
                    </div>
                    <input type="hidden" name="${field.name}" ${field.required ? 'required' : ''}>`;
                break;
                
            case 'signature':
                html += `
                    <div class="signature-container">
                        <canvas class="signature-canvas" id="${field.name}_canvas" data-field="${field.name}"></canvas>
                        <div class="signature-controls">
                            <button type="button" class="signature-btn" onclick="clearSignature('${field.name}')">Clear</button>
                        </div>
                    </div>
                    <input type="hidden" name="${field.name}">`;
                break;
                
            case 'gps':
                html += `
                    <div class="gps-container">
                        <div class="gps-status">
                            <div class="gps-icon" id="gps_icon"></div>
                            <div>
                                <div class="gps-info" id="gps_status">Click to capture GPS location</div>
                                <div class="gps-coords" id="gps_coords"></div>
                            </div>
                        </div>
                        <button type="button" class="gps-btn" onclick="captureGPS()">📍 Capture GPS</button>
                    </div>
                    <input type="hidden" name="gps_latitude" id="gps_latitude">
                    <input type="hidden" name="gps_longitude" id="gps_longitude">
                    <input type="hidden" name="gps_accuracy" id="gps_accuracy">`;
                break;
        }
        
        html += '</div>';
        return html;
    }).join('');
}

function generateCascadingSelect(field) {
    const { regionDistrictMap } = state.cascading;
    
    if (field.level === 1) {
        return `
            <select class="form-select" name="${field.name}" id="regionSelect" ${field.required ? 'required' : ''}>
                <option value="">Select Region...</option>
                ${Object.keys(regionDistrictMap).sort().map(r => `<option value="${r}">${r}</option>`).join('')}
            </select>`;
    } else if (field.level === 2) {
        return `<select class="form-select" name="${field.name}" id="districtSelect" disabled ${field.required ? 'required' : ''}>
            <option value="">Select Region first...</option>
        </select>`;
    } else if (field.level === 3) {
        return `<select class="form-select" name="${field.name}" id="chiefdomSelect" disabled ${field.required ? 'required' : ''}>
            <option value="">Select District first...</option>
        </select>`;
    } else if (field.level === 4) {
        return `<select class="form-select" name="${field.name}" id="phuSelect" disabled ${field.required ? 'required' : ''}>
            <option value="">Select Chiefdom first...</option>
        </select>`;
    }
    return '';
}

// ============================================
// CASCADING DROPDOWNS
// ============================================
function setupCascadingDropdowns() {
    const regionSelect = document.getElementById('regionSelect');
    const districtSelect = document.getElementById('districtSelect');
    const chiefdomSelect = document.getElementById('chiefdomSelect');
    const phuSelect = document.getElementById('phuSelect');
    
    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            const region = regionSelect.value;
            const { regionDistrictMap } = state.cascading;
            
            districtSelect.innerHTML = '<option value="">Select District...</option>';
            chiefdomSelect.innerHTML = '<option value="">Select District first...</option>';
            phuSelect.innerHTML = '<option value="">Select Chiefdom first...</option>';
            
            chiefdomSelect.disabled = true;
            phuSelect.disabled = true;
            
            if (region && regionDistrictMap[region]) {
                districtSelect.disabled = false;
                regionDistrictMap[region].sort().forEach(d => {
                    districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
                });
            } else {
                districtSelect.disabled = true;
            }
        });
    }
    
    if (districtSelect) {
        districtSelect.addEventListener('change', () => {
            const district = districtSelect.value;
            const { districtChiefdomMap } = state.cascading;
            
            chiefdomSelect.innerHTML = '<option value="">Select Chiefdom...</option>';
            phuSelect.innerHTML = '<option value="">Select Chiefdom first...</option>';
            phuSelect.disabled = true;
            
            if (district && districtChiefdomMap[district]) {
                chiefdomSelect.disabled = false;
                districtChiefdomMap[district].sort().forEach(c => {
                    chiefdomSelect.innerHTML += `<option value="${c}">${c}</option>`;
                });
            } else {
                chiefdomSelect.disabled = true;
            }
        });
    }
    
    if (chiefdomSelect) {
        chiefdomSelect.addEventListener('change', () => {
            const chiefdom = chiefdomSelect.value;
            const { chiefdomPHUMap } = state.cascading;
            
            phuSelect.innerHTML = '<option value="">Select PHU...</option>';
            
            if (chiefdom && chiefdomPHUMap[chiefdom]) {
                phuSelect.disabled = false;
                chiefdomPHUMap[chiefdom].sort().forEach(p => {
                    phuSelect.innerHTML += `<option value="${p}">${p}</option>`;
                });
            } else {
                phuSelect.disabled = true;
            }
        });
    }
    
    if (phuSelect) {
        phuSelect.addEventListener('change', () => {
            const phu = phuSelect.value;
            const chiefdom = chiefdomSelect.value;
            const { phuUIDMap } = state.cascading;
            
            const uidField = document.querySelector('[name="facility_uid"]');
            if (uidField && phu && chiefdom) {
                const uid = phuUIDMap[`${chiefdom}||${phu}`] || '';
                uidField.value = uid;
            }
        });
    }
    
    // Setup quality button listeners
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            const value = btn.dataset.value;
            
            // Remove selected from siblings
            btn.parentElement.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('selected'));
            
            // Add selected to clicked
            btn.classList.add('selected');
            
            // Update hidden input
            document.querySelector(`input[name="${field}"]`).value = value;
        });
    });
}

// ============================================
// SIGNATURE PADS
// ============================================
function initializeSignaturePads() {
    const canvases = document.querySelectorAll('.signature-canvas');
    
    canvases.forEach(canvas => {
        const fieldName = canvas.dataset.field;
        const container = canvas.parentElement;
        
        canvas.width = container.offsetWidth - 20;
        canvas.height = 120;
        
        const signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)'
        });
        
        state.signaturePads[fieldName] = signaturePad;
        
        signaturePad.addEventListener('endStroke', () => {
            const hidden = document.querySelector(`input[name="${fieldName}"]`);
            if (hidden) {
                hidden.value = signaturePad.toDataURL();
            }
        });
    });
}

function clearSignature(fieldName) {
    const pad = state.signaturePads[fieldName];
    if (pad) {
        pad.clear();
        const hidden = document.querySelector(`input[name="${fieldName}"]`);
        if (hidden) hidden.value = '';
    }
}

// ============================================
// GPS CAPTURE
// ============================================
function captureGPS() {
    const icon = document.getElementById('gps_icon');
    const status = document.getElementById('gps_status');
    const coords = document.getElementById('gps_coords');
    
    if (!navigator.geolocation) {
        showNotification('GPS not supported', 'error');
        return;
    }
    
    icon.className = 'gps-icon loading';
    status.textContent = 'Capturing GPS...';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            
            document.getElementById('gps_latitude').value = latitude;
            document.getElementById('gps_longitude').value = longitude;
            document.getElementById('gps_accuracy').value = accuracy;
            
            icon.className = 'gps-icon success';
            status.textContent = 'GPS captured successfully!';
            coords.textContent = `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`;
            
            state.gpsLocation = { latitude, longitude, accuracy };
            showNotification('GPS location captured', 'success');
        },
        (error) => {
            icon.className = 'gps-icon error';
            status.textContent = 'Failed to capture GPS';
            showNotification('GPS capture failed: ' + error.message, 'error');
        },
        { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 }
    );
}

// ============================================
// NAVIGATION
// ============================================
function nextSection() {
    if (state.currentSection < state.totalSections) {
        document.querySelector(`.form-section[data-section="${state.currentSection}"]`).classList.remove('active');
        state.currentSection++;
        document.querySelector(`.form-section[data-section="${state.currentSection}"]`).classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousSection() {
    if (state.currentSection > 1) {
        document.querySelector(`.form-section[data-section="${state.currentSection}"]`).classList.remove('active');
        state.currentSection--;
        document.querySelector(`.form-section[data-section="${state.currentSection}"]`).classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateProgress() {
    const progress = (state.currentSection / state.totalSections) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = `Section ${state.currentSection} of ${state.totalSections}`;
}

function updateOnlineStatus() {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (state.isOnline) {
        indicator.className = 'status-indicator online';
        text.textContent = 'Online';
    } else {
        indicator.className = 'status-indicator offline';
        text.textContent = 'Offline';
    }
}

function updateCounts() {
    document.getElementById('draftCount').textContent = state.drafts.length;
    document.getElementById('pendingCount').textContent = state.pendingSubmissions.length;
}

// ============================================
// FORM SUBMISSION
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        timestamp: new Date().toISOString(),
        submittedBy: sessionStorage.getItem('username') || 'admin'
    };
    
    for (const [key, value] of formData.entries()) {
        if (data[key]) {
            // Handle multiple values (checkboxes)
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    // Convert arrays to comma-separated strings
    Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
            data[key] = data[key].join(', ');
        }
    });
    
    if (state.isOnline) {
        await submitToServer(data);
    } else {
        saveOffline(data);
    }
}

async function submitToServer(data) {
    showNotification('Submitting...', 'info');
    
    try {
        // Save to local storage first
        state.submissions.push(data);
        localStorage.setItem('supervisionSubmissions', JSON.stringify(state.submissions));
        
        // Try to submit to Google Sheets
        if (CONFIG.SCRIPT_URL && CONFIG.SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
            await fetch(CONFIG.SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        // Remove from drafts if it was a draft
        if (state.currentDraftId) {
            state.drafts = state.drafts.filter(d => d.draftId !== state.currentDraftId);
            localStorage.setItem('supervisionDrafts', JSON.stringify(state.drafts));
        }
        
        showNotification('Submission successful!', 'success');
        clearForm();
        updateCounts();
        
    } catch (error) {
        console.error('Submit error:', error);
        saveOffline(data);
    }
}

function saveOffline(data) {
    state.pendingSubmissions.push(data);
    localStorage.setItem('supervisionPending', JSON.stringify(state.pendingSubmissions));
    
    // Also save to submissions for reporting
    state.submissions.push(data);
    localStorage.setItem('supervisionSubmissions', JSON.stringify(state.submissions));
    
    updateCounts();
    showNotification('Saved offline - Will sync when online', 'warning');
    clearForm();
}

async function syncPendingSubmissions() {
    if (state.pendingSubmissions.length === 0) return;
    
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        return;
    }
    
    const successful = [];
    
    for (let i = 0; i < state.pendingSubmissions.length; i++) {
        try {
            await fetch(CONFIG.SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.pendingSubmissions[i])
            });
            successful.push(i);
        } catch (e) {
            console.error('Sync error:', e);
        }
    }
    
    if (successful.length > 0) {
        state.pendingSubmissions = state.pendingSubmissions.filter((_, i) => !successful.includes(i));
        localStorage.setItem('supervisionPending', JSON.stringify(state.pendingSubmissions));
        updateCounts();
        showNotification(`Synced ${successful.length} submission(s)`, 'success');
    }
}

// ============================================
// DRAFTS
// ============================================
function saveDraft() {
    const formData = new FormData(document.getElementById('supervisionForm'));
    
    const draft = {
        draftId: state.currentDraftId || 'draft_' + Date.now(),
        savedAt: new Date().toISOString(),
        currentSection: state.currentSection
    };
    
    for (const [key, value] of formData.entries()) {
        draft[key] = value;
    }
    
    // Save signatures
    Object.keys(state.signaturePads).forEach(name => {
        const pad = state.signaturePads[name];
        if (pad && !pad.isEmpty()) {
            draft[name] = pad.toDataURL();
        }
    });
    
    // Update or add draft
    const existingIndex = state.drafts.findIndex(d => d.draftId === draft.draftId);
    if (existingIndex >= 0) {
        state.drafts[existingIndex] = draft;
    } else {
        state.drafts.push(draft);
    }
    
    localStorage.setItem('supervisionDrafts', JSON.stringify(state.drafts));
    state.currentDraftId = draft.draftId;
    
    updateCounts();
    showNotification('Draft saved!', 'success');
}

function openDraftsModal() {
    const modal = document.getElementById('draftsModal');
    const body = document.getElementById('draftsModalBody');
    
    if (state.drafts.length === 0) {
        body.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No saved drafts</p>';
    } else {
        body.innerHTML = state.drafts.map(d => `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #ddd;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${d.facility_name || 'Unnamed Facility'}</strong>
                        <div style="font-size: 12px; color: #666;">${new Date(d.savedAt).toLocaleString()}</div>
                    </div>
                    <div>
                        <button class="control-btn primary" onclick="loadDraft('${d.draftId}')" style="padding: 8px 16px; font-size: 12px;">Load</button>
                        <button class="control-btn danger" onclick="deleteDraft('${d.draftId}')" style="padding: 8px 16px; font-size: 12px;">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    modal.classList.add('show');
}

function closeDraftsModal() {
    document.getElementById('draftsModal').classList.remove('show');
}

function loadDraft(draftId) {
    const draft = state.drafts.find(d => d.draftId === draftId);
    if (!draft) return;
    
    state.currentDraftId = draftId;
    
    // Populate form fields
    Object.keys(draft).forEach(key => {
        if (['draftId', 'savedAt', 'currentSection'].includes(key)) return;
        
        const field = document.querySelector(`[name="${key}"]`);
        if (field) {
            if (field.type === 'radio') {
                const radio = document.querySelector(`[name="${key}"][value="${draft[key]}"]`);
                if (radio) radio.checked = true;
            } else if (field.type === 'checkbox') {
                // Handle multi-select
                const values = draft[key].split(', ');
                document.querySelectorAll(`[name="${key}"]`).forEach(cb => {
                    cb.checked = values.includes(cb.value);
                });
            } else if (field.type === 'hidden' && key.includes('signature')) {
                // Handle signatures
                const canvas = document.getElementById(`${key}_canvas`);
                if (canvas && draft[key]) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = draft[key];
                    field.value = draft[key];
                }
            } else {
                field.value = draft[key];
            }
        }
    });
    
    // Handle quality buttons
    document.querySelectorAll('.quality-btn').forEach(btn => {
        const fieldName = btn.dataset.field;
        const hiddenInput = document.querySelector(`input[name="${fieldName}"]`);
        if (hiddenInput && hiddenInput.value === btn.dataset.value) {
            btn.classList.add('selected');
        }
    });
    
    // Navigate to saved section
    if (draft.currentSection) {
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        state.currentSection = draft.currentSection;
        document.querySelector(`.form-section[data-section="${draft.currentSection}"]`).classList.add('active');
        updateProgress();
    }
    
    // Trigger cascading dropdowns
    setTimeout(() => {
        const regionSelect = document.getElementById('regionSelect');
        if (regionSelect && draft.region) {
            regionSelect.value = draft.region;
            regionSelect.dispatchEvent(new Event('change'));
            
            setTimeout(() => {
                const districtSelect = document.getElementById('districtSelect');
                if (districtSelect && draft.district) {
                    districtSelect.value = draft.district;
                    districtSelect.dispatchEvent(new Event('change'));
                    
                    setTimeout(() => {
                        const chiefdomSelect = document.getElementById('chiefdomSelect');
                        if (chiefdomSelect && draft.chiefdom) {
                            chiefdomSelect.value = draft.chiefdom;
                            chiefdomSelect.dispatchEvent(new Event('change'));
                            
                            setTimeout(() => {
                                const phuSelect = document.getElementById('phuSelect');
                                if (phuSelect && draft.facility_name) {
                                    phuSelect.value = draft.facility_name;
                                    phuSelect.dispatchEvent(new Event('change'));
                                }
                            }, 100);
                        }
                    }, 100);
                }
            }, 100);
        }
    }, 100);
    
    closeDraftsModal();
    showNotification('Draft loaded', 'success');
}

function deleteDraft(draftId) {
    if (!confirm('Delete this draft?')) return;
    
    state.drafts = state.drafts.filter(d => d.draftId !== draftId);
    localStorage.setItem('supervisionDrafts', JSON.stringify(state.drafts));
    
    if (state.currentDraftId === draftId) {
        state.currentDraftId = null;
    }
    
    updateCounts();
    openDraftsModal();
    showNotification('Draft deleted', 'info');
}

function clearForm() {
    document.getElementById('supervisionForm').reset();
    
    // Clear signatures
    Object.keys(state.signaturePads).forEach(name => {
        clearSignature(name);
    });
    
    // Clear quality selections
    document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('selected'));
    
    // Reset GPS
    document.getElementById('gps_icon').className = 'gps-icon';
    document.getElementById('gps_status').textContent = 'Click to capture GPS location';
    document.getElementById('gps_coords').textContent = '';
    
    // Reset cascading
    const districtSelect = document.getElementById('districtSelect');
    const chiefdomSelect = document.getElementById('chiefdomSelect');
    const phuSelect = document.getElementById('phuSelect');
    
    if (districtSelect) {
        districtSelect.innerHTML = '<option value="">Select Region first...</option>';
        districtSelect.disabled = true;
    }
    if (chiefdomSelect) {
        chiefdomSelect.innerHTML = '<option value="">Select District first...</option>';
        chiefdomSelect.disabled = true;
    }
    if (phuSelect) {
        phuSelect.innerHTML = '<option value="">Select Chiefdom first...</option>';
        phuSelect.disabled = true;
    }
    
    state.currentDraftId = null;
    state.currentSection = 1;
    
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.form-section[data-section="1"]').classList.add('active');
    updateProgress();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// VIEW DATA
// ============================================
function viewData() {
    if (CONFIG.GOOGLE_SHEET_URL && CONFIG.GOOGLE_SHEET_URL !== 'YOUR_GOOGLE_SHEET_URL_HERE') {
        window.open(CONFIG.GOOGLE_SHEET_URL, '_blank');
    } else {
        // Show local data in modal
        showNotification('Configure Google Sheet URL to view online data', 'info');
    }
}

// ============================================
// NOTIFICATIONS
// ============================================
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    notification.className = `notification ${type} show`;
    text.textContent = message;
    
    setTimeout(() => notification.classList.remove('show'), 4000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
