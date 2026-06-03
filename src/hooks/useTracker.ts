import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AppMode, PeriodSettings, DailyData, PeriodStatus } from '../utils/types';
import { getDateKey } from '../utils/dateUtils';
import { getPeriodStatus } from '../utils/periodLogic';

const MODE_STORAGE_KEY = 'appMode';
const PERIOD_SETTINGS_KEY = 'periodSettings';
const PARTNER_ID_STORAGE_KEY = 'partnerUserId';

export function useTracker() {
    const { userId } = useAuth();
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [appMode, setAppMode] = useState<AppMode>('counter');
    const [periodSettings, setPeriodSettings] = useState<PeriodSettings>({ periodLength: 7, cycleLength: 28 });
    const [periodStartDate, setPeriodStartDate] = useState<string | null>(null);
    
    const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
    const [dailyStatuses, setDailyStatuses] = useState<Record<string, string>>({});
    
    const [isLoading, setIsLoading] = useState(true);
    const [isPartnerView, setIsPartnerView] = useState(false);

    const [inviteCode, setInviteCode] = useState<string | null>(null);

    // Initial load from local storage
    useEffect(() => {
        const savedMode = (localStorage.getItem(MODE_STORAGE_KEY) as AppMode) || 'counter';
        const savedSettings = localStorage.getItem(PERIOD_SETTINGS_KEY);

        setAppMode(savedMode);
        
        if (savedSettings) {
            setPeriodSettings(JSON.parse(savedSettings));
        }

        const fetchPartnerInfo = async () => {
            if (!userId) return;
            try {
                const res = await fetch('/api/partner');
                if (res.ok) {
                    const data = await res.json();
                    setInviteCode(data.inviteCode);
                    if (data.partnerId) {
                        setPartnerId(data.partnerId);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch partner info", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPartnerInfo();
    }, [userId]);

    const fetchDailyData = useCallback(async (activePartnerId?: string) => {
        if (!userId) return;
        setIsLoading(true);
        
        try {
            let url = '/api/tracker';
            if (activePartnerId) {
                url += `?partnerId=${activePartnerId}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch data');

            const data = await res.json();
            
            setDailyCounts(data.counts || {});
            setDailyStatuses(data.statuses || {});
            
            // Calculate period start date from statuses
            if (data.statuses) {
                const dates = Object.keys(data.statuses).filter(key => data.statuses[key] === 'start').sort();
                if (dates.length > 0) {
                    setPeriodStartDate(dates[dates.length - 1]);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setDailyCounts({});
            setDailyStatuses({});
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch data when userId or partner view changes
    useEffect(() => {
        if (userId) {
            const activePartnerId = isPartnerView && partnerId ? partnerId : undefined;
            fetchDailyData(activePartnerId);
        } else {
            setDailyCounts({});
            setDailyStatuses({});
        }
    }, [userId, partnerId, isPartnerView, fetchDailyData]);

    const submitData = async (dateKey: string, count: number, status: string | null) => {
        if (!userId) return;

        try {
            const body: any = { date: dateKey, count, status };
            if (isPartnerView && partnerId) {
                body.partnerId = partnerId;
            }

            await fetch('/api/tracker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error('Submission failed:', error);
        }
    };

    const toggleStatus = async (dateKey: string, status: any) => {
        if (isPartnerView) {
            alert("Viewing Partner is strictly read-only.");
            return;
        }
        if (!userId) return;

        const newCounts = { ...dailyCounts };
        const newStatuses = { ...dailyStatuses };
        
        let countToSubmit = newCounts[dateKey] || 0;
        let statusToSubmit: string | null = null;

        if (appMode === 'period') {
            if (status === 'start') {
                setPeriodStartDate(dateKey);
            }
            if (status === 'end') {
                if (!periodStartDate || new Date(dateKey) < new Date(periodStartDate)) {
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
                        submitData(dKey, count, tempStatus);
                    }
                }
            }
            
            if (status === 'clear') {
                delete newStatuses[dateKey];
                statusToSubmit = 'clear';
            } else {
                newStatuses[dateKey] = String(status);
                statusToSubmit = String(status);
            }
        } else {
            const amount = typeof status === 'number' ? status : parseInt(status);
            countToSubmit += amount;
            if (countToSubmit < 0) countToSubmit = 0;
            newCounts[dateKey] = countToSubmit;
            statusToSubmit = newStatuses[dateKey] || null;
        }

        setDailyCounts(newCounts);
        setDailyStatuses(newStatuses);
        await submitData(dateKey, countToSubmit, statusToSubmit);

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
                        await submitData(dateKey, dailyCounts[dateKey] || 0, predStatus);
                    }
                }
            }
        }
        setDailyStatuses(updatedStatuses);
    };

    const savePeriodSettings = (settings: PeriodSettings) => {
        setPeriodSettings(settings);
        localStorage.setItem(PERIOD_SETTINGS_KEY, JSON.stringify(settings));
        setAppMode('period');
        localStorage.setItem(MODE_STORAGE_KEY, 'period');
    };

    const connectPartner = async (code: string) => {
        try {
            const res = await fetch('/api/partner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode: code })
            });
            const data = await res.json();
            
            if (!res.ok) {
                alert(data.error || "Failed to connect to partner");
                return false;
            }
            
            setPartnerId(data.partnerId);
            return true;
        } catch (error) {
            console.error("Connect error", error);
            alert("Error connecting to partner.");
            return false;
        }
    };

    const disconnectPartner = async () => {
        try {
            await fetch('/api/partner', { method: 'DELETE' });
            setPartnerId(null);
            setIsPartnerView(false);
        } catch (error) {
            console.error("Disconnect error", error);
        }
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
        inviteCode,
        appMode,
        periodSettings,
        periodStartDate,
        dailyCounts,
        dailyStatuses,
        isLoading,
        isPartnerView,
        savePeriodSettings,
        connectPartner,
        disconnectPartner,
        togglePartnerView,
        toggleAppMode,
        toggleStatus
    };
}
