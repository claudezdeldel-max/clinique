import type { QueueItem } from '@/types/queue'

export function queueDossierLink(item: QueueItem) {
  if (!item.patient_id) return null
  const params = new URLSearchParams({ patientId: String(item.patient_id), patientName: item.patient_name,
    examType: item.modality_name || '', queueId: String(item.id) })
  if (item.appointment_id) params.set('appointmentId', String(item.appointment_id))
  return `/comptes-rendus?${params}`
}
