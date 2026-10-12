import { formatPhoneNumber } from '@/lib/utils'
"use client"

import { useState, useEffect } from 'react'
import { UserPlus, Calendar, PhoneCall, CreditCard, Plus, FileSpreadsheet, User, Phone } from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { KpiCard } from '@/components/clinic/kpi-card'
import { StatusPill } from '@/components/clinic/status-pill'
import { PatientWizard } from '@/components/patients/patient-wizard'
import { getCalls, createCall, getPayments } from '@/lib/api'
import { ReadyFiles } from '@/components/clinic/ready-files'

export default function SecretariatPage() {
  const [calls, setCalls] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [callModalOpen, setCallModalOpen] = useState(false)

  // Call form state
  const [newCall, setNewCall] = useState({
    caller: '',
    phone: '',
    type: 'incoming',
    reason: 'Prise de RDV',
    notes: '',
  })
  const [submittingCall, setSubmittingCall] = useState(false)

  const fetchData = async () => {
    try {
      const [c, p] = await Promise.all([getCalls(), getPayments()])
      setCalls(c || [])
      setPayments(p || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateCall = async () => {
    if (!newCall.caller.trim()) return
    setSubmittingCall(true)
    try {
      await createCall(newCall)
      setCallModalOpen(false)
      setNewCall({ caller: '', phone: '', type: 'incoming', reason: 'Prise de RDV', notes: '' })
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingCall(false)
    }
  }

  return (
    <BaseLayout title="Espace Secrétariat & Accueil" description="Accueil des patients, enregistrement administratif, quittances et journal des appels">
      <div className="space-y-6 px-4 md:px-6">
        {/* Quick Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-sky-900 to-indigo-950 text-white rounded-2xl shadow-sm border">
          <div>
            <h2 className="text-xl font-black tracking-tight">Accueil & Secrétariat Médical</h2>
            <p className="text-xs text-sky-200 mt-0.5">Poste d'orientation et encaissement quittances</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              data-testid="secretariat-new-patient"
              onClick={() => setWizardOpen(true)}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
            >
              <UserPlus className="h-4 w-4 mr-1" /> Nouveau Patient
            </Button>

            <Button
              data-testid="secretariat-new-appt"
              onClick={() => (window.location.href = '/calendar')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              <Calendar className="h-4 w-4 mr-1" /> Prise de RDV
            </Button>

            <Button
              onClick={() => setCallModalOpen(true)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <PhoneCall className="h-4 w-4 mr-1" /> Enregistrer Appel
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <ReadyFiles />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard title="Patients Accueillis" value="28" change="Aujourd'hui" trend="up" icon={User} />
          <KpiCard title="Quittances Émises" value={String(payments.length)} change="Tiers Payant & Cash" trend="up" icon={CreditCard} />
          <KpiCard title="Encaissement Espèces" value="145,000 DA" change="Caisse ouverte" trend="neutral" icon={FileSpreadsheet} />
          <KpiCard title="Appels Téléphoniques" value={String(calls.length)} change="Journal du jour" trend="neutral" icon={PhoneCall} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Journal Widget */}
          <Card data-testid="secretariat-calls-widget" className="border-2 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-primary" /> Journal des Appels Téléphoniques
                </CardTitle>
                <CardDescription>Suivi des demandes d'information et rendez-vous téléphoniques</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCallModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouvel Appel
              </Button>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {calls.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Aucun appel enregistré.</div>
                ) : (
                  calls.map((c) => (
                    <div key={c.id} className="p-3 border rounded-xl bg-card flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{c.caller}</div>
                          <div className="text-xs text-muted-foreground">{formatPhoneNumber(c.phone)} • {c.reason}</div>
                          {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{c.notes}"</p>}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{c.created_at?.substring(11, 16) || '10:15'}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments & Receipts Widget */}
          <Card className="border-2 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Dernières Quittances de Caisse
                </CardTitle>
                <CardDescription>Encaissements et règlements des examens</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = '/payments')}>
                Voir tout
              </Button>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {payments.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-3 border rounded-xl bg-card flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{p.student_name || 'Amine Benali'}</div>
                      <div className="text-xs text-muted-foreground">{p.receipt_no} • {p.grade || 'IRM Cérébrale'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-emerald-600">{p.paid_amount || 15000} DA</div>
                      <StatusPill status={p.payment_status || 'Paid'} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Patient Wizard Modal */}
      <PatientWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* Call Modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un Appel Téléphonique</DialogTitle>
            <DialogDescription>Consignez l'appelant et l'objet de la communication.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="caller">Nom de l'Appelant *</Label>
              <Input
                id="caller"
                placeholder="Ex: Mme. Zahra Benali"
                value={newCall.caller}
                onChange={(e) => setNewCall({ ...newCall, caller: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="call_phone">Téléphone</Label>
                <Input type="tel"
                  id="call_phone"
                  placeholder="05 55 12 34 56"
                  value={newCall.phone}
                  onChange={(e) => setNewCall({ ...newCall, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Motif</Label>
                <Select value={newCall.reason} onValueChange={(val) => setNewCall({ ...newCall, reason: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Motif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prise de RDV">Prise de RDV</SelectItem>
                    <SelectItem value="Demande de Résultats">Demande de Résultats</SelectItem>
                    <SelectItem value="Renseignement Tarif">Renseignement Tarif</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="call_notes">Notes / Observations</Label>
              <Textarea
                id="call_notes"
                placeholder="Détails de l'échange..."
                value={newCall.notes}
                onChange={(e) => setNewCall({ ...newCall, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCallModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCall} disabled={submittingCall}>
              {submittingCall ? 'Enregistrement...' : 'Enregistrer Appel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
