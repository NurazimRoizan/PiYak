// --- CONFIGURATION ---
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK9fqXn-Mhw9u7FwI4PA4A3qj5t6D9qjVo07PZw1GD5FL47cyFyljhXFoWys9QNrVD1w/exec';
let DEFAULT_USER_ID = null;
const USER_ID_STORAGE_KEY = 'calendarUserId';

// --- NEW MODE VARIABLES ---
let currentAppMode = 'counter'; // 'counter' or 'period'
const MODE_STORAGE_KEY = 'appMode';
const PERIOD_SETTINGS_KEY = 'periodSettings';
const PARTNER_ID_STORAGE_KEY = 'partnerUserId';
let PARTNER_ID = localStorage.getItem(PARTNER_ID_STORAGE_KEY) || null;
let isPartnerView = false;

// --- NEW PERIOD SETTINGS ---
// Default values will be loaded/overwritten by local storage
let periodSettings = {
    periodLength: 13,
    cycleLength: 60,
};
let periodStartDate = null; // Last recorded start date

// --- JSONP GLOBAL CALLBACK SETUP ---
// This function will be called by the Apps Script once the data is ready.
let resolveJsonpPromise;
let rejectJsonpPromise;

window.handleRetrievedData = function (data) {
    if (resolveJsonpPromise) {
        if (data.error) {
            rejectJsonpPromise(new Error(data.error));
        } else {
            // NEW PARSING LOGIC: Split the data into two dictionaries
            const parsedCounters = {};
            const parsedStatuses = {};

            for (const [dateKey, combinedValue] of Object.entries(data.dailyCounters)) {
                if (typeof combinedValue === 'string' && combinedValue.includes('|')) {
                    const parts = combinedValue.split('|');
                    const countPart = parts[0].trim();
                    const statusPart = parts[1].trim();

                    // Parse Counter: Convert to number if non-empty, otherwise 0
                    parsedCounters[dateKey] = countPart ? parseInt(countPart) : 0;

                    // Parse Status: Store if non-empty
                    if (statusPart) {
                        parsedStatuses[dateKey] = statusPart;
                    }
                } else if (!isNaN(Number(combinedValue))) {
                    // Handle old data format (only counter)
                    parsedCounters[dateKey] = parseInt(combinedValue);
                } else {
                    // Handle old data format (only period status, if possible)
                    parsedStatuses[dateKey] = combinedValue;
                }
            }

            resolveJsonpPromise({
                counts: parsedCounters,
                statuses: parsedStatuses
            });
        }
    }
    const scriptTag = document.getElementById('jsonpScript');
    if (scriptTag) {
        scriptTag.remove();
    }
};

// Helper function to convert a JS object into URL-encoded form data (for POST)
function encodeFormData(data) {
    return Object.keys(data).map(key =>
        encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
    ).join('&');
}

// --- CALENDAR DATA & STATE ---
const today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let dailyCounters = {}; // Now only stores the Period Status (e.g., 'start', 'predicted_ovulation')
let dailyCounts = {};   // NEW: Will store the numerical Counter values (e.g., 5)
// ... existing variables ...

// --- DOM ELEMENTS ---
const userIdInputSection = document.getElementById('userIdInputSection');
const userIdInput = document.getElementById('userIdInput');
const saveUserIdBtn = document.getElementById('saveUserIdBtn');
//const currentUserDisplay = document.getElementById('currentUserDisplay');
const resetUserIdBtn = document.getElementById('resetUserIdBtn');
const monthYearDisplay = document.getElementById('monthYearDisplay');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const button1 = document.getElementById('button1');
const button2 = document.getElementById('button2');
const button3 = document.getElementById('button3');
let selectedDate = null;
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const loadingOverlay = document.getElementById('loadingOverlay');

