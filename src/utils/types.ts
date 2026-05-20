export type AppMode = 'counter' | 'period';

export interface PeriodSettings {
  periodLength: number;
  cycleLength: number;
}

export type PeriodStatus = 
  | 'start' 
  | 'end' 
  | 'flow' 
  | 'predicted_period' 
  | 'predicted_ovulation' 
  | 'fertile_window' 
  | null;

export interface DailyData {
  counts: Record<string, number>;
  statuses: Record<string, string>;
}
