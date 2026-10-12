"use client"

import React,{ useState,useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccountStore, hasDossierAccess } from '@/stores/account-store'
import { printDocument, escapeText } from '@/lib/print-document'
import {
User,
ArrowLeft,
Save,
Calendar,
Phone,
Mail,
ShieldCheck,
FileText,
Activity,Printer,
Plus,AlertCircle,Pill,
Upload
} from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select'
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs'
import { Card,CardContent,CardHeader,CardTitle,CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusPill } from '@/components/clinic/status-pill'
import { toast } from 'sonner'
import { getPatientById,updatePatient,addPatientNote,addPatientDocument } from '@/lib/api'
import { getPatientAvatarUrl } from '@/components/patients/patient-profile-card'
import { AppointmentModal } from '@/components/clinic/appointment-modal'
import { PrescriptionModal } from '@/components/clinic/prescription-modal'
import { calculateAge, formatPhoneNumber } from '@/lib/utils'


interface PatientEditDossierPageProps {
  patientId: number
  onBack: () => void
  onUpdateSuccess?: () => void
}

export function PatientEditDossierPage({ patientId, onBack, onUpdateSuccess }: PatientEditDossierPageProps) {
  const navigate = useNavigate()
  const account = useAccountStore(s => s.user)
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    age: '',
    gender: '',
    phone: '',
    birth_date: '',
    nationality: '',
    marital_status: '',
    address: '',
    profession: '',
    emergency_contact: '',
    social_sec_no: '',
    insurance_type: '',
    insurance_number: '',
    blood_group: '',
    weight: '',
    height: '',
    prescribing_doctor: '',
    requested_exam: '',
    notes: '',
    allergies_notes: '',
    history_notes: '',
    status: 'Actif',
  })

  // New Note state
  const [newNote, setNewNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  // New Document state
  const [docTitle, setDocTitle] = useState('')
  const [docKind] = useState('pdf')
  const [submittingDoc, setSubmittingDoc] = useState(false)

  // Appointment & Prescription Modal States
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false)


  const fetchPatientDetails = async () => {
    setLoading(true)
    try {
      const data = await getPatientById(patientId)
      if (data) {
        setPatient(data)
        setFormData({
          name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || '',
          first_name: data.first_name || data.name?.split(' ')[0] || '',
          last_name: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
          email: data.email || '',
          age: String(calculateAge(data.birth_date) ?? ''),
          gender: data.gender || '',
          phone: data.phone || '',
          birth_date: data.birth_date || '',
          nationality: data.nationality || '',
          marital_status: data.marital_status || '',
          address: data.address || '',
          profession: data.profession || '',
          emergency_contact: data.emergency_contact || '',
          social_sec_no: data.social_sec_no || '',
          insurance_type: data.insurance_type || '',
          insurance_number: data.insurance_number || '',
          blood_group: data.blood_group || '',
          weight: String(data.weight ?? ''),
          height: String(data.height ?? ''),
          prescribing_doctor: data.prescribing_doctor || '',
          requested_exam: data.requested_exam || '',
          notes: data.clinical_notes || '',
          allergies_notes: data.allergies_notes || '',
          history_notes: data.history_notes || '',
          status: data.status || 'Actif',
        })
      }
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors du chargement des données du patient.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatientDetails()
  }, [patientId])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'birth_date') {
        updated.age = String(calculateAge(value) ?? '')
      }
      return updated
    })
  }

  const handleSavePatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const computedName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim() || formData.name.trim()
      if (!computedName) { toast.error('Le nom du patient est obligatoire.'); return }
      if (formData.birth_date && calculateAge(formData.birth_date) === null) { toast.error('Date de naissance invalide.'); return }
      const payload = {
        ...formData,
        name: computedName,
        age: calculateAge(formData.birth_date),
        weight: formData.weight === '' ? null : Number(formData.weight),
        height: formData.height === '' ? null : Number(formData.height),
      }

      const updated = await updatePatient(patientId, payload)
      if (updated) {
        setPatient((previous: any) => ({ ...previous, ...updated, clinical_notes: updated.notes, notes: previous?.notes || [] }))
        toast.success(`Le dossier de ${computedName} a été mis à jour avec succès !`)
        if (onUpdateSuccess) onUpdateSuccess()
      }
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde des modifications.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setSubmittingNote(true)
    try {
      const added = await addPatientNote(patientId, { author: account?.name || 'Accueil', content: newNote })
      if (added) {
        setNewNote('')
        toast.success('Observation médicale ajoutée avec succès.')
        await fetchPatientDetails()
      }
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'ajout de la note.')
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docTitle.trim()) return
    setSubmittingDoc(true)
    try {
      await addPatientDocument(patientId, { title: docTitle, kind: docKind })
      setDocTitle('')
      toast.success('Document ajouté au dossier du patient.')
      await fetchPatientDetails()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'ajout du document.')
    } finally {
      setSubmittingDoc(false)
    }
  }

  const handlePrintDossier = () => {
    void printDocument(`Fiche patient ${patientId}`, `<h1>RadioMed — Fiche patient</h1><h2>${escapeText(formData.name)}</h2><p>Dossier #${patientId}</p>${[['Naissance', formData.birth_date], ['Âge', formData.age], ['Téléphone', formatPhoneNumber(formData.phone)], ['Email', formData.email], ['Groupe sanguin', formData.blood_group], ['Assurance', formData.insurance_type], ['Poids (kg)', formData.weight], ['Taille (cm)', formData.height], ['Allergies', formData.allergies_notes], ['Antécédents', formData.history_notes], ['Notes', formData.notes]].filter(([, value]) => value !== '').map(([label, value]) => `<p><strong>${escapeText(label)} :</strong> ${escapeText(value)}</p>`).join('')}`, 'Fiche patient').catch(err => toast.error(err.message))
  }

  if (loading) {
    return (
      <BaseLayout title="Dossier Patient" description="Chargement des informations...">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-muted-foreground">Chargement du dossier médical du patient #{patientId}...</p>
        </div>
      </BaseLayout>
    )
  }

  const avatarUrl = getPatientAvatarUrl(patient)

  return (
    <BaseLayout title={`Fiche Patient — ${formData.name}`} description="Consultation et modification complète du dossier médical et administratif">
      <div data-testid="patient-dossier-modal" className="space-y-6 px-4 md:px-6 pb-12">
        {/* Top Header Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack} className="gap-2 font-semibold hover:bg-muted">
              <ArrowLeft className="w-4 h-4" />
              Retour au Registre
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/10 text-primary border-primary/20 px-2.5 py-1">
              ID Patient #{patientId}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button disabled={!hasDossierAccess(account)} variant="outline" size="sm" onClick={() => navigate(`/comptes-rendus?patientId=${patientId}`)}>Dossier médical</Button>
            <Button variant="outline" size="sm" onClick={handlePrintDossier} className="gap-1.5 font-medium">
              <Printer className="w-4 h-4 text-muted-foreground" />
              Imprimer Fiche
            </Button>
            <Button disabled={!account?.features.prescriptions} variant="secondary" size="sm" onClick={() => setPrescriptionModalOpen(true)} className="gap-1.5 font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer">
              <Pill className="w-4 h-4" />
              Prescrire Ordonnance
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAppointmentModalOpen(true)} className="gap-1.5 font-semibold bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border border-sky-500/20">
              <Calendar className="w-4 h-4" />
              Nouveau Rendez-Vous
            </Button>

            <Button
              data-testid="save-patient-btn"
              onClick={handleSavePatient}
              disabled={saving}
              size="sm"
              className="gap-2 font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
            </Button>
          </div>
        </div>

        {/* Hero Patient Profile Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-700/50">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={formData.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white/20 shadow-2xl bg-white/10"
                />
                <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-slate-900 shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 data-testid="dossier-patient-name" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{formData.name}</h1>
                  <StatusPill status={formData.status} />
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-sky-400" /> {formData.gender} ({formData.age === '' ? 'Âge non renseigné' : `${formData.age} ans`})
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> {formatPhoneNumber(formData.phone) || 'N/C'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-purple-400" /> {formData.email || 'Non renseigné'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-2xs font-mono">
                    Téléphone: {formatPhoneNumber(formData.phone) || 'N/C'}
                  </Badge>

                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-2xs font-bold">
                    Assurance: {formData.insurance_type}
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30 text-2xs font-bold">
                    Groupe: {formData.blood_group}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Stats side panel */}
            <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div>
                <div className="text-2xs uppercase text-slate-400 font-bold tracking-wider">Examens</div>
                <div className="text-xl font-black text-white mt-0.5">{patient?.appointments?.length || 0}</div>
              </div>
              <div>
                <div className="text-2xs uppercase text-slate-400 font-bold tracking-wider">Taille/Poids</div>
                <div className="text-sm font-bold text-slate-200 mt-1">{formData.height} cm / {formData.weight} kg</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-2xs uppercase text-slate-400 font-bold tracking-wider">Médecin</div>
                <div className="text-xs font-semibold text-sky-300 mt-1 truncate max-w-[120px]">{formData.prescribing_doctor}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Page Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-2xl border flex flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="w-4 h-4 text-primary" />
              Édition Profil & État Civil
            </TabsTrigger>
            <TabsTrigger value="medical" className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Activity className="w-4 h-4 text-rose-500" />
              Dossier Médical & Assurance
            </TabsTrigger>
            <TabsTrigger data-testid="dossier-tab-notes" value="notes" className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4 text-amber-500" />
              Notes ({patient?.notes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Upload className="w-4 h-4 text-indigo-500" />
              Documents ({patient?.documents?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PROFILE EDIT & CIVIL STATUS */}
          <TabsContent value="profile" className="space-y-6 mt-0">
            <Card className="shadow-xs border-2">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  État Civil & Informations Personnelles
                </CardTitle>
                <CardDescription className="text-xs">
                  Modifiez directement les champs ci-dessous puis cliquez sur "Enregistrer les Modifications".
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Prénom</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Prénom"
                      className="text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Nom de Famille</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Nom de famille"
                      className="text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Nom d'Affichage Complet</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: ZERROUKI Sofiane"
                      className="text-sm font-bold bg-muted/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Sexe / Genre</Label>
                    <Select value={formData.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Homme">Homme</SelectItem>
                        <SelectItem value="Femme">Femme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-patient-age" className="text-xs font-bold">Âge (Ans)</Label>
                    <Input
                      id="edit-patient-age"
                      type="number"
                      min="0"
                      value={formData.age}
                      readOnly
                      placeholder="Âge du patient"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-patient-birth-date" className="text-xs font-bold">Date de Naissance</Label>
                    <Input
                      id="edit-patient-birth-date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-patient-phone" className="text-xs font-bold">Numéro de Téléphone</Label>
                    <Input
                      id="edit-patient-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Téléphone du patient"
                      className="text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Adresse Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="patient@mail.com"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Nationalité</Label>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      placeholder="Algérienne"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Situation Familiale</Label>
                    <Select value={formData.marital_status} onValueChange={(val) => handleInputChange('marital_status', val)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Célibataire">Célibataire</SelectItem>
                        <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                        <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                        <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Profession</Label>
                    <Input
                      value={formData.profession}
                      onChange={(e) => handleInputChange('profession', e.target.value)}
                      placeholder="Ex: Enseignant, Ingénieur..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Contact d'Urgence (Nom & Tél)</Label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                      placeholder="Épouse - 05 55 12 34 56"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Adresse Résidentielle Complète</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Rue, Cité, Wilaya..."
                    className="text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSavePatient} disabled={saving} className="gap-2 font-bold px-6">
                    <Save className="w-4 h-4" />
                    Enregistrer les Modifications du Profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: MEDICAL & INSURANCE */}
          <TabsContent value="medical" className="space-y-6 mt-0">
            <Card className="shadow-xs border-2">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-500" />
                  Couverture Sociale, Organisme & Données Médicales
                </CardTitle>
                <CardDescription className="text-xs">
                  Saisie du numéro NNI / Chifa, groupe sanguin, médecin traitant et antécédents.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">N° Sécurité Sociale (NSS / Chifa)</Label>
                    <Input
                      value={formData.social_sec_no}
                      onChange={(e) => handleInputChange('social_sec_no', e.target.value)}
                      placeholder="185031620492144"
                      className="text-sm font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Type d'Assurance / Couverture</Label>
                    <Select value={formData.insurance_type} onValueChange={(val) => handleInputChange('insurance_type', val)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNAS">CNAS (Salarié)</SelectItem>
                        <SelectItem value="CASNOS">CASNOS (Non-Salarié)</SelectItem>
                        <SelectItem value="MNT">MNT / Tiers Payant</SelectItem>
                        <SelectItem value="Privé">Assurance Privée</SelectItem>
                        <SelectItem value="Aucun">Aucune (Payant)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">N° d'Assuré / Carte</Label>
                    <Input
                      value={formData.insurance_number}
                      onChange={(e) => handleInputChange('insurance_number', e.target.value)}
                      placeholder="N° carte d'assuré"
                      className="text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Groupe Sanguin</Label>
                    <Select value={formData.blood_group} onValueChange={(val) => handleInputChange('blood_group', val)}>
                      <SelectTrigger className="text-sm font-bold text-red-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Poids (kg)</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="70"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Taille (cm)</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder="170"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Médecin Traitant / Orientateur</Label>
                    <Input
                      value={formData.prescribing_doctor}
                      onChange={(e) => handleInputChange('prescribing_doctor', e.target.value)}
                      placeholder="Dr. Rahmane"
                      className="text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold">Examen Indiqué / Demandé</Label>
                    <Input
                      value={formData.requested_exam}
                      onChange={(e) => handleInputChange('requested_exam', e.target.value)}
                      placeholder="IRM Cérébrale 3T avec injection"
                      className="text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Allergies & Contre-indications
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.allergies_notes}
                      onChange={(e) => handleInputChange('allergies_notes', e.target.value)}
                      placeholder="Ex: Allergie au produit de contraste iodé, pacemaker, prothèse métallique..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Antécédents Médicaux & Chirurgicaux
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.history_notes}
                      onChange={(e) => handleInputChange('history_notes', e.target.value)}
                      placeholder="Ex: HTA sous traitement, diabète type 2, chirurgie genou 2021..."
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Remarques & Consignes Cliniques</Label>
                  <Textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Notes diverses pour la secrétairerie et la salle d'examen..."
                    className="text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSavePatient} disabled={saving} className="gap-2 font-bold px-6">
                    <Save className="w-4 h-4" />
                    Enregistrer le Dossier Médical
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: NOTES & TIMELINE */}
          <TabsContent value="notes" className="space-y-6 mt-0">
            <Card className="shadow-xs border-2">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Observations Médicales & Historique des Notes
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajoutez de nouvelles observations pour le suivi clinique du patient.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <form onSubmit={handleAddNote} className="space-y-3 p-4 border rounded-2xl bg-amber-500/5 border-amber-500/20">
                  <Label className="text-xs font-bold text-amber-800 dark:text-amber-300">Nouvelle Observation Clinique</Label>
                  <Textarea
                    data-testid="patient-note-input"
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Écrivez une note médicale (ex: Patient prévenu pour à jeun 4h avant l'examen IRM)..."
                    className="text-sm bg-background"
                  />
                  <div className="flex justify-end">
                    <Button data-testid="patient-note-submit-btn" type="submit" size="sm" disabled={submittingNote || !newNote.trim()} className="gap-1.5 font-bold">
                      <Plus className="w-4 h-4" />
                      Ajouter l'Observation
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes Précédentes</h4>
                  {!patient?.notes || patient.notes.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl">
                      Aucune note médicale enregistrée pour ce patient.
                    </div>
                  ) : (
                    patient.notes.map((n: any, idx: number) => (
                      <div key={n.id || idx} className="p-4 border rounded-xl bg-card space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary">{n.author || 'Auteur non renseigné'}</span>
                          <span className="text-muted-foreground font-mono">{n.date || 'Aujourd\'hui'}</span>
                        </div>
                        <p className="text-sm text-foreground">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: DOCUMENTS */}
          <TabsContent value="documents" className="space-y-6 mt-0">
            <Card className="shadow-xs border-2">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-500" />
                  Documents, Ordonnances & Clichés Radiologiques
                </CardTitle>
                <CardDescription className="text-xs">
                  Gestion des fichiers joints et comptes-rendus numérisés.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <form onSubmit={handleAddDocument} className="flex flex-col sm:flex-row items-end gap-3 p-4 border rounded-2xl bg-indigo-500/5 border-indigo-500/20">
                  <div className="space-y-1.5 flex-1 w-full">
                    <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Titre du Document / Ordonnance</Label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Ex: Ordonnance IRM Genou Droit.pdf"
                      className="text-sm bg-background"
                    />
                  </div>
                  <Button type="submit" disabled={submittingDoc || !docTitle.trim()} className="w-full sm:w-auto gap-1.5 font-bold">
                    <Plus className="w-4 h-4" />
                    Joindre au Dossier
                  </Button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!patient?.documents || patient.documents.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-xs text-muted-foreground border rounded-xl">
                      Aucun document attaché.
                    </div>
                  ) : (
                    patient.documents.map((doc: any, idx: number) => (
                      <div key={doc.id || idx} className="p-4 border rounded-2xl bg-card flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                            {doc.kind || 'PDF'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-foreground">{doc.title}</div>
                            <div className="text-xs text-muted-foreground">Ajouté le {doc.uploaded_at || '04/10/2026'}</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => window.open(doc.url || '/api/uploads/default.pdf', '_blank')} className="text-xs">
                          Ouvrir
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Direct Appointment Booking Modal */}
      <AppointmentModal
        open={appointmentModalOpen}
        onOpenChange={setAppointmentModalOpen}
        initialPatient={patient}
        onSuccess={fetchPatientDetails}
      />

      {/* Prescription Generator Modal */}
      <PrescriptionModal
        open={prescriptionModalOpen}
        onOpenChange={setPrescriptionModalOpen}
        patientId={patientId}
        patientName={formData.name}
        doctorName={account?.name || ''}
      />

    </BaseLayout>
  )
}