// --- NEW DOM ELEMENTS ---
const toggleModeBtn = document.getElementById('toggleModeBtn');
const currentModeDisplay = document.getElementById('currentModeDisplay');
const periodSetupModal = document.getElementById('periodSetupModal');
const periodLengthInput = document.getElementById('periodLength');
const cycleLengthInput = document.getElementById('cycleLength');
const savePeriodSettingsBtn = document.getElementById('savePeriodSettingsBtn');
const todayDate = document.getElementById('date-display');
const todayWeekDay = document.getElementById('weekDay-display');
const loginStatusText = document.getElementById('loginStatusText');
const loginStatus = document.getElementById('loginStatus');
const statusBar = document.getElementById('status-bar');
const resetPeriodSettingsBtn = document.getElementById('resetPeriodSettingsBtn');
const partnerLink = document.getElementById('partnerLink');
const partnerSetupModal = document.getElementById('partnerSetupModal');
const partnerIdInput = document.getElementById('partnerIdInput');
const savePartnerIdBtn = document.getElementById('savePartnerIdBtn');
const cancelPartnerSetupBtn = document.getElementById('cancelPartnerSetupBtn');
// Format the date into a readable string (e.g., "Wednesday, November 5, 2025")
// This method automatically handles locale formatting for a clean display.
const formattedDate = today.toLocaleDateString('en-GB', {
    month: 'long',
    day: 'numeric'
});
todayDate.textContent = formattedDate;
todayWeekDay.textContent = (today.toLocaleDateString('en-GB', { weekday: 'long' }));

// ------- Period FUnctions --------
// Function to load settings from Local Storage
function loadPeriodSettings() {
    const savedSettings = localStorage.getItem(PERIOD_SETTINGS_KEY);
    if (savedSettings) {
        periodSettings = JSON.parse(savedSettings);
        // Also load the last recorded start date from dailyCounters if available
        const dates = Object.keys(dailyCounters).filter(key => dailyCounters[key] === 'start').sort();
        periodStartDate = dates.length > 0 ? dates[dates.length - 1] : null;
    }
}

// Function to calculate predicted period dates
// Function to calculate predicted period dates
function getPeriodStatus(dateKey) {
    if (!periodStartDate) return null;

    // --- NEW: Check for Existing Status in Sheet Data (dailyCounters) ---
    const sheetStatus = dailyCounters[dateKey];
    if (sheetStatus) {
        // If any status ('start', 'end', 'flow', 'predicted_ovulation', etc.) is found,
        // we use that status for coloring and stop further prediction calculation.
        return sheetStatus;
    }

    const startDate = new Date(periodStartDate + 'T00:00:00');
    const currentDate = new Date(dateKey + 'T00:00:00');
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    // Days elapsed since the last recorded period start
    const timeDiff = currentDate.getTime() - startDate.getTime();
    const daysSinceStart = Math.round(timeDiff / MS_PER_DAY);

    // --- NEW: Boundary Check ---
    // If the current date is after the start of the next expected cycle,
    // we stop showing predictions to avoid repetition.
    if (daysSinceStart >= periodSettings.cycleLength) {
        // If outside the prediction window, only return recorded period data
        if (['start', 'end', 'flow'].includes(dailyCounters[dateKey])) {
            return dailyCounters[dateKey]; // Return the actual recorded status
        }
        return null; // Stop further prediction display/logging
    }
    // ---------------------------

    // Days into the current cycle (0-indexed cycle day, 0 being the start day)
    const cycleDay = (daysSinceStart % periodSettings.cycleLength + periodSettings.cycleLength) % periodSettings.cycleLength;

    if (daysSinceStart >= 0) {
        // 1. Current Period (If date is within the recorded period duration)
        // if (['start', 'end', 'flow'].includes(dailyCounters[dateKey])) {
        //      return dailyCounters[dateKey]; 
        // }

        // 2. Predicted Ovulation (Cycle day 14 is a common average, adjusted for cycle length)
        const ovulationDay = periodSettings.cycleLength - 14;
        if (cycleDay === ovulationDay) {
            return 'predicted_ovulation';
        }

        // 3. Fertile Window (e.g., 5 days before ovulation)
        if (cycleDay >= ovulationDay - 5 && cycleDay < ovulationDay) {
            return 'fertile_window';
        }

        // 4. Predicted Next Period (Prediction only applies if it hasn't been recorded yet)
        if (cycleDay < periodSettings.periodLength) {
            // This is the prediction of the NEXT period, which starts on day 0 of the cycle.
            // Since we've already checked for current_period above, this is the prediction.
            return 'predicted_period';
        }
    }

    return null; // Regular cycle day
}

// --- NEW MODE SWITCHING LOGIC ---

