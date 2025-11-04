// --- CONFIGURATION ---
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK9fqXn-Mhw9u7FwI4PA4A3qj5t6D9qjVo07PZw1GD5FL47cyFyljhXFoWys9QNrVD1w/exec'; 
let DEFAULT_USER_ID = null; 
const USER_ID_STORAGE_KEY = 'calendarUserId';

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
let selectedDate = null; 
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


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
        
    } else {
        DEFAULT_USER_ID = null;
        currentUserDisplay.textContent = 'Not Set';
        userIdInputSection.style.display = 'block';
        userIdInput.value = '';
        
        document.querySelector('.container').style.opacity = 0.5;
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
        applyCountStyle(dateDiv, count);
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

// --- SUBMISSION LOGIC (Unchanged) ---
function updateCounterAndSubmit(amount) {
    if (!selectedDate || !DEFAULT_USER_ID) {
        alert('Please enter your User ID and select a date first.');
        return;
    }

    // 1. Update Counter Locally
    let currentCount = dailyCounters[selectedDate] || 0;
    currentCount += amount;
    if (currentCount < 0) currentCount = 0;
    dailyCounters[selectedDate] = currentCount;

    // 2. Re-render the calendar
    renderCalendar(currentMonth, currentYear);
    
    // 3. Prepare the data payload
    const dataToSend = {
        'userID': DEFAULT_USER_ID, 
        'date': selectedDate, 
        'counterValue': currentCount
    };

    // 4. Convert to URL-encoded form data string
    const formData = encodeFormData(dataToSend);

    // 5. Send data silently (POST)
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
        console.log(`Silent submission sent for ${selectedDate} by ${DEFAULT_USER_ID}: count ${currentCount}`);
    })
    .catch(error => {
        console.error('Submission failed:', error);
        alert('Error submitting data. Check the browser console.');
    });
}

// --- EVENT HANDLERS ---
button1.addEventListener('click', () => { if (DEFAULT_USER_ID) updateCounterAndSubmit(1); else alert('Please enter your User ID first.'); }); 
button2.addEventListener('click', () => { if (DEFAULT_USER_ID) updateCounterAndSubmit(-1); else alert('Please enter your User ID first.'); });

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