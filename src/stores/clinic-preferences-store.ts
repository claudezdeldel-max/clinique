import { create } from 'zustand'
import { getClinicPreferences, type ClinicPreferences } from '@/lib/clinic-settings'
import { useAccountStore } from '@/stores/account-store'

interface PreferenceState { preferences: ClinicPreferences | null; refresh: () => Promise<void>; clear: () => void }
export const useClinicPreferencesStore = create<PreferenceState>((set) => ({
  preferences: null,
  refresh: async () => { const token = useAccountStore.getState().token; const preferences = await getClinicPreferences(); if (useAccountStore.getState().token === token) set({ preferences }) },
  clear: () => set({ preferences: null }),
}))
export function usePaymentMethods() {
  const preferences = useClinicPreferencesStore(s => s.preferences)
  return preferences?.payments.filter(p => p.active).map(p => p.name) || ['Espèces', 'Chifa / Tiers Payant', 'Carte bancaire', 'Chèque', 'Virement bancaire']
}

export function formatClinicMoney(amountDzd: number) {
  const p = useClinicPreferencesStore.getState().preferences
  const currency = p?.clinic.currency || 'DZD'
  const rate = p?.currencies.find(c => c.code === currency && c.active)?.rate || 1
  return new Intl.NumberFormat(p?.clinic.language || 'fr', { style: 'currency', currency }).format(amountDzd / rate)
}

export function formatClinicDate(value: string | Date = new Date()) {
  const p = useClinicPreferencesStore.getState().preferences
  const fr = typeof value === 'string' && /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value)
  const date = value instanceof Date ? value : new Date(fr ? `${fr[3]}-${fr[2]}-${fr[1]}T12:00:00Z` : value)
  if (!Number.isFinite(date.getTime())) return String(value)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: p?.clinic.timezone || 'Africa/Algiers', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(date)
  const part = (name: string) => parts.find(p => p.type === name)?.value || ''
  const [day, month, year] = ['day', 'month', 'year'].map(part)
  return p?.clinic.date_format === 'yyyy-MM-dd' ? `${year}-${month}-${day}` : p?.clinic.date_format === 'MM/dd/yyyy' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`
}
