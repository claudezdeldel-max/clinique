"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Printer, FileText, Plus, Stethoscope, Trash2 } from "lucide-react"

import { printDocument, escapeText } from '@/lib/print-document'
import { toast } from 'sonner'

interface MedicationItem {
  name: string
  dosage: string
  posology: string
  duration: string
}

interface PrescriptionModalProps {
  patientName?: string
  patientAge?: number
  patientGender?: string
  socialSecNo?: string
  triggerButton?: React.ReactNode
}

export function PrescriptionModal({
  patientName = "Jean Dupont",
  patientAge = 45,
  patientGender = "Homme",
  socialSecNo = "1 79 05 75 123 456 78",
  triggerButton,
}: PrescriptionModalProps) {
  const [open, setOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  const [pName, setPName] = useState(patientName)
  const [pAge, setPAge] = useState(patientAge.toString())
  const [doctorName, setDoctorName] = useState("Prof. Marc Laurent")
  const [instructions, setInstructions] = useState("Proposer une consultation de contrôle en cas de récidive des symptômes. Repos recommandé.")
  
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: "Doliprane 1000mg", dosage: "1 gélule", posology: "Toutes les 8 heures si douleur", duration: "5 jours" },
    { name: "Magnesium B6", dosage: "2 comprimés", posology: "Matin et soir au repas", duration: "30 jours" },
  ])

  const [medName, setMedName] = useState("")
  const [medDosage, setMedDosage] = useState("")
  const [medPosology, setMedPosology] = useState("")
  const [medDuration, setMedDuration] = useState("")

  const handleAddMedication = () => {
    if (!medName) return
    setMedications(prev => [
      ...prev,
      {
        name: medName,
        dosage: medDosage || "1 comprimé",
        posology: medPosology || "Selon besoin",
        duration: medDuration || "5 jours",
      }
    ])
    setMedName("")
    setMedDosage("")
    setMedPosology("")
    setMedDuration("")
  }

  const handleRemoveMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }

  const handlePrint = () => {
    void printDocument('Ordonnance médicale', `<h1>Ordonnance médicale</h1><p>Patient : ${escapeText(pName)} · ${escapeText(pAge)} ans</p><p>Médecin : ${escapeText(doctorName)}</p><ol>${medications.map(m => `<li><strong>${escapeText(m.name)}</strong> · ${escapeText(m.dosage)} · ${escapeText(m.posology)} · ${escapeText(m.duration)}</li>`).join('')}</ol><p>${escapeText(instructions)}</p>`, 'Prescription').catch(err => toast.error(err.message))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {triggerButton || (
            <Button className="cursor-pointer gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="h-4 w-4" />
              Prescrire Ordonnance
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Stethoscope className="h-5 w-5" />
              Rédaction d'Ordonnance Médicale
            </DialogTitle>
            <DialogDescription>
              Prescrivez des traitements, examens complémentaires ou soins et générez l'ordonnance officielle imprimable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Doctor & Patient Row */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border text-xs">
              <div>
                <Label className="text-[10px] text-muted-foreground">Médecin Prescripteur</Label>
                <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="h-8 text-xs font-semibold mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Patient</Label>
                <Input value={pName} onChange={(e) => setPName(e.target.value)} className="h-8 text-xs font-semibold mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Âge (ans)</Label>
                <Input value={pAge} onChange={(e) => setPAge(e.target.value)} className="h-8 text-xs font-semibold mt-1" />
              </div>
            </div>

            {/* Add Medication Form */}
            <div className="space-y-2 border p-3 rounded-lg bg-card">
              <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un Médicament / Traitement
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Dénomination du médicament (ex: Doliprane 1g)" value={medName} onChange={(e) => setMedName(e.target.value)} className="text-xs h-8" />
                <Input placeholder="Dosage (ex: 1 comprimé)" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} className="text-xs h-8" />
                <Input placeholder="Posologie (ex: 3 fois par jour)" value={medPosology} onChange={(e) => setMedPosology(e.target.value)} className="text-xs h-8" />
                <Input placeholder="Durée (ex: 7 jours)" value={medDuration} onChange={(e) => setMedDuration(e.target.value)} className="text-xs h-8" />
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={handleAddMedication} className="w-full mt-2 h-7 text-xs cursor-pointer">
                + Rajouter au traitement
              </Button>
            </div>

            {/* Medications List */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Traitements Prescrits ({medications.length})</Label>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {medications.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border text-xs bg-muted/20">
                    <div>
                      <span className="font-bold text-foreground">{med.name}</span>
                      <p className="text-muted-foreground text-[11px]">{med.dosage} • {med.posology} • Durée: {med.duration}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMedication(idx)} className="h-6 w-6 text-red-500 hover:text-red-700 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <Label className="text-xs font-semibold">Consignes & Recommandations du Radiologue</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="text-xs min-h-[60px] mt-1" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setOpen(false)
                setPrintOpen(true)
              }}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Aperçu & Imprimer l'Ordonnance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Prescription Modal */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
          <div id="printable-prescription" className="p-8 space-y-6 bg-white dark:bg-zinc-950 text-foreground">
            {/* Header Stamp */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">RadioMed OS</h2>
                <p className="text-xs font-semibold text-foreground">{doctorName}</p>
                <p className="text-[11px] text-muted-foreground">Spécialiste en Radiologie & Imagerie Médicale</p>
                <p className="text-[10px] text-muted-foreground">N° RPPS: 10104829102 • N° ADELI: 751293847</p>
                <p className="text-[10px] text-muted-foreground">12 Avenue de la Santé, 75008 Paris • Tél: +33 14 05 06 07 0</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-mono text-xs mb-1 border-blue-500 text-blue-600">
                  ORDONNANCE MÉDICALE
                </Badge>
                <p className="text-xs text-muted-foreground">Paris, le {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            {/* Patient Header Box */}
            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Patient: <strong className="text-sm font-bold text-foreground">{pName}</strong></span>
                <span>Âge: <strong className="font-bold">{pAge} ans</strong> ({patientGender})</span>
              </div>
              <p className="text-muted-foreground text-[11px]">N° Sécurité Sociale: <span className="font-mono font-semibold text-foreground">{socialSecNo}</span></p>
            </div>

            {/* Medications Rx Content */}
            <div className="space-y-4 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Prescription Médicamenteuse & Soins
              </h3>
              <div className="space-y-4 pl-2">
                {medications.map((med, index) => (
                  <div key={index} className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">
                      {index + 1}. {med.name}
                    </p>
                    <p className="text-xs text-muted-foreground pl-4">
                      • Posologie: <span className="font-semibold text-foreground">{med.dosage}</span> — {med.posology} pendant <span className="font-semibold text-foreground">{med.duration}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommandations */}
            {instructions && (
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">Consignes Médicales & Recommandations :</p>
                <p className="text-muted-foreground italic text-[11px]">{instructions}</p>
              </div>
            )}

            {/* Signature & Stamp Footer */}
            <div className="flex justify-between items-end pt-8 border-t">
              <div className="text-[10px] text-muted-foreground">
                <p>Ordonnance établie conformément au code de santé publique.</p>
                <p>Document médical officiel RadioMed OS.</p>
              </div>
              <div className="text-center px-8 py-2 border-2 border-dashed border-blue-400/60 rounded-xl bg-blue-50/30">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{doctorName}</p>
                <p className="text-[9px] text-muted-foreground italic mt-6">Signature & Cachet Médecin</p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t flex flex-row items-center justify-between">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>
              Fermer
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
              <Printer className="h-4 w-4" />
              Imprimer l'Ordonnance Officielle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
