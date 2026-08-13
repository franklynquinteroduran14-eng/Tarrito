export type MediaType = 'image' | 'video_link' | 'short_video';

export type CalendarEventType = 'recordatorio' | 'evento' | 'cumpleanos';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  description: string | null;
  repeatYearly: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  message: string;
  created_at: string;
  createdAtDate?: string;
  is_read: boolean;
  timesOpened: number;
}

export interface AdminNote extends Note {
  rating: number | null;
  comment: string | null;
  read_at: string | null;
}

export interface NotesMetrics {
  total: number;
  readCount: number;
  unreadCount: number;
  totalOpens: number;
}

export interface UserFeedback {
  id: string;
  note_id: string;
  rating: number;
  comment: string | null;
  read_at: string;
}

export interface HistoryNote extends Note {
  rating: number;
  comment: string | null;
  read_at: string;
  media_count: number;
  media_types: string | null;
}

export interface MediaAttachment {
  id: string;
  note_id: string;
  type: MediaType;
  url: string;
  position: number;
}

export interface SeedNote {
  id: string;
  title: string;
  message: string;
  created_at: string;
  createdAtDate?: string;
  is_read: boolean;
  feedback?: {
    id: string;
    rating: number;
    comment?: string;
    read_at: string;
  } | null;
  media?: Array<{
    id: string;
    type: MediaType;
    url: string;
    position: number;
  }>;
}
