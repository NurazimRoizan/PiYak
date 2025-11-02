// --- CALENDAR DATA & STATE ---
const today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
// Data structure: { "YYYY-MM-DD": count, ... }
let dailyCounters = {}; 

// --- DOM ELEMENTS ---
const monthYearDisplay = document.getElementById('monthYearDisplay');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const button1 = document.getElementById('button1');
const button2 = document.getElementById('button2');

// Global variable to track the currently selected date (YYYY-MM-DD)
let selectedDate = null; 

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- HELPER FUNCTION: GET DATE KEY ---
// Creates a unique key for the dailyCounters object
function getDateKey(year, month, day) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
}

// --- CORE FUNCTION: RENDER CALENDAR ---
function renderCalendar(month, year) {
    // Clear previous dates, keep the day-name headers (first 7 children)
    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.lastChild);
    }

    monthYearDisplay.textContent = `${months[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. Create blank placeholders
    for (let i = 0; i < firstDayOfMonth; i++) {
        const blankDay = document.createElement('div');
        blankDay.classList.add('date-number', 'inactive');
        calendarGrid.appendChild(blankDay);
    }

    // 2. Populate the days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateDiv = document.createElement('div');
        dateDiv.textContent = i;
        dateDiv.classList.add('date-number');
        
        const dateKey = getDateKey(year, month, i);
        const count = dailyCounters[dateKey] || 0; // Get the counter, default to 0

        // Highlight today's date
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dateDiv.classList.add('current-date');
            if (!selectedDate) { // Select today by default if no date is selected
                selectedDate = dateKey;
            }
        }
        
        // Highlight the selected date
        if (dateKey === selectedDate) {
            dateDiv.classList.add('selected-date');
        }

        // Apply visual count style
        applyCountStyle(dateDiv, count);
        
        // Add click event for date selection
        dateDiv.addEventListener('click', function() {
            // Remove selection from previous date
            const prevSelected = document.querySelector('.selected-date');
            if (prevSelected) {
                prevSelected.classList.remove('selected-date');
            }
            
            // Set new selection
            dateDiv.classList.add('selected-date');
            selectedDate = dateKey;
            
            // Optional: Update button display (e.g., alert the count)
            const currentCount = dailyCounters[selectedDate] || 0;
            console.log(`Selected date: ${selectedDate}. Current count: ${currentCount}`);
        });

        calendarGrid.appendChild(dateDiv);
    }
}

// --- CORE FUNCTION: APPLY COUNT STYLE ---
function applyCountStyle(element, count) {
    element.removeAttribute('data-count'); // Clear old count
    element.classList.remove('has-counter', 'counter-1', 'counter-2', 'counter-3', 'counter-4'); // Clear old classes

    if (count > 0) {
        element.setAttribute('data-count', count);
        element.classList.add('has-counter');
        
        // Add class for color intensity (up to a max of 4 for distinct steps)
        const intensity = Math.min(count, 4); 
        element.classList.add(`counter-${intensity}`);
    }
}

// --- BUTTON HANDLERS ---
function updateCounter(amount) {
    if (!selectedDate) {
        alert('Please select a date on the calendar first.');
        return;
    }

    let currentCount = dailyCounters[selectedDate] || 0;
    currentCount += amount;

    // Ensure count never goes below 0
    if (currentCount < 0) currentCount = 0;

    dailyCounters[selectedDate] = currentCount;

    // Re-render the calendar to reflect the change
    renderCalendar(currentMonth, currentYear);

    // Optional: Log the update
    console.log(`Counter for ${selectedDate} updated to: ${currentCount}`);
    if(amount==1){
        alert('Omaigod u pooped! You little smelly bastard');
    }
}

button1.addEventListener('click', () => updateCounter(1)); // Increase
button2.addEventListener('click', () => updateCounter(-1)); // Decrease

// --- NAVIGATION LISTENERS ---
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
});

// Initial calendar render
renderCalendar(currentMonth, currentYear);