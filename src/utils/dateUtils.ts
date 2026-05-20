export function getDateKey(year: number, month: number, day: number): string {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
}

export function parseDateKey(dateKey: string): Date {
    return new Date(`${dateKey}T00:00:00`);
}
