import { useState, useEffect, useCallback } from 'react';
import { AppMode, PeriodSettings, DailyData, PeriodStatus } from '../utils/types';
import { getDateKey } from '../utils/dateUtils';
import { getPeriodStatus } from '../utils/periodLogic';

const USER_ID_STORAGE_KEY = 'calendarUserId';
const MODE_STORAGE_KEY = 'appMode';
const PERIOD_SETTINGS_KEY = 'periodSettings';
const PARTNER_ID_STORAGE_KEY = 'partnerUserId';

export function useTracker() {
    const [userId, setUserId] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [appMode, setAppMode] = useState<AppMode>('counter');
    const [periodSettings, setPeriodSettings] = useState<PeriodSettings>({ periodLength: 7, cycleLength: 28 });
    const [periodStartDate, setPeriodStartDate] = useState<string | null>(null);
    
    const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
    const [dailyStatuses, setDailyStatuses] = useState<Record<string, string>>({});
    
    const [isLoading, setIsLoading] = useState(true);
    const [isPartnerView, setIsPartnerView] = useState(false);

    // Initial load from local storage
    useEffect(() => {
        const savedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
        const savedPartnerId = localStorage.getItem(PARTNER_ID_STORAGE_KEY);
        const savedMode = (localStorage.getItem(MODE_STORAGE_KEY) as AppMode) || 'counter';
        const savedSettings = localStorage.getItem(PERIOD_SETTINGS_KEY);

        if (savedUserId) setUserId(savedUserId);
        if (savedPartnerId) setPartnerId(savedPartnerId);
        setAppMode(savedMode);
        
        if (savedSettings) {
            setPeriodSettings(JSON.parse(savedSettings));
        }

        setIsLoading(false);
    }, []);

    const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK9fqXn-Mhw9u7FwI4PA4A3qj5t6D9qjVo07PZw1GD5FL47cyFyljhXFoWys9QNrVD1w/exec';

    const fetchDailyData = useCallback((uid: string) => {
        setIsLoading(true);
        
        const callbackName = 'jsonp_cb_' + Math.round(100000 * Math.random());
        const script = document.createElement('script');
        
        const cleanup = () => {
            if (script.parentNode) script.parentNode.removeChild(script);
            delete (window as any)[callbackName];
            setIsLoading(false);
        };
        
        (window as any)[callbackName] = (rawData: any) => {
            cleanup();
            
            // Parse data as we did in the API route
            const parsedCounters: Record<string, number> = {};
            const parsedStatuses: Record<string, string> = {};

            if (rawData && rawData.dailyCounters) {
                for (const [dateKey, combinedValue] of Object.entries(rawData.dailyCounters)) {
                    if (typeof combinedValue === 'string' && combinedValue.includes('|')) {
                        const parts = combinedValue.split('|');
                        const countPart = parts[0].trim();
                        const statusPart = parts[1].trim();

                        parsedCounters[dateKey] = countPart ? parseInt(countPart) : 0;
                        if (statusPart) {
                            parsedStatuses[dateKey] = statusPart;
                        }
                    } else if (!isNaN(Number(combinedValue))) {
                        parsedCounters[dateKey] = parseInt(String(combinedValue));
                    } else if (typeof combinedValue === 'string') {
                        parsedStatuses[dateKey] = combinedValue;
                    }
                }
            }
            
            setDailyCounts(parsedCounters);
            setDailyStatuses(parsedStatuses);
            
            // Calculate period start date from statuses
            const dates = Object.keys(parsedStatuses).filter(key => parsedStatuses[key] === 'start').sort();
            if (dates.length > 0) {
                setPeriodStartDate(dates[dates.length - 1]);
            }
        };
        
        script.onerror = () => {
            cleanup();
            console.error('JSONP Request Failed');
            setDailyCounts({});
            setDailyStatuses({});
        };
        
        script.src = `${GOOGLE_APP_SCRIPT_URL}?userID=${encodeURIComponent(uid)}&callback=${callbackName}`;
        document.body.appendChild(script);
    }, []);

    // Fetch data when userId or partner view changes
    useEffect(() => {
        const activeUserId = isPartnerView ? partnerId : userId;
        if (activeUserId) {
            fetchDailyData(activeUserId);
        } else {
            setDailyCounts({});
            setDailyStatuses({});
        }
    }, [userId, partnerId, isPartnerView, fetchDailyData]);

    const submitData = async (dateKey: string, valueToSubmit: string) => {
        const activeUserId = isPartnerView ? partnerId : userId;
        if (!activeUserId) return;

        try {
            const formData = new URLSearchParams();
            formData.append('userID', activeUserId);
            formData.append('date', dateKey);
            formData.append('counterValue', valueToSubmit);

            // Use no-cors mode for Google Apps Script to avoid CORS errors on POST
            await fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
        } catch (error) {
            console.error('Submission failed:', error);
        }
    };

    const updateCounterAndSubmit = async (dateKey: string, status: string | number) => {
        if (!userId || isPartnerView) return;

        let newCounts = { ...dailyCounts };
        let newStatuses = { ...dailyStatuses };
        let valueToSubmit = String(status);

        if (appMode === 'period') {
            const periodStat = status as PeriodStatus;
            
            if (periodStat === 'start') {
                setPeriodStartDate(dateKey);
            } else if (periodStat === 'end') {
                if (!periodStartDate || dateKey <= periodStartDate) {
                    alert("Please mark a 'Start Date' on an earlier day before marking the end.");
                    return;
                }
                // Fill flow days between start and end
                const start = new Date(periodStartDate + 'T00:00:00');
                const end = new Date(dateKey + 'T00:00:00');
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dKey = getDateKey(d.getFullYear(), d.getMonth(), d.getDate());
                    let tempStatus = 'flow';
                    if (dKey === periodStartDate) tempStatus = 'start';
                    if (dKey === dateKey) tempStatus = 'end';
                    newStatuses[dKey] = tempStatus;
                    
                    const count = newCounts[dKey] || 0;
                    if (dKey !== dateKey) { // we will submit the dateKey separately below
                        submitData(dKey, `${count}|${tempStatus}`);
                    }
                }
            }
            
            if (status === 'clear') {
                delete newStatuses[dateKey];
                valueToSubmit = `${newCounts[dateKey] || 0}|`;
            } else {
                newStatuses[dateKey] = String(status);
                valueToSubmit = `${newCounts[dateKey] || 0}|${status}`;
            }
        } else {
            const amount = typeof status === 'number' ? status : parseInt(status);
            let currentCount = newCounts[dateKey] || 0;
            currentCount += amount;
            if (currentCount < 0) currentCount = 0;
            newCounts[dateKey] = currentCount;
            valueToSubmit = `${currentCount}|${newStatuses[dateKey] || ''}`;
        }

        setDailyCounts(newCounts);
        setDailyStatuses(newStatuses);
        await submitData(dateKey, valueToSubmit);

        // Update predictions if period mode start
        if (appMode === 'period' && status === 'start') {
            await submitPredictions(newStatuses, dateKey); // passing new statuses and start date
        }
    };

    const submitPredictions = async (currentStatuses: Record<string, string>, newStartDate: string) => {
        if (!userId) return;
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const startDateObj = new Date(newStartDate + 'T00:00:00');
        const predictionEndDateObj = new Date(startDateObj);
        predictionEndDateObj.setDate(predictionEndDateObj.getDate() + periodSettings.cycleLength - 1);

        const updatedStatuses = { ...currentStatuses };

        for (let d = new Date(startDateObj); d <= predictionEndDateObj; d.setDate(d.getDate() + 1)) {
            const dateKey = getDateKey(d.getFullYear(), d.getMonth(), d.getDate());
            if (dateKey === newStartDate) continue;

            const predStatus = getPeriodStatus(dateKey, newStartDate, periodSettings, currentStatuses);
            
            if (predStatus && (predStatus.startsWith('predicted_') || predStatus.endsWith('_window'))) {
                const sheetStatus = currentStatuses[dateKey];
                if (!['start', 'end', 'flow'].includes(sheetStatus || '')) {
                    if (sheetStatus !== predStatus) {
                        updatedStatuses[dateKey] = predStatus;
                        await submitData(dateKey, `${dailyCounts[dateKey] || 0}|${predStatus}`);
                    }
                }
            }
        }
        setDailyStatuses(updatedStatuses);
    };

    const login = (id: string) => {
        setUserId(id);
        localStorage.setItem(USER_ID_STORAGE_KEY, id);
    };

    const logout = () => {
        setUserId(null);
        setDailyCounts({});
        setDailyStatuses({});
        localStorage.removeItem(USER_ID_STORAGE_KEY);
    };

    const savePeriodSettings = (settings: PeriodSettings) => {
        setPeriodSettings(settings);
        localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(settings));
        setAppMode('period');
        localStorage.setItem(MODE_STORAGE_KEY, 'period');
    };

    const connectPartner = (id: string) => {
        setPartnerId(id);
        localStorage.setItem(PARTNER_ID_STORAGE_KEY, id);
    };

    const togglePartnerView = () => {
        setIsPartnerView(!isPartnerView);
    };

    const toggleAppMode = () => {
        const newMode = appMode === 'counter' ? 'period' : 'counter';
        setAppMode(newMode);
        localStorage.setItem(MODE_STORAGE_KEY, newMode);
    };

    return {
        userId,
        partnerId,
        appMode,
        periodSettings,
        periodStartDate,
        dailyCounts,
        dailyStatuses,
        isLoading,
        isPartnerView,
        login,
        logout,
        savePeriodSettings,
        connectPartner,
        togglePartnerView,
        toggleAppMode,
        updateCounterAndSubmit
    };
}
