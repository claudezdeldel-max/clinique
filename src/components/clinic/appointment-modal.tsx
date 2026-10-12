import { BirthDateFields } from '@/components/patients/birth-date-fields'
"use client"

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAppointment, getAppointmentSlots } from '@/lib/api'

import { useClinicResources } from '@/hooks/use-clinic-resources'
import { toast } from 'sonner'

interface AppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPatient?: {
    id?: number
    name?: string
    phone?: string
    birth_date?: string
    requested_exam?: string
  } | null
  onSuccess?: () => void
}

export function AppointmentModal({
  open,
  onOpenChange,
  initialPatient,
  onSuccess,
}: AppointmentModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [slots, setSlots] = useState<Array<{ time: string; occupied: boolean }>>([])
  const resources = useClinicResources()
  const doctorsList = resources.doctors
  const rooms = resources.rooms.filter(r => r.status === 'available' || r.status === 'busy')

  const [form, setForm] = useState({
    patient_name: '',
    patient_phone: '',
    patient_birth_date: '',
    exam_type: 'IRM Cérébrale',
    radiologist: '',
    room: '',
    time: '09:00',
    priority: 'normal',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(prev => ({ ...prev, patient_name: '', patient_phone: '', patient_birth_date: '' }))
      if (initialPatient) {
        setForm((prev) => ({
          ...prev,
          patient_name: initialPatient.name || '',
          patient_phone: initialPatient.phone || '',
          patient_birth_date: initialPatient.birth_date || '',
          exam_type: initialPatient.requested_exam || prev.exam_type,
        }))
      }
      setForm(prev => ({ ...prev, radiologist: resources.doctors[0]?.name || '', room: resources.rooms.find(r => r.status === 'available')?.name || '' }))
    }
  }, [open, initialPatient])

  useEffect(() => { if (!form.room && rooms.length) setForm(prev => ({ ...prev, room: rooms[0].name, radiologist: doctorsList[0]?.name || '' })) }, [resources.rooms, resources.doctors])

  const fetchSlots = async () => {
    try {
      const data = await getAppointmentSlots(selectedDate, form.room)
      setSlots(data || [])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  useEffect(() => {
    if (open) {
      fetchSlots()
    }
  }, [open, selectedDate, form.room])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !form.patient_name.trim()) return
    if (!form.room) { toast.error('Choisissez une salle disponible.'); return }
    setSubmitting(true)

    try {
      const payload = {
        patient_id: initialPatient?.id || null,
        patient_name: form.patient_name,
        patient_phone: form.patient_phone,
        patient_birth_date: form.patient_birth_date,
        exam_type: form.exam_type,
        radiologist: form.radiologist,
        room: form.room,
        time: form.time,
        date_time: `${selectedDate} ${form.time}`,
        priority: form.priority,
        notes: form.notes,
        status: 'Programmé',
      }

      await createAppointment(payload)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="appointment-modal" className="sm:max-w-[620px] rounded-[24px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Planifier un Rendez-Vous Direct
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Prise de rendez-vous rapide pour {form.patient_name || 'le patient'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Patient Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rdv_patient_name" className="text-xs font-bold">
                Nom & Prénom Patient *
              </Label>
              <Input
                id="rdv_patient_name"
                data-testid="appt-patient-name"
                placeholder="Ex: Karim Haddad"
                value={form.patient_name}
                onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                required readOnly={!!initialPatient?.id}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rdv_patient_phone" className="text-xs font-bold">
                Téléphone
              </Label>
              <Input type="tel"
                id="rdv_patient_phone"
                data-testid="appt-patient-phone"
                placeholder="Ex: 05 55 12 34 56"
                value={form.patient_phone}
                onChange={(e) => setForm({ ...form, patient_phone: e.target.value })}
                className="text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          <BirthDateFields id="rdv_patient" value={form.patient_birth_date} readOnly={!!initialPatient?.id} onChange={value => setForm(prev => ({ ...prev, patient_birth_date: value }))} />

          {/* Exam & Room Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Examen Demandé *</Label>
              <Select value={form.exam_type} onValueChange={(val) => setForm({ ...form, exam_type: val })}>
                <SelectTrigger data-testid="appt-exam-select" className="text-xs h-9 rounded-xl">
                  <SelectValue placeholder="Choisir l'examen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IRM Cérébrale">IRM Cérébrale 3T</SelectItem>
                  <SelectItem value="IRM Lombaire">IRM Rachis Lombaire</SelectItem>
                  <SelectItem value="Scanner Abdomino-Pelvien">Scanner Abdomino-Pelvien</SelectItem>
                  <SelectItem value="Scanner Thoracique">Scanner Thoracique</SelectItem>
                  <SelectItem value="Échographie Abdominale">Échographie Abdominale</SelectItem>
                  <SelectItem value="Radiologie Numérique">Radiologie Numérique Osseuse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Salle d'Imagerie *</Label>
              <Select value={form.room} onValueChange={(val) => setForm({ ...form, room: val })}>
                <SelectTrigger data-testid="appt-room-select" className="text-xs h-9 rounded-xl">
                  <SelectValue placeholder="Choisir la salle" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Doctor Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Date du Rendez-Vous *</Label>
              <Input
                type="date"
                data-testid="appt-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Médecin Radiologue</Label>
              <Select value={form.radiologist} onValueChange={(val) => setForm({ ...form, radiologist: val })}>
                <SelectTrigger data-testid="appt-doctor-select" className="text-xs h-9 rounded-xl">
                  <SelectValue placeholder="Médecin" />
                </SelectTrigger>
                <SelectContent>
                  {doctorsList.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Slot Grid Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center justify-between">
              <span>Créneau Horaire Disponible</span>
              <span className="text-muted-foreground font-normal text-[11px]">Sélectionnez une heure</span>
            </Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 border rounded-xl bg-muted/20">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  disabled={s.occupied}
                  onClick={() => setForm({ ...form, time: s.time })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                    s.occupied
                      ? 'bg-rose-50 text-rose-300 border-rose-100 cursor-not-allowed line-through'
                      : form.time === s.time
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:border-primary text-foreground'
                  }`}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>

          {/* Priority & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Priorité Prise en Charge</Label>
              <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                <SelectTrigger className="text-xs h-9 rounded-xl">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normale (Standard)</SelectItem>
                  <SelectItem value="urgent">Urgente (Prioritaire)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rdv_notes" className="text-xs font-bold">Consignes / Remarques</Label>
              <Input
                id="rdv_notes"
                placeholder="Ajeun, injection produit..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              type="submit"
              data-testid="appt-submit-btn"
              disabled={submitting}
              className="bg-primary text-primary-foreground font-bold rounded-xl"
            >
              {submitting ? 'Validation...' : 'Confirmer le Rendez-Vous'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
