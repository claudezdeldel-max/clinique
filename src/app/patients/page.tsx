import { toast } from 'sonner'
"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  Download,
  Archive,
  Trash2,
  FileSpreadsheet,
  CheckSquare,
  ShieldCheck,
  LayoutGrid,
  List,
  

} from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { KpiCard } from '@/components/clinic/kpi-card'
import { PatientWizard } from '@/components/patients/patient-wizard'
import { PatientEditDossierPage } from '@/components/patients/patient-edit-dossier-page'
import { PatientProfileCard } from '@/components/patients/patient-profile-card'
import { AppointmentModal } from '@/components/clinic/appointment-modal'
import { getPatients, bulkPatientAction, deletePatient } from '@/lib/api'
import { CimaPatientsTable } from '@/components/patients/cima-patients-table'

export default function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [patients, setPatients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)




  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState('all')
  const [gender, setGender] = useState('all')
  const [bloodGroup, setBloodGroup] = useState('all')

  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Full-page Patient Edit/Dossier State (No popup modal)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(Number(searchParams.get('patientId')) || null)
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setSelectedPatientId(Number(searchParams.get('patientId')) || null)
  }, [searchParams])
  const [wizardOpen, setWizardOpen] = useState(false)


  // Appointment Modal state for direct RDV booking
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [selectedPatientForRDV, setSelectedPatientForRDV] = useState<any>(null)

  const fetchPatientsList = async () => {
    setLoading(true)
    try {
      const res = await getPatients({
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        gender: gender !== 'all' ? gender : undefined,
        blood_group: bloodGroup !== 'all' ? bloodGroup : undefined,
      })
      setPatients(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatientsList()
  }, [search, status, gender, bloodGroup])

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const handleBulkAction = async (action: 'archive' | 'delete') => {
    if (selectedIds.length === 0) return
    if (action === 'delete' && !window.confirm('Supprimer les dossiers sélectionnés sans historique ? Pour conserver les dossiers, choisissez Archiver.')) return
    try {
      await bulkPatientAction(selectedIds, action)
      setSelectedIds([])
      await fetchPatientsList()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDeletePatient = async (patient: { id: number; name: string }) => {
    if (!window.confirm(`Supprimer le dossier de ${patient.name} ? Les dossiers avec historique doivent être archivés.`)) return
    try {
      await deletePatient(patient.id)
      setSelectedIds(previous => previous.filter(id => id !== patient.id))
      await fetchPatientsList()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleExportCsv = () => {
    window.open('/api/patients/export.csv', '_blank')
  }

  const handleOpenDossier = (id: number) => {
    setSelectedPatientId(id)
  }

  const handlePlanifyRDV = (patient: any) => {
    setSelectedPatientForRDV(patient)
    setAppointmentModalOpen(true)
  }

  // If a patient is selected for viewing/editing, render full page dossier view (NO POPUP)
  if (selectedPatientId !== null) {
    return (
      <PatientEditDossierPage
        patientId={selectedPatientId}
        onBack={() => { setSelectedPatientId(null); if (searchParams.has('patientId')) { const params = new URLSearchParams(searchParams); params.delete('patientId'); setSearchParams(params, { replace: true }) } }}
        onUpdateSuccess={fetchPatientsList}
      />
    )
  }

  return (

    <BaseLayout title="Gestion des patients" description="Gestion administrative et dossiers médicaux des patients de la clinique">
      <div className="space-y-6 px-4 md:px-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard title="Total Patients" value={String(total)} change="Registre SQLite" trend="neutral" icon={Users} />
          <KpiCard title="Dossiers Actifs" value={String(patients.filter((p) => p.status === 'Actif').length)} change="Suivi clinique" trend="up" icon={ShieldCheck} />
          <KpiCard title="Examens IRM & CT" value="48" change="Ce mois-ci" trend="up" icon={FileSpreadsheet} />
          <KpiCard title="Assurés CNAS/CASNOS" value="82%" change="Tiers Payant" trend="neutral" icon={CheckSquare} />
        </div>

        {/* Filter & View Mode Bar */}
        <Card className="shadow-xs border-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full md:w-auto flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="patient-search-input"
                    placeholder="Recherche par nom, prénom, sécu, téléphone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="patient-status-filter" className="w-[130px] text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statut</SelectItem>
                    <SelectItem value="Actif">Actif</SelectItem>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Archivé">Archivé</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="patient-gender-filter" className="w-[120px] text-xs">
                    <SelectValue placeholder="Sexe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous sexe</SelectItem>
                    <SelectItem value="Homme">Homme</SelectItem>
                    <SelectItem value="Femme">Femme</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                  <SelectTrigger data-testid="patient-blood-filter" className="w-[120px] text-xs">
                    <SelectValue placeholder="Groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous groupe</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                  </SelectContent>
                </Select>

                {(search || status !== 'all' || gender !== 'all' || bloodGroup !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setStatus('all')
                      setGender('all')
                      setBloodGroup('all')
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>

              {/* View Switcher & Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted p-1 rounded-xl border">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-7 px-2.5 text-xs font-medium gap-1 rounded-lg"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Cartes
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-7 px-2.5 text-xs font-medium gap-1 rounded-lg"
                  >
                    <List className="h-3.5 w-3.5" /> Tableau
                  </Button>
                </div>

                <Button data-testid="bulk-export-btn" variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button data-testid="new-patient-btn" size="sm" onClick={() => setWizardOpen(true)} className="bg-primary text-primary-foreground font-semibold">
                  <Plus className="h-4 w-4 mr-1" /> Nouveau Patient
                </Button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold">
                <span>{selectedIds.length} patient(s) sélectionné(s)</span>
                <div className="flex items-center gap-2">
                  <Button data-testid="bulk-archive-btn" variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                    <Archive className="h-3.5 w-3.5 mr-1" /> Archiver
                  </Button>
                  <Button data-testid="bulk-delete-btn" variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patients Display (Grid Cards or Table) */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground border-2 rounded-2xl bg-card">
            Chargement de la liste des patients...
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 rounded-2xl bg-card">
            Aucun patient trouvé dans le registre.
          </div>
        ) : viewMode === 'grid' ? (
          /* Sleek Profile Cards Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {patients.map((p) => (
              <PatientProfileCard
                key={p.id}
                patient={p}
                onViewDossier={handleOpenDossier}
                onPlanifyRDV={handlePlanifyRDV}
                onSelectOne={handleSelectOne}
                isSelected={selectedIds.includes(p.id)}
              />
            ))}
          </div>
        ) : (
          /* Table copied from GSTION DES PATIENTS.html, without the Statut column. */
          <CimaPatientsTable
            key={`${search}|${status}|${gender}|${bloodGroup}`}
            patients={patients}
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onOpenDossier={handleOpenDossier}
            onPlanifyRDV={handlePlanifyRDV}
            onDelete={handleDeletePatient}
          />
        )}
      </div>

      {/* Patient Wizard Modal */}
      <PatientWizard open={wizardOpen} onOpenChange={setWizardOpen} onSuccess={fetchPatientsList} />

      {/* Direct Appointment Booking Modal */}
      <AppointmentModal

        open={appointmentModalOpen}
        onOpenChange={setAppointmentModalOpen}
        initialPatient={selectedPatientForRDV}
        onSuccess={fetchPatientsList}
      />
    </BaseLayout>
  )
}
