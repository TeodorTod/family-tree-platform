export interface EducationEntry {
  id: string;
  name: string; 
  qualification?: string | null; 
  startYear: number;
  endYear?: number | null;
  completed: boolean;
  notes?: string | null;
}