function switchAppMode(newMode) {
    const calendarContainer = document.getElementById('calendarGrid'); // Get the grid element

    if (newMode === 'period' && !localStorage.getItem(PERIOD_SETTINGS_KEY)) {
        // If switching to Period mode for the first time, show setup modal
        periodSetupModal.style.display = 'block';
        return;
    }

    currentAppMode = newMode;
    localStorage.setItem(MODE_STORAGE_KEY, newMode);

    if (newMode === 'period') {
        currentModeDisplay.textContent = 'Period';
        toggleModeBtn.textContent = 'Switch to Poopie Tracker';
        button1.textContent = 'Mark Start Date 🩸';
        button2.textContent = 'Mark End Date ✅';
        button3.textContent = 'Clear Marking 🗑️';
        button3.style.display = 'inline-block'; // Show the new button
        statusBar.style.display = 'block';
        resetPeriodSettingsBtn.style.display = 'inline-block';

        // CRITICAL: Add class to calendar grid
        calendarContainer.classList.add('period-mode');
        // Ensure period settings are loaded before rendering
        loadPeriodSettings();
    } else {
        currentModeDisplay.textContent = 'Poopie';
        toggleModeBtn.textContent = 'Switch to Period Tracker';
        button1.textContent = 'I Pooped!';
        button2.textContent = 'Just kidding I no poop';
        button3.style.display = 'none'; // Hide the period-specific button
        statusBar.style.display = 'block';
        updatePoopStatus(); // Initialize correct message
        // CRITICAL: Remove class from calendar grid
        resetPeriodSettingsBtn.style.display = 'none';

        calendarContainer.classList.remove('period-mode');
    }

    // Re-render the calendar to apply new styles
    renderCalendar(currentMonth, currentYear);
}

// Event listener for the mode toggle button
toggleModeBtn.addEventListener('click', () => {
    const newMode = currentAppMode === 'counter' ? 'period' : 'counter';
    switchAppMode(newMode);
});

// Event listener for saving period settings
savePeriodSettingsBtn.addEventListener('click', () => {
    const pLen = parseInt(periodLengthInput.value);
    const cLen = parseInt(cycleLengthInput.value);

    if (pLen >= 3 && cLen >= 20) {
        periodSettings.periodLength = pLen;
        periodSettings.cycleLength = cLen;
        localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(periodSettings));
        periodSetupModal.style.display = 'none';
        switchAppMode('period'); // Finalize switch
    } else {
        alert("Please enter valid lengths (Period >= 3, Cycle >= 20).");
    }
});

// New function to mark all days between start and end as 'flow'
function fillPeriodFlow(startDateKey, endDateKey) {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');

    // Make sure we update the start day status from 'start' to 'flow' for consistent rendering
    // We update this *after* the initial submission when fillPeriodFlow is called.
    // NOTE: We keep 'start' and 'end' for data submission but rely on 'flow' for color fill.

    // Iterate day by day
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Format date back to YYYY-MM-DD key
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Only mark as flow if it's not the actual 'start' or 'end' day
        if (dateKey === startDateKey) {
            dailyCounters[dateKey] = 'start'; // Re-set to start
        } else if (dateKey === endDateKey) {
            dailyCounters[dateKey] = 'end'; // Re-set to end
        } else {
            dailyCounters[dateKey] = 'flow'; // Mark in between days as flow
        }

        // Submit the 'flow' data back to the sheet to save the marked day
        submitFlowData(dateKey, dailyCounters[dateKey]);
    }

    // After marking all days and submitting, re-render the calendar
    renderCalendar(currentMonth, currentYear);
}

// Helper to submit flow/start/end data silently to the sheet

