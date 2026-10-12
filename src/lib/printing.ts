import { fetchApi } from '@/lib/api'

export const PRINT_TYPES = ['Compte rendu', 'Prescription', 'Quittance', 'Fiche patient', 'Ticket'] as const
export type PrintType = typeof PRINT_TYPES[number]
export interface PrintRule {
  enabled: boolean; printers: string[] | null; documents: PrintType[]; default_printer: string
  max_copies: number; color: boolean; duplex: boolean
}
export interface PrintingPolicy {
  printers: Record<string, { enabled: boolean; paper: 'A4' | '80mm' | '58mm' }>
  roles: Record<string, PrintRule>; users: Record<string, PrintRule>
}
export interface InstalledPrinter {
  name: string; driver: string; port: string; is_default: boolean; offline: boolean; network: boolean
  status: number; supports_color: boolean; supports_duplex: boolean; kind: 'physical' | 'pdf' | 'external'; managed: boolean; note: string
}
export interface PrinterSettings {
  computer: string; detected_at: string; printers: InstalledPrinter[]; policy: PrintingPolicy
  accounts: Array<{ id: number; name: string; role: string; active: boolean }>; roles: Array<{ id: string; name: string }>
}
export interface PrinterChoices { computer: string; printers: InstalledPrinter[]; rule: PrintRule; default_printer: string }
export interface PrintJob {
  id: string; actor: string; printer: string; document_type: PrintType; title: string; copies: number
  status: 'preparing' | 'submitted' | 'pdf' | 'failed'; created_at: string; error?: string
}
export const newPrintRule = (enabled = false): PrintRule => ({ enabled, printers: null, documents: [...PRINT_TYPES], default_printer: '', max_copies: 10, color: true, duplex: true })
export const getPrinterSettings = () => fetchApi<PrinterSettings>('/printing/settings')
export const getPrinterChoices = (type: PrintType) => fetchApi<PrinterChoices>(`/printing/choices?type=${encodeURIComponent(type)}`)
export const getPrintJobs = () => fetchApi<PrintJob[]>('/printing/jobs')
