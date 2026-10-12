"use client"

import { useState, useEffect } from 'react'
import {
  Users,
  Calendar,
  Megaphone,
  Scan,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HeroBanner } from '@/components/clinic/hero-banner'
import { KpiCard } from '@/components/clinic/kpi-card'
import { StatusPill } from '@/components/clinic/status-pill'
import { PatientWizard } from '@/components/patients/patient-wizard'
import { getDashboardSummary, updateEquipment } from '@/lib/api'
import { useThemeSettingsStore } from '@/stores/theme-settings-store'
import { CimaDashboard } from '@/components/clinic/cima-dashboard'

export default function Dashboard2() {
  const designStyle = useThemeSettingsStore(state => state.designStyle)
  return designStyle === 'mediscan' ? <CimaDashboard /> : <StandardDashboard />
}

function StandardDashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)

  const fetchSummary = async () => {
    try {
      const data = await getDashboardSummary()
      setSummary(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const handleToggleMaintenance = async (equipId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'operational' ? 'maintenance' : 'operational'
    try {
      await updateEquipment(equipId, { status: nextStatus })
      await fetchSummary()
    } catch (err) {
      console.error(err)
    }
  }

  const kpis = summary?.kpis || {
    today_appointments: 12,
    total_patients: 148,
    completed_exams: 8,
    waiting_queue: 3,
  }

  return (
    <BaseLayout>
      <div className="flex-1 space-y-6 px-4 md:px-6 pt-0">
        {/* Hero Banner */}
        <HeroBanner
          title="RadioMed OS — Clinique de Radiologie Haute Précision"
          subtitle="Bienvenue Dr. Rahmane. 12 examens d'imagerie au programme aujourd'hui. Toutes les modalités d'imagerie fonctionnent sous contrôle automatisé."
          onPrimaryClick={() => setWizardOpen(true)}
          primaryLabel="Nouveau Patient"
        />
        {loading && (
          <p data-testid="dashboard-loading" className="text-xs text-muted-foreground">Synchronisation avec la base SQLite…</p>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Examens du Jour"
            value={String(kpis.today_appointments)}
            change="+3 urgences"
            trend="up"
            icon={Calendar}
            description="Planning imagerie"
          />
          <KpiCard
            title="Total Patients"
            value={String(kpis.total_patients)}
            change="Base SQLite"
            trend="neutral"
            icon={Users}
            description="Registre actif"
          />
          <KpiCard
            title="Examens Réalisés"
            value={String(kpis.completed_exams)}
            change="66% du quota"
            trend="up"
            icon={CheckCircle2}
            description="Comptes-rendus en cours"
          />
          <KpiCard
            title="File d'Attente"
            value={String(kpis.waiting_queue)}
            change="Temps moyen 12 min"
            trend="neutral"
            icon={Megaphone}
            description="Patients en salle"
          />
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Live Queue & Appointments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Queue Widget */}
            <Card data-testid="dashboard-queue-widget" className="border-2 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" /> Direct File d'Attente Appel
                  </CardTitle>
                  <CardDescription>Patients actuellement en attente et en cours d'examen dans les salles</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/queue-management">
                    Gestion file <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {summary?.queue && summary.queue.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {summary.queue.slice(0, 4).map((q: any) => (
                      <div key={q.id} className="p-3 border rounded-xl bg-card flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-sm px-2.5 py-1 bg-primary/10 text-primary rounded-lg">
                            {q.ticket_number}
                          </span>
                          <div>
                            <div className="font-bold text-sm">{q.patient_name}</div>
                            <div className="text-xs text-muted-foreground">{q.modality_name} • {q.room_name}</div>
                          </div>
                        </div>
                        <StatusPill status={q.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Aucun patient en file d'attente pour le moment.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today Appointments Summary */}
            <Card className="border-2 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Planning de la Journée
                  </CardTitle>
                  <CardDescription>Rendez-vous programmés pour la journée</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/calendar">
                    Voir planning <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent>
                {summary?.today_appointments && summary.today_appointments.length > 0 ? (
                  <div className="space-y-2">
                    {summary.today_appointments.slice(0, 5).map((a: any) => (
                      <div key={a.id} className="p-3 border rounded-lg bg-card flex items-center justify-between hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-bold px-2 py-1 bg-muted rounded text-foreground">
                            {a.time}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{a.patient_name}</div>
                            <div className="text-xs text-muted-foreground">{a.modality_name} • {a.radiologist}</div>
                          </div>
                        </div>
                        <StatusPill status={a.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Aucun rendez-vous aujourd'hui.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Equipment Grid */}
          <div className="space-y-6">
            <Card data-testid="equipment-grid" className="border-2 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Scan className="h-5 w-5 text-primary" /> Équipements & Salles
                </CardTitle>
                <CardDescription>État opérationnel et maintenance</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {summary?.equipment && summary.equipment.length > 0 ? (
                  summary.equipment.map((e: any) => (
                    <div key={e.id} className="p-3 border rounded-xl bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{e.name}</span>
                        <StatusPill status={e.status} />
                      </div>

                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Modalité: {e.code} ({e.room})</span>
                        <span>Charge: {e.usage_pct}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            e.usage_pct > 80 ? 'bg-amber-500' : e.usage_pct > 50 ? 'bg-primary' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${e.usage_pct}%` }}
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Prochaine maintenance: {e.next_maintenance}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleMaintenance(e.id, e.status)}
                          className="h-6 text-[10px] font-semibold"
                        >
                          {e.status === 'operational' ? 'Mettre en maintenance' : 'Activer'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Aucun équipement enregistré.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Patient Wizard Modal */}
      <PatientWizard open={wizardOpen} onOpenChange={setWizardOpen} onSuccess={fetchSummary} />
    </BaseLayout>
  )
}
