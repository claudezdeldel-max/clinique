"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Printer, Pill, CheckCircle2 } from 'lucide-react'
import { PatientCompactCard } from '@/components/patients/patient-profile-card'
import { createPrescription } from '@/lib/api'
import { toast } from 'sonner'
import { printPrescription } from '@/lib/print-document'

interface MedicationItem {
  name: string
  dosage: string
  posology: string
  duration: string
}

interface PrescriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId?: number
  patientName?: string
  doctorName?: string
  patientObj?: any
  onPrescriptionSaved?: () => void
}

const MEDICATION_PRESETS = [
  { name: 'Paracétamol 1000mg', dosage: '1 comprimé', posology: '3 fois par jour (toutes les 8h)', duration: '5 jours' },
  { name: 'Augmentin 1g (Amoxicilline/Ac. Clavulanique)', dosage: '1 sachet', posology: '2 fois par jour au milieu des repas', duration: '7 jours' },
  { name: 'Spasfon 80mg', dosage: '2 comprimés', posology: 'En cas de douleur abdominale (max 6/jour)', duration: '5 jours' },
  { name: 'Inipomp 20mg (Pantoprazole)', dosage: '1 gélule', posology: 'Le matin à jeun', duration: '14 jours' },
  { name: 'Dexaméthasone 4mg', dosage: '1 comprimé', posology: 'Le matin avec un grand verre d eau', duration: '3 jours' },
  { name: 'Produit de contraste Iode (Iopamiron 300)', dosage: '1 flacon 50ml', posology: 'Pour examen Scanner CT', duration: 'Usage unique' },
]

