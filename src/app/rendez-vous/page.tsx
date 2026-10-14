import { BirthDateFields } from '@/components/patients/birth-date-fields'
import { calculateAge, formatPhoneNumber } from '@/lib/utils'
"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { StatusPill } from '@/components/clinic/status-pill'
import { KpiCard } from '@/components/clinic/kpi-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getAppointments,
  getAppointmentSlots,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markAppointmentArrived,
  getPatients,
} from '@/lib/api'
import { useClinicResources } from '@/hooks/use-clinic-resources'
import { examCategory } from '@/stores/account-store'
import { toast } from 'sonner'
import { ReferenceCalendar } from './reference-calendar'
import { dateOf, weekStart, shiftDate, navigateReferenceDate, referenceStatus, type RdvView } from './rdv-reference'

export default function RendezVousPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const resources = useClinicResources()
  const getRoomsForExam = (exam: string) => resources.rooms.filter(r => (r.status === 'available' || r.status === 'busy') && examCategory(r.type) === examCategory(exam)).map(r => r.name)
  const [loadError, setLoadError] = useState('')
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState('all')
  const [selectedDoctor, setSelectedDoctor] = useState('all')
  const [calendarView, setCalendarView] = useState<RdvView>('table')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const calendarDate = selectedDate || today

  // Deletion confirmation state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  // New/Edit Appointment Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppt, setEditingAppt] = useState<any | null>(null)
  const [slots, setSlots] = useState<Array<{ time: string; occupied: boolean }>>([])
  const [newAppt, setNewAppt] = useState({
    appt_date: new Date().toISOString().split('T')[0],
    patient_id: null as number | null,
    patient_name: '',
    patient_phone: '',
    patient_birth_date: '',
    exam_type: 'IRM Cérébrale',
    radiologist: resources.doctors[0]?.name || '',
    room: getRoomsForExam('IRM')[0] || '',
    time: '14:00',
    priority: 'normal',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchAppointments = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const data = await getAppointments({
        auto_queue: false,
      })
      setAppointments(data || []); setLoadError('')
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSlots = async () => {
    try {
      const targetDate = newAppt.appt_date || selectedDate || new Date().toISOString().split('T')[0]
      const data = await getAppointmentSlots(targetDate, newAppt.room, editingAppt?.id)
      setSlots(data || [])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  useEffect(() => {
    fetchAppointments()
    const refresh = () => { void fetchAppointments(false) }
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('clinic-data-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('clinic-data-changed', refresh); window.removeEventListener('focus', refresh) }
  }, [selectedDate, selectedRoom, selectedDoctor])

  useEffect(() => {
    if (modalOpen) {
      fetchSlots()
    }
  }, [newAppt.appt_date, newAppt.room, modalOpen, editingAppt])

  // Patient search state for modal
  const [patientSearchMode, setPatientSearchMode] = useState<'existing' | 'new'>('existing')
  const [existingPatients, setExistingPatients] = useState<any[]>([])
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)

  const fetchExistingPatients = async () => {
    try {
      const res = await getPatients({ page_size: 100 })
      setExistingPatients(res.items || [])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleOpenCreateModal = () => {
    setEditingAppt(null)
    setPatientSearchQuery('')
    setShowPatientDropdown(false)
    setPatientSearchMode('existing')
    setNewAppt({
      appt_date: selectedDate || new Date().toISOString().split('T')[0],
      patient_id: null,
      patient_name: '',
      patient_phone: '',
    patient_birth_date: '',
      exam_type: 'IRM Cérébrale',
      radiologist: resources.doctors[0]?.name || '',
      room: getRoomsForExam('IRM')[0] || '',
      time: '14:00',
      priority: 'normal',
      notes: '',
    })
    setModalOpen(true)
    fetchExistingPatients()
  }

  useEffect(() => {
    // The dashboard mounts this page before the asynchronous room/doctor list arrives.
    // Keep the request until the form can be initialized with real resources.
    if (searchParams.get('new') !== '1' || resources.loading || resources.error) return
    handleOpenCreateModal()
    const params = new URLSearchParams(searchParams)
    params.delete('new')
    setSearchParams(params, { replace: true })
  }, [searchParams, resources.loading, resources.error])

  const handleOpenEditModal = (appt: any) => {
    setEditingAppt(appt)
    const rawDate = (appt.date_time || '').split(' ')[0].split('T')[0] || selectedDate
    setPatientSearchQuery(appt.patient_name || '')
    setShowPatientDropdown(false)
    setPatientSearchMode('existing')
    setNewAppt({
      appt_date: rawDate,
      patient_id: appt.patient_id,
      patient_name: appt.patient_name || '',
      patient_phone: appt.patient_phone || '',
      patient_birth_date: '',
      exam_type: appt.exam_type || appt.modality_name || 'IRM Cérébrale',
      radiologist: appt.radiologist || 'Dr. Rahmane',
      room: appt.room || appt.location || 'Salle A - IRM 3T',
      time: appt.time || '14:00',
      priority: appt.priority || 'normal',
      notes: appt.notes || '',
    })
    setModalOpen(true)
    fetchExistingPatients()
  }

  const handleDeleteAppointment = (id: number) => {
    setDeleteTargetId(id)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteAppointment(deleteTargetId)
      setAppointments((prev) => prev.filter((a) => a.id !== deleteTargetId))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const filteredPatients = existingPatients.filter((p) => {
    if (!patientSearchQuery.trim()) return true
    const q = patientSearchQuery.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) || (q.replace(/\D/g, '').length > 0 && p.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) ||
      p.social_sec_no?.toLowerCase().includes(q)
    )
  })

  // Computed filtered appointments for list display
  const filteredAppointments = appointments.filter((appt) => {
    // 1. Date Filter (if selectedDate is set)
    const apptDate = dateOf(appt)
    if (calendarView === 'week' || calendarView === 'list') {
      const start = weekStart(calendarDate)
      if (apptDate < start || apptDate > shiftDate(start, 6)) return false
    } else if (calendarView === 'month') {
      if (apptDate.slice(0, 7) !== calendarDate.slice(0, 7)) return false
    } else if ((selectedDate || calendarView === 'day') && apptDate !== calendarDate) return false
    if (selectedStatus !== 'all' && referenceStatus(appt) !== selectedStatus) return false

    // 2. Room / Exam Filter
    if (selectedRoom !== 'all') {
      const roomLower = selectedRoom.toLowerCase()
      const matchRoom =
        (appt.modality_name || '').toLowerCase().includes(roomLower) ||
        (appt.exam_type || '').toLowerCase().includes(roomLower) ||
        (appt.room || '').toLowerCase().includes(roomLower) ||
        (appt.location || '').toLowerCase().includes(roomLower)
      if (!matchRoom && examCategory(appt.exam_type || appt.modality_name) !== examCategory(selectedRoom)) return false
    }

    // 3. Doctor Filter
    if (selectedDoctor !== 'all') {
      const docLower = selectedDoctor.toLowerCase()
      const matchDoc = (appt.radiologist || '').toLowerCase().includes(docLower)
      if (!matchDoc) return false
    }

    return true
  })

  const formatApptDate = (dateTimeStr?: string) => {
    if (!dateTimeStr) return 'Non définie'
    const datePart = dateTimeStr.split(' ')[0].split('T')[0]
    const parts = datePart.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return datePart
  }

  const handleSaveAppointment = async () => {
    if (submitting) return
    setShowPatientDropdown(false)
    if (patientSearchMode === 'existing' && !newAppt.patient_id) { toast.error('Sélectionnez le patient dans la liste ou choisissez « Nouveau patient ».'); return }
    if (!newAppt.room) { toast.error('Choisissez une salle disponible pour cet examen.'); return }
    const finalPatientName = newAppt.patient_name.trim() || patientSearchQuery.trim()
    if (!finalPatientName) { toast.error('Le nom du patient est obligatoire.'); return }
    if (newAppt.patient_birth_date && calculateAge(newAppt.patient_birth_date) === null) { toast.error('Date de naissance invalide.'); return }
    setSubmitting(true)

    const dateStr = newAppt.appt_date || selectedDate || new Date().toISOString().split('T')[0]
    const payload = {
      ...newAppt,
      patient_name: finalPatientName,
      date_time: `${dateStr} ${newAppt.time || '14:00'}`,
      modality_name: newAppt.exam_type,
      location: newAppt.room,
    }

    try {
      if (editingAppt) {
        const updated = await updateAppointment(editingAppt.id, payload)
        if (updated) {
          setAppointments((prev) => prev.map((a) => (a.id === editingAppt.id ? updated : a)))
        }
      } else {
        const created = await createAppointment(payload)
        setAppointments(prev => [created, ...prev])
      }
      setModalOpen(false)
      setShowPatientDropdown(false)
      fetchAppointments()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkArrived = async (id: number) => {
    try {
      await markAppointmentArrived(id)
      await fetchAppointments()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleCalendarStatus = async (id: number, status: string) => {
    try {
      await updateAppointment(id, { status })
      await fetchAppointments(false)
      toast.success(status === 'cancelled' ? 'Rendez-vous annulé' : 'Rendez-vous confirmé')
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleExportCsv = () => {
    window.open('/api/appointments/export.csv', '_blank')
  }

  return (
    <BaseLayout title="Planning & Prise de Rendez-Vous" description="Gestion des créneaux horaires, salles d'imagerie et arrivée des patients">
      {resources.loading && <p role="status" className="mx-4 mb-4 text-sm text-muted-foreground">Chargement des salles et des médecins…</p>}
      {(loadError || resources.error) && <div role="alert" className="mx-4 mb-4 border rounded-lg p-3 text-destructive">{loadError || resources.error}<Button variant="outline" onClick={() => { void fetchAppointments(); resources.reload() }}>Réessayer</Button></div>}
      <div className="space-y-6 px-4 md:px-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard title="RDV Programmés" value={String(filteredAppointments.length)} change={calendarView === 'week' || calendarView === 'list' ? 'Planning de la semaine' : calendarView === 'month' ? 'Planning du mois' : 'Planning du jour'} trend="neutral" icon={CalendarIcon} />
          <KpiCard title="Patients Arrivés" value={String(filteredAppointments.filter((a) => a.status === 'arrived').length)} change="En salle d'attente" trend="up" icon={UserCheck} />
          <KpiCard title="Examens Urgents" value={String(filteredAppointments.filter((a) => a.priority === 'urgent').length)} change="Priorité haute" trend="down" icon={AlertCircle} />
          <KpiCard title="Patients attendus" value={String(filteredAppointments.filter(a => a.status !== 'arrived' && a.status !== 'cancelled').length)} change="À accueillir" trend="up" icon={Clock} />
        </div>

        {/* Filter Bar */}
        <Card className="shadow-xs border-2">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {calendarView === 'table' && <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Date Filter & Toggle */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  aria-label="Date du planning"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[145px] text-xs font-semibold"
                />
                <Button
                  data-testid="toggle-all-dates-btn"
                  variant={selectedDate === '' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDate(selectedDate === '' ? new Date().toISOString().split('T')[0] : '')}
                  className="text-xs h-9 font-semibold whitespace-nowrap"
                >
                  {selectedDate === '' ? '📅 Aujourd\'hui' : '📋 Toutes les dates'}
                </Button>
              </div>

              {/* Room Filter */}
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-[150px] text-xs">
                  <SelectValue placeholder="Salle / Modalité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les Salles</SelectItem>
                  <SelectItem value="IRM">Salle IRM</SelectItem>
                  <SelectItem value="Scanner">Salle CT Scanner</SelectItem>
                  <SelectItem value="Échographie">Salle Échographie</SelectItem>
                  <SelectItem value="Radiographie">Salle Radiographie</SelectItem>
                </SelectContent>
              </Select>

              {/* Doctor Filter */}
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-[150px] text-xs">
                  <SelectValue placeholder="Radiologue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Médecins</SelectItem>
                  {resources.doctors.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>

            </div>}

            <div className="flex items-center gap-2">
              <Button data-testid="export-appointments-csv" variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-1" /> Exporter
              </Button>

              <Button data-testid="new-appointment-btn" size="sm" onClick={handleOpenCreateModal} disabled={resources.loading || !!resources.error} className="bg-primary text-primary-foreground font-semibold">
                <Plus className="h-4 w-4 mr-1" /> Nouveau RDV
              </Button>
            </div>
          </CardContent>
        </Card>

        <ReferenceCalendar
          view={calendarView} date={calendarDate} today={today} appointments={filteredAppointments}
          doctors={resources.doctors} exam={selectedRoom} doctor={selectedDoctor} status={selectedStatus}
          onView={view => { setCalendarView(view); if (view === 'table') setSelectedStatus('all') }}
          onNavigate={direction => setSelectedDate(navigateReferenceDate(calendarDate, calendarView, direction))}
          onToday={() => setSelectedDate(today)} onExam={setSelectedRoom} onDoctor={setSelectedDoctor} onStatus={setSelectedStatus}
          onDay={date => { setSelectedDate(date); setCalendarView('day') }}
          onCreate={(date, time) => { handleOpenCreateModal(); setNewAppt(current => ({ ...current, appt_date: date, time })) }}
          onEdit={id => { const appointment = appointments.find(item => item.id === id); if (appointment) handleOpenEditModal(appointment) }}
          onConfirm={id => { void handleCalendarStatus(id, 'confirmed') }} onCancel={setCancelTargetId}
        />

        {/* Appointments List View (Table Only) */}
        {calendarView === 'table' && (
        <Card className="shadow-xs border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                Liste des Rendez-Vous {selectedDate ? `du ${selectedDate}` : '(Toutes les dates)'}
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">
                {filteredAppointments.length} RDV {filteredAppointments.length > 1 ? 'affichés' : 'affiché'}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground font-medium">Chargement des rendez-vous...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-medium">Aucun rendez-vous prévu pour cette sélection.</div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Heure & Durée</TableHead>
                      <TableHead className="font-bold">Patient</TableHead>
                      <TableHead className="font-bold">Examen / Modalité</TableHead>
                      <TableHead className="font-bold">Salle d'Imagerie</TableHead>
                      <TableHead className="font-bold">Radiologue</TableHead>
                      <TableHead className="font-bold">Priorité</TableHead>
                      <TableHead className="font-bold">Statut</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appt) => {
                      const isArrived = appt.status === 'arrived'
                      return (
                        <TableRow key={appt.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-bold text-xs whitespace-nowrap text-foreground">
                            <span className="flex items-center gap-1.5 font-bold text-foreground">
                              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                              {formatApptDate(appt.date_time)}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {appt.time || '09:00'} ({appt.duration || '30 min'})
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-sm">
                            {appt.patient_name}
                            {appt.patient_phone && (
                              <span className="mt-1 block whitespace-nowrap text-base leading-relaxed font-semibold tabular-nums text-foreground">
                                {formatPhoneNumber(appt.patient_phone)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-primary">
                            {appt.modality_name || appt.exam_type}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {appt.location || appt.room || 'Salle A'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {appt.radiologist || 'Dr. Rahmane'}
                          </TableCell>
                          <TableCell>
                            {appt.priority === 'urgent' ? (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-rose-500 text-white rounded shadow-xs">
                                URGENT
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                Normale
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusPill status={appt.status} />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isArrived ? (
                                <Button
                                  data-testid={`mark-arrived-${appt.id}`}
                                  size="sm"
                                  onClick={() => handleMarkArrived(appt.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-2.5"
                                >
                                  <UserCheck className="h-3.5 w-3.5 mr-1" /> Arrivé
                                </Button>
                              ) : (
                                <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1 mr-1">
                                  <CheckCircle2 className="h-4 w-4" /> En file
                                </span>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`edit-appt-${appt.id}`}
                                onClick={() => handleOpenEditModal(appt)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                title="Modifier le rendez-vous"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`delete-appt-${appt.id}`}
                                onClick={() => handleDeleteAppointment(appt.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 border-rose-200"
                                title="Supprimer le rendez-vous"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>)}
      </div>

      <Dialog open={cancelTargetId !== null} onOpenChange={open => { if (!open) setCancelTargetId(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Annuler ce rendez-vous ?</DialogTitle><DialogDescription>Le rendez-vous sera conservé dans le planning avec le statut « Annulé ».</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setCancelTargetId(null)}>Retour</Button><Button variant="destructive" onClick={() => { if (cancelTargetId) void handleCalendarStatus(cancelTargetId, 'cancelled'); setCancelTargetId(null) }}>Confirmer l’annulation</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Appointment Deletion */}
      <Dialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2 font-bold text-base">
              <Trash2 className="h-5 w-5 text-rose-600" /> Supprimer ce Rendez-Vous ?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>
              Annuler
            </Button>
            <Button
              data-testid="confirm-delete-appt-btn"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Appointment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>{editingAppt ? 'Modification du Rendez-Vous' : 'Prise de Rendez-Vous Examen'}</DialogTitle>
            <DialogDescription>
              {editingAppt
                ? 'Modifiez les détails du rendez-vous puis validez pour enregistrer.'
                : 'Sélectionnez un patient existant ou créez un nouveau dossier pour planifier l\'examen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Patient Mode Toggle */}
            <div className="flex p-1 bg-muted rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPatientSearchMode('existing')}
                className={`flex-1 py-1.5 rounded-md font-bold transition-all ${
                  patientSearchMode === 'existing' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                🔍 Patient Existant (Recherche)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientSearchMode('new')
                  setNewAppt((prev) => ({ ...prev, patient_name: '', patient_phone: '',
    patient_birth_date: '', patient_id: null as any }))
                }}
                className={`flex-1 py-1.5 rounded-md font-bold transition-all ${
                  patientSearchMode === 'new' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                ➕ Nouveau Patient
              </button>
            </div>

            {/* Patient Search Autocomplete (Existing Patient Mode) */}
            {patientSearchMode === 'existing' ? (
              <div className="space-y-1.5 relative">
                <Label htmlFor="patient_search">Rechercher Patient (Nom, Téléphone, Secu) *</Label>
                <div className="relative">
                  <Input
                    id="patient_search"
                    data-testid="appt-patient-name"
                    placeholder="Tapez un nom (ex: Amine Benali, Sarah...)"
                    value={newAppt.patient_name || patientSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value
                      setPatientSearchQuery(val)
                      setNewAppt((prev) => ({ ...prev, patient_name: val, patient_id: null, patient_phone: '', patient_birth_date: '' }))
                      setShowPatientDropdown(true)
                    }}
                    readOnly={!!editingAppt} onFocus={() => { if (!editingAppt) setShowPatientDropdown(true) }}
                  />
                </div>

                {/* Autocomplete Dropdown List */}
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-popover border rounded-lg shadow-lg divide-y">
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setNewAppt((prev) => ({
                            ...prev,
                            patient_id: p.id,
                            patient_name: p.name,
                            patient_phone: p.phone || '',
                            patient_birth_date: p.birth_date || '',
                          }))
                          setPatientSearchQuery(p.name)
                          setShowPatientDropdown(false)
                        }}
                        className="p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-foreground block">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">Tél: {formatPhoneNumber(p.phone) || 'N/A'} • N° Sécu: {p.social_sec_no || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Sélectionner
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* New Patient Inputs */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="patient_name">Nom & Prénom du Patient *</Label>
                  <Input
                    id="patient_name"
                    data-testid="appt-patient-name"
                    placeholder="Ex: Nadir Mansouri"
                    value={newAppt.patient_name}
                    onChange={(e) => setNewAppt((prev) => ({ ...prev, patient_name: e.target.value }))}
                  />
                </div>
                <BirthDateFields id="appt_patient" value={newAppt.patient_birth_date} onChange={value => setNewAppt(prev => ({ ...prev, patient_birth_date: value }))} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appt_date_picker">Date du Rendez-Vous *</Label>
                <Input
                  id="appt_date_picker"
                  type="date"
                  data-testid="appt-date-input"
                  value={newAppt.appt_date}
                  onChange={(e) => setNewAppt((prev) => ({ ...prev, appt_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patient_phone">Téléphone</Label>
                <Input type="tel"
                  id="patient_phone"
                  placeholder="05 55 00 11 22"
                  value={newAppt.patient_phone}
                  onChange={(e) => setNewAppt((prev) => ({ ...prev, patient_phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priorité Examen</Label>
                <Select value={newAppt.priority} onValueChange={(val) => setNewAppt((prev) => ({ ...prev, priority: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="urgent">🚨 Urgent (Priorité haute)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Modalité Examen</Label>
                <Select
                  value={newAppt.exam_type}
                  onValueChange={(val) => {
                    const matchedRooms = getRoomsForExam(val)
                    setNewAppt((prev) => ({
                      ...prev,
                      exam_type: val,
                      room: matchedRooms[0] || '',
                    }))
                  }}
                >
                  <SelectTrigger aria-label="Modalité Examen">
                    <SelectValue placeholder="Examen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IRM Cérébrale">IRM Cérébrale 3T</SelectItem>
                    <SelectItem value="Scanner CT Thoracique">Scanner CT Thoracique</SelectItem>
                    <SelectItem value="Échographie Abdominale">Échographie Abdominale</SelectItem>
                    <SelectItem value="Radiographie Thorax">Radiographie Thorax</SelectItem>
                    <SelectItem value="Mammographie Bilatérale">Mammographie Bilatérale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Salle d'Imagerie Concernée</Label>
                <Select value={newAppt.room} onValueChange={(val) => setNewAppt((prev) => ({ ...prev, room: val }))}>
                  <SelectTrigger aria-label="Salle d'Imagerie Concernée">
                    <SelectValue placeholder="Salle" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoomsForExam(newAppt.exam_type).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getRoomsForExam(newAppt.exam_type).length === 0 && <p role="alert" className="text-sm text-destructive">Aucune salle disponible pour cet examen. Configurez une salle dans les paramètres ou choisissez un autre examen.</p>}
              </div>
            </div>

            <div className="space-y-2"><Label htmlFor="appt-doctor">Médecin radiologue</Label><select id="appt-doctor" className="border rounded-md p-2 bg-background w-full" value={newAppt.radiologist} onChange={e => setNewAppt(prev => ({ ...prev, radiologist: e.target.value }))}><option value="">Non affecté</option>{resources.doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
            {/* Slots selector */}
            <div className="space-y-1.5">
              <Label>Créneau Horaire Disponible ({slots.length} créneaux)</Label>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 border rounded-lg bg-muted/20">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={s.occupied}
                    onClick={() => setNewAppt((prev) => ({ ...prev, time: s.time }))}
                    className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all ${
                      s.occupied
                        ? 'bg-muted text-muted-foreground line-through cursor-not-allowed border-transparent'
                        : newAppt.time === s.time
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-background hover:border-primary text-foreground'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="button" data-testid="appt-submit-btn" onClick={handleSaveAppointment} disabled={submitting}>
              {submitting ? 'Validation...' : editingAppt ? 'Enregistrer la Modification' : 'Confirmer le Rendez-Vous'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
