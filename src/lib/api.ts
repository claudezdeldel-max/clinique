/**
 * RadioMed OS - Backend API Client
 */

import { useAccountStore, type Account, type AccountDirectory, type AccountRole } from '@/stores/account-store'
export const API_BASE = '/api'
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(useAccountStore.getState().token ? { Authorization: `Bearer ${useAccountStore.getState().token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Une erreur est survenue' }))
    throw new ApiError(err.error || `Erreur serveur ${res.status}`, res.status)
  }
  const data = await res.json()
  if (options?.method && options.method.toUpperCase() !== 'GET') {
    window.dispatchEvent(new Event('clinic-data-changed'))
  }
  return data
}

export const getAccounts = () => fetchApi<Account[]>('/accounts')
export const getAccountDirectory = () => fetchApi<AccountDirectory>('/auth/accounts')
export const selectAccount = (accountId: number) => fetchApi<{ token: string; user: Account }>('/auth/select-account', { method: 'POST', body: JSON.stringify({ account_id: accountId }) })
export const createAccountRole = (name: string) => fetchApi<AccountRole>('/account-roles', { method: 'POST', body: JSON.stringify({ name }) })
export const saveAccount = (data: Partial<Account> & { password?: string }, id?: number) => fetchApi<Account>(id ? `/accounts/${id}` : '/accounts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) })
export const getCallPolicy = () => fetchApi<{ echo_doctor_id: number | null }>('/call-policy')
export const saveCallPolicy = (id: number | null) => fetchApi('/call-policy', { method: 'PUT', body: JSON.stringify({ echo_doctor_id: id }) })
export const markReportPrintStarted = (id: number) => fetchApi<any>(`/reports/${id}/print`, { method: 'POST' })
export const getReadyFiles = () => fetchApi<any[]>('/ready-files')
export const updateReadyFile = (id: number, status: string) => fetchApi(`/ready-files/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })

// Reset Database (Test mode)
export async function resetTestDatabase(): Promise<{ status: string; message: string }> {
  return fetchApi('/test/reset', { method: 'POST' })
}

// Dashboard Summary API
export interface DashboardSummary {
  kpis: {
    today_appointments: number
    total_patients: number
    completed_exams: number
    waiting_queue: number
    pending_reports: number | null
  }
  today_appointments: Array<any>
  queue: Array<any>
  equipment: Array<any>
  exam_counts: Array<{ name: string; count: number }>
  comparison: { appointments_yesterday: number; patients_this_month: number; completed_yesterday: number }
  date: string
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return fetchApi(`/dashboard/summary?date=${date}`)
}

// Patients API
export interface PatientParams {
  search?: string
  status?: string
  gender?: string
  blood_group?: string
  sort?: string
  page?: number
  page_size?: number
}

export async function getPatients(params?: PatientParams): Promise<{ items: any[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.status) query.append('status', params.status)
  if (params?.gender) query.append('gender', params.gender)
  if (params?.blood_group) query.append('blood_group', params.blood_group)
  if (params?.sort) query.append('sort', params.sort)
  if (params?.page) query.append('page', String(params.page))
  if (params?.page_size) query.append('page_size', String(params.page_size))

  const queryString = query.toString()
  return fetchApi(`/patients${queryString ? `?${queryString}` : ''}`)
}

export async function getPatientById(id: string | number): Promise<any> {
  return fetchApi(`/patients/${id}`)
}

