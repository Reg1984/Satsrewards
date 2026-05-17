export interface TimetableEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  classId?: string;
  location?: string;
  description?: string;
  allDay?: boolean;
  type: 'class' | 'meeting' | 'exam' | 'other';
  recurrenceRule?: string;
  metadata?: Record<string, any>;
}

export interface SupabaseEvent {
  id: string;
  teacher_id: string;
  title: string;
  start_time: string;
  end_time: string;
  class_id?: string;
  location?: string;
  description?: string;
  event_type: 'class' | 'meeting' | 'exam' | 'other';
  recurrence_rule?: string;
  all_day: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimetableEvent | null;
  onSave: (event: TimetableEvent) => void;
  onDelete: (eventId: string) => void;
}

export interface RecurrenceOptions {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}