export function PrescriptionModal({
  open,
  onOpenChange,
  patientId,
  patientName = '',
  doctorName = '',
  patientObj,
  onPrescriptionSaved,
}: PrescriptionModalProps) {
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: '', dosage: '', posology: '', duration: '' },
  ])
  const [instructions, setInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savedPrescription, setSavedPrescription] = useState<any>(null)
  const [viewPrintMode, setViewPrintMode] = useState(false)

  const patientData = patientObj || { id: patientId, name: patientName, phone: '', birth_date: '', age: null };

  const handleAddMedication = () => {
    setMedications((prev) => [
      ...prev,
      { name: '', dosage: '', posology: '', duration: '' },
    ])
  }

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateMedication = (index: number, field: keyof MedicationItem, val: string) => {
    setMedications((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const handleSelectPreset = (preset: (typeof MEDICATION_PRESETS)[0]) => {
    setMedications((prev) => [...prev.filter(m => m.name || m.dosage || m.posology || m.duration), { ...preset }])
  }

  const handleSavePrescription = async () => {
    if (submitting) return
    if (!patientId) { toast.error('Sélectionnez un patient enregistré.'); return }
    if (medications.length === 0 || medications.some(m => !m.name.trim())) { toast.error('Saisissez le nom de chaque médicament ou retirez les lignes vides.'); return }
    setSubmitting(true)
    try {
      const created = await createPrescription({
        patient_id: patientId,
        patient_name: patientName,
        doctor_name: doctorName,
        date: new Date().toISOString().split('T')[0],
        medications,
        instructions,
      })
      setSavedPrescription(created)
      setViewPrintMode(true)
      onPrescriptionSaved?.()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    if (savedPrescription) void printPrescription(savedPrescription).catch(err => toast.error(err.message))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto rounded-[24px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {viewPrintMode ? 'Ordonnance Médicale Générée' : 'Prescription d\'Ordonnance Médicale'}
          </DialogTitle>
          {/* Embedded Patient Compact Card with Photo & Details */}
          <PatientCompactCard patient={patientData} />
        </DialogHeader>

        {!viewPrintMode ? (
          <div className="space-y-6 py-2">
            {/* Quick Preset Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">
                Ajouter un médicament fréquemment prescrit
              </Label>
              <div className="flex flex-wrap gap-2">
                {MEDICATION_PRESETS.map((preset, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectPreset(preset)}
                    className="text-xs cursor-pointer hover:border-primary"
                  >
                    + {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Medication List Form */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Liste des Médicaments Prescrits</Label>
                <Button type="button" size="sm" variant="ghost" onClick={handleAddMedication} className="cursor-pointer text-xs">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
                </Button>
              </div>

              {medications.map((med, index) => (
                <div key={index} className="p-3 border rounded-xl bg-muted/20 space-y-3 relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary">Médicament n°{index + 1}</span>
                    {medications.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMedication(index)}
                        className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Nom du médicament *</Label>
                      <Input
                        placeholder="Ex: Paracétamol 1g"
                        value={med.name}
                        onChange={(e) => handleUpdateMedication(index, 'name', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Dosage / Unité</Label>
                      <Input
                        placeholder="Ex: 1 comprimé"
                        value={med.dosage}
                        onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Posologie / Fréquence</Label>
                      <Input
                        placeholder="Ex: 3 fois par jour"
                        value={med.posology}
                        onChange={(e) => handleUpdateMedication(index, 'posology', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Durée du traitement</Label>
                      <Input
                        placeholder="Ex: 5 jours"
                        value={med.duration}
                        onChange={(e) => handleUpdateMedication(index, 'duration', e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* General Instructions */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Instructions & Recommandations au Patient</Label>
              <Textarea
                placeholder="Remarques particulières, mode d'administration..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
        ) : (
          /* Printable Prescription Preview Document */
          <div className="p-6 border-2 border-primary/20 rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-primary uppercase tracking-tight">
                  RadioMed OS — Clinique de Radiologie
                </h3>
                <p className="text-xs text-muted-foreground">Centre d'Imagerie & Diagnostic Médical</p>
                <p className="text-[11px] text-muted-foreground">Médecin Prescripteur: {doctorName}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary">
                  N° {savedPrescription?.prescription_no || 'ORD-2026-001'}
                </Badge>
                <p className="text-xs font-semibold text-foreground mt-1">Date: {savedPrescription?.date || new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-xs font-semibold">
              <span>Patient: <strong className="text-foreground">{patientName}</strong></span>
              <span>Réf. Dossier: #{patientId}</span>
            </div>

            <div className="space-y-3 py-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Ordonnance médicale
              </h4>

              <div className="space-y-3">
                {(savedPrescription?.medications || medications).map((m: MedicationItem, i: number) => (
                  <div key={i} className="p-3 border rounded-lg bg-background flex items-start justify-between">
                    <div>
                      <h5 className="font-bold text-sm text-foreground">{i + 1}. {m.name}</h5>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        Posologie: {m.posology} • Dosage: {m.dosage}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold">
                      Pendant {m.duration}
                    </Badge>
                  </div>
                ))}
              </div>

              {instructions && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
                  <strong className="text-amber-700 dark:text-amber-400 block mb-0.5">Instructions du Médecin:</strong>
                  <p className="text-muted-foreground">{instructions}</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t flex justify-between items-end text-xs">
              <div className="text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 inline mr-1" />
                Document officiel délivré par RadioMed OS
              </div>
              <div className="text-right space-y-8">
                <span className="font-bold text-foreground block">Signature & Cachet du Radiologue</span>
                <div className="border-b-2 border-dashed border-foreground/40 w-40 ml-auto"></div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!viewPrintMode ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSavePrescription} disabled={submitting || !patientId || !medications.length || medications.some(m => !m.name.trim())}>
                {submitting ? 'Génération...' : 'Générer & Enregistrer l\'Ordonnance'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setViewPrintMode(false)}>
                Préparer une nouvelle ordonnance
              </Button>
              <Button onClick={handlePrint} className="bg-primary text-primary-foreground font-bold">
                <Printer className="h-4 w-4 mr-1.5" /> Imprimer L'Ordonnance
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
