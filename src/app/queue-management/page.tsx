import { PatientPicker } from '@/components/patients/patient-picker'
import { BirthDateFields } from '@/components/patients/birth-date-fields'
"use client";

import { useState, useEffect } from 'react';
import { useClinicResources } from '@/hooks/use-clinic-resources';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { queueDossierLink } from '@/lib/dossier-link';
import { useAccountStore, hasDossierAccess, examCategory, EXAMS } from '@/stores/account-store';
import { BaseLayout } from '@/components/layouts/base-layout';
import { useQueue } from '@/hooks/use-queue';
import { useSchoolData } from '@/hooks/use-school-data';
import type { QueuePriority, QueueStatus } from '@/types/queue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatPatientName, calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users,
  Megaphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Volume2,
  Plus,
  RotateCcw,
  UserCheck,
  UserX,
  Trash2,
  Search,
  Sparkles,
  Tv,
  Phone,
  ShieldCheck,
  Pause,
  Play,
  Printer,
} from 'lucide-react';
import { printDocument, escapeText } from '@/lib/print-document';
import { toggleQueuePause } from '@/lib/api';

const MODALITIES = [
  'IRM Cérébrale & Médullaire 3T',
  'Scanner CT 128 Coupes',
  'Échographie Doppler Vasculaire',
  'Radiographie Numérique Thorax',
  'Mammographie Numérique',
];

