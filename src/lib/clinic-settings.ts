import { fetchApi } from '@/lib/api'
import { useAccountStore } from '@/stores/account-store'
import type { PrintingPolicy } from '@/lib/printing'

export type Permission = { view: boolean; create: boolean; edit: boolean; delete: boolean }
export interface ClinicConfig {
  clinic: Record<string, string>
  taxes: { regime: string; items: Array<{ id: string; name: string; rate: number; type: string; active: boolean; default: boolean }> }
  currencies: Array<{ code: string; name: string; rate: number; active: boolean; updated_at: string | null }>
  payments: Array<{ id: string; name: string; active: boolean }>
  documents: { conditions: string; footer: string; color: string; font: string; models: Array<{ id: string; name: string; type: string; default: boolean; body: string }> }
  notifications: { channels: { application: boolean; email: boolean; sms: boolean }; items: Array<{ id: string; name: string; description: string; active: boolean; threshold?: number; unit?: string }> }
  security: { automatic_backup: boolean; backup_time: string; retention: number; encrypted_backup: boolean; session_timeout: number }
  permissions: Record<string, Record<string, Permission>>
  printing: PrintingPolicy
}
export type ClinicPreferences = Pick<ClinicConfig, 'clinic' | 'documents' | 'payments' | 'currencies' | 'taxes' | 'permissions'> & { security: { session_timeout: number } }
export interface Backup { name: string; size: number; created_at: string }
export interface ClinicSystem { version: string; mode: string; database_size: number; connected_users: number; backups: Backup[] }
export interface AuditLog { id: number; actor: string; action: string; target: string; created_at: string }
export const getClinicConfig = () => fetchApi<ClinicConfig>('/clinic-config')
export const getClinicPreferences = () => fetchApi<ClinicPreferences>('/clinic-preferences')
export const saveClinicSection = <K extends keyof ClinicConfig>(section: K, data: ClinicConfig[K]) => fetchApi<ClinicConfig[K]>(`/clinic-config/${section}`, { method: 'PUT', body: JSON.stringify(data) })
export const getClinicSystem = () => fetchApi<ClinicSystem>('/clinic-config/system')
export const getClinicJournal = (from = '') => fetchApi<AuditLog[]>(`/clinic-config/journal?from=${encodeURIComponent(from)}`)
export const createClinicBackup = () => fetchApi<Backup>('/clinic-config/backup', { method: 'POST' })
export async function downloadClinicBackup(name: string) {
  const response = await fetch(`/api/clinic-config/backup/${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${useAccountStore.getState().token}` } })
  if (!response.ok) throw new Error('Impossible de télécharger la sauvegarde.')
  const url = URL.createObjectURL(await response.blob()), link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function downloadCsv(name: string, rows: unknown[][]) {
  const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
