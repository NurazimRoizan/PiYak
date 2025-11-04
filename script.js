// --- CONFIGURATION ---
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK9fqXn-Mhw9u7FwI4PA4A3qj5t6D9qjVo07PZw1GD5FL47cyFyljhXFoWys9QNrVD1w/exec'; 
let DEFAULT_USER_ID = null; 
const USER_ID_STORAGE_KEY = 'calendarUserId';

// --- NEW MODE VARIABLES ---
let currentAppMode = 'counter'; // 'counter' or 'period'
const MODE_STORAGE_KEY = 'appMode';
const PERIOD_SETTINGS_KEY = 'periodSettings';

// --- NEW PERIOD SETTINGS ---
// Default values will be loaded/overwritten by local storage
let periodSettings = {
    periodLength: 7, 
    cycleLength: 28
};
let periodStartDate = null; // Last recorded start date

// --- JSONP GLOBAL CALLBACK SETUP ---
// This function will be called by the Apps Script once the data is ready.
let resolveJsonpPromise;
let rejectJsonpPromise;

window.handleRetrievedData = function(data) {
    if (resolveJsonpPromise) {
        // Resolve or reject the Promise based on the data received
        if (data.error) {
            rejectJsonpPromise(new Error(data.error));
        } else {
            resolveJsonpPromise(data.dailyCounters);
        }
    }
    // Clean up the dynamically created script tag
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
let dailyCounters = {}; 

// --- DOM ELEMENTS ---
const userIdInputSection = document.getElementById('userIdInputSection');
const userIdInput = document.getElementById('userIdInput');
const saveUserIdBtn = document.getElementById('saveUserIdBtn');
const currentUserDisplay = document.getElementById('currentUserDisplay');
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
        // We still need to check if the current date itself is marked as 'start' or 'period'.
        // This handles days in the new, *unrecorded* cycle.
        if (dailyCounters[dateKey] === 'start' || dailyCounters[dateKey] === 'period') {
             return 'current_period';
        }
        return null; // Stop predictions if cycle length is exceeded
    }
    // ---------------------------

    // Days into the current cycle (0-indexed cycle day, 0 being the start day)
    const cycleDay = (daysSinceStart % periodSettings.cycleLength + periodSettings.cycleLength) % periodSettings.cycleLength;

    if (daysSinceStart >= 0) {
        // 1. Current Period (If date is within the recorded period duration)
        if (dailyCounters[dateKey] === 'start' || dailyCounters[dateKey] === 'period') {
             return 'current_period';
        }
        
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
        toggleModeBtn.textContent = 'Switch to Counter Tracker';
        button1.textContent = 'Mark Start Date 🩸';
        button2.textContent = 'Mark End Date ✅';
        button3.textContent = 'Clear Marking 🗑️'; 
        button3.style.display = 'inline-block'; // Show the new button

        // CRITICAL: Add class to calendar grid
        calendarContainer.classList.add('period-mode');
        // Ensure period settings are loaded before rendering
        loadPeriodSettings(); 
    } else {
        currentModeDisplay.textContent = 'Counter';
        toggleModeBtn.textContent = 'Switch to Period Tracker';
        button1.textContent = 'I Pooped!';
        button2.textContent = 'Just kidding I no poop';
        button3.style.display = 'none'; // Hide the period-specific button
        // CRITICAL: Remove class from calendar grid
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
        currentUserDisplay.textContent = DEFAULT_USER_ID;
        userIdInputSection.style.display = 'none';
        
        document.querySelector('.container').style.opacity = 1;
        document.querySelector('.calendar-container').style.display = 'block';

        // NEW: Wait for the retrieved data using JSONP
        try {
            dailyCounters = await retrieveDailyCounters(DEFAULT_USER_ID); 
        } catch (e) {
            console.error('Failed to load existing data. Starting count from zero.', e);
            dailyCounters = {};
        }
        
        // Render calendar with the retrieved data
        renderCalendar(currentMonth, currentYear);
        loadingOverlay.style.display = 'none'; // Hide loading after render!
        
    } else {
        DEFAULT_USER_ID = null;
        // If no ID found, show input and hide calendar/loading
        loadingOverlay.style.display = 'none'; // Ensure hidden if no ID
        currentUserDisplay.textContent = 'Not Set';
        userIdInputSection.style.display = 'block';
        userIdInput.value = '';
        
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
            }
        } else {
            // If not in period mode, apply standard counter styles
            applyCountStyle(dateDiv, count);
        }
        //applyCountStyle(dateDiv, count);
        dateDiv.addEventListener('click', function() {
            const prevSelected = document.querySelector('.selected-date');
            if (prevSelected) {
                prevSelected.classList.remove('selected-date');
            }
            dateDiv.classList.add('selected-date');
            selectedDate = dateKey;
            const currentCount = dailyCounters[selectedDate] || 0;
            console.log(`Selected date: ${selectedDate}. Current count: ${currentCount}`);
        });
        calendarGrid.appendChild(dateDiv);
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
        if (status === 'clear') {
             // Clear the selected date
            delete dailyCounters[dateKey];
        } else {
            // Set the selected date status ('start', 'end', or 'flow' if called from flow filler)
            dailyCounters[dateKey] = status;
        }

    } else {
        // --- Counter Mode Logic (Still relies on 'amount' being passed for +/-) ---
        let amount = status; // Revert status back to 'amount' for counter mode
        let currentCount = dailyCounters[dateKey] || 0;
        currentCount += amount;
        if (currentCount < 0) currentCount = 0;
        dailyCounters[dateKey] = currentCount;
        valueToSubmit = currentCount;
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