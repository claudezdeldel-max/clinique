"use client"

import { useState,useEffect } from "react"
import { CreditCard,FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import { useSchoolData,type StudentPayment } from "@/hooks/use-school-data"
import { PaymentReceiptModal } from "./payment-receipt-modal"
import { usePaymentMethods } from "@/stores/clinic-preferences-store"
import { fetchApi } from "@/lib/api"

interface AddPaymentModalProps {
  onPaymentAdded?: () => void
}

export function AddPaymentModal({ onPaymentAdded }: AddPaymentModalProps = {}) {
  const paymentMethods = usePaymentMethods()
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [patientNameInput, setPatientNameInput] = useState("")
  const [examType, setExamType] = useState("IRM Cérébrale 3T")
  const [totalFee, setTotalFee] = useState("8500")
  const [remiseAmount, setRemiseAmount] = useState("0")
  const [paidAmount, setPaidAmount] = useState("8500")
  const [paymentMethod, setPaymentMethod] = useState("Espèces")
  useEffect(() => { if (!paymentMethods.includes(paymentMethod)) setPaymentMethod(paymentMethods[0] || '') }, [paymentMethods.join('|'), paymentMethod])
  const [period, setPeriod] = useState(`${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)

  const [receiptOpen, setReceiptOpen] = useState(false)
  const [newPayment, setNewPayment] = useState<StudentPayment | null>(null)

  const { students, addPayment } = useSchoolData()
  const [completedList, setCompletedList] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      fetchApi<any[]>('/payments/queue-completed')
        .then((data) => setCompletedList(data || []))
        .catch(() => setCompletedList([]))
    }
  }, [open])

  const handleSelectCompletedPatient = (val: string) => {
    setStudentId(val)
    if (val === "custom") {
      setPatientNameInput("")
      return
    }

    const foundQueue = completedList.find(c => c.ticket_id.toString() === val || c.patient_name === val)
    if (foundQueue) {
      setPatientNameInput(foundQueue.patient_name)
      setExamType(foundQueue.exam_type)
      const p = foundQueue.price || 8500
      setTotalFee(String(p))
      setRemiseAmount("0")
      setPaidAmount(String(p))
      return
    }

    const foundStudent = students.find(s => s.id.toString() === val)
    if (foundStudent) {
      setPatientNameInput(foundStudent.name)
      setExamType(foundStudent.grade || "IRM Cérébrale 3T")
    }
  }

  const handleExamChange = (val: string) => {
    setExamType(val)
    let p = 8500
    if (val.includes("Scanner")) p = 7000
    else if (val.includes("Échographie") || val.includes("Echo")) p = 6000
    else if (val.includes("Radio")) p = 2500
    setTotalFee(String(p))
    setRemiseAmount("0")
    setPaidAmount(String(p))
  }

  const parsedTotal = parseFloat(totalFee) || 0
  const parsedRemise = parseFloat(remiseAmount) || 0
  const parsedPaid = parseFloat(paidAmount) || 0
  const netFee = Math.max(0, parsedTotal - parsedRemise)
  const dueBalance = Math.max(0, netFee - parsedPaid)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalName = patientNameInput.trim()
    if (!finalName && studentId && studentId !== "custom") {
      const foundStudent = students.find(s => s.id.toString() === studentId)
      if (foundStudent) finalName = foundStudent.name
    }
    if (!finalName) finalName = "Patient Radiologie"

    const createdPayment = await addPayment({
      student_id: parseInt(studentId) || Math.floor(Math.random() * 1000),
      student_name: finalName,
      grade: examType,
      period,
      total_fee: parsedTotal,
      paid_amount: parsedPaid,
      payment_method: paymentMethod,
    })

    setOpen(false)

    if (createdPayment) {
      setNewPayment(createdPayment)
      setReceiptOpen(true)
      if (onPaymentAdded) onPaymentAdded()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="cursor-pointer gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm">
            <CreditCard className="h-4 w-4" />
            Nouveau Règlement & Ticket
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] rounded-[24px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold">
                <FileCheck className="h-5 w-5" />
                Enregistrer un Règlement d'Examen & Quittance
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sélectionnez un patient terminé ou renseignez le nom du patient et le tarif configuré.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Patient Selector / Input */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-select" className="text-right text-xs font-bold">
                  Patient
                </Label>
                <Select value={studentId} onValueChange={handleSelectCompletedPatient}>
                  <SelectTrigger className="col-span-3 cursor-pointer text-xs bg-background" id="student-select">
                    <SelectValue placeholder="Choisir un patient ou Saisir..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="custom" className="font-bold text-primary">
                      ✏️ + Saisir un autre patient
                    </SelectItem>
                    {completedList.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground bg-muted/40">
                          Patients Terminés en File d'Attente
                        </div>
                        {completedList.map((item) => (
                          <SelectItem key={`queue-${item.ticket_id}`} value={item.ticket_id.toString()}>
                            ✨ {item.patient_name} — {item.exam_type} ({item.price} DA)
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {students.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground bg-muted/40">
                          Registre des Patients
                        </div>
                        {students.map((student) => (
                          <SelectItem key={`stu-${student.id}`} value={student.id.toString()}>
                            👤 {student.name} ({student.grade})
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {(studentId === "custom" || !studentId) && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="custom-name" className="text-right text-xs font-bold">
                    Nom Patient
                  </Label>
                  <Input
                    id="custom-name"
                    value={patientNameInput}
                    onChange={(e) => setPatientNameInput(e.target.value)}
                    placeholder="Nom complet du patient..."
                    className="col-span-3 text-xs font-bold"
                  />
                </div>
              )}

              {/* Exam Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exam-select" className="text-right text-xs font-bold">
                  Examen
                </Label>
                <Select value={examType} onValueChange={handleExamChange}>
                  <SelectTrigger className="col-span-3 cursor-pointer text-xs" id="exam-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IRM Cérébrale 3T">🧠 IRM Cérébrale 3T (8 500 DA)</SelectItem>
                    <SelectItem value="Scanner CT Abdominal">🫁 Scanner CT Abdominal (7 000 DA)</SelectItem>
                    <SelectItem value="Échographie Doppler">🩺 Échographie Doppler (6 000 DA)</SelectItem>
                    <SelectItem value="Radiographie Thoracique">🦴 Radiographie Thoracique (2 500 DA)</SelectItem>
                    <SelectItem value="Mammographie Numérique">🌸 Mammographie Numérique (5 500 DA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="period" className="text-right text-xs font-bold">
                  Date / Heure
                </Label>
                <Input
                  id="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="Date de règlement..."
                  className="col-span-3 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total-fee" className="text-right text-xs font-bold">
                  Tarif Total (DA)
                </Label>
                <Input
                  id="total-fee"
                  type="number"
                  step="100"
                  value={totalFee}
                  onChange={(e) => setTotalFee(e.target.value)}
                  className="col-span-3 font-mono font-bold text-sm text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remise-amount" className="text-right text-xs font-bold text-amber-600">
                  Remise (DA)
                </Label>
                <Input
                  id="remise-amount"
                  type="number"
                  step="100"
                  value={remiseAmount}
                  onChange={(e) => {
                    const r = e.target.value
                    setRemiseAmount(r)
                    const parsedR = parseFloat(r) || 0
                    const net = Math.max(0, parsedTotal - parsedR)
                    setPaidAmount(String(net))
                  }}
                  placeholder="0 DA"
                  className="col-span-3 font-mono font-bold text-sm text-amber-600 border-amber-300"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paid-amount" className="text-right text-xs font-bold">
                  Montant Versé (DA)
                </Label>
                <Input
                  id="paid-amount"
                  type="number"
                  step="100"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="col-span-3 font-mono font-bold text-sm text-emerald-600"
                  required
                />
              </div>

              {/* Real-Time Balance Display */}
              <div className="grid grid-cols-4 items-center gap-4 p-3 rounded-xl bg-muted/40 border">
                <span className="text-xs font-bold text-right col-span-1">Solde Dû:</span>
                <div className="col-span-3 flex items-center justify-between">
                  <span className={`text-sm font-black font-mono ${dueBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {dueBalance.toLocaleString('fr-FR')} DA
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {dueBalance > 0 ? "(Reste à charge patient)" : "(Intégralement réglé)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment-method" className="text-right text-xs font-bold">
                  Mode Règlement
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="col-span-3 cursor-pointer text-xs" id="payment-method">
                    <SelectValue placeholder="Mode de règlement" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                Enregistrer & Générer la Quittance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generated Printable Receipt Modal */}
      <PaymentReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        payment={newPayment}
      />
    </>
  )
}
