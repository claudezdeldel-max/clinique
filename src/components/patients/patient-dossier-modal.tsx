"use client"

import React, { useState, useEffect } from 'react'
import {
  User,
  Activity,
  FileText,
  CreditCard,
  Printer,
  FileUp,
  CheckCircle2,
  Check,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getPatientById, addPatientNote, addPatientDocument } from '@/lib/api'
import { getPatientAvatarUrl } from '@/components/patients/patient-profile-card'
import { formatPatientAge, formatPhoneNumber } from '@/lib/utils'

interface PatientDossierModalProps {
  patientId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PatientDossierModal({ patientId, open, onOpenChange }: PatientDossierModalProps) {
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // New Note State
  const [newNoteContent, setNewNoteContent] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  // New Document State
  const [docTitle, setDocTitle] = useState('')
  const [docKind] = useState('pdf')

  const fetchDossier = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const data = await getPatientById(patientId)
      setPatient(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && patientId) {
      fetchDossier()
    }
  }, [open, patientId])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteContent.trim() || !patientId) return
    setSubmittingNote(true)
    try {
      const added = await addPatientNote(patientId, { author: 'Dr. Rahmane', content: newNoteContent })
      setNewNoteContent('')
      setPatient((prev: any) => ({
        ...prev,
        notes: [added, ...(prev?.notes || [])],
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docTitle.trim() || !patientId) return
    try {
      await addPatientDocument(patientId, { title: docTitle, kind: docKind })
      setDocTitle('')
      await fetchDossier()
    } catch (err) {
      console.error(err)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="patient-dossier-modal" className="max-w-4xl max-h-[82vh] p-0 overflow-hidden flex flex-col rounded-[24px] border-0 shadow-2xl">
        <DialogTitle className="sr-only">Dossier patient {patient?.name ?? ''}</DialogTitle>
        {loading || !patient ? (
          <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground">
            Chargement du dossier médical...
          </div>
        ) : (
          <>
            {/* Compact Sleek Header Banner */}
            <div className="p-4 sm:p-5 bg-[#0c102a] text-white flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar with Sky Border Frame */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-sky-400/90 shadow-md flex-shrink-0 bg-slate-800">
                  <img
                    src={getPatientAvatarUrl(patient)}
                    alt={patient.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  {/* Name + Verified checkmark + Status pill + Blood group pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate" data-testid="dossier-patient-name">
                      {patient.name}
                    </h2>
                    <span
                      title="Dossier vérifié"
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {patient.status || 'Confirmé'}
                    </span>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                      Groupe {patient.blood_group || 'O-'}
                    </span>
                  </div>

                  {/* Single Clean Compact Subtitle Line */}
                  <p className="text-xs text-slate-300 font-medium truncate">
                    {patient.gender || 'Homme'}, {formatPatientAge(patient.birth_date, patient.age)} • N° Sécu: {patient.social_sec_no || '1 76 09 19 567 890'} • Tél: {formatPhoneNumber(patient.phone) || 'Non renseigné'} • {patient.insurance_type || 'CNAS'}
                  </p>
                </div>
              </div>

              {/* Top Right Action Button */}
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700 font-medium text-xs rounded-xl h-8 px-3">
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
                </Button>
              </div>
            </div>

            {/* 6 Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
              <div className="px-5 pt-2 pb-1 border-b bg-white dark:bg-slate-950">
                <TabsList className="bg-transparent h-auto p-0 gap-1.5 flex-wrap">
                  <TabsTrigger
                    data-testid="dossier-tab-overview"
                    value="overview"
                    className="data-[state=active]:bg-sky-500 data-[state=active]:text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                  >
                    Vue d'ensemble
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="dossier-tab-history"
                    value="history"
                    className="data-[state=active]:bg-sky-500 data-[state=active]:text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Historique Médical
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="dossier-tab-exams"
                    value="exams"
                    className="data-[state=active]:bg-sky-500 data-[state=active]:text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Examens & Imagerie
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="dossier-tab-documents"
                    value="documents"
                    className="data-[state=active]:bg-sky-500 data-[state=active]:text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Documents & CR
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="dossier-tab-notes"
                    value="notes"
                    className="data-[state=active]:bg-sky-500 data-[state=active]:text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Notes Médicales
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="dossier-tab-billing"
                    value="billing"
                    className="data-[state=active]:bg-sky-500 data-[state=active]:text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
                  >
                    Facturation
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 p-5 overflow-y-auto">
                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="m-0 space-y-4">
                  {/* 4 Compact Stat Cards Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-foreground">4</div>
                        <div className="text-[11px] font-semibold text-muted-foreground">Examens Réalisés</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-foreground truncate">{patient.prescribing_doctor || 'Dr. Rahmane'}</div>
                        <div className="text-[11px] font-semibold text-muted-foreground">Médecin Traitant</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-foreground">100%</div>
                        <div className="text-[11px] font-semibold text-muted-foreground">Présence (3/3 RDV)</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-foreground">0 DA</div>
                        <div className="text-[11px] font-semibold text-muted-foreground">Solde Restant</div>
                      </div>
                    </div>
                  </div>

                  {/* 2 Bottom Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 border rounded-2xl bg-white dark:bg-slate-900 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-foreground">Fiche Informatique Patient</h4>
                        <span className="text-xs font-mono text-muted-foreground">ID #{patient.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground block">Email:</span>
                          <span className="font-semibold text-foreground">{patient.email || 'k.haddad@email.com'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Nationalité:</span>
                          <span className="font-semibold text-foreground">{patient.nationality || 'Algérienne'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Situation Familiale:</span>
                          <span className="font-semibold text-foreground">{patient.marital_status || 'Marié(e)'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Poids & Taille:</span>
                          <span className="font-semibold text-foreground">{patient.weight || 75} kg / {patient.height || 178} cm</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border rounded-2xl bg-white dark:bg-slate-900 space-y-3 shadow-xs">
                      <h4 className="font-extrabold text-sm text-foreground">Alertes & Allergies</h4>
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold">
                        {patient.allergies_notes || "Irritation cutanée"}
                      </div>
                      <div className="text-xs text-muted-foreground pt-1">
                        <strong className="text-foreground font-semibold">Dernière visite:</strong> {patient.last_visit || '2026-09-29'}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Medical History */}
                <TabsContent value="history" className="m-0 space-y-4">
                  <h4 className="font-bold text-sm">Chronologie des Antécédents</h4>
                  <div className="space-y-3">
                    {patient.history && patient.history.length > 0 ? (
                      patient.history.map((h: any) => (
                        <div key={h.id} className="p-3 border rounded-lg bg-card flex items-start gap-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-md">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">{h.title}</span>
                              <span className="text-xs text-muted-foreground">{h.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground p-4 text-center border rounded-lg">
                        Aucun antécédent médical particulier consigné.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Exams & Imaging */}
                <TabsContent value="exams" className="m-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Examens de Radiologie Soumis & Clichés</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-xl bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">IRM Cérébrale 3T</span>
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-full">Terminé</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Date: 03/10/2026 — Radiologue: Dr. Rahmane</p>
                      <div className="h-28 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 text-xs font-mono border">
                        [ Cliché DICOM Scanner IRM — 256 coupes ]
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 4: Documents & Reports */}
                <TabsContent value="documents" className="m-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Comptes-Rendus & Pièces Jointes</h4>
                  </div>

                  <form onSubmit={handleAddDocument} className="flex gap-2">
                    <Input
                      placeholder="Titre du document (ex: Ordonnance d'imagerie)"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="text-xs"
                    />
                    <Button type="submit" size="sm">
                      <FileUp className="h-4 w-4 mr-1" /> Joindre Document
                    </Button>
                  </form>

                  <div className="space-y-2">
                    {patient.documents && patient.documents.length > 0 ? (
                      patient.documents.map((d: any) => (
                        <div key={d.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{d.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{d.uploaded_at}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground p-4 text-center border rounded-lg">
                        Aucun compte-rendu ou pièce jointe archivé.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 5: Notes */}
                <TabsContent value="notes" className="m-0 space-y-4">
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <Label htmlFor="note_content" className="text-xs font-bold">Ajouter une Note Médicale</Label>
                    <Textarea
                      id="note_content"
                      data-testid="patient-note-input"
                      placeholder="Observation du médecin, consignes ou suivi..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={2}
                    />
                    <Button data-testid="patient-note-submit-btn" type="submit" size="sm" disabled={submittingNote}>
                      {submittingNote ? 'Ajout...' : 'Enregistrer Note'}
                    </Button>
                  </form>

                  <div className="space-y-3 pt-2">
                    {patient.notes && patient.notes.length > 0 ? (
                      patient.notes.map((n: any) => (
                        <div key={n.id} className="p-3 border rounded-lg bg-card space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-bold text-foreground">{n.author}</span>
                            <span>{n.created_at}</span>
                          </div>
                          <p className="text-xs text-foreground">{n.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground p-4 text-center border rounded-lg">
                        Aucune note médicale enregistrée.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 6: Billing */}
                <TabsContent value="billing" className="m-0 space-y-4">
                  <div className="p-4 border rounded-xl bg-card flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Historique des Quittances de Paiement</div>
                      <div className="text-lg font-black mt-1">Montant Total Réglé: 15,000 DA</div>
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CreditCard className="h-4 w-4 mr-1" /> Régler une Prestation
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
