export type QueueStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'absent' | 'cancelled';

export type QueuePriority = 'normal' | 'vip' | 'urgent';

export interface QueueItem {
  id: number;
  patient_id?: number;
  appointment_id?: number;
  ticket_number: string;
  patient_name: string;
  modality_name?: string;
  doctor_name?: string;
  room_name: string;
  status: QueueStatus;
  priority: QueuePriority;
  created_at: string;
  called_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface QueueStats {
  totalWaiting: number;
  totalCalled: number;
  totalCompleted: number;
  avgWaitMinutes: number;
  urgentCount: number;
}

export type QueueSyncEvent = 
  | { type: 'QUEUE_UPDATED'; payload: QueueItem[] }
  | { type: 'PATIENT_CALLED'; payload: QueueItem }
  | { type: 'STATUS_CHANGED'; payload: { id: number; status: QueueStatus } };

export const QUEUE_VERSION = '1.0.0';