// --- NEW FUNCTION: Calculate Days Until Next Ovulation ---
// --- UPDATED FUNCTION: Calculate Next Prediction Status ---
function calculateNextOvulation() {
    if (isPartnerView) {
        statusBar.textContent = "Viewing Partner's Calendar (Read Only)";
        return;
    }
    if (!periodStartDate || currentAppMode !== 'period') {
        statusBar.textContent = "Prediction Status: Awaiting Start Date...";
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const cycleLength = periodSettings.cycleLength;
    const periodLength = periodSettings.periodLength;
    const ovulationDayOffset = cycleLength - 14; // Day index for Ovulation
    const periodStartOffset = 0; // Day index for Next Period Start

    // 1. Find the start of the current cycle (or the last recorded cycle)
    let startDateObj = new Date(periodStartDate + 'T00:00:00');
    startDateObj.setHours(0, 0, 0, 0);

    // Advance the cycle start date until it's the start of the current/next cycle (relative to today).
    while (startDateObj.getTime() < today.getTime()) {
        startDateObj.setDate(startDateObj.getDate() + cycleLength);
    }

    // ----------------------------------------------------
    // --- STEP 1: Check Next Predicted OVULATION ---
    // ----------------------------------------------------
    let nextOvulationDate = new Date(startDateObj);

    // If the start date is in the future, roll back one cycle length to find the start of the current cycle
    if (nextOvulationDate.getTime() > today.getTime()) {
        nextOvulationDate.setDate(nextOvulationDate.getDate() - cycleLength);
    }

    // Add the ovulation offset to the closest past/current cycle start
    nextOvulationDate.setDate(nextOvulationDate.getDate() + ovulationDayOffset);

    // If the calculated ovulation day is in the past, advance to the next cycle's ovulation
    while (nextOvulationDate.getTime() < today.getTime()) {
        nextOvulationDate.setDate(nextOvulationDate.getDate() + cycleLength);
    }

    const daysUntilOvulation = Math.ceil((nextOvulationDate.getTime() - today.getTime()) / MS_PER_DAY);

    // Check if ovulation is today or in the future
    if (daysUntilOvulation >= 0) {
        if (daysUntilOvulation === 0) {
            statusBar.textContent = `🎉 Ovulation is TODAY!`;
        } else {
            statusBar.textContent = `Next Ovulation in ${daysUntilOvulation} days.`;
        }
        return; // Exit if a future ovulation date is found
    }

    // ----------------------------------------------------
    // --- STEP 2: Check Next Predicted PERIOD ---
    // ----------------------------------------------------
    // If ovulation is in the past, calculate the next period start

    // Roll back startDateObj by one cycle to get the start of the cycle that contains today
    startDateObj.setDate(startDateObj.getDate() - cycleLength);

    // The next predicted period starts at the beginning of the *next* cycle
    let nextPeriodDate = new Date(startDateObj);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength + periodStartOffset);

    // Ensure we are checking the future period
    while (nextPeriodDate.getTime() < today.getTime()) {
        nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
    }

    const daysUntilPeriod = Math.ceil((nextPeriodDate.getTime() - today.getTime()) / MS_PER_DAY);

    // Check if period start is today or in the future
    if (daysUntilPeriod >= 0) {
        if (daysUntilPeriod === 0) {
            statusBar.textContent = `🩸 Period is TODAY (Predicted)!`;
        } else {
            statusBar.textContent = `Next Predicted Period in ${daysUntilPeriod} days.`;
        }
        return; // Exit if a future period date is found
    }

    // ----------------------------------------------------
    // --- STEP 3: Fallback (If both are past) ---
    // ----------------------------------------------------
    // If both ovulation and period start are mathematically in the past,
    // it means the user has not marked their latest period.
    statusBar.textContent = `⚠️ You should have your period now. Please mark the Start Date.`;
}

// --- NEW FUNCTION: Calculate Poop Streak ---
function calculatePoopStreak() {
    let currentStreak = 0;
    // Start checking from TODAY backwards
    let checkDate = new Date(today); // Use safe copy of today
    checkDate.setHours(0, 0, 0, 0);

    // Loop backwards to find consecutive days with counts > 0
    while (true) {
        const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

        if ((dailyCounts[dateKey] || 0) > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1); // Go to previous day
        } else {
            break; // Break streak if a day is missed
        }
    }
    return currentStreak;
}

// --- NEW FUNCTION: Update Poop Status Bar ---
function updatePoopStatus() {
    if (isPartnerView) {
        statusBar.textContent = "Viewing Partner's Calendar (Read Only)";
        return;
    }

    // Safety check just in case called in wrong mode, though logic handles display
    if (currentAppMode !== 'counter') return;

    const todayKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const countToday = dailyCounts[todayKey] || 0;
    const streak = calculatePoopStreak();

    if (streak > 2) {
        statusBar.textContent = `You are on the roll !! ${streak} days streak !!`;
    } else if (countToday >= 1) {
        statusBar.textContent = "Bowel movement doing great today !";
    } else {
        statusBar.textContent = "Poopie time !!";
    }
}