export async function createPatient(data: any): Promise<any> {
  return fetchApi('/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePatient(id: string | number, data: any): Promise<any> {
  return fetchApi(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePatient(id: string | number): Promise<any> {
  return fetchApi(`/patients/${id}`, { method: 'DELETE' })
}

export async function bulkPatientAction(ids: number[], action: 'archive' | 'delete'): Promise<any> {
  return fetchApi('/patients/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  })
}

export async function addPatientNote(patientId: string | number, note: { author?: string; content: string }): Promise<any> {
  return fetchApi(`/patients/${patientId}/notes`, {
    method: 'POST',
    body: JSON.stringify(note),
  })
}

export async function addPatientHistory(patientId: string | number, item: { date?: string; type?: string; title: string; description?: string }): Promise<any> {
  return fetchApi(`/patients/${patientId}/history`, {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

export async function addPatientDocument(patientId: string | number, doc: { title: string; url?: string; kind?: string }): Promise<any> {
  return fetchApi(`/patients/${patientId}/documents`, {
    method: 'POST',
    body: JSON.stringify(doc),
  })
}

export interface PatientVisitMeasurement {
  id: number
  patient_id: number
  visit_date: string
  weight: number | null
  systolic: number | null
  diastolic: number | null
  notes: string
  queue_id: number | null
  appointment_id: number | null
  recorded_by: number
  recorded_by_name: string
  created_at: string
}

export type PatientVisitInput = Pick<PatientVisitMeasurement, 'visit_date' | 'weight' | 'systolic' | 'diastolic' | 'notes'> & Partial<Pick<PatientVisitMeasurement, 'queue_id' | 'appointment_id'>>
export const getPatientVisits = (patientId: number) => fetchApi<PatientVisitMeasurement[]>(`/patients/${patientId}/visits`)
export const createPatientVisit = (patientId: number, visit: PatientVisitInput) => fetchApi<PatientVisitMeasurement>(`/patients/${patientId}/visits`, { method: 'POST', body: JSON.stringify(visit) })

// Appointments API
export async function getAppointments(params?: { from?: string; to?: string; exam?: string; doctor?: string; status?: string; auto_queue?: boolean | string }): Promise<any[]> {
  const query = new URLSearchParams()
  if (params?.from) query.append('from', params.from)
  if (params?.to) query.append('to', params.to)
  if (params?.exam) query.append('exam', params.exam)
  if (params?.doctor) query.append('doctor', params.doctor)
  if (params?.status) query.append('status', params.status)
  if (params?.auto_queue !== undefined) query.append('auto_queue', String(params.auto_queue))

  const queryString = query.toString()
  return fetchApi(`/appointments${queryString ? `?${queryString}` : ''}`)
}

export async function getAppointmentSlots(date?: string, room?: string, exclude_id?: string | number): Promise<Array<{ time: string; occupied: boolean }>> {
  const query = new URLSearchParams()
  if (date) query.append('date', date)
  if (room) query.append('room', room)
  if (exclude_id) query.append('exclude_id', String(exclude_id))
  return fetchApi(`/appointments/slots?${query.toString()}`)
}

export async function createAppointment(data: any): Promise<any> {
  return fetchApi('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAppointment(id: string | number, data: any): Promise<any> {
  return fetchApi(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAppointment(id: string | number): Promise<any> {
  return fetchApi(`/appointments/${id}`, {
    method: 'DELETE',
  })
}

export async function markAppointmentArrived(id: string | number): Promise<{ message: string; ticket: any }> {
  return fetchApi(`/appointments/${id}/arrive`, { method: 'POST' })
}

// Queue API
export async function getQueueState(): Promise<any> {
  return fetchApi('/queue/state')
}

export async function toggleQueuePause(paused: boolean): Promise<{ paused: boolean }> {
  return fetchApi('/queue/pause', {
    method: 'POST',
    body: JSON.stringify({ paused }),
  })
}

// Equipment API
export async function getEquipment(): Promise<any[]> {
  return fetchApi('/equipment')
}

export async function updateEquipment(id: string | number, data: { status?: string; usage_pct?: number; next_maintenance?: string }): Promise<any> {
  return fetchApi(`/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Reports API
export async function getReports(params?: { status?: string; author?: string; patient_id?: string | number }): Promise<any[]> {
  const query = new URLSearchParams()
  if (params?.status) query.append('status', params.status)
  if (params?.author) query.append('author', params.author)
  if (params?.patient_id) query.append('patient_id', String(params.patient_id))
  return fetchApi(`/reports?${query.toString()}`)
}

export async function getReportById(id: string | number): Promise<any> {
  return fetchApi(`/reports/${id}`)
}

export async function createReport(data: any): Promise<any> {
  return fetchApi('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateReport(id: string | number, data: any): Promise<any> {
  return fetchApi(`/reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function validateReport(id: string | number): Promise<any> {
  return fetchApi(`/reports/${id}/validate`, { method: 'POST' })
}

export async function getReportTemplates(): Promise<any[]> {
  return fetchApi('/report-templates')
}

// Messaging API
export async function getConversations(): Promise<any[]> {
  return fetchApi('/conversations')
}

export async function createConversation(data: { title: string; type?: string; participants?: string[] }): Promise<any> {
  return fetchApi('/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getMessages(conversationId: string | number): Promise<any[]> {
  return fetchApi(`/conversations/${conversationId}/messages`)
}

export async function sendMessage(conversationId: string | number, data: { body: string; sender_name?: string; urgent?: boolean; attachment_url?: string }): Promise<any> {
  return fetchApi(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function markConversationRead(conversationId: string | number, userName?: string): Promise<any> {
  return fetchApi(`/conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({ user_name: userName }),
  })
}

// Calls API
export async function getCalls(): Promise<any[]> {
  return fetchApi('/calls')
}

export async function createCall(data: any): Promise<any> {
  return fetchApi('/calls', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Payments & Tariffs API
export async function getPayments(): Promise<any[]> {
  return fetchApi('/payments')
}

export async function getPaymentSummary(): Promise<any> {
  return fetchApi('/payments/summary')
}

export async function getTariffs(): Promise<any[]> {
  return fetchApi('/tariffs')
}

// Finance API
export async function getFinanceSummary(): Promise<any> {
  return fetchApi('/finance/summary')
}

export async function getTransactions(params?: { type?: string; search?: string }): Promise<any[]> {
  const query = new URLSearchParams()
  if (params?.type) query.append('type', params.type)
  if (params?.search) query.append('search', params.search)
  return fetchApi(`/transactions?${query.toString()}`)
}

export async function createTransaction(data: any): Promise<any> {
  return fetchApi('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getFinanceGoals(): Promise<any[]> {
  return fetchApi('/finance/goals')
}

// Notifications API
export async function getNotifications(): Promise<{ total: number; items: any[] }> {
  return fetchApi('/notifications')
}

// Prescriptions API
export async function getPrescriptions(patientId?: string | number): Promise<any[]> {
  const query = new URLSearchParams()
  if (patientId) query.append('patient_id', String(patientId))
  return fetchApi(`/prescriptions${query.toString() ? `?${query.toString()}` : ''}`)
}

export async function createPrescription(data: any): Promise<any> {
  return fetchApi('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Doctors, Rooms & Secretaries API
export async function getDoctors(): Promise<any[]> {
  return fetchApi<any[]>('/doctors')
}

export async function getRooms(): Promise<any[]> {
  return fetchApi<any[]>('/rooms')
}

export async function getSecretaries(): Promise<any[]> {
  return fetchApi<any[]>('/secretaries')
}
