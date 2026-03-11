export interface Objective {
  id: number;
  name: string;
  description: string;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  difficulty: number;
  objective_id?: number;
  objective_name?: string;
}

export interface Topic {
  id: number;
  subject_id: number;
  subject_name?: string;
  name: string;
  description: string;
}

export interface Session {
  id: number;
  subject_id: number;
  topic_id?: number;
  subject_name?: string;
  subject_color?: string;
  topic_name?: string;
  date: string;
  duration: number; // in minutes
  type: 'theory' | 'revision' | 'exercises' | 'simulated' | 'reading' | 'video' | 'practice';
  notes: string;
}

export interface Exercise {
  id: number;
  subject_id: number;
  topic_id?: number;
  subject_name?: string;
  topic_name?: string;
  date: string;
  total: number;
  correct: number;
  incorrect: number;
  percent_correct: number;
  notes: string;
}

export interface Review {
  id: number;
  subject_id: number;
  subject_name?: string;
  subject_color?: string;
  scheduled_date: string;
  status: 'pending' | 'completed' | 'overdue';
  type: '24h' | '7d' | '30d';
}

export interface Goal {
  id: number;
  type: 'daily' | 'weekly' | 'monthly';
  target_hours: number;
  period: string;
}

export interface DashboardStats {
  today_duration: number;
  daily_goal: number;
  recent_sessions: Session[];
  pending_reviews_count: number;
}
