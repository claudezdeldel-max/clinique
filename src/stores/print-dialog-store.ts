import { create } from 'zustand'
import type { PrintJob, PrintType } from '@/lib/printing'

export interface PrintRequest {
  title: string; html: string; type: PrintType; reportId?: number; token: string; requestId: string
  resolve: (job: PrintJob | null) => void
}
export const usePrintDialogStore = create<{ request: PrintRequest | null; setRequest: (request: PrintRequest | null) => void }>(set => ({
  request: null, setRequest: request => set({ request }),
}))
