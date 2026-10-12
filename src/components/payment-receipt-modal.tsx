"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Activity, FileText } from "lucide-react"
import type { StudentPayment } from "@/hooks/use-school-data"
import { printDocument, escapeText } from '@/lib/print-document'
import { useClinicPreferencesStore, formatClinicMoney, formatClinicDate } from '@/stores/clinic-preferences-store'
import { toast } from 'sonner'

interface PaymentReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: StudentPayment | null
}

export function PaymentReceiptModal({ open, onOpenChange, payment }: PaymentReceiptModalProps) {
  const preferences = useClinicPreferencesStore(s => s.preferences)
  if (!payment) return null
  let fiscal: { currency: string; rate: number; tax_name: string; tax_rate: number; regime: string } | null = null
  try { fiscal = JSON.parse(payment.fiscal_json || 'null') } catch { /* Older receipts have no fiscal snapshot. */ }
  const money = (amount: number) => fiscal ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: fiscal.currency }).format(amount / fiscal.rate) : formatClinicMoney(amount)
  const taxAmount = fiscal?.tax_rate ? payment.total_fee - payment.total_fee / (1 + fiscal.tax_rate / 100) : 0

  const handlePrint = () => {
    void printDocument(payment.receipt_no, `<h2>Quittance ${escapeText(payment.receipt_no)}</h2><p>${escapeText(formatClinicDate(payment.date))}</p><p>Patient : ${escapeText(payment.student_name)}</p><p>Examen : ${escapeText(payment.grade)}</p><p>Mode de règlement : ${escapeText(payment.payment_method)}</p><table><tr><th>Honoraires TTC</th><td>${escapeText(money(payment.total_fee))}</td></tr>${taxAmount ? `<tr><th>Dont ${escapeText(fiscal!.tax_name)} (${fiscal!.tax_rate} %)</th><td>${escapeText(money(taxAmount))}</td></tr>` : ''}<tr><th>Réglé</th><td>${escapeText(money(payment.paid_amount))}</td></tr><tr><th>Solde</th><td>${escapeText(money(payment.due_balance))}</td></tr></table><p>Cachet de la clinique et signature</p>`, 'Quittance').catch(err => toast.error(err.message))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        {/* Printable Area */}
        <div id="printable-receipt" className="p-6 space-y-6 bg-white dark:bg-zinc-950 text-foreground">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{preferences?.clinic.name || 'RadioMed OS'}</h2>
                <p className="text-xs text-muted-foreground">Clinique de Radiologie & Imagerie Médicale</p>
                <p className="text-[10px] text-muted-foreground">{[preferences?.clinic.address, preferences?.clinic.city, preferences?.clinic.phone].filter(Boolean).join(' • ')}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="font-mono text-xs mb-1">
                {payment.receipt_no}
              </Badge>
              <p className="text-[11px] text-muted-foreground">Date: {formatClinicDate(payment.date)}</p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3.5 rounded-lg text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px]">Patient Examéné</span>
              <strong className="text-sm font-semibold text-foreground">{payment.student_name}</strong>
              <p className="text-muted-foreground mt-0.5">Examen: {payment.grade}</p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px]">Prescription & Période</span>
              <strong className="text-sm font-semibold text-foreground">{payment.period}</strong>
              <p className="text-muted-foreground mt-0.5">Règlement: {payment.payment_method}</p>
            </div>
          </div>

          {/* Billing Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Détail des Frais d'Imagerie Médicale
            </h4>
            <div className="rounded-lg border overflow-hidden text-xs">
              <div className="flex justify-between p-2.5 bg-muted/50 font-medium">
                <span>Désignation de l'Acte</span>
                <span>Montant ({fiscal?.currency || preferences?.clinic.currency || 'DZD'})</span>
              </div>
              <div className="flex justify-between p-2.5 border-t">
                <span>Honoraires Examen Radiologique ({payment.grade})</span>
                <span>{money(payment.total_fee)}</span>
              </div>
              {taxAmount > 0 && <div className="flex justify-between p-2.5 border-t"><span>Dont {fiscal?.tax_name} ({fiscal?.tax_rate} %)</span><span>{money(taxAmount)}</span></div>}
              <div className="flex justify-between p-2.5 border-t bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>Montant Réglé / Tiers Payant CPAM</span>
                <span>- {money(payment.paid_amount)}</span>
              </div>
              <div className={`flex justify-between p-2.5 border-t font-bold text-sm ${payment.due_balance > 0 ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" : "bg-muted/30"}`}>
                <span>Solde Restant à Charge Patient</span>
                <span>{money(payment.due_balance)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature Stamp */}
          <div className="flex items-end justify-between pt-4 border-t text-[11px]">
            <div>
              <p className="font-semibold">Statut du Règlement :</p>
              <Badge variant={payment.payment_status === "Paid" ? "default" : "secondary"}>
                {payment.payment_status === "Paid" ? "Réglé / Tiers Payant CPAM" : payment.payment_status === "Partial" ? "Acompte Versé" : "Règlement En Attente"}
              </Badge>
            </div>
            <div className="text-center border-t border-dashed pt-2 px-6">
              <p className="text-[10px] text-muted-foreground italic">Cachet de la Clinique & Signature</p>
              <div className="h-8"></div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <DialogHeader className="sr-only">
          <DialogTitle>Quittance d'Examen Radiologique</DialogTitle>
          <DialogDescription>Ticket de caisse imprimable</DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-4 bg-muted/30 border-t flex flex-row items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handlePrint} className="gap-2 cursor-pointer">
            <Printer className="h-4 w-4" />
            Imprimer le Reçu Medical
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
