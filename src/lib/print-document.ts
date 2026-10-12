import DOMPurify from 'dompurify'
import { useClinicPreferencesStore, formatClinicDate } from '@/stores/clinic-preferences-store'
import { usePrintDialogStore } from '@/stores/print-dialog-store'
import { useAccountStore } from '@/stores/account-store'
import { PRINT_TYPES, type PrintType, type PrintJob } from '@/lib/printing'
export const escapeText = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

export function buildPrintDocument(title: string, html: string, type?: string) {
  const p = useClinicPreferencesStore.getState().preferences
  const clinic = p?.clinic
  const name = clinic?.name || 'RadioMed — Clinique de Radiologie'
  const color = p?.documents.color || '#4f46e5'
  const font = p?.documents.font === 'Inter' ? 'CimaInter' : p?.documents.font || 'Arial'
  const extra = type && type !== 'Compte rendu' ? p?.documents.models.find(m => m.type === type && m.default)?.body : ''
  const header = `<header>${clinic?.logo ? `<img alt="Logo" src="${escapeText(clinic.logo)}" style="max-width:70px;max-height:70px;float:right">` : ''}<h1>${escapeText(name)}</h1><p>${[clinic?.address, clinic?.city, clinic?.phone, clinic?.email].filter(Boolean).map(escapeText).join(' · ')}</p>${clinic?.nif ? `<small>NIF : ${escapeText(clinic.nif)}</small>` : ''}</header>`
  const footer = [p?.documents.conditions, p?.documents.footer].filter(Boolean).map(v => `<p>${escapeText(v).replace(/\n/g, '<br>')}</p>`).join('')
  return `<!doctype html><html lang="${escapeText(clinic?.language || 'fr')}"><head><meta charset="utf-8"><link rel="stylesheet" href="${escapeText(new URL(`${import.meta.env.BASE_URL}cima/inter.css`, window.location.origin).href)}"><title>${escapeText(title)}</title><style>body{font-family:"${escapeText(font)}",sans-serif;margin:20mm;color:#111}header{border-bottom:2px solid ${color};padding-bottom:12px;margin-bottom:20px}h1{font-size:22px;color:${color}}h2{font-size:16px}li,p{line-height:1.6}footer{border-top:1px solid #ddd;margin-top:25px;font-size:11px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}@page{size:A4;margin:15mm}</style></head><body>${DOMPurify.sanitize(header)}${extra ? `<p>${escapeText(extra).replace(/\n/g, '<br>')}</p>` : ''}${DOMPurify.sanitize(html.replace(/RadioMed — /g, ''))}${footer ? `<footer>${footer}</footer>` : ''}</body></html>`
}

export async function printDocument(title: string, html: string, type: PrintType = 'Compte rendu', reportId?: number): Promise<PrintJob | null> {
  const { token } = useAccountStore.getState()
  if (!token) throw new Error('Choisissez un compte pour imprimer.')
  if (!PRINT_TYPES.includes(type)) throw new Error('Type de document inconnu.')
  if (usePrintDialogStore.getState().request) throw new Error('Une demande d’impression est déjà ouverte.')
  return new Promise(resolve => usePrintDialogStore.getState().setRequest({
    title, html: buildPrintDocument(title, html, type), type, reportId, token,
    requestId: crypto.randomUUID(), resolve,
  }))
}

export function printPrescription(prescription: any) {
  return printDocument(prescription.prescription_no, `<h1>Ordonnance médicale</h1><p>${escapeText(prescription.prescription_no)} · ${escapeText(formatClinicDate(prescription.date))}</p><p>Patient : ${escapeText(prescription.patient_name)} · Dossier #${escapeText(prescription.patient_id)}</p><p>Médecin : ${escapeText(prescription.doctor_name)}</p><ol>${prescription.medications.map((m: any) => `<li><strong>${escapeText(m.name)}</strong><p>${[m.dosage, m.posology, m.duration].filter(Boolean).map(escapeText).join(' · ')}</p></li>`).join('')}</ol><p>${escapeText(prescription.instructions)}</p><p>Signature et cachet du médecin :</p>`, 'Prescription')
}