// --- CORRECTED FUNCTION: Log Predictions for ONLY the Current Cycle ---
// --- UPDATED FUNCTION: Log Predictions to Google Sheet ---
// --- UPDATED FUNCTION: Log Predictions to Google Sheet (Called only on 'start') ---
function submitPredictions() {
    // This function assumes periodStartDate and periodSettings are freshly updated.
    if (!DEFAULT_USER_ID || !periodStartDate) {
        return;
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const startDateObj = new Date(periodStartDate + 'T00:00:00');

    // Calculate the end date of the predicted cycle (last start date + cycle length days)
    const predictionEndDateObj = new Date(startDateObj);
    predictionEndDateObj.setDate(predictionEndDateObj.getDate() + periodSettings.cycleLength - 1);

    // Iterate day by day from the start date, up to the end of the predicted cycle
    for (let d = new Date(startDateObj); d <= predictionEndDateObj; d.setDate(d.getDate() + 1)) {
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Skip prediction logging for the actual start date itself (it's submitted separately as 'start')
        if (dateKey === periodStartDate) continue;

        // Get the prediction status
        const status = getPeriodStatus(dateKey); // Can return a string or null

        // CRITICAL FIX: Ensure status is a string before using startsWith
        if (typeof status === 'string' && (status.startsWith('predicted_') || status.endsWith('_window'))) {

            // CRITICAL CHECK: Only submit if the day is currently UNMARKED by the user.
            const sheetStatus = dailyCounters[dateKey];

            // If the sheet status is not manually marked ('start', 'end', 'flow')
            if (!['start', 'end', 'flow'].includes(sheetStatus)) {

                // If the status is changing or if the status is currently null (not logged), submit it.
                if (sheetStatus !== status) {

                    // Update local counter data with the prediction status
                    dailyCounters[dateKey] = status;

                    // Submit the prediction status to the Google Sheet
                    submitFlowData(dateKey, status);
                }
            }
        }
    }
}

function submitFlowData(date, status) {
    const dataToSend = {
        'userID': DEFAULT_USER_ID,
        'date': date,
        'counterValue': status
    };
    const formData = encodeFormData(dataToSend);

    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    })
        .then(() => console.log(`Flow submission sent for ${date}: status ${status}`))
        .catch(error => console.error('Flow submission failed:', error));
}

// --- NEW FUNCTION: RETRIEVE DATA VIA JSONP (GET) ---
function retrieveDailyCounters(userId) {
    return new Promise((resolve, reject) => {
        resolveJsonpPromise = resolve;
        rejectJsonpPromise = reject;

        const callbackName = 'handleRetrievedData'; // Must match the global function name
        // Construct the GET URL with the userID and the callback name
        const retrievalUrl = `${GOOGLE_APP_SCRIPT_URL}?userID=${encodeURIComponent(userId)}&callback=${callbackName}`;

        const script = document.createElement('script');
        script.src = retrievalUrl;
        script.id = 'jsonpScript';

        // Handle network errors (though Apps Script usually catches script injection errors)
        script.onerror = () => reject(new Error('JSONP request failed or blocked.'));

        // Inject the script tag into the head to execute the Apps Script response
        document.head.appendChild(script);
    });
}

// --- USER ID PERSISTENCE LOGIC (MODIFIED TO BE ASYNC) ---

async function initializeUserId() {
    const savedId = localStorage.getItem(USER_ID_STORAGE_KEY);

    if (savedId) {
        // Show loading overlay while we fetch the data
        // Load the stored mode
        const savedMode = localStorage.getItem(MODE_STORAGE_KEY) || 'counter';
        switchAppMode(savedMode);

        loadingOverlay.style.display = 'flex';

        DEFAULT_USER_ID = savedId;
        //currentUserDisplay.textContent = DEFAULT_USER_ID;
        userIdInputSection.style.display = 'none';

        document.querySelector('.container').style.opacity = 1;
        document.querySelector('.calendar-container').style.display = 'block';

        // NEW: Wait for the retrieved data using JSONP
        try {
            // dailyData now returns an object { counts, statuses }
            const dailyData = await retrieveDailyCounters(DEFAULT_USER_ID);

            dailyCounts = dailyData.counts;       // NEW: Populate numerical counters
            dailyCounters = dailyData.statuses;   // EXISTING: Now stores only period statuses

        } catch (e) {
            console.error('Failed to load existing data. Starting count from zero.', e);
            dailyCounts = {};
            dailyCounters = {};
        }

        // Render calendar with the retrieved data
        renderCalendar(currentMonth, currentYear);
        loadingOverlay.style.display = 'none'; // Hide loading after render!
        loginStatusText.textContent = "Currently logged-in as " + DEFAULT_USER_ID;
        loginStatus.style.display = 'block';
        loginStatusText.style.display = 'inline'; /* Changed to inline for link to sit next to it */
        partnerLink.style.display = 'inline';

        // Update Link Text based on whether partner exists
        if (PARTNER_ID) {
            partnerLink.textContent = "View Partner's Calendar";
        } else {
            partnerLink.textContent = "Connect with a Partner";
        }

    } else {
        DEFAULT_USER_ID = null;
        // If no ID found, show input and hide calendar/loading
        loadingOverlay.style.display = 'none'; // Ensure hidden if no ID
        //currentUserDisplay.textContent = 'Not Set';
        userIdInputSection.style.display = 'block';

        userIdInput.value = '';
        loginStatus.style.display = 'none';
        loginStatusText.style.display = 'none';
        document.querySelector('.calendar-container').style.display = 'none';
    }
}

