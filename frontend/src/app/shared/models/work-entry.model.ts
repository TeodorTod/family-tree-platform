export interface WorkEntry {
  id: string;
  employerName: string;
  profession?: string | null; 
  startYear: number;
  endYear?: number | null;
  completed: boolean;
  notes?: string | null;
}