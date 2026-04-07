export type Priority = 'low' | 'medium' | 'high';

export interface Subtask {
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  uid: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
  completed: boolean;
  category: string;
  createdAt: string;
  completedAt?: string;
  timeSpent?: number; // in minutes
  subtasks: Subtask[];
}

export interface UserSettings {
  darkMode: boolean;
  focusDuration: number;
  breakDuration: number;
  muteSound?: boolean;
  autoStart?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  settings: UserSettings;
}

export interface ScheduleItem {
  time: string;
  taskTitle: string;
  duration: string;
}

export interface Plan {
  id: string;
  uid: string;
  date: string;
  schedule: ScheduleItem[];
}