saveUserIdBtn.addEventListener('click', async () => {
    const newId = userIdInput.value.trim();
    if (newId) {
        localStorage.setItem(USER_ID_STORAGE_KEY, newId);
        await initializeUserId();
    } else {
        alert('Please enter a valid User ID.');
    }
});

resetUserIdBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the saved User ID? You will need to re-enter it next time.')) {
        localStorage.removeItem(USER_ID_STORAGE_KEY);
        initializeUserId();

        while (calendarGrid.children.length > 7) {
            calendarGrid.removeChild(calendarGrid.lastChild);
        }
        alert('User ID has been reset!');
    }
});

resetPeriodSettingsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the saved period settings?')) {
        localStorage.removeItem(PERIOD_SETTINGS_KEY);
        periodSetupModal.style.display = 'block';

        alert('Period settings has been reset!');
    }
    if (currentAppMode === 'period') {
        // 1. Load current settings into the modal inputs
        periodLengthInput.value = periodSettings.periodLength;
        cycleLengthInput.value = periodSettings.cycleLength;

        // 2. Show the setup modal (which uses the 'savePeriodSettingsBtn' to save)
        periodSetupModal.style.display = 'block';
    }
});


// Redundant block removed



// --- PARTNER VIEW LOGIC ---

partnerLink.addEventListener('click', async (e) => {
    e.preventDefault();

    // CASE 1: No Partner Linked -> Open Modal
    if (!PARTNER_ID) {
        partnerSetupModal.style.display = 'block';
        return;
    }

    // CASE 2: Partner Linked -> Toggle View
    if (isPartnerView) {
        // Switch back to My Calendar
        isPartnerView = false;
        partnerLink.textContent = "View Partner's Calendar";
        await initializeUserId(); // Reload my data

        // Re-enable controls
        document.querySelector('.buttons-group').style.display = 'block';
        toggleModeBtn.style.display = 'inline-block';
        if (resetPeriodSettingsBtn) resetPeriodSettingsBtn.style.display = (currentAppMode === 'period') ? 'inline-block' : 'none';

    } else {
        // Switch to Partner View
        isPartnerView = true;
        partnerLink.textContent = "Back to My Calendar";

        // Update Status Bars
        loginStatusText.textContent = "Viewing Partner: " + PARTNER_ID;
        statusBar.textContent = "Loading Partner Data...";

        // Hide Controls for Read-Only Mode
        document.querySelector('.buttons-group').style.display = 'none';
        toggleModeBtn.style.display = 'none';
        resetPeriodSettingsBtn.style.display = 'none';

        // Fetch Partner Data
        loadingOverlay.style.display = 'flex';
        try {
            const dailyData = await retrieveDailyCounters(PARTNER_ID);
            dailyCounts = dailyData.counts;
            dailyCounters = dailyData.statuses;
        } catch (e) {
            console.error('Failed to load partner data', e);
            dailyCounts = {};
            dailyCounters = {};
            statusBar.textContent = "Error loading partner data.";
        }

        loadingOverlay.style.display = 'none';
        renderCalendar(currentMonth, currentYear);
        // Force update status bar text after render (since render calls calculateNextOvulation which might override it)
        statusBar.textContent = "Viewing Partner's Calendar (Read Only)";
    }
});

