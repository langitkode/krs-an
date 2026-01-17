export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface TimeSlot {
  day: DayOfWeek;
  start: string; // "HH:MM" 24h format
  end: string; // "HH:MM" 24h format
}

export interface Course {
  id: string; // generated unique id
  code: string;
  name: string;
  sks: number;
  class: string;
  lecturer: string;
  room: string;
  schedule: TimeSlot[];
  group?: string; // Optional grouping (e.g., if multiple entries needed for one course)
}

export interface Plan {
  id: string;
  name: string;
  courses: Course[];
  score?: {
    safe: number;
    risky: number;
    optimal: number;
  };
  analysis?: string; // AI explanation
}

export interface UserPreferences {
  maxSks: number;
  excludedDays: DayOfWeek[];
  preferredLecturers: string[];
}

export interface ArchivedPlan {
  _id: string;
  name: string;
  data: Plan;
  createdAt: number;
}
