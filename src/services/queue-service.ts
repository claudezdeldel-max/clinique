import { fetchApi } from '@/lib/api';
import type { QueueItem, QueueStatus, QueuePriority, QueueSyncEvent } from '@/types/queue';

const BROADCAST_CHANNEL_NAME = 'radiomed_queue_channel';
const LOCAL_STORAGE_KEY = 'radiomed_queue_data_v1';
const CALL_EVENT_KEY = 'radiomed_last_called_patient';

// Fallback initial queue data if backend is offline
const DEFAULT_QUEUE: QueueItem[] = [];

class QueueService {
  private broadcastChannel: BroadcastChannel | null = null;
  private audioContext: AudioContext | null = null;
  private listeners: Set<(event: QueueSyncEvent) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment', e);
      }

      window.addEventListener('storage', (e) => {
        if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
          try {
            const data: QueueItem[] = JSON.parse(e.newValue);
            this.notifyListeners({ type: 'QUEUE_UPDATED', payload: data });
          } catch (err) {
            console.error('Failed to parse storage queue update', err);
          }
        }
        if (e.key === CALL_EVENT_KEY && e.newValue) {
          try {
            const item: QueueItem = JSON.parse(e.newValue);
            this.notifyListeners({ type: 'PATIENT_CALLED', payload: item });
          } catch (err) {
            console.error('Failed to parse call event from storage', err);
          }
        }
      });
    }
  }

  public subscribe(callback: (event: QueueSyncEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(event: QueueSyncEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  private broadcast(event: QueueSyncEvent) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (err) {
        console.error('Error sending broadcast message', err);
      }
    }
    this.notifyListeners(event);
  }

  // Only confirmed server writes are reflected in the shared queue.
  public async fetchQueue(): Promise<QueueItem[]> {
    const data = await fetchApi<QueueItem[]>('/queue');
    this.saveToLocal(data);
    return data;
  }

  public async addTicket(ticketData: {
    patient_id?: number; patient_name: string; modality_name?: string;
    doctor_name?: string; room_name: string; priority?: QueuePriority; notes?: string;
  }): Promise<QueueItem> {
    const item = await fetchApi<QueueItem>('/queue', { method: 'POST', body: JSON.stringify(ticketData) });
    this.publishItem(item);
    return item;
  }

  private publishItem(item: QueueItem) {
    const list = this.loadFromLocal();
    const index = list.findIndex(row => row.id === item.id);
    if (index < 0) list.push(item); else list[index] = item;
    this.saveToLocal(list);
    this.broadcast({ type: 'QUEUE_UPDATED', payload: list });
  }

  // Update item status (e.g., 'called', 'in_progress', 'completed', 'absent')
  public async updateStatus(
    id: number,
    status: QueueStatus,
    extraProps?: { room_name?: string; doctor_name?: string; priority?: QueuePriority }
  ): Promise<QueueItem | null> {
    const updatedItem = await fetchApi<QueueItem>(`/queue/${id}/status`, {
      method: 'PUT', body: JSON.stringify({ status, ...extraProps }),
    });
    this.publishItem(updatedItem);
    if (status === 'called') this.triggerCallEvent(updatedItem);
    return updatedItem;
  }

  // Trigger callout event with audio chime & speech voice announcement
  public triggerCallEvent(item: QueueItem) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CALL_EVENT_KEY, JSON.stringify(item));
      } catch (err) {
        console.error('Failed to set call event in storage', err);
      }
    }
    this.broadcast({ type: 'PATIENT_CALLED', payload: item });
  }

  // Reset daily queue
  public async resetQueue(): Promise<void> {
    await fetchApi('/queue/reset', { method: 'POST' });
    this.saveToLocal([]);
    this.broadcast({ type: 'QUEUE_UPDATED', payload: [] });
  }

  // Delete single ticket
  public async deleteTicket(id: number): Promise<void> {
    await fetchApi(`/queue/${id}`, { method: 'DELETE' });
    const currentList = this.loadFromLocal().filter((item) => item.id !== id);
    this.saveToLocal(currentList);
    this.broadcast({ type: 'QUEUE_UPDATED', payload: currentList });
  }

  // Local storage management helpers
  private saveToLocal(data: QueueItem[]) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('LocalStorage write error', e);
      }
    }
  }

  private loadFromLocal(): QueueItem[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error('LocalStorage read error', e);
      }
    }
    return DEFAULT_QUEUE;
  }

  // Audio Playback & Voice Synthesis Utilities

  // Play pleasant two-tone medical chime sound using Web Audio API
  public playChimeSound() {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      // Tone 1: High E5 (659.25 Hz)
      const osc1 = this.audioContext.createOscillator();
      const gain1 = this.audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);

      // Tone 2: C5 (523.25 Hz)
      const osc2 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.3);
      gain2.gain.setValueAtTime(0.4, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(this.audioContext.destination);

      osc1.start(now);
      osc1.stop(now + 0.6);
      osc2.start(now + 0.3);
      osc2.stop(now + 1.2);
    } catch (err) {
      console.warn('Web Audio playback error', err);
    }
  }

  // Synthesize French Voice Callout ("Le patient X, ticket Y, est demandé en Salle Z")
  public speakCallout(item: QueueItem, anonymize: boolean = false) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const displayName = anonymize
        ? `Ticket ${item.ticket_number}`
        : `${item.patient_name}, ticket ${item.ticket_number}`;

      const text = `${displayName}, est attendu en ${item.room_name}.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Select French voice if available
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith('fr'));
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error', err);
    }
  }
}

export const queueService = new QueueService();