// Partner Modal Handlers
savePartnerIdBtn.addEventListener('click', () => {
    const pId = partnerIdInput.value.trim();
    if (pId) {
        if (pId === DEFAULT_USER_ID) {
            alert("You cannot add yourself as a partner.");
            return;
        }
        PARTNER_ID = pId;
        localStorage.setItem(PARTNER_ID_STORAGE_KEY, PARTNER_ID);
        partnerSetupModal.style.display = 'none';
        partnerLink.textContent = "View Partner's Calendar";
        alert(`Partner ${PARTNER_ID} connected!`);
    } else {
        alert("Please enter a valid Partner ID.");
    }
});

cancelPartnerSetupBtn.addEventListener('click', () => {
    partnerSetupModal.style.display = 'none';
    partnerIdInput.value = '';
});


// --- CORE FUNCTIONS (Unchanged from previous logic) ---

function applyCountStyle(element, count) {
    element.removeAttribute('data-count');
    element.classList.remove('has-counter', 'counter-1', 'counter-2', 'counter-3', 'counter-4');
    if (count > 0) {
        element.setAttribute('data-count', count);
        element.classList.add('has-counter');
        const intensity = Math.min(count, 4);
        element.classList.add(`counter-${intensity}`);
    }
}

function renderCalendar(month, year) {
    if (!DEFAULT_USER_ID) return;

    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.lastChild);
    }
    monthYearDisplay.textContent = `${months[month]} ${year}`;
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDayOfMonth; i++) {
        const blankDay = document.createElement('div');
        blankDay.classList.add('date-number', 'inactive');
        calendarGrid.appendChild(blankDay);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const dateDiv = document.createElement('div');
        dateDiv.textContent = i;
        dateDiv.classList.add('date-number');
        const dateKey = getDateKey(year, month, i);
        const count = dailyCounters[dateKey] || 0;
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dateDiv.classList.add('current-date');
            if (!selectedDate) {
                selectedDate = dateKey;
            }
        }
        if (dateKey === selectedDate) {
            dateDiv.classList.add('selected-date');
        }
        // Check if we are in Period Mode and apply period styles
        if (currentAppMode === 'period') {
            // Remove existing counter styles
            dateDiv.classList.remove('has-counter', 'counter-1', 'counter-2', 'counter-3', 'counter-4', 'selected-date');
            const periodStatus = getPeriodStatus(dateKey);

            // Remove all previous period classes for safety
            dateDiv.classList.remove('current_period', 'predicted_period', 'predicted_ovulation', 'fertile_window');

            // Apply new period class
            if (periodStatus) {
                dateDiv.classList.add(periodStatus);
            }

            // Check if this date was marked as a START date in the sheet
            if (dailyCounters[dateKey] === 'start') {
                dateDiv.classList.add('period_start');
            } else if (dailyCounters[dateKey] === 'end') { // NEW END CHECK
                dateDiv.classList.add('period_end');
            } else if (dailyCounters[dateKey] === 'flow') { // NEW FLOW CHECK
                dateDiv.classList.add('period_flow');
            } else if (dailyCounters[dateKey] === 'predicted_period') { // NEW CHECK
                dateDiv.classList.add('predicted_period');
            } else if (dailyCounters[dateKey] === 'predicted_ovulation') { // NEW CHECK
                dateDiv.classList.add('predicted_ovulation');
            } else if (dailyCounters[dateKey] === 'fertile_window') { // NEW CHECK
                dateDiv.classList.add('fertile_window');
            }
        } else {
            // If not in period mode, apply standard counter styles
            // CRITICAL CHANGE: Use dailyCounts for numerical value
            const count = dailyCounts[dateKey] || 0;
            applyCountStyle(dateDiv, count);
        }
        //applyCountStyle(dateDiv, count);
        dateDiv.addEventListener('click', function () {
            const prevSelected = document.querySelector('.selected-date');
            if (prevSelected) {
                prevSelected.classList.remove('selected-date');
            }
            dateDiv.classList.add('selected-date');
            selectedDate = dateKey;
            const currentCount = dailyCounts[selectedDate] || 0;
            const currentStatus = dailyCounters[selectedDate] || 0;
            console.log(`Selected date: ${selectedDate}. Current count: ${currentCount}.Current status:${currentStatus}`);
        });
        calendarGrid.appendChild(dateDiv);
    }
    if (currentAppMode === 'period') {
        calculateNextOvulation();
    } else {
        updatePoopStatus(); // Update poop status on render
    }
}

function getDateKey(year, month, day) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
}