export default function QueueManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketSearch = searchParams.get('search') || '';
  const examFilter = (searchParams.get('exam') || '').split(',').filter(value => value in EXAMS);
  const account = useAccountStore(s => s.user);
  const openDossier = (item: Parameters<typeof queueDossierLink>[0]) => {
    const link = queueDossierLink(item);
    if (link) navigate(link);
    else toast.error('Associez ce ticket à un patient enregistré avant d’ouvrir son dossier.');
  };
  const {
    queue,
    loading,
    error: queueError,
    paused: serverPaused,
    refreshQueue,
    stats,
    addTicket,
    updateStatus,
    callPatient,
    startExam,
    callNextWaitingPatient,
    resetQueue,
    deleteTicket,
    testAudio,
    canCall,
  } = useQueue({ enableAudio: true });

  const resources = useClinicResources();
  const ROOMS = ['Tous les bureaux / Salles', ...Array.from(new Set([...resources.rooms.map(r => r.name), ...queue.map(q => q.room_name)]))];
  const availableRooms = resources.rooms.filter(r => r.status === 'available' || r.status === 'busy').map(r => r.name);
  const RADIOLOGISTS = resources.doctors.map(d => d.name);
  const { addStudent } = useSchoolData();

  const [selectedRoom, setSelectedRoom] = useState<string>('Tous les bureaux / Salles');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState<string>(ticketSearch);
  useEffect(() => { setSearchQuery(ticketSearch); }, [ticketSearch]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isQueuePaused, setIsQueuePaused] = useState<boolean>(false);
  const [enteringPatient, setEnteringPatient] = useState<number | null>(null);
  const [selectedPrintTicket, setSelectedPrintTicket] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);

  // New Ticket Form state
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isExpressPatientMode, setIsExpressPatientMode] = useState<boolean>(false);
  const [expressName, setExpressName] = useState<string>('');
  const [expressBirthDate, setExpressBirthDate] = useState<string>('');
  const expressAge = String(calculateAge(expressBirthDate) ?? '');
  const [expressPhone, setExpressPhone] = useState<string>('');

  const [newModality, setNewModality] = useState<string>(MODALITIES[0]);
  const [newDoctor, setNewDoctor] = useState<string>('');
  const [newRoom, setNewRoom] = useState<string>('');
  const [newPriority, setNewPriority] = useState<QueuePriority>('normal');
  const [newNotes, setNewNotes] = useState<string>('');

  const [ticketError, setTicketError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!newDoctor && resources.doctors.length) setNewDoctor(resources.doctors[0].name);
    if (!newRoom && resources.rooms.length) setNewRoom(resources.rooms.find(r => r.status === 'available')?.name || '');
  }, [resources.doctors, resources.rooms, newDoctor, newRoom]);
  useEffect(() => { setIsQueuePaused(serverPaused) }, [serverPaused]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!newRoom) { toast.error('Choisissez une salle disponible.'); return; }
    setSubmitting(true); setTicketError('');
    try {
    let finalPatientName = '';
    let finalPatientId: number | undefined;

    if (isExpressPatientMode) {
      if (!expressName.trim()) {
        toast.error('Veuillez saisir le nom du nouveau patient.');
        return;
      }
      if (expressBirthDate && calculateAge(expressBirthDate) === null) {
        toast.error('Date de naissance invalide.');
        return;
      }

      const formattedExpressName = formatPatientName(expressName);

      // Enregistrer d'abord le patient en BDD SQLite
      try {
        const created = await addStudent({
          name: formattedExpressName,
          email: '',
          birth_date: expressBirthDate,
          grade: expressAge,
          parent_phone: expressPhone,
        });

        finalPatientName = created?.name || formattedExpressName;
        finalPatientId = created?.id;
        setSelectedPatient(created); setIsExpressPatientMode(false);
        toast.success(`Nouveau patient ${finalPatientName} enregistré en BDD avec succès !`);
      } catch (err) {
        toast.error("Erreur d'enregistrement du patient express.");
        return;
      }
    } else {
      if (!selectedPatient?.id) {
        toast.error("Sélectionnez un patient.");
        return;
      }
      const existing = selectedPatient;
      if (!existing) {
        toast.error("Patient non trouvé dans le système.");
        return;
      }
      finalPatientName = formatPatientName(existing.name);
      finalPatientId = existing.id;
    }

    try {
      const ticket = await addTicket({
        patient_id: finalPatientId,
        patient_name: finalPatientName,
        modality_name: newModality,
        doctor_name: newDoctor,
        room_name: newRoom,
        priority: newPriority,
        notes: newNotes,
      });

      toast.success(`Ticket ${ticket.ticket_number} émis pour ${ticket.patient_name}`);
      setIsAddModalOpen(false);
      setSelectedPatient(null);
      setExpressName('');
      setExpressBirthDate('');
      setExpressPhone('');
      setIsExpressPatientMode(false);
      setNewNotes('');
    } catch (err) {
      setTicketError((err as Error).message); toast.error((err as Error).message);
    }
    } finally { setSubmitting(false); }
  };

  const handleCallNext = async () => {
    const filter = selectedRoom === 'Tous les bureaux / Salles' ? undefined : selectedRoom;
    const called = await callNextWaitingPatient(filter);
    if (called) {
      toast.success(`Patient appelé : ${called.patient_name} (${called.ticket_number})`);
      if (hasDossierAccess(account)) openDossier(called);
    } else {
      toast.info('Aucun patient en attente dans la file pour cette salle.');
    }
  };

  const handleOpenDisplay = () => {
    window.open('/queue-display', '_blank', 'noopener,noreferrer');
    toast.info('Écran TV Salle d\'attente ouvert dans une nouvelle fenêtre.');
  };

  const filteredQueue = queue.filter((item) => {
    const matchesRoom =
      selectedRoom === 'Tous les bureaux / Salles' || item.room_name === selectedRoom;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && ['waiting', 'called', 'in_progress'].includes(item.status)) ||
      (statusFilter === 'waiting' && item.status === 'waiting') ||
      (statusFilter === 'called' && (item.status === 'called' || item.status === 'in_progress')) ||
      (statusFilter === 'completed' && item.status === 'completed');
    const matchesSearch =
      (item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || formatPatientName(item.patient_name).toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExam = examFilter.length === 0 || examFilter.includes(examCategory(item.modality_name));
    return matchesRoom && matchesStatus && matchesSearch && matchesExam;
  }).sort((a, b) => a.id - b.id);

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">En Attente</Badge>;
      case 'called':
        return <Badge className="bg-blue-600 text-white animate-pulse">Appelé</Badge>;
      case 'in_progress':
        return <Badge className="bg-emerald-600 text-white">En cours</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Terminé</Badge>;
      case 'absent':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">Absent</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground">Annulé</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">En Attente</Badge>;
    }
  };

  const getPriorityBadge = (priority: QueuePriority) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-600 text-white flex gap-1 items-center font-bold"><AlertTriangle className="size-3" /> Urgence</Badge>;
      case 'vip':
        return <Badge className="bg-purple-600 text-white font-medium">VIP</Badge>;
      case 'normal':
      default:
        return <Badge variant="outline" className="text-xs text-muted-foreground">Normal</Badge>;
    }
  };

  return (
    <BaseLayout>
      {(queueError || resources.error) && <div role="alert" className="m-4 rounded-lg border border-destructive p-4 text-destructive">{queueError || resources.error} · Les données affichées peuvent être anciennes.<Button variant="outline" onClick={refreshQueue}>Réessayer</Button></div>}
      <div className="flex-1 space-y-6 px-6 pt-2 pb-10">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">File d'attente</h1>
            <p className="text-xs text-muted-foreground mt-1">Gestion des tickets et appel des patients enregistrés dans le système.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={testAudio} variant="outline" size="sm" className="gap-2">
              <Volume2 className="size-4 text-primary" />
              Test audio
            </Button>

            <Button
              data-testid="queue-pause-toggle"
              onClick={async () => {
                const next = !isQueuePaused
                setIsQueuePaused(next)
                await toggleQueuePause(next)
                toast.info(next ? "File d'attente suspendue" : "File d'attente reprise")
              }}
              variant={isQueuePaused ? "destructive" : "outline"}
              size="sm"
              className="gap-2"
            >
              {isQueuePaused ? <Pause className="size-4" /> : <Play className="size-4" />}
              {isQueuePaused ? "File Suspendue" : "Suspendre File"}
            </Button>
            
            <Button onClick={handleOpenDisplay} variant="outline" size="sm" className="gap-2 bg-slate-900 text-slate-50 hover:bg-slate-800 border-slate-700 dark:bg-slate-100 dark:text-slate-900">
              <Tv className="size-4 text-emerald-400 dark:text-emerald-600" />
              Écran TV
            </Button>

            <Button onClick={() => {
              setSelectedPatient(null); setExpressName(''); setExpressBirthDate(''); setExpressPhone('');
              setIsExpressPatientMode(false); setNewNotes(''); setIsAddModalOpen(true);
            }} size="sm" className="gap-2 bg-primary text-primary-foreground font-bold">
              <Plus className="size-4" />
              Nouveau Ticket Patient
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En Attente</CardTitle>
              <Users className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.totalWaiting}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.urgentCount > 0 ? `${stats.urgentCount} urgence(s)` : 'File normale'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Appelés / En Cours</CardTitle>
              <Megaphone className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{stats.totalCalled}</div>
              <p className="text-xs text-blue-600/80 mt-1">Salles occupées</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Terminés Aujourd'hui</CardTitle>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground mt-1">Réalisés</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temps Moyen</CardTitle>
              <Clock className="size-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgWaitMinutes} min</div>
              <p className="text-xs text-muted-foreground mt-1">Estimation</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-primary">Appeler le Suivant</CardTitle>
              <Sparkles className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <Button onClick={handleCallNext} disabled={isQueuePaused || !queue.some(item => item.status === 'waiting' && canCall(item))} size="sm" className="w-full gap-2 font-bold cursor-pointer">
                <Megaphone className="size-3.5" />
                Appeler Suivant
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-4">
            {examFilter.length > 0 && <div className="flex items-center gap-3 text-sm"><span>Examens : {examFilter.map(value => EXAMS[value as keyof typeof EXAMS]).join(' / ')}</span><Button variant="outline" size="sm" onClick={() => { const params = new URLSearchParams(searchParams); params.delete('exam'); setSearchParams(params); }}>Tous les examens</Button></div>}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom de patient ou ticket (ex: T-101)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Statut de la file d’attente" className="w-full sm:w-[230px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">En attente + En cours</SelectItem>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="waiting">En attente</SelectItem>
                    <SelectItem value="called">Appelés / En cours</SelectItem>
                    <SelectItem value="completed">Terminés</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setIsResetConfirmOpen(true)} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <RotateCcw className="size-4 mr-1" /> ReàZ File
                </Button>
              </div>
            </div>

            {/* Queue Table */}
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Ticket #</th>
                    <th className="px-4 py-3">Patient Enregistré</th>
                    <th className="px-4 py-3">Examen & Salle</th>
                    <th className="px-4 py-3">Médecin</th>
                    <th className="px-4 py-3 text-center">Priorité</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-right">Actions Appel</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Chargement de la file d'attente...
                      </td>
                    </tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun ticket correspondant dans la file d'attente.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => {
                      const isCalled = item.status === 'called' || item.status === 'in_progress';

                      return (
                        <tr key={item.id} data-testid={`queue-ticket-${item.id}`} className={`hover:bg-muted/30 transition-colors ${isCalled ? 'bg-blue-500/5' : ''}`}>
                          <td className="px-4 py-3 font-mono font-bold text-base text-primary">
                            {item.ticket_number}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="size-4 text-emerald-600" />
                              {hasDossierAccess(account) ? <button className="text-left underline-offset-4 hover:underline" onClick={() => openDossier(item)}>{formatPatientName(item.patient_name)}</button> : formatPatientName(item.patient_name)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium text-foreground">{item.modality_name}</div>
                            <div className="text-muted-foreground font-mono">{item.room_name}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-muted-foreground">
                            {item.doctor_name || 'Non affecté'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getPriorityBadge(item.priority)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {hasDossierAccess(account) && <Button variant="outline" size="sm" onClick={() => openDossier(item)} disabled={!item.patient_id}>Ouvrir le dossier</Button>}
                              {/* Calling and confirming entry are separate steps. */}
                              {item.status === 'waiting' && (
                                <Button
                                  onClick={async () => { const called = await callPatient(item); if (called && hasDossierAccess(account)) openDossier(called); }}
                                  disabled={!canCall(item) || isQueuePaused}
                                  size="sm"
                                  className="h-8 gap-1 bg-blue-600 text-white hover:bg-blue-700 font-semibold cursor-pointer"
                                >
                                  <Megaphone className="size-3.5" />
                                  Appeler
                                </Button>
                              )}

                              {isCalled && (
                                <>
                                  <Button
                                    onClick={async () => {
                                      if (enteringPatient !== null) return;
                                      setEnteringPatient(item.id);
                                      try { await startExam(item); } finally { setEnteringPatient(null); }
                                    }}
                                    disabled={item.status === 'in_progress' || !canCall(item) || !!queueError || enteringPatient !== null}
                                    size="sm"
                                    variant="outline"
                                    title={item.status === 'in_progress' ? 'Le patient est entré, l’examen est en cours.' : 'Confirmer l’entrée du patient et démarrer l’examen.'}
                                    className="h-8 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                                  >
                                    <UserCheck className="size-3.5" />
                                    {item.status === 'in_progress' ? 'En cours' : enteringPatient === item.id ? 'Validation…' : 'Entrer'}
                                  </Button>
                                  <Button
                                    onClick={async () => {
                                      try { await updateStatus(item.id, 'waiting')
                                      toast.info(`Appel annulé par erreur pour ${item.patient_name}. Ticket remis en attente.`) } catch (err) { toast.error((err as Error).message) }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer font-bold"
                                    title="Annuler l'appel cliqué par erreur (Remettre en attente)"
                                  >
                                    <RotateCcw className="size-3.5" />
                                    Annuler Appel
                                  </Button>
                                </>
                              )}

                              {/* Complete */}
                              {item.status !== 'completed' && (
                                <Button
                                  onClick={() => void updateStatus(item.id, 'completed').catch(err => toast.error(err.message))}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-emerald-600 hover:bg-emerald-50"
                                  title="Marquer terminé"
                                >
                                  <UserCheck className="size-3.5" />
                                </Button>
                              )}

                              {/* Ticket printing button */}
                              <Button
                                onClick={() => {
                                  setSelectedPrintTicket(item);
                                  setIsTicketModalOpen(true);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 text-2xs px-2 font-bold border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1 cursor-pointer"
                                title="Imprimer le Ticket"
                              >
                                <Printer className="size-3.5" /> Ticket
                              </Button>

                              {/* Mark Absent */}
                              {item.status !== 'completed' && item.status !== 'absent' && (
                                <Button
                                  onClick={() => void updateStatus(item.id, 'absent').catch(err => toast.error(err.message))}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                  title="Marquer absent"
                                >
                                  <UserX className="size-3.5" />
                                </Button>
                              )}

                              {/* Delete */}
                              <Button
                                onClick={() => { if (window.confirm(`Supprimer le ticket ${item.ticket_number} ?`)) void deleteTicket(item.id).catch(err => toast.error(err.message)) }}
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                title="Supprimer"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal: Émission de Ticket avec Validation de Patient Enregistré & Création Express */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                <Plus className="size-5" />
                Nouveau ticket
              </DialogTitle>
              <DialogDescription className="sr-only">Patient et examen à ajouter à la file.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTicket} className="space-y-4 py-2">
              {/* Patient Selector or Express Registration */}
              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
                <Label className="text-sm font-medium">Patient *</Label>
                {!isExpressPatientMode ? (
                  <PatientPicker value={selectedPatient} onChange={setSelectedPatient} onNew={() => setIsExpressPatientMode(true)} />
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-background border border-primary/30">
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsExpressPatientMode(false)}>Rechercher un patient</button>
                    <div className="space-y-1">
                      <Label htmlFor="express_name" className="text-xs">Nom et prénom *</Label>
                      <Input
                        id="express_name"
                        placeholder="ex: Molière Jean-Baptiste"
                        value={expressName}
                        onChange={(e) => setExpressName(e.target.value)}
                        required
                      />
                    </div>
                    <BirthDateFields id="express" value={expressBirthDate} onChange={setExpressBirthDate} />
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="express_phone" className="text-xs font-bold flex items-center gap-1">
                          <Phone className="size-3 text-primary" /> Téléphone
                        </Label>
                        <Input type="tel"
                          id="express_phone"
                          placeholder="06 12 34 56 78"
                          value={expressPhone}
                          onChange={(e) => setExpressPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="modality">Examen</Label>
                  <Select value={newModality} onValueChange={setNewModality}>
                    <SelectTrigger id="modality" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="room">Salle *</Label>
                  <Select value={newRoom} onValueChange={setNewRoom}>
                    <SelectTrigger id="room" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="doctor">Médecin</Label>
                  <Select value={newDoctor} onValueChange={setNewDoctor}>
                    <SelectTrigger id="doctor" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIOLOGISTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="priority">Priorité</Label>
                  <Select value={newPriority} onValueChange={(val) => setNewPriority(val as QueuePriority)}>
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">🔴 Urgence</SelectItem>
                      <SelectItem value="vip">🟣 VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {ticketError && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{ticketError}</p>}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Annuler
                </Button>
                <Button disabled={submitting || !!queueError} type="submit" className="bg-primary text-primary-foreground font-bold cursor-pointer">
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Reset Queue Confirmation */}
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
                <RotateCcw className="size-5" />
                Réinitialiser la file d'attente ?
              </DialogTitle>
              <DialogDescription>
                Cette action supprimera les tickets sans compte rendu. Les tickets associés à un dossier médical seront conservés pour retrouver les examens.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsResetConfirmOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try { await resetQueue();
                  setIsResetConfirmOpen(false);
                  toast.success("File d'attente réinitialisée avec succès !"); } catch (err) { toast.error((err as Error).message) }
                }}
              >
                Réinitialiser la File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Ticket Printing Preview */}
        <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
          <DialogContent className="sm:max-w-[420px] rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                <Printer className="size-5" /> Ticket de Passage Patient
              </DialogTitle>
              <DialogDescription>
                Aperçu du ticket thermique imprimable pour la salle d'attente.
              </DialogDescription>
            </DialogHeader>

            {selectedPrintTicket && (
              <div id="printable-ticket" className="p-6 border-2 border-dashed border-primary/40 rounded-2xl bg-slate-50 dark:bg-slate-900 text-center space-y-4 font-mono text-slate-800 dark:text-slate-200 shadow-inner">
                <div className="border-b pb-3 space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider text-primary font-sans">
                    RadioMed — Clinique de Radiologie
                  </div>
                  <div className="text-2xs text-muted-foreground font-sans">
                    Système d'Appel & Gestion de File d'Attente
                  </div>
                </div>

                <div>
                  <div className="text-2xs uppercase text-muted-foreground tracking-widest">N° DE TICKET DE PASSAGE</div>
                  <div className="text-5xl font-black text-primary tracking-tight my-1">
                    {selectedPrintTicket.ticket_number}
                  </div>
                  <div className="text-xs font-bold text-foreground uppercase font-sans">
                    {selectedPrintTicket.patient_name}
                  </div>
                </div>

                <div className="bg-background p-3 rounded-xl border text-left space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Examen :</span>
                    <span className="font-bold text-foreground">{selectedPrintTicket.modality_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salle :</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedPrintTicket.room_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Médecin :</span>
                    <span className="font-medium text-foreground">{selectedPrintTicket.doctor_name || 'Non affecté'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date / Heure :</span>
                    <span className="font-mono text-2xs">{new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-muted-foreground font-sans">
                    Veuillez conserver ce ticket jusqu'à la fin de votre examen
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsTicketModalOpen(false)}>
                Fermer
              </Button>
              <Button onClick={() => { const t = selectedPrintTicket; if (t) void printDocument(t.ticket_number, `<h1>RadioMed — Ticket ${escapeText(t.ticket_number)}</h1><h2>${escapeText(t.patient_name)}</h2><p>Examen : ${escapeText(t.modality_name)}</p><p>Salle : ${escapeText(t.room_name)}</p><p>Médecin : ${escapeText(t.doctor_name || 'Non affecté')}</p><p>Veuillez conserver ce ticket jusqu’à la fin de votre examen.</p>`, 'Ticket').catch(err => toast.error(err.message)) }} className="bg-primary text-primary-foreground font-bold gap-2">
                <Printer className="size-4" />
                Imprimer le Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseLayout>
  );
}
