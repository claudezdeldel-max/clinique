import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QueueItem, QueueStatus, QueuePriority, QueueStats } from '@/types/queue';
import { queueService } from '@/services/queue-service';
import { getCallPolicy, fetchApi } from '@/lib/api';
import { useAccountStore, canCallExam } from '@/stores/account-store';
import { toast } from 'sonner';

export function useQueue(options?: { enableAudio?: boolean; isDisplayMode?: boolean }) {
  const user = useAccountStore(s => s.user);
  const [paused, setPaused] = useState(false);
  const [echoDoctorId, setEchoDoctorId] = useState<number | null>(null);
  const canCall = useCallback((item: QueueItem) => canCallExam(user, item.modality_name, echoDoctorId), [user, echoDoctorId]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCalledItem, setActiveCalledItem] = useState<QueueItem | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(options?.enableAudio ?? false);
  const [anonymizeMode, setAnonymizeMode] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  // Load initial queue data
  const refreshQueue = useCallback(async () => {
    setLoading(true);
    try { const data = await queueService.fetchQueue(); setQueue(data); setError(''); }
    catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [policy, data, state] = await Promise.all([getCallPolicy(), queueService.fetchQueue(), fetchApi<{ paused: boolean }>('/queue/state')]);
        setEchoDoctorId(policy.echo_doctor_id); setPaused(state.paused); setQueue(data); setError('');
      } catch (err) { setError((err as Error).message); }
    };
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  // Handle Screen Wake Lock for Display mode (TV screen)
  useEffect(() => {
    if (!options?.isDisplayMode) return;

    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
        } catch (err) {
          console.warn('Wake Lock request failed', err);
          setWakeLockActive(false);
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [options?.isDisplayMode]);

  // Subscribe to real-time broadcast and storage events
  useEffect(() => {
    refreshQueue();

    const unsubscribe = queueService.subscribe((event) => {
      if (event.type === 'QUEUE_UPDATED') {
        setQueue(event.payload);
      } else if (event.type === 'PATIENT_CALLED') {
        const item = event.payload;
        setActiveCalledItem(item);

        if (audioEnabled) {
          queueService.playChimeSound();
          setTimeout(() => {
            queueService.speakCallout(item, anonymizeMode);
          }, 600);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshQueue, audioEnabled, anonymizeMode]);

  // Action methods
  const addTicket = useCallback(async (ticketData: {
    patient_id?: number;
    patient_name: string;
    modality_name?: string;
    doctor_name?: string;
    room_name: string;
    priority?: QueuePriority;
    notes?: string;
  }) => {
    return await queueService.addTicket(ticketData);
  }, []);

  const updateStatus = useCallback(async (
    id: number,
    status: QueueStatus,
    extraProps?: { room_name?: string; doctor_name?: string; priority?: QueuePriority }
  ) => {
    return await queueService.updateStatus(id, status, extraProps);
  }, []);

  const callPatient = useCallback(async (item: QueueItem) => {
    if (!canCall(item)) { toast.error("Votre compte n'est pas autorisé à appeler cet examen."); return null; }
    try {
      const updated = await queueService.updateStatus(item.id, 'called');
      if (updated) setActiveCalledItem(updated);
      return updated;
    } catch (err) { toast.error((err as Error).message); return null; }
  }, [canCall]);

  const startExam = useCallback(async (item: QueueItem) => {
    if (!canCall(item)) { toast.error("Votre compte n'est pas autorisé à prendre en charge cet examen."); return null; }
    try {
      const updated = await queueService.updateStatus(item.id, 'in_progress');
      if (updated) toast.success(`Patient entré : ${updated.patient_name}. Examen en cours.`);
      return updated;
    } catch (err) { toast.error((err as Error).message); return null; }
  }, [canCall]);

  const callNextWaitingPatient = useCallback(async (roomFilter?: string) => {
    const waitingList = queue.filter(
      (q) => q.status === 'waiting' && canCall(q) && (!roomFilter || q.room_name === roomFilter)
    );

    // Urgent patients first, then lowest id
    waitingList.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
      return a.id - b.id;
    });

    if (waitingList.length > 0) {
      return await callPatient(waitingList[0]);
    }
    return null;
  }, [queue, callPatient, canCall]);

  const resetQueue = useCallback(async () => {
    await queueService.resetQueue();
    setActiveCalledItem(null);
  }, []);

  const deleteTicket = useCallback(async (id: number) => {
    await queueService.deleteTicket(id);
    if (activeCalledItem?.id === id) {
      setActiveCalledItem(null);
    }
  }, [activeCalledItem]);

  // Queue Statistics calculation
  const stats: QueueStats = useMemo(() => {
    const totalWaiting = queue.filter((q) => q.status === 'waiting').length;
    const totalCalled = queue.filter((q) => q.status === 'called' || q.status === 'in_progress').length;
    const totalCompleted = queue.filter((q) => q.status === 'completed').length;
    const urgentCount = queue.filter((q) => q.priority === 'urgent' && q.status === 'waiting').length;

    // Average wait time approximation in minutes
    const completedItems = queue.filter((q) => q.status === 'completed' && q.created_at && q.completed_at);
    let avgWaitMinutes = 15; // default fallback estimate
    if (completedItems.length > 0) {
      const totalMinutes = completedItems.reduce((acc, q) => {
        const start = new Date(q.created_at).getTime();
        const end = new Date(q.completed_at!).getTime();
        return acc + Math.max(1, Math.round((end - start) / 60000));
      }, 0);
      avgWaitMinutes = Math.round(totalMinutes / completedItems.length);
    }

    return {
      totalWaiting,
      totalCalled,
      totalCompleted,
      avgWaitMinutes,
      urgentCount,
    };
  }, [queue]);

  const dismissCallout = useCallback(() => {
    setActiveCalledItem(null);
  }, []);

  const testAudio = useCallback(() => {
    setAudioEnabled(true);
    queueService.playChimeSound();
    setTimeout(() => {
      queueService.speakCallout({
        id: 0,
        ticket_number: 'A-00',
        patient_name: 'Test Sonore',
        room_name: 'Salle IRM 1',
        status: 'called',
        priority: 'normal',
        created_at: new Date().toISOString(),
      }, false);
    }, 600);
  }, []);

  return {
    canCall,
    paused,
    error,
    queue,
    loading,
    stats,
    activeCalledItem,
    audioEnabled,
    anonymizeMode,
    wakeLockActive,
    setAudioEnabled,
    setAnonymizeMode,
    refreshQueue,
    addTicket,
    updateStatus,
    callPatient,
    startExam,
    callNextWaitingPatient,
    resetQueue,
    deleteTicket,
    dismissCallout,
    testAudio,
  };
}
