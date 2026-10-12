"use client"

import { useState,useEffect,useRef } from 'react'
import DOMPurify from 'dompurify'
import { useSearchParams } from 'react-router-dom'
import {
FileText,
CheckCircle2,
Printer,
FileDown,
Eye,
Lock,
Save,
Undo,
Redo,
Bold,
Italic,
Underline,
Strikethrough,
Highlighter,
List,
ListOrdered,
Quote,
AlignLeft,
AlignCenter,
AlignRight,Minus,Mic,BookOpen,
Brain,
Pill,
Images,
History,
Zap,
Check,
Plus,Sparkles,
ChevronRight,Calendar
} from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog'
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fetchApi,getReports,getReportById,getPatientById,getPatients,createReport,updateReport,validateReport } from '@/lib/api'
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs'
import { DossierExtras } from '@/components/clinic/dossier-extras'
import { PatientVisits } from '@/components/clinic/patient-visits'
import { useAccountStore,examCategory,hasDossierAccess } from '@/stores/account-store'
import { useNavigate } from 'react-router-dom'
import { printDocument } from '@/lib/print-document'
import { getClinicPreferences } from '@/lib/clinic-settings'
import { useClinicPreferencesStore, formatClinicDate } from '@/stores/clinic-preferences-store'

const REPORT_TEMPLATES: Record<string, { title: string; html: string }> = Object.fromEntries(
  [['IRM', 'IRM'], ['Scanner', 'Scanner'], ['Radio', 'Radiographie'], ['Echo', 'Échographie']].map(([key, label]) => [key, {
    title: `Compte rendu — ${label}`,
    html: '<h1>Compte rendu — {EXAM_TYPE}</h1><p><strong>Patient :</strong> {PATIENT_NAME}</p><h2>Indication clinique</h2><p><br></p><h2>Technique</h2><p><br></p><h2>Résultats</h2><p><br></p><h2>Conclusion</h2><p><br></p>',
  }])
)
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

