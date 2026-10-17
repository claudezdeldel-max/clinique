"use client"

import { useState,useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table"
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Printer,CreditCard,Search,RefreshCcw,CheckCircle2,Clock,Tag,FileText,ArrowDown } from "lucide-react"
import { useSchoolData } from "@/hooks/use-school-data"
import { AddPaymentModal } from "@/components/add-payment-modal"
import { PaymentReceiptModal } from "@/components/payment-receipt-modal"
import { fetchApi } from "@/lib/api"
import { usePaymentMethods } from "@/stores/clinic-preferences-store"
import { toast } from "sonner"

function cleanString(str: string): string {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isSamePatient(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false
  const n1 = cleanString(name1)
  const n2 = cleanString(name2)
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true

  const words1 = n1.split(/[^a-z0-9]+/).filter((w) => w.length > 1)
  const words2 = n2.split(/[^a-z0-9]+/).filter((w) => w.length > 1)
  if (words1.length === 0 || words2.length === 0) return false

  return words1.every((w) => n2.includes(w)) || words2.every((w) => n1.includes(w))
}

function isSameExam(exam1: string, exam2: string): boolean {
  if (!exam1 || !exam2) return true
  const e1 = cleanString(exam1)
  const e2 = cleanString(exam2)
  if (e1 === e2 || e1.includes(e2) || e2.includes(e1)) return true

  const modalities = ['irm', 'scanner', 'ct', 'radio', 'echo', 'mammo', 'xray']
  for (const m of modalities) {
    if (e1.includes(m) && e2.includes(m)) return true
  }
  return false
}

export default function PaymentsPage() {
  const paymentMethods = usePaymentMethods()
  const { studentPayments = [], refetch } = useSchoolData()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [queueFilterStatus, setQueueFilterStatus] = useState<"pending" | "settled" | "all">("pending")
  const [activeTab, setActiveTab] = useState<"completed-queue" | "balances" | "history">("completed-queue")

  // Live direct payments list
  const [paymentsList, setPaymentsList] = useState<any[]>([])
  const [, setLoadingPayments] = useState(true)

  // Queue completed patients pending settlement state
  const [completedQueueItems, setCompletedQueueItems] = useState<any[]>([])
  const [loadingQueue, setLoadingQueue] = useState(true)

  // Patient Balances & History state
  const [patientBalances, setPatientBalances] = useState<any[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  // Settle Payment Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [selectedTicketToPay, setSelectedTicketToPay] = useState<any>(null)
  const [settleForm, setSettleForm] = useState({
    paid_amount: '',
    remise_amount: '0',
    payment_method: paymentMethods[0] || 'Espèces',
    period: `${new Date().toLocaleString('fr-FR', { month: 'long' })} ${new Date().getFullYear()}`,
    notes: '',
  })
  useEffect(() => { if (!paymentMethods.includes(settleForm.payment_method)) setSettleForm(f => ({ ...f, payment_method: paymentMethods[0] || '' })) }, [paymentMethods.join('|'), settleForm.payment_method])
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const fetchPaymentsList = async (isInitial = false) => {
    if (isInitial && paymentsList.length === 0) setLoadingPayments(true)
    try {
      const data = await fetchApi<any[]>('/payments').catch(() => null)
      if (data && Array.isArray(data)) {
        setPaymentsList(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPayments(false)
    }
  }

  const fetchCompletedQueuePatients = async (isInitial = false) => {
    if (isInitial && completedQueueItems.length === 0) setLoadingQueue(true)
    try {
      const data = await fetchApi<any[]>('/payments/queue-completed').catch(() => null)
      if (!data && completedQueueItems.length > 0) return

      let localExtra: any[] = []
      if (typeof window !== 'undefined') {
        try {
          const rawLocal = localStorage.getItem('radiomed_queue_data_v1')
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal)
            if (Array.isArray(parsed)) {
              const localCompleted = parsed.filter(
                (item) => item.status === 'completed' || item.status === 'terminé' || item.status === 'done'
              )
              localCompleted.forEach((item) => {
                const pName = item.patient_name || item.name || 'Patient'
                const exam = item.modality_name || item.exam_type || 'IRM Cérébrale'
                const exists = (data || []).some(
                  (d) => d && isSamePatient(d.patient_name, pName) && isSameExam(d.exam_type, exam)
                )
                if (!exists) {
                  const defaultPrice = exam.includes('IRM')
                    ? 8500
                    : exam.includes('Scanner')
                    ? 7000
                    : exam.includes('Radio')
                    ? 2500
                    : exam.includes('Écho')
                    ? 6000
                    : 5000
                  const stableLocalId = item.id
                    ? `local_${item.id}`
                    : `local_${pName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${exam.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                  localExtra.push({
                    ticket_id: stableLocalId,
                    ticket_number: item.ticket_number || String(item.id || '01').padStart(2, '0'),
                    patient_name: pName,
                    exam_type: exam,
                    doctor_name: item.doctor_name || 'Dr. Rahmane',
                    completed_at: item.completed_at || new Date().toISOString(),
                    price: defaultPrice,
                    payment: null,
                  })
                }
              })
            }
          }
        } catch (e) {}
      }

      setCompletedQueueItems([...(data || []), ...localExtra])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingQueue(false)
    }
  }

  const fetchPatientBalances = async (isInitial = false) => {
    if (isInitial && patientBalances.length === 0) setLoadingBalances(true)
    try {
      const data = await fetchApi<any[]>('/payments/patient-balances').catch(() => null)
      if (data && Array.isArray(data)) {
        setPatientBalances(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingBalances(false)
    }
  }

  const fetchAllData = async (isInitial = false) => {
    await Promise.all([
      fetchPaymentsList(isInitial),
      fetchCompletedQueuePatients(isInitial),
      fetchPatientBalances(isInitial),
      refetch(),
    ])
  }

  useEffect(() => {
    fetchAllData(true)
    const interval = setInterval(() => fetchAllData(false), 2000)
    const handleFocus = () => fetchAllData(false)
    const handleCustomUpdate = () => fetchAllData(false)

    window.addEventListener('focus', handleFocus)
    window.addEventListener('radiomed-payment-updated', handleCustomUpdate)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('radiomed-payment-updated', handleCustomUpdate)
    }
  }, [])

  // Consolidate payments list from direct fetch or hook fallback
  const safePayments = paymentsList.length > 0 ? paymentsList : (Array.isArray(studentPayments) ? studentPayments : [])

  const filteredPayments = safePayments.filter((p) => {
    const studentName = p?.student_name || p?.patient_name || ""
    const receiptNo = p?.receipt_no || ""
    const paymentStatus = p?.payment_status || ""
    
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          receiptNo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || paymentStatus.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const filteredQueueCompleted = completedQueueItems.filter((item) => {
    if (!item) return false
    const isPaid = !!item.payment
    if (queueFilterStatus === 'pending' && isPaid) return false
    if (queueFilterStatus === 'settled' && !isPaid) return false

    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    const pName = String(item.patient_name || "")
    const exam = String(item.exam_type || "")
    const ticketNo = String(item.ticket_number || "")
    return (
      pName.toLowerCase().includes(q) ||
      exam.toLowerCase().includes(q) ||
      ticketNo.toLowerCase().includes(q)
    )
  })

  const filteredBalances = patientBalances.filter((pb) => {
    if (!pb) return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    const pName = String(pb.patient_name || "")
    return pName.toLowerCase().includes(q)
  })

  // Synchronized Metric Calculations (Safe number coercion to prevent precision offset)
  const totalCollected = safePayments.reduce((sum, p) => sum + (parseFloat(p?.paid_amount) || 0), 0)
  const totalTariffsValue = safePayments.reduce((sum, p) => sum + (parseFloat(p?.total_fee) || 0), 0)
  const totalDue = safePayments.reduce((sum, p) => sum + (parseFloat(p?.due_balance) || 0), 0)

  const totalRemises = safePayments.reduce((sum, p) => {
    const fee = parseFloat(p?.total_fee) || 0
    const paid = parseFloat(p?.paid_amount) || 0
    const due = parseFloat(p?.due_balance) || 0
    const rem = fee - paid - due
    return sum + (rem > 0 ? rem : 0)
  }, 0)

  // Payment Methods Breakdown
  const espècesTotal = safePayments
    .filter((p) => (p?.payment_method || '').toLowerCase().includes('espèce') || (p?.payment_method || '').toLowerCase().includes('comptant'))
    .reduce((sum, p) => sum + (parseFloat(p?.paid_amount) || 0), 0)

  const cbTotal = safePayments
    .filter((p) => (p?.payment_method || '').toLowerCase().includes('carte') || (p?.payment_method || '').toLowerCase().includes('cib'))
    .reduce((sum, p) => sum + (parseFloat(p?.paid_amount) || 0), 0)

  const chifaTotal = safePayments
    .filter((p) => (p?.payment_method || '').toLowerCase().includes('chifa') || (p?.payment_method || '').toLowerCase().includes('tiers'))
    .reduce((sum, p) => sum + (parseFloat(p?.paid_amount) || 0), 0)

  const chèqueTotal = safePayments
    .filter((p) => (p?.payment_method || '').toLowerCase().includes('chèque') || (p?.payment_method || '').toLowerCase().includes('virement'))
    .reduce((sum, p) => sum + (parseFloat(p?.paid_amount) || 0), 0)

  // Collection Ratio (Taux d'encaissement)
  const recoveryRate = totalTariffsValue > 0 ? Math.min(100, Math.round((totalCollected / totalTariffsValue) * 100)) : 100

  // Pending Queue Metrics
  const pendingQueueItems = completedQueueItems.filter((item) => item && !item.payment)
  const pendingCount = pendingQueueItems.length
  const pendingQueueAmount = pendingQueueItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
  const avgPendingPrice = pendingCount > 0 ? Math.round(pendingQueueAmount / pendingCount) : 0

  // Receipt Status Breakdown
  const paidCount = safePayments.filter((p) => p.payment_status === 'Paid' || p.payment_status === 'Payé').length
  const partialCount = safePayments.filter((p) => p.payment_status === 'Partial' || p.payment_status === 'Partiel').length
  const overdueCount = safePayments.filter((p) => p.payment_status === 'Overdue' || p.payment_status === 'En attente').length

  const handleOpenSettleModal = (ticketItem: any) => {
    const now = new Date()
    const nowFormatted = `${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

    setSelectedTicketToPay(ticketItem)
    setSettleForm({
      paid_amount: String(ticketItem.price || 8500),
      remise_amount: '0',
      payment_method: paymentMethods[0] || 'Espèces',
      period: nowFormatted,
      notes: '',
    })
    setSettleModalOpen(true)
  }

  const handleConfirmSettlePayment = async () => {
    if (!selectedTicketToPay) return
    setSubmittingPayment(true)
    try {
      const now = new Date()
      const nowFormatted = `${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

      if (!selectedTicketToPay.patient_id) throw new Error('Associez ce passage à un dossier patient avant de le régler.')
      const payload = {
        patient_id: selectedTicketToPay.patient_id,
        queue_id: selectedTicketToPay.queue_id,
        appointment_id: selectedTicketToPay.appointment_id,
        patient_name: selectedTicketToPay.patient_name,
        exam_type: selectedTicketToPay.exam_type,
        total_fee: selectedTicketToPay.price,
        remise_amount: parseFloat(settleForm.remise_amount) || 0,
        paid_amount: parseFloat(settleForm.paid_amount) || selectedTicketToPay.price,
        payment_method: settleForm.payment_method,
        period: `${settleForm.period || nowFormatted} (Ticket #${selectedTicketToPay.ticket_number})`,
        date: nowFormatted,
      }

      const created = await fetchApi<any>('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const formattedPayment = {
        fiscal_json: created.fiscal_json,
        id: created.id || Date.now(),
        receipt_no: created.receipt_no,
        student_id: created.patient_id,
        patient_id: created.patient_id,
        patient_name: created.patient_name,
        student_name: created.patient_name,
        exam_type: created.exam_type,
        grade: created.exam_type,
        period: created.period,
        total_fee: created.total_fee,
        paid_amount: created.paid_amount,
        due_balance: created.due_balance,
        payment_status: created.payment_status,
        payment_method: created.payment_method,
        date: created.date,
      }

      // Optimistic Instant Update: Add to payments history & mark queue item settled
      setPaymentsList((prev) => [formattedPayment, ...prev.filter(p => p.id !== formattedPayment.id)])

      setCompletedQueueItems((prev) =>
        prev.map((item) =>
          item.ticket_id === selectedTicketToPay.ticket_id
            ? { ...item, payment: formattedPayment }
            : item
        )
      )

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('radiomed-payment-updated'))
      }

      toast.success(`Paiement de ${created.paid_amount} DA encaissé pour ${created.patient_name} !`)
      setSettleModalOpen(false)
      setSelectedReceipt(formattedPayment)
      setReceiptOpen(true)
      fetchAllData(false)
    } catch (err) {
      console.error(err)
      toast.error((err as Error).message || 'Erreur lors du traitement du règlement.')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handlePrintClick = (payment: any) => {
    setSelectedReceipt(payment)
    setReceiptOpen(true)
  }

  return (
    <BaseLayout title="Caisse & Règlement des Patients" description="Encaissements des examens terminés dans la file d'attente et gestion des quittances">
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-0">
        
        {/* Synchronized Overview Stats Cards Header */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Encaissé */}
          <Card className="border-2 shadow-xs bg-card hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardDescription className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Encaissé
                </CardDescription>
                <CardTitle className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {totalCollected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </CardTitle>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <ArrowDown className="h-5 w-5" />
              </div>
            </CardHeader>

            <CardContent className="pt-2 space-y-1.5 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Taux de Recouvrement :</span>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                  {recoveryRate}%
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>💵 Espèces: <strong className="text-foreground">{espècesTotal.toLocaleString('fr-FR')} DA</strong></span>
                <span>💳 CB: <strong className="text-foreground">{cbTotal.toLocaleString('fr-FR')} DA</strong></span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>🏥 Chifa: <strong className="text-foreground">{chifaTotal.toLocaleString('fr-FR')} DA</strong></span>
                <span>📜 Autre: <strong className="text-foreground">{chèqueTotal.toLocaleString('fr-FR')} DA</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Examens à Encaisser */}
          <Card className="border-2 shadow-xs bg-card hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardDescription className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  À encaisser
                </CardDescription>
                <CardTitle className={`text-2xl font-black mt-1 ${pendingCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {pendingCount} Patient(s)
                </CardTitle>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardHeader>

            <CardContent className="pt-2 space-y-1.5 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Montant à Percevoir :</span>
                <span className="font-mono font-bold text-amber-600">{pendingQueueAmount.toLocaleString('fr-FR')} DA</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>Panier Moyen :</span>
                <span className="font-mono font-bold text-foreground">{avgPendingPrice.toLocaleString('fr-FR')} DA / examen</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic pt-0.5">
                Paiements d'examens terminés en attente de caisse
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Quittances Générées */}
          <Card className="border-2 shadow-xs bg-card hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardDescription className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Quittances
                </CardDescription>
                <CardTitle className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                  {safePayments.length} Quittances
                </CardTitle>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                <Printer className="h-5 w-5" />
              </div>
            </CardHeader>

            <CardContent className="pt-2 space-y-1.5 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Valeur Totale Actes :</span>
                <span className="font-mono font-bold text-foreground">{totalTariffsValue.toLocaleString('fr-FR')} DA</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>Statuts Quittances :</span>
                <span className="font-bold text-emerald-600">✅ {paidCount} Payées</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Acomptes & Attente :</span>
                <span className="font-bold text-amber-600">⚠️ {partialCount} Partiels / 🔴 {overdueCount} Dûs</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Remises & Dettes Restantes */}
          <Card className="border-2 shadow-xs bg-card hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardDescription className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Solde dû
                </CardDescription>
                <CardTitle className={`text-2xl font-black font-mono mt-1 ${totalDue > 0 ? "text-rose-600" : "text-slate-700 dark:text-slate-200"}`}>
                  {totalDue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </CardTitle>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                <Tag className="h-5 w-5" />
              </div>
            </CardHeader>

            <CardContent className="pt-2 space-y-1.5 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Remises Accordées :</span>
                <span className="font-mono font-bold text-purple-600">{totalRemises.toLocaleString('fr-FR')} DA</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>Part Dettes / Prestations :</span>
                <span className="font-mono font-bold text-rose-600">
                  {totalTariffsValue > 0 ? ((totalDue / totalTariffsValue) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground italic pt-0.5">
                Gestion des relances et soldes dans l'onglet Débiteurs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'completed-queue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('completed-queue')}
            className="gap-2 font-bold cursor-pointer"
          >
            <Clock className="h-4 w-4" />
            Patients Terminés en File ({pendingCount})
          </Button>

          <Button
            variant={activeTab === 'balances' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('balances')}
            className="gap-2 font-bold cursor-pointer"
          >
            <Tag className="h-4 w-4" />
            Soldes & Historiques Patients ({patientBalances.length})
          </Button>

          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="gap-2 font-bold cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Registre Général des Quittances ({safePayments.length})
          </Button>
        </div>

        {/* TAB 1: QUEUE COMPLETED PATIENTS PENDING SETTLEMENT */}
        {activeTab === 'completed-queue' && (
          <Card className="border-2 shadow-xs">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b bg-muted/20">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Examens Terminés — Règlements à Effectuer
                </CardTitle>
                <CardDescription>
                  Liste des patients ayant terminé leur passage en salle d'examen. Cliquez sur "Régler le Paiement" pour appliquer le tarif configuré dans Finance.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchCompletedQueuePatients()} className="gap-1 cursor-pointer text-xs">
                  <RefreshCcw className="h-3.5 w-3.5" /> Actualiser File
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-1 items-center space-x-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-[280px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher patient ou ticket..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <Select value={queueFilterStatus} onValueChange={(val: any) => setQueueFilterStatus(val)}>
                    <SelectTrigger className="w-[190px] text-xs font-bold">
                      <SelectValue placeholder="Filtre File" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ À Régler (File Active)</SelectItem>
                      <SelectItem value="settled">✅ Déjà Réglés (Encaissés)</SelectItem>
                      <SelectItem value="all">📋 Tous les examens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  Tarifs synchronisés depuis l'espace <strong className="text-primary">Finance</strong>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-20 font-semibold">Ticket #</TableHead>
                      <TableHead className="font-semibold">Patient</TableHead>
                      <TableHead className="font-semibold">Examen Réalisé</TableHead>
                      <TableHead className="font-semibold">Médecin Radiologue</TableHead>
                      <TableHead className="text-right font-semibold">Tarif Appliqué (Finance)</TableHead>
                      <TableHead className="text-center font-semibold">Statut Règlement</TableHead>
                      <TableHead className="text-right font-semibold">Action Caisse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingQueue ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          Chargement des patients de la file d'attente...
                        </TableCell>
                      </TableRow>
                    ) : filteredQueueCompleted.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          Aucun patient terminé en attente de règlement.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQueueCompleted.map((item, idx) => {
                        const isPaid = !!item.payment
                        const rowKey = item.ticket_id || `queue-${item.patient_name}-${item.exam_type}-${idx}`
                        return (
                          <TableRow key={rowKey} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-sm font-black text-primary">
                              #{item.ticket_number}
                            </TableCell>

                            <TableCell className="font-bold text-sm text-foreground">
                              {item.patient_name}
                            </TableCell>

                            <TableCell>
                              <div className="font-semibold text-xs text-primary">{item.exam_type}</div>
                              <div className="text-[11px] text-muted-foreground">Complété le {new Date(item.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </TableCell>

                            <TableCell className="text-xs font-medium text-muted-foreground">
                              {item.doctor_name}
                            </TableCell>

                            <TableCell className="text-right font-black text-base font-mono text-emerald-600">
                              {item.price?.toLocaleString('fr-FR')} DA
                            </TableCell>

                            <TableCell className="text-center">
                              {isPaid ? (
                                <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Payé ({item.payment.receipt_no})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold text-xs">
                                  À Régler
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              {isPaid ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintClick(item.payment)}
                                  className="h-8 text-xs font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 cursor-pointer gap-1"
                                >
                                  <Printer className="h-3.5 w-3.5" /> Quittance
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenSettleModal(item)}
                                  className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <CreditCard className="h-3.5 w-3.5" /> Régler le Paiement
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: GENERAL PAYMENTS REGISTER HISTORY */}
        {activeTab === 'history' && (
          <Card className="border-2 shadow-xs">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Registre Général des Règlements & Quittances
                </CardTitle>
                <CardDescription>
                  Historique complet des encaissements enregistrés
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <AddPaymentModal onPaymentAdded={fetchAllData} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-1 items-center space-x-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou N° quittance..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[170px] text-xs">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="paid">Payé / Tiers Payant</SelectItem>
                      <SelectItem value="partial">Acompte (Solde dû)</SelectItem>
                      <SelectItem value="overdue">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  {filteredPayments.length} règlement(s) répertorié(s)
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">N° Quittance</TableHead>
                      <TableHead className="font-semibold">Patient & Examen</TableHead>
                      <TableHead className="font-semibold">Période</TableHead>
                      <TableHead className="text-right font-semibold">Tarif Examen</TableHead>
                      <TableHead className="text-right font-semibold">Montant Payé</TableHead>
                      <TableHead className="text-right font-semibold">Reste à Charge</TableHead>
                      <TableHead className="text-center font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold">Règlement</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((payment, idx) => {
                        const rowKey = payment.id
                          ? `pay-${payment.id}`
                          : payment.receipt_no
                          ? `receipt-${payment.receipt_no}`
                          : `pay-idx-${idx}`
                        return (
                          <TableRow key={rowKey} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {payment.receipt_no || "RAD-2026-000"}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-sm text-foreground">{payment.student_name || "Patient"}</div>
                            <div className="text-xs text-muted-foreground">{payment.grade || "Examen"}</div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{payment.period || "Septembre 2026"}</TableCell>
                          <TableCell className="text-right font-medium">{(payment.total_fee || 0).toFixed(2)} DA</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {(payment.paid_amount || 0).toFixed(2)} DA
                          </TableCell>
                          <TableCell className={`text-right font-bold ${(payment.due_balance || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {(payment.due_balance || 0).toFixed(2)} DA
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              payment.payment_status === "Paid" ? "default" :
                              payment.payment_status === "Partial" ? "secondary" : "destructive"
                            }>
                              {payment.payment_status === "Paid" ? "Payé" : payment.payment_status === "Partial" ? "Partiel" : "En attente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{payment.payment_method || "Espèces"}</TableCell>
                          <TableCell className="text-xs">{payment.date || "2026-08-28"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handlePrintClick(payment)} className="gap-1 cursor-pointer text-xs font-bold">
                              <Printer className="h-3.5 w-3.5" />
                              Quittance
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          Aucun règlement trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: PATIENT BALANCES & TRANSACTION HISTORY */}
        {activeTab === 'balances' && (
          <Card className="border-2 shadow-xs">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b bg-muted/20">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <Tag className="h-5 w-5 text-amber-500" />
                  Soldes & Historiques Financiers par Patient
                </CardTitle>
                <CardDescription>
                  Suivi des comptes patients, cumuls d'actes d'imagerie, remises accordées et soldes restants à régler.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchPatientBalances()} className="gap-1 cursor-pointer text-xs">
                  <RefreshCcw className="h-3.5 w-3.5" /> Actualiser Soldes
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer par nom de patient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-semibold">Patient</TableHead>
                      <TableHead className="text-center font-semibold">Nb Examens</TableHead>
                      <TableHead className="text-right font-semibold">Total Honoraires</TableHead>
                      <TableHead className="text-right font-semibold">Total Payé</TableHead>
                      <TableHead className="text-right font-semibold">Solde Dû (Reste)</TableHead>
                      <TableHead className="text-center font-semibold">Statut Compte</TableHead>
                      <TableHead className="text-right font-semibold">Historique Quittances</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBalances ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          Chargement des soldes des patients...
                        </TableCell>
                      </TableRow>
                    ) : filteredBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          Aucun compte patient trouvé.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBalances.map((pb, idx) => {
                        const isOverdue = pb.due_balance > 0
                        const rowKey = pb.patient_id
                          ? `bal-${pb.patient_id}`
                          : pb.patient_name
                          ? `bal-${pb.patient_name}`
                          : `bal-idx-${idx}`
                        return (
                          <TableRow key={rowKey} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-bold text-sm text-foreground">
                              {pb.patient_name}
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold text-xs">
                              {pb.total_exams} acte(s)
                            </TableCell>

                            <TableCell className="text-right font-mono font-semibold text-xs">
                              {pb.total_fee.toLocaleString('fr-FR')} DA
                            </TableCell>

                            <TableCell className="text-right font-mono font-bold text-emerald-600 text-xs">
                              {pb.total_paid.toLocaleString('fr-FR')} DA
                            </TableCell>

                            <TableCell className={`text-right font-mono font-extrabold text-sm ${isOverdue ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {pb.due_balance.toLocaleString('fr-FR')} DA
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge variant={isOverdue ? 'destructive' : 'default'} className="text-[10px] font-bold">
                                {isOverdue ? `Reste ${pb.due_balance} DA` : 'Compte Soldé'}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPatientHistory(pb)
                                  setHistoryModalOpen(true)
                                }}
                                className="h-8 text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5" /> Historique ({pb.history.length})
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settlement Modal: Settle Payment for Queue Completed Patient */}
      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <CreditCard className="h-5 w-5" /> Encaissement du Patient — File d'Attente
            </DialogTitle>
            <DialogDescription>
              Règlement de la prestation médicale avec possibilité de remise accordée.
            </DialogDescription>
          </DialogHeader>

          {selectedTicketToPay && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-sm text-foreground border-b pb-1">
                  <span>Patient : {selectedTicketToPay.patient_name}</span>
                  <span className="font-mono text-primary">Ticket #{selectedTicketToPay.ticket_number}</span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-0.5">
                  <span>Examen Réalisé : <strong>{selectedTicketToPay.exam_type}</strong></span>
                  <span>Médecin : {selectedTicketToPay.doctor_name}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-semibold text-foreground">Tarif Examen (Finance) :</span>
                  <span className="text-base font-black text-emerald-600 font-mono">
                    {selectedTicketToPay.price?.toLocaleString('fr-FR')} DA
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="settle_method" className="text-xs font-bold">Mode de Règlement *</Label>
                  <Select
                    value={settleForm.payment_method}
                    onValueChange={(val) => setSettleForm({ ...settleForm, payment_method: val })}
                  >
                    <SelectTrigger id="settle_method" className="h-10 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="settle_remise" className="text-xs font-bold text-amber-600">Remise Accordée (DA)</Label>
                    <Input
                      id="settle_remise"
                      type="number"
                      value={settleForm.remise_amount}
                      onChange={(e) => {
                        const r = e.target.value
                        const p = selectedTicketToPay.price || 8500
                        const net = Math.max(0, p - (parseFloat(r) || 0))
                        setSettleForm({ ...settleForm, remise_amount: r, paid_amount: String(net) })
                      }}
                      placeholder="0 DA"
                      className="font-mono text-sm font-bold text-amber-600 border-amber-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="settle_amount" className="text-xs font-bold">Montant Encaissé (DA) *</Label>
                    <Input
                      id="settle_amount"
                      type="number"
                      value={settleForm.paid_amount}
                      onChange={(e) => setSettleForm({ ...settleForm, paid_amount: e.target.value })}
                      className="font-mono text-sm font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settle_period" className="text-xs font-bold">Période / Date</Label>
                  <Input
                    id="settle_period"
                    value={settleForm.period}
                    onChange={(e) => setSettleForm({ ...settleForm, period: e.target.value })}
                    className="text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSettleModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmSettlePayment} disabled={submittingPayment} className="bg-primary text-primary-foreground font-bold gap-1.5">
              <Printer className="h-4 w-4" />
              {submittingPayment ? 'Enregistrement...' : 'Valider & Imprimer Quittance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Modal */}
      <PaymentReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        payment={selectedReceipt}
      />

      {/* Patient Transaction History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-[24px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold text-lg">
              <FileText className="h-5 w-5 text-indigo-500" />
              Historique des Quittances & Règlements Patient
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cumul des actes et quittances délivrées pour {selectedPatientHistory?.patient_name}.
            </DialogDescription>
          </DialogHeader>

          {selectedPatientHistory && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-2xl bg-muted/30 border grid grid-cols-3 gap-3 text-xs text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Total Prestations</span>
                  <strong className="text-sm font-black font-mono text-foreground">{selectedPatientHistory.total_fee?.toLocaleString('fr-FR')} DA</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Montant Encaissé</span>
                  <strong className="text-sm font-black font-mono text-emerald-600">{selectedPatientHistory.total_paid?.toLocaleString('fr-FR')} DA</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Solde Débiteur</span>
                  <strong className={`text-sm font-black font-mono ${selectedPatientHistory.due_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {selectedPatientHistory.due_balance?.toLocaleString('fr-FR')} DA
                  </strong>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">N° Quittance</TableHead>
                      <TableHead className="text-xs font-bold">Examen</TableHead>
                      <TableHead className="text-right text-xs font-bold">Total</TableHead>
                      <TableHead className="text-right text-xs font-bold">Payé</TableHead>
                      <TableHead className="text-right text-xs font-bold">Reçu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPatientHistory.history?.map((h: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/20 text-xs">
                        <TableCell className="font-mono font-bold text-primary">{h.receipt_no}</TableCell>
                        <TableCell className="font-semibold">{h.exam_type || h.grade}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{(h.total_fee || 0).toFixed(2)} DA</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">{(h.paid_amount || 0).toFixed(2)} DA</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(h)
                              setHistoryModalOpen(false)
                              setReceiptOpen(true)
                            }}
                            className="h-7 text-[10px] font-bold px-2 gap-1 cursor-pointer"
                          >
                            <Printer className="h-3 w-3" /> Imprimer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)} className="w-full sm:w-auto">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
