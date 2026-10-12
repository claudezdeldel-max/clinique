"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History, FileText, Plus, Pill, Stethoscope, Clock } from 'lucide-react'
import { getPatientById, addPatientNote, getPrescriptions } from '@/lib/api'
import { PatientCompactCard } from '@/components/patients/patient-profile-card'

interface ConsultationHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId?: number
  patientName?: string
}

export function ConsultationHistoryModal({
  open,
  onOpenChange,
  patientId = 1,
  patientName = 'Amine Benali',
}: ConsultationHistoryModalProps) {
  const [patientData, setPatientData] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New consultation note state
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteAuthor, setNewNoteAuthor] = useState('Dr. Rahmane')
  const [submittingNote, setSubmittingNote] = useState(false)

  const fetchHistory = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const data = await getPatientById(patientId)
      setPatientData(data)
      const ords = await getPrescriptions(patientId)
      setPrescriptions(ords || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && patientId) {
      fetchHistory()
    }
  }, [open, patientId])

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !patientId) return
    setSubmittingNote(true)
    try {
      await addPatientNote(patientId, {
        author: newNoteAuthor,
        content: newNoteContent,
      })
      setNewNoteContent('')
      setShowAddNote(false)
      await fetchHistory()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingNote(false)
    }
  }

  const notesList = patientData?.notes || []
  const patientObj = patientData || {
    id: patientId,
    name: patientName,
    gender: 'Homme',
    age: 45,
    phone: '+213 555 123 456',
    social_sec_no: '1 76 09 19 567 890 12',
    insurance_type: 'CNAS',
    blood_group: 'A+',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto rounded-[24px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historique des Visites & Notes Médicales
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddNote(!showAddNote)}
              className="bg-primary text-primary-foreground font-semibold text-xs cursor-pointer rounded-xl"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {showAddNote ? 'Masquer Formulaire' : 'Nouvelle Note'}
            </Button>
          </DialogTitle>
          {/* Embedded Patient Compact Card with Photo & Details */}
          <PatientCompactCard patient={patientObj} />
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* New Note Form */}
          {showAddNote && (
            <div className="p-4 border-2 border-primary/30 rounded-xl bg-primary/5 space-y-3">
              <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Saisie d'une Nouvelle Note de Consultation
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="note_author">Auteur / Médecin Radiologue</Label>
                <Select value={newNoteAuthor} onValueChange={setNewNoteAuthor}>
                  <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                    <SelectValue placeholder="Médecin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Rahmane">Dr. Rahmane</SelectItem>
                    <SelectItem value="Prof. Marc Laurent">Prof. Marc Laurent</SelectItem>
                    <SelectItem value="Dr. Kaci">Dr. Kaci</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note_content">Observations Médicales & Motif de la Visite *</Label>
                <Textarea
                  id="note_content"
                  placeholder="Tapez vos notes de consultation, évolution clinique, symptômes..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  className="text-xs bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowAddNote(false)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleAddNote} disabled={submittingNote}>
                  {submittingNote ? 'Enregistrement...' : 'Enregistrer la Note'}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Chargement de l'historique médical...</div>
          ) : (
            <div className="space-y-6">
              {/* Prescriptions Section */}
              {prescriptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-sky-500" /> Ordonnances Médicales Prescrites ({prescriptions.length})
                  </h4>

                  <div className="space-y-2">
                    {prescriptions.map((ord) => (
                      <div key={ord.id} className="p-3 border rounded-xl bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {ord.prescription_no}
                            </Badge>
                            <span className="text-xs font-bold text-foreground">{ord.doctor_name}</span>
                            <span className="text-[11px] text-muted-foreground">• {ord.date}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(ord.medications || []).map((m: any) => m.name).join(', ')}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {(ord.medications || []).length} médicament(s)
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consultation Notes Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-500" /> Chronologie des Notes de Consultation ({notesList.length})
                </h4>

                {notesList.length === 0 ? (
                  <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                    Aucune note clinique enregistrée pour ce patient.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
                    {notesList.map((note: any) => (
                      <div key={note.id} className="relative pl-8 space-y-1">
                        <div className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </div>

                        <div className="p-3 border rounded-xl bg-card space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">{note.author}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {note.created_at}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{note.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