export default function ComptesRendusPage() {
  const preferences = useClinicPreferencesStore(s => s.preferences)
  const documentModels = preferences?.documents.models
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const account = useAccountStore(s => s.user)
  const reportId = searchParams.get('reportId')
  const [patientReports, setPatientReports] = useState<any[]>([])
  const queueId = searchParams.get('queueId')
  const appointmentId = searchParams.get('appointmentId')
  const [activeTab, setActiveTab] = useState('report')
  const [report, setReport] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)

  const patientNameParam = searchParams.get('patientName') || searchParams.get('patient') || ''
  const examTypeParam = searchParams.get('examType') || searchParams.get('exam') || ''
  const patientIdParam = searchParams.get('patientId') || ''

  const editorRef = useRef<HTMLDivElement>(null)
  const editorHtmlRef = useRef('')
  const speechRef = useRef<any>(null)
  const draftKey = `radiomed-draft:${account?.id}:${patientIdParam}:${reportId || queueId || appointmentId || examTypeParam}`
  const [recovered, setRecovered] = useState(false)
  const [draftConflict, setDraftConflict] = useState(false)

  // Report editor state
  const [patientName, setPatientName] = useState(patientNameParam)
  const [examType, setExamType] = useState(examTypeParam)
  const [reportTitle, setReportTitle] = useState(`Compte-Rendu — ${examTypeParam}`)
  const [isValidated, setIsValidated] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  // Stats
  const [wordCount, setWordCount] = useState(187)
  const [charCount, setCharCount] = useState(1245)
  const [readTime, setReadTime] = useState(2)

  // Modals state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [dictatedText, setDictatedText] = useState('')

  useEffect(() => {
    if (!patientIdParam) {
      getPatients({ page_size: 500 }).then(data => setPatients(data.items || [])).catch(err => setLoadError(err.message))
      setLoading(false)
      return
    }
    if (!hasDossierAccess(account)) { setLoading(false); return }
    let cancelled = false
    setLoading(true); setLoadError(''); setReport(null); setIsValidated(false); setActiveTab(account?.features.reports ? 'report' : account?.features.prescriptions ? 'prescriptions' : 'images')
    Promise.all([getPatientById(patientIdParam), account?.features.reports ? getReports({ patient_id: patientIdParam }) : Promise.resolve([]), getClinicPreferences()]).then(async ([data, reports, clinicPreferences]) => {
      let ticket: any = null
      if (queueId) {
        const response = await fetchApi<any>(`/queue/${queueId}/dossier`)
        ticket = response
        if (String(ticket.patient_id) !== patientIdParam) throw new Error('Le ticket ne correspond pas à ce patient.')
      }
      if (cancelled) return
      const exam = ticket?.modality_name || examTypeParam || data.requested_exam || 'Examen'
      const apptId = ticket?.appointment_id || appointmentId
      const saved = reportId ? reports.find(r => String(r.id) === reportId) : queueId ? reports.find(r => String(r.queue_id) === queueId) || (apptId ? reports.find(r => String(r.appointment_id) === String(apptId)) : null)
        : apptId ? reports.find(r => String(r.appointment_id) === String(apptId))
        : reports.find(r => !r.queue_id && !r.appointment_id && r.exam_type === exam)
      if (reportId && account?.features.reports && !saved) throw new Error('Ce compte rendu ne correspond pas au patient.')
      setPatientReports(reports); setPatient(data); setPatientName(data.name); setExamType(saved?.exam_type || exam); setReport(saved || null)
      setReportTitle(saved?.title || `Compte rendu — ${exam}`); setIsValidated(saved?.status === 'validated')
      let draft: { html: string; version?: number } | null = null
      try { draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null') } catch { /* A damaged local draft must not prevent opening the dossier. */ }
      const restore = saved?.status !== 'validated' && draft
      setRecovered(!!restore); setDraftConflict(!!(restore && draft?.version !== undefined && draft.version !== saved?.version))
      const defaultModel = clinicPreferences.documents.models.find(m => m.type === 'Compte rendu' && m.default && m.body.trim())
      const initialHtml = defaultModel ? '<h1>Compte rendu — {EXAM_TYPE}</h1><p><strong>Patient :</strong> {PATIENT_NAME}</p>' + defaultModel.body.split(/\n\s*\n/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('') : (REPORT_TEMPLATES[examCategory(exam)] || REPORT_TEMPLATES.Radio).html
      if (editorRef.current) editorRef.current.innerHTML = DOMPurify.sanitize((restore ? draft!.html : saved?.content_html) || initialHtml
        .replace(/{PATIENT_NAME}/g, escapeHtml(data.name)).replace(/{EXAM_TYPE}/g, escapeHtml(exam)))
      updateEditorStats(false); setSaveStatus(account?.features.reports && (restore || !saved) ? 'unsaved' : 'saved')
      if (saved) {
        const details = await getReportById(saved.id)
        if (!cancelled) setVersions(details.versions || [])
      } else setVersions([])
    }).catch(err => { if (!cancelled) setLoadError(err.message) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [patientIdParam, examTypeParam, queueId, appointmentId, reportId, account?.id, account?.features.reports, account?.features.images, account?.features.prescriptions])

  useEffect(() => {
    if (saveStatus !== 'unsaved' || isValidated) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveStatus, isValidated])
  useEffect(() => () => { speechRef.current?.abort() }, [])

  const updateEditorStats = (remember = true) => {
    if (!editorRef.current) return
    editorHtmlRef.current = editorRef.current.innerHTML
    if (remember && !isValidated) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ html: editorHtmlRef.current, version: report?.version })) }
      catch { toast.error('La copie locale du brouillon est indisponible. Enregistrez votre texte avant de quitter le dossier.') }
    }
    const text = editorRef.current.innerText || ''
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    const time = Math.max(1, Math.ceil(words / 90))
    setWordCount(words)
    setCharCount(chars)
    setReadTime(time)
    setSaveStatus('unsaved')
  }

  // Formatting helpers
  const execFormat = (command: string, value: string | undefined = undefined) => {
    if (isValidated || loading || busy) return
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    updateEditorStats()
  }

  const handleBlockFormat = (tag: string) => {
    if (isValidated || loading || busy) return
    document.execCommand('formatBlock', false, tag)
    updateEditorStats()
  }

  const handleInsertPhrase = (phrase: string) => {
    if (!editorRef.current || isValidated || loading || busy) return
    editorRef.current.focus()
    document.execCommand('insertText', false, ` ${phrase} `)
    updateEditorStats()
    toast.success(`Phrase rapide insérée : "${phrase.substring(0, 30)}..."`)
  }

  const handleLoadTemplate = (key: string) => {
    const tmpl = REPORT_TEMPLATES[key]
    if (tmpl && editorRef.current && !isValidated && !loading && !busy) {
      const html = tmpl.html.replace(/{PATIENT_NAME}/g, escapeHtml(patientName)).replace(/{EXAM_TYPE}/g, escapeHtml(examType))
      editorRef.current.innerHTML = html
      setReportTitle(tmpl.title)
      updateEditorStats()
      toast.success(`Modèle "${tmpl.title}" chargé dans le compte-rendu.`)
    }
  }

  const persistReport = async () => {
    if (!patient || !editorRef.current || loadError) throw new Error('Le dossier doit être chargé avant enregistrement.')
    if (isValidated) return report
    if (draftConflict) throw new Error('Un autre poste a enregistré une nouvelle version. Copiez votre texte, puis rechargez le compte rendu enregistré avant de poursuivre.')
    setSaveError(''); setSaveStatus('saving')
    const payload = { patient_id: patient.id, patient_name: patient.name, exam_type: examType, title: reportTitle,
      queue_id: queueId ? Number(queueId) : null, appointment_id: appointmentId ? Number(appointmentId) : null,
      version: report?.version, content_html: DOMPurify.sanitize(editorHtmlRef.current), author: account?.name }
    const saved = report ? await updateReport(report.id, payload) : await createReport(payload)
    setReport(saved); setPatientReports(previous => [saved, ...previous.filter(r => r.id !== saved.id)]); setSaveStatus('saved'); sessionStorage.removeItem(draftKey); setRecovered(false)
    const details = await getReportById(saved.id); setVersions(details.versions || [])
    return saved
  }
  const handleSaveDraft = async () => {
    setBusy(true)
    try { await persistReport(); toast.success('Brouillon enregistré') }
    catch (err) { setSaveStatus('unsaved'); setSaveError((err as Error).message); toast.error((err as Error).message) }
    finally { setBusy(false) }
  }
  const handleValidateReport = async () => {
    setBusy(true)
    try {
      const saved = await persistReport()
      const validated = await validateReport(saved.id)
      setReport(validated); setIsValidated(true); setSaveStatus('saved'); toast.success('Compte rendu finalisé et verrouillé')
    } catch (err) { setSaveStatus('unsaved'); setSaveError((err as Error).message); toast.error((err as Error).message) }
    finally { setBusy(false) }
  }
  const handlePrint = async () => {
    if (!report || !isValidated) { toast.error('Finalisez le compte rendu avant de lancer l’impression.'); return }
    setBusy(true)
    try {
      const job = await printDocument(report.report_no, `<h1>Compte rendu médical</h1><p>${escapeHtml(patientName)} · ${escapeHtml(report.report_no)} · ${escapeHtml(report.author)}</p>${report.content_html}`, 'Compte rendu', report.id)
      if (job?.status === 'submitted') toast.success('Dossier visible au secrétariat')
    } catch (err) { toast.error((err as Error).message) }
    finally { setBusy(false) }
  }

  const handleToggleVoiceRecording = () => {
    if (recording) { speechRef.current?.stop(); return }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition) { toast.error('La dictée vocale n’est pas disponible dans ce navigateur. Vous pouvez saisir le texte ci-dessous.'); return }
    const recognition = new Recognition()
    recognition.lang = 'fr-FR'; recognition.continuous = true; recognition.interimResults = false
    recognition.onresult = (event: any) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) text += event.results[i][0].transcript + ' '
      setDictatedText(previous => `${previous} ${text}`.trim())
    }
    recognition.onerror = () => { setRecording(false); toast.error('Dictée interrompue. Vérifiez le microphone et l’autorisation du navigateur. Le texte transcrit est conservé.') }
    recognition.onend = () => setRecording(false)
    speechRef.current = recognition
    try { recognition.start(); setRecording(true) } catch { toast.error('Impossible de démarrer la dictée.') }
  }

  const handleInsertVoiceText = () => {
    if (editorRef.current && dictatedText && !isValidated && !loading && !busy) {
      editorRef.current.focus()
      document.execCommand('insertText', false, `\n${dictatedText}\n`)
      updateEditorStats()
      speechRef.current?.stop(); setDictatedText(''); setVoiceOpen(false)
      toast.success('Texte dicté inséré dans le compte-rendu.')
    }
  }

  if (!hasDossierAccess(account) || !account) return <BaseLayout title="Dossier patient"><p className="p-6">Choisissez un compte autorisé aux dossiers patients depuis le menu latéral.</p></BaseLayout>
  if (!patientIdParam) return <BaseLayout title="Comptes rendus"><div className="p-6 space-y-4"><h2 className="font-semibold">Sélectionnez un patient ou ouvrez son dossier depuis la file d’attente.</h2>{loadError && <p role="alert">{loadError}</p>}<select aria-label="Patient du compte rendu" className="border rounded-md p-3 bg-background" defaultValue="" onChange={e => { if (e.target.value) navigate(`/comptes-rendus?patientId=${e.target.value}`) }}><option value="">Choisir un patient…</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div></BaseLayout>

  return (
    <BaseLayout title={account.features.reports ? 'Gestion & Rédaction des Comptes-Rendus Médicaux' : `Dossier patient — ${patientName}`} description={account.features.reports ? "Éditeur structuré avec aide à la saisie, dictée vocale, modèles d'imagerie et export PDF" : 'Accédez aux sections activées pour votre compte.'}>
      {saveError && <p role="alert" className="mx-6 mb-4 rounded-lg border border-destructive p-3 text-destructive">{saveError}</p>}
      {recovered && <div role="status" className="mx-6 mb-4 rounded-lg border p-3 space-y-2"><p>{draftConflict ? 'Une nouvelle version a été enregistrée sur un autre poste. Votre texte local est conservé ci-dessous ; copiez-le avant de recharger le compte rendu.' : 'Votre brouillon non enregistré a été restauré. Enregistrez-le pour le partager avec la clinique.'}</p><Button variant="outline" size="sm" onClick={() => { if (window.confirm('Remplacer le brouillon local par le compte rendu enregistré ?')) { sessionStorage.removeItem(draftKey); window.location.reload() } }}>Recharger le compte rendu enregistré</Button></div>}
      <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
        {loading && <p className="px-6 py-2">Chargement du dossier…</p>}
        {loadError && <div role="alert" className="px-6 py-2 text-destructive">{loadError}<Button variant="outline" onClick={() => window.location.reload()}>Réessayer</Button></div>}
      <div className="flex flex-col min-h-[calc(100vh-5rem)] bg-background">
        {/* Topbar navigation & status bar */}
        <div className="sticky top-0 z-40 bg-card border-b px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span>Accueil</span>
              <span className="text-muted-foreground/60">/</span>
              <span>Comptes-rendus</span>
              <span className="text-muted-foreground/60">/</span>
              <span className="text-foreground font-bold">{reportTitle}</span>
            </div>

            {/* Save status badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              saveStatus === 'saved'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : saveStatus === 'saving'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {!account.features.reports ? 'Sections autorisées' : saveStatus === 'saved' ? 'Sauvegardé' : saveStatus === 'saving' ? 'Enregistrement...' : 'Non sauvegardé'}
            </div>
          </div>

          {account.features.reports && <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => execFormat('undo')} title="Annuler" className="h-8 w-8 p-0">
              <Undo className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => execFormat('redo')} title="Refaire" className="h-8 w-8 p-0">
              <Redo className="w-4 h-4" />
            </Button>

            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)} className="h-8 text-xs font-bold gap-1.5 cursor-pointer">
              <Eye className="w-3.5 h-3.5 text-sky-500" /> Aperçu PDF
            </Button>

            <Button
              size="sm"
              onClick={handleValidateReport}
              disabled={isValidated || loading || busy || !!loadError}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {isValidated ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Validé & Verrouillé
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Valider Compte-Rendu
                </>
              )}
            </Button>
          </div>}
        </div>

        {/* Content layout: Editor (Left) + Side Panel (Right) */}
        <div className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Editor Card (Cols 1-3) */}
          <div className="order-2 lg:order-1 lg:col-span-3 min-w-0">
          <TabsContent value="report" forceMount className={activeTab !== 'report' ? 'hidden' : ''}>
          <div className="bg-card border rounded-2xl shadow-xs overflow-hidden flex flex-col">
            {/* Patient Hero Banner */}
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent border-b flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  {patientName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground flex flex-wrap items-center gap-2 break-words">
                    {patientName}
                    <span className="text-xs font-normal text-muted-foreground font-mono">#PAT-{patientIdParam}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium mt-1">
                    <span><Calendar className="w-3.5 h-3.5 text-emerald-500 inline mr-1" /> {patient?.age ?? '—'} ans • {patient?.birth_date || 'Date de naissance non renseignée'}</span>
                    <span>{patient?.gender}</span>
                    <span className="text-red-500 font-bold">Groupe: {patient?.blood_group || 'Non renseigné'}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{patient?.allergies_notes || ''}</span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="bg-background border-primary/30 text-primary font-bold px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-2xs">
                <Brain className="w-4 h-4" /> {examType}
              </Badge>
            </div>

            {/* WYSIWYG Toolbar */}
            <div className="p-2 border-b bg-muted/30 flex flex-wrap items-center gap-1">
              <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Select onValueChange={handleBlockFormat} defaultValue="p">
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p">Paragraphe</SelectItem>
                    <SelectItem value="h1">Titre 1</SelectItem>
                    <SelectItem value="h2">Titre 2</SelectItem>
                    <SelectItem value="h3">Titre 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button size="sm" variant="ghost" onClick={() => execFormat('bold')} title="Gras (Ctrl+B)" className="h-8 w-8 p-0">
                  <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('italic')} title="Italique (Ctrl+I)" className="h-8 w-8 p-0">
                  <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('underline')} title="Souligné (Ctrl+U)" className="h-8 w-8 p-0">
                  <Underline className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('strikeThrough')} title="Barré" className="h-8 w-8 p-0">
                  <Strikethrough className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('hiliteColor', '#fef08a')} title="Surligner" className="h-8 w-8 p-0">
                  <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                </Button>
              </div>

              <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button size="sm" variant="ghost" onClick={() => execFormat('insertUnorderedList')} title="Liste à puces" className="h-8 w-8 p-0">
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('insertOrderedList')} title="Liste numérotée" className="h-8 w-8 p-0">
                  <ListOrdered className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('formatBlock', 'blockquote')} title="Citation / Remarque" className="h-8 w-8 p-0">
                  <Quote className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button size="sm" variant="ghost" onClick={() => execFormat('justifyLeft')} title="Aligner à gauche" className="h-8 w-8 p-0">
                  <AlignLeft className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('justifyCenter')} title="Centrer" className="h-8 w-8 p-0">
                  <AlignCenter className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => execFormat('justifyRight')} title="Aligner à droite" className="h-8 w-8 p-0">
                  <AlignRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => execFormat('insertHorizontalRule')} title="Ligne horizontale" className="h-8 w-8 p-0">
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVoiceOpen(true)}
                  title="Dictée vocale"
                  className="h-8 text-xs font-bold gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Mic className="w-3.5 h-3.5" /> Dictée Vocale
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTemplatesOpen(true)}
                  title="Choisir un modèle"
                  className="h-8 text-xs font-bold gap-1 text-indigo-600 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Modèles Types
                </Button>
              </div>
            </div>

            {/* Rich Editor Editable Canvas */}
            <div
              ref={editorRef}
              data-testid="report-editor"
              contentEditable={!isValidated && !loading && !busy && !loadError}
              onInput={() => updateEditorStats()}
              className="p-8 min-h-[520px] max-h-[700px] overflow-y-auto focus:outline-none prose dark:prose-invert max-w-none text-sm leading-relaxed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />

            {/* Editor Footer Stats & Quick Actions */}
            <div className="p-4 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                <span>Mots: <strong className="text-emerald-600">{wordCount}</strong></span>
                <span>Caractères: <strong className="text-sky-600">{charCount}</strong></span>
                <span>Temps de lecture: <strong className="text-indigo-600">{readTime} min</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={handleSaveDraft} disabled={isValidated || loading || busy || !!loadError} className="h-8 text-xs font-semibold gap-1">
                  <Save className="w-3.5 h-3.5" /> Brouillon
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint} disabled={!isValidated || busy} className="h-8 text-xs font-semibold gap-1">
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </Button>
                <Button size="sm" onClick={() => setPreviewOpen(true)} className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground">
                  <FileDown className="w-3.5 h-3.5" /> Export PDF / Aperçu
                </Button>
              </div>
            </div>
          </div>

          </TabsContent>
          <TabsContent value="prescriptions"><DossierExtras key={`rx-${patientIdParam}`} patientId={Number(patientIdParam)} type="prescriptions" /></TabsContent>
          <TabsContent value="images"><DossierExtras key={`images-${patientIdParam}`} patientId={Number(patientIdParam)} type="images" /></TabsContent>
          <TabsContent value="visits">{!loading && !loadError && patient ? <PatientVisits key={`visits-${patientIdParam}-${queueId || appointmentId || ''}`} patientId={Number(patientIdParam)} patientName={patient.name} queueId={queueId ? Number(queueId) : undefined} appointmentId={appointmentId ? Number(appointmentId) : undefined} /> : <p role={loadError ? 'alert' : 'status'} className="p-6 text-muted-foreground">{loadError || 'Chargement du dossier…'}</p>}</TabsContent>
          </div>

          {/* Dossier navigation stays visible beside every panel. */}
          <aside className="order-1 lg:order-2 min-w-0 space-y-4 lg:sticky lg:top-20" data-testid="dossier-sidebar">
            <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider border-b pb-3">Dossier patient</h4>
              <TabsList aria-label="Sections du dossier patient" className="h-auto w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 items-stretch gap-1 lg:gap-2 bg-transparent p-0">
                {[
                  { value: 'report', label: 'Compte rendu', icon: FileText, disabled: !account.features.reports },
                  { value: 'prescriptions', label: 'Prescriptions', icon: Pill, disabled: !account.features.prescriptions },
                  { value: 'images', label: 'Images', icon: Images, disabled: !account.features.images },
                  { value: 'visits', label: 'Suivi des visites', icon: History, disabled: false },
                ].map(({ value, label, icon: Icon, disabled }) => <TabsTrigger key={value} value={value} disabled={disabled} className="min-w-0 flex-1 lg:w-full lg:flex-none justify-center lg:justify-start gap-1 lg:gap-3 rounded-xl border border-border bg-muted/20 p-2 lg:p-3 text-xs lg:text-sm data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Icon className="hidden sm:block size-5" /> {label}
                </TabsTrigger>)}
              </TabsList>
                {patientReports.length > 0 && <div className="space-y-2 mt-4 border-t pt-3 max-h-48 overflow-y-auto"><p className="text-xs font-semibold">Comptes rendus du patient</p>{patientReports.map(r => <Button key={r.id} variant="outline" size="sm" className="w-full h-auto whitespace-normal justify-start text-left text-xs py-2" onClick={() => navigate(`/comptes-rendus?patientId=${patient.id}&reportId=${r.id}`)}>{r.report_no} · {r.exam_type} · {r.status === 'validated' ? 'Finalisé' : 'Brouillon'}</Button>)}</div>}
            </div>

            {activeTab === 'report' && <>
            {/* Phrases Rapides Card */}
            <div className="hidden lg:block bg-card border rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-extrabold text-xs flex items-center gap-1.5 uppercase tracking-wider text-foreground">
                  <Zap className="w-4 h-4 text-amber-500" /> Phrases Rapides
                </h4>
              </div>

              <div className="space-y-1.5">
                {[
                  "Aucune anomalie détectée. Examen sans particularité.",
                  "Examen à comparer avec les examens antérieurs.",
                  "Contrôle recommandé dans 6 mois.",
                  "Avis spécialisé recommandé.",
                  "⚠️ Signes d'urgence - intervention immédiate requise.",
                ].map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => handleInsertPhrase(phrase)}
                    className="w-full text-left p-2 rounded-lg bg-muted/30 border border-muted hover:border-primary/40 hover:bg-primary/5 text-xs text-foreground transition-all cursor-pointer font-medium"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Historique des Versions */}
            <div className="hidden lg:block bg-card border rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-extrabold text-xs flex items-center gap-1.5 uppercase tracking-wider text-foreground">
                  <History className="w-4 h-4 text-indigo-500" /> Historique Versions
                </h4>
                <Badge variant="secondary" className="text-2xs font-bold">{versions.length}</Badge>
              </div>

              <div className="space-y-2 text-xs">{versions.length === 0 ? <p>Aucune version enregistrée.</p> : versions.map(v => <div key={v.id} className="p-2.5 rounded-xl border"><strong>Version {v.version}</strong><p>{v.author} · {new Date(v.saved_at).toLocaleString('fr-FR')}</p></div>)}</div>
            </div>
            </>}
          </aside>
        </div>

        {/* Modal 1: Aperçu PDF / Printable Document */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-[24px]">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-primary">
                <FileText className="w-6 h-6" /> Aperçu du Compte-Rendu Médical (Format Officiel PDF)
              </DialogTitle>
              <DialogDescription>
                Document médical prêt pour impression et archivage légal.
              </DialogDescription>
            </DialogHeader>

            {/* PDF Printable Document Page */}
            <div className="printable-area p-8 bg-white text-slate-900 border-2 rounded-xl space-y-6 shadow-sm font-sans">
              <div className="text-center border-b pb-4 space-y-1">
                <h1 className="text-2xl font-black uppercase text-sky-600 tracking-wide">
                  {preferences?.clinic.name || 'Clinique de Radiologie'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {[preferences?.clinic.address, preferences?.clinic.city, preferences?.clinic.phone].filter(Boolean).join(' • ')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div><strong className="text-slate-500">Nom du Patient :</strong> <span className="font-bold text-slate-900">{patientName}</span></div>
                  <div><strong className="text-slate-500">N° Dossier :</strong> #PAT-{patientIdParam}</div>
                  <div><strong className="text-slate-500">Âge / Sexe :</strong> {patient?.age ?? '—'} ans • {patient?.gender}</div>
                </div>
                <div>
                  <div><strong className="text-slate-500">Médecin Radiologue :</strong> {report?.author || account.name}</div>
                  <div><strong className="text-slate-500">Examen Réalisé :</strong> {examType}</div>
                  <div><strong className="text-slate-500">Date d'Examen :</strong> {formatClinicDate()}</div>
                </div>
              </div>

              <div
                className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editorRef.current?.innerHTML || '') }}
              />

              <div className="pt-8 border-t flex justify-between items-end text-xs">
                <div className="text-slate-400 font-mono text-[11px]">
                  Document généré électroniquement par RadioMed OS • Ref: {report?.report_no || 'Brouillon'}
                </div>
                <div className="text-center space-y-8">
                  <div className="font-bold text-slate-900">{report?.author || account.name}</div>
                  <div className="border-b-2 border-dashed border-slate-400 w-48"></div>
                  <div className="text-2xs text-slate-500">Signature et Cachet Médical</div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Fermer
              </Button>
              <Button onClick={handlePrint} disabled={!isValidated || busy} className="bg-primary text-primary-foreground font-bold gap-2">
                <Printer className="w-4 h-4" /> Imprimer le CR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal 2: Dictée Vocale */}
        <Dialog open={voiceOpen} onOpenChange={open => { if (!open) speechRef.current?.stop(); setVoiceOpen(open) }}>
          <DialogContent className="sm:max-w-[480px] rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-rose-600">
                <Mic className="w-5 h-5" /> Dictée Vocale Médicale Intelligente
              </DialogTitle>
              <DialogDescription>
                Parlez naturellement pour dicter vos constatations radiologiques.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center space-y-6">
              <div className="flex justify-center">
                <button
                  onClick={handleToggleVoiceRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                    recording
                      ? 'bg-rose-600 text-white animate-pulse scale-110 shadow-rose-500/50'
                      : 'bg-muted text-foreground hover:bg-rose-500/10 hover:text-rose-600'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </button>
              </div>

              <div className="text-xs font-semibold text-muted-foreground">
                {recording ? '🔴 Enregistrement en cours... Parlez dans votre micro' : 'Cliquez sur le microphone pour démarrer la dictée'}
              </div>

              <div className="p-4 rounded-xl border bg-muted/30 text-left text-xs space-y-2">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Transcription Vocale en Direct:
                </div>
                <textarea aria-label="Texte de la dictée" className="w-full rounded-md border p-3 bg-background" rows={5} placeholder="Le texte transcrit apparaît ici. Relisez-le avant insertion." value={dictatedText} onChange={e => setDictatedText(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setVoiceOpen(false)}>
                Annuler
              </Button>
              <Button disabled={!dictatedText.trim() || recording} onClick={handleInsertVoiceText} className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5">
                <Plus className="w-4 h-4" /> Insérer dans le Compte-Rendu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal 3: Choice of Templates */}
        <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <DialogContent className="sm:max-w-[540px] rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                <BookOpen className="w-5 h-5" /> Modèles de Comptes-Rendus Prédéfinis
              </DialogTitle>
              <DialogDescription>
                Sélectionnez un modèle d'examen pour charger la trame correspondante.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              {documentModels?.filter(m => m.type === 'Compte rendu').map(model => <button type="button" key={model.id} className="w-full text-left p-3.5 border rounded-2xl hover:bg-primary/5" onClick={() => {
                if (!editorRef.current || isValidated || busy) return
                editorRef.current.innerHTML = `<h1>Compte rendu — ${escapeHtml(examType)}</h1><p><strong>Patient :</strong> ${escapeHtml(patientName)}</p>` + model.body.split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')
                updateEditorStats(); setTemplatesOpen(false); toast.success('Modèle chargé')
              }}><span className="font-bold text-sm">{model.name}</span>{model.default && <span className="ml-2 text-xs text-muted-foreground">Par défaut</span>}</button>)}
              {Object.entries(REPORT_TEMPLATES).map(([key, tmpl]) => (
                <div
                  key={key}
                  onClick={() => {
                    handleLoadTemplate(key)
                    setTemplatesOpen(false)
                  }}
                  className="p-3.5 border rounded-2xl bg-muted/20 hover:bg-primary/5 hover:border-primary/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary">{tmpl.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Trame structurée avec sections médicales standards</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplatesOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </Tabs>
    </BaseLayout>
  )
}
