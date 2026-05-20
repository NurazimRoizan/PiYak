import { NextResponse } from 'next/server';

const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK9fqXn-Mhw9u7FwI4PA4A3qj5t6D9qjVo07PZw1GD5FL47cyFyljhXFoWys9QNrVD1w/exec';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userID');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userID parameter' }, { status: 400 });
    }

    try {
        // The original script used JSONP ?userID=...&callback=...
        // The Google Apps Script throws a TypeError if we don't provide a callback because of a bug in its error handling logic.
        const response = await fetch(`${GOOGLE_APP_SCRIPT_URL}?userID=${encodeURIComponent(userId)}&callback=handleRetrievedData`, {
            method: 'GET',
            redirect: 'follow',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Wait, the original Apps Script might only support JSONP if a callback is provided.
        // If we provide no callback, it might return pure JSON.
        const text = await response.text();
        
        // If it still returns JSONP like: handleRetrievedData({...})
        // We need to parse it out.
        let data;
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
            data = JSON.parse(text.substring(startIndex, endIndex + 1));
        } else {
            // Try parsing as raw JSON
            data = JSON.parse(text);
        }

        const parsedCounters: Record<string, number> = {};
        const parsedStatuses: Record<string, string> = {};

        if (data && data.dailyCounters) {
            for (const [dateKey, combinedValue] of Object.entries(data.dailyCounters)) {
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

        return NextResponse.json({ counts: parsedCounters, statuses: parsedStatuses });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Convert to form data as expected by the Google Apps Script
        const formData = new URLSearchParams();
        if (body.userID) formData.append('userID', body.userID);
        if (body.date) formData.append('date', body.date);
        if (body.counterValue) formData.append('counterValue', String(body.counterValue));

        // Submit to Google Apps Script
        // We use fetch with follow redirects
        const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            body: formData,
            // Mode doesn't need to be no-cors here on the server side
            redirect: 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // The GAS script often returns an HTML page or a redirect for POSTs.
        // We don't strictly need to parse the result if it was successful.
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