// Update to remove dependence on 'amount' for period mode
function updateCounterAndSubmit(dateKey, status) {
    if (!dateKey || !DEFAULT_USER_ID) {
        alert('Please enter your User ID and select a date first.');
        return;
    }

    let valueToSubmit = status;

    if (currentAppMode === 'period') {
        // --- Period Mode Logic ---
        if (status === 'start') {
            periodStartDate = dateKey;
            localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(periodSettings));
            // 3. CRITICAL: Trigger prediction submission immediately after marking start
            submitPredictions();
            alert("Period start date marked! Cycle predictions updated.");

        } else if (status === 'end') {
            if (!periodStartDate || dateKey <= periodStartDate) {
                alert("Please mark a 'Start Date' on an earlier day before marking the end.");
                return;
            }
            // CRITICAL STEP: Fill the days between start and end
            fillPeriodFlow(periodStartDate, dateKey);
            alert(`Period flow marked from ${periodStartDate} to ${dateKey}.`);

        } else if (status === 'clear') {
            // Clearing requires no special logic here, just deletion below
        }

        // Update local counter data
        // Update local counter data (period status)
        if (status === 'clear') {
            delete dailyCounters[dateKey]; // Delete status
        } else {
            dailyCounters[dateKey] = status; // Set new status ('start', 'end', 'flow', etc.)
        }
        // Get the existing count and combine for submission
        const currentCount = dailyCounts[dateKey] || 0; // READ from dailyCounts
        const currentStatus = dailyCounters[dateKey] || '';
        valueToSubmit = `${currentCount}|${currentStatus}`; // Combine for submission

    } else {
        // --- Counter Mode Logic (Still relies on 'amount' being passed for +/-) ---
        let amount = status; // Revert status back to 'amount' for counter mode
        let currentCount = dailyCounts[dateKey] || 0;
        currentCount += amount;
        if (currentCount < 0) currentCount = 0;
        dailyCounts[dateKey] = currentCount; // WRITE to dailyCounts
        const currentStatus = dailyCounters[dateKey] || '';
        valueToSubmit = `${currentCount}|${currentStatus}`;

        // Immediate UI Update for Status Bar
        if (dateKey === getDateKey(today.getFullYear(), today.getMonth(), today.getDate())) {
            // We need to update this slightly differently or just re-render which happens below
        }
    }

    renderCalendar(currentMonth, currentYear);

    // Submission logic (unchanged)
    const dataToSend = {
        'userID': DEFAULT_USER_ID,
        'date': dateKey,
        'counterValue': valueToSubmit
    };
    const formData = encodeFormData(dataToSend);
    // ... (fetch call) ...

    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    })
        .then(() => {
            console.log(`Submission sent for ${dateKey}: value ${valueToSubmit}`);
        })
        .catch(error => {
            console.error('Submission failed:', error);
        });
}

// --- EVENT HANDLERS ---
// Button 1: Start/Increment
button1.addEventListener('click', () => {
    if (!DEFAULT_USER_ID || !selectedDate) return alert('Select date and enter User ID.');
    if (currentAppMode === 'period') {
        updateCounterAndSubmit(selectedDate, 'start');
    } else {
        updateCounterAndSubmit(selectedDate, 1); // Counter mode increment
    }
});

// Button 2: End/Decrement
button2.addEventListener('click', () => {
    if (!DEFAULT_USER_ID || !selectedDate) return alert('Select date and enter User ID.');
    if (currentAppMode === 'period') {
        updateCounterAndSubmit(selectedDate, 'end');
    } else {
        updateCounterAndSubmit(selectedDate, -1); // Counter mode decrement
    }
});

// NEW BUTTON 3: Clear Marking (Period Mode Only)
button3.addEventListener('click', () => {
    if (!DEFAULT_USER_ID || !selectedDate) return alert('Select date and enter User ID.');
    if (currentAppMode === 'period') {
        // Use 'clear' status which is handled in updateCounterAndSubmit
        updateCounterAndSubmit(selectedDate, 'clear');
        alert(`Marking cleared for ${selectedDate}.`);
    }
});

prevMonthBtn.addEventListener('click', () => {
    if (!DEFAULT_USER_ID) return;
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
});

nextMonthBtn.addEventListener('click', () => {
    if (!DEFAULT_USER_ID) return;
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
});

// --- INITIALIZATION ---
initializeUserId();

// --- PWA SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => {
                console.log('Service Worker registered! Scope is:', reg.scope);
            })
            .catch((err) => {
                console.error('Service Worker registration failed:', err);
            });
    });
}