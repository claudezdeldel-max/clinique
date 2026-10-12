// Add dialog copied from INTERFACE  CIMA/FICHE PATIENT.html; steps 2 and 3 removed, JSX and persistence connected to the app.
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { calculateAge } from '@/lib/utils'
import { createPatient } from '@/lib/api'
import { useAccountStore } from '@/stores/account-store'
import '@/styles/designs/cima-patient-add-modal.css'

interface PatientWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const emptyPatientForm = () => ({
  last_name: '', first_name: '', birth_date: '', gender: 'Homme', nationality: 'Algérienne',
  marital_status: '', phone: '', email: '', address: '', profession: '', emergency_contact: '',
  insurance_type: '', insurance_number: '', photo_url: '',
})

export function PatientWizard({ open, onOpenChange, onSuccess }: PatientWizardProps) {
  const accountId = useAccountStore(state => state.user?.id)
  const draftKey = 'radiomed-patient-admission-draft:' + (accountId || 'shared')
  const [formData, setFormData] = useState(emptyPatientForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  useEffect(() => {
    if (!open) return
    const data = emptyPatientForm()
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (saved) for (const field of Object.keys(data) as Array<keyof typeof data>) {
        if (typeof saved[field] === 'string') data[field] = saved[field]
      }
    } catch { /* Start with an empty form if the draft is unavailable. */ }
    setFormData(data)
    setError(null)
  }, [open, draftKey])

  useEffect(() => { if (error) bodyRef.current?.scrollTo({ top: 0 }) }, [error])

  const updateField = (field: keyof typeof formData, value: string) => setFormData(previous => ({ ...previous, [field]: value }))
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Choisissez une photo JPG ou PNG.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('La photo ne doit pas dépasser 5 Mo.'); return }
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Impossible de lire cette photo.'))
        reader.readAsDataURL(file)
      })
      updateField('photo_url', photo)
      setError(null)
    } catch (err) { setError((err as Error).message) }
  }
  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(formData))
      toast.success('Brouillon enregistré')
    } catch { setError('Impossible de conserver le brouillon dans ce navigateur.'); }
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    if (!formData.last_name.trim() || !formData.first_name.trim()) {
      setError('Renseignez le nom et le prénom.'); return
    }
    if (formData.birth_date && calculateAge(formData.birth_date) === null) { setError('Veuillez saisir une date de naissance valide.'); return }
    setLoading(true)
    setError(null)
    try {
      await createPatient({ ...formData, first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), phone: formData.phone.trim() })
      try { localStorage.removeItem(draftKey) } catch { /* The patient is already saved. */ }
      toast.success('Patient créé avec succès')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) { setError((err as Error).message || 'Erreur lors de la création du patient') }
    finally { setLoading(false) }
  }

  return <DialogPrimitive.Root open={open} onOpenChange={value => { if (!loading) onOpenChange(value) }}>
    <link rel="stylesheet" href={import.meta.env.BASE_URL + 'cima/inter.css'} />
    <link rel="stylesheet" href={import.meta.env.BASE_URL + 'cima/fontawesome.css'} />
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="cima-patient-form modal-overlay active">
        <DialogPrimitive.Content asChild onOpenAutoFocus={event => { event.preventDefault(); formRef.current?.focus() }}>
          <form ref={formRef} className="modal" data-testid="patient-wizard-modal" onSubmit={handleSubmit}>
            <div className="modal-header">
      <div className="mh-left">
        <div className="mh-icon"><i aria-hidden="true" className="fas fa-user-plus"></i></div>
        <div>
          <DialogPrimitive.Title asChild><h3>Nouveau Patient</h3></DialogPrimitive.Title>
          <DialogPrimitive.Description asChild><p>Créer un nouveau dossier médical</p></DialogPrimitive.Description>
        </div>
      </div>
      <button className="modal-close" type="button" aria-label="Fermer" disabled={loading} onClick={() => onOpenChange(false)}>
        <i aria-hidden="true" className="fas fa-times"></i>
      </button>
    </div>

    
            <div ref={bodyRef} className="modal-body">
              <div className="form-steps">
        <button className="step active" type="button" data-step="1">
          <span className="step-num">1</span> Informations personnelles
        </button>
      </div>

      
              {error && <div className="form-error" role="alert">{error}</div>}
              <div className="form-step active" id="step1">

        
        <div className="form-section">
          <div className="form-section-title"><i aria-hidden="true" className="fas fa-camera"></i> Photo du patient</div>
          <div className="avatar-upload">
            <div className="avatar-preview" id="avatarPreview">{formData.photo_url ? <img src={formData.photo_url} alt="Photo du patient" /> : '?'}</div>
            <div className="info">
              <p>Photo de profil (optionnel)</p>
              <p>JPG, PNG • Max 5 MB • Sera affichée sur la fiche patient</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                  <i aria-hidden="true" className="fas fa-upload"></i> Choisir un fichier
                </button>
                <input type="file" id="fileInput" ref={fileInputRef} accept="image/jpeg,image/png" style={{ display: "none" }} onChange={handleFile} />
              </div>
            </div>
          </div>
        </div>

        
        <div className="form-section">
          <div className="form-section-title"><i aria-hidden="true" className="fas fa-user"></i> Informations personnelles</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="nom"><i aria-hidden="true" className="fas fa-user"></i> Nom <span aria-hidden="true" className="required">*</span></label>
              <input type="text" className="form-input" id="nom" placeholder="Ex: Benali" required value={formData.last_name} onChange={event => updateField('last_name', event.target.value)} data-testid="patient-lastname-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prenom"><i aria-hidden="true" className="fas fa-user"></i> Prénom <span aria-hidden="true" className="required">*</span></label>
              <input type="text" className="form-input" id="prenom" placeholder="Ex: Amine" required value={formData.first_name} onChange={event => updateField('first_name', event.target.value)} data-testid="patient-firstname-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dateNaissance"><i aria-hidden="true" className="fas fa-calendar"></i> Date de naissance</label>
              <input type="date" className="form-input" id="dateNaissance" value={formData.birth_date} onChange={event => updateField('birth_date', event.target.value)} data-testid="patient-birthdate-input" max={today} />
            </div>
            <div className="form-group">
              <label className="form-label"><i aria-hidden="true" className="fas fa-venus-mars"></i> Sexe</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input type="radio" id="sexeM" name="sexe" value="M" checked={formData.gender === 'Homme'} onChange={() => updateField('gender', 'Homme')} />
                  <label htmlFor="sexeM"><i aria-hidden="true" className="fas fa-mars"></i> Homme</label>
                </div>
                <div className="radio-option">
                  <input type="radio" id="sexeF" name="sexe" value="F" checked={formData.gender === 'Femme'} onChange={() => updateField('gender', 'Femme')} />
                  <label htmlFor="sexeF"><i aria-hidden="true" className="fas fa-venus"></i> Femme</label>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="nationalite"><i aria-hidden="true" className="fas fa-flag"></i> Nationalité</label>
              <input type="text" className="form-input" id="nationalite" placeholder="Ex: Algérienne" value={formData.nationality} onChange={event => updateField('nationality', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="situation"><i aria-hidden="true" className="fas fa-ring"></i> Situation familiale</label>
              <select className="form-select" id="situation" value={formData.marital_status} onChange={event => updateField('marital_status', event.target.value)}>
                <option value="">— Sélectionner —</option>
                <option>Célibataire</option>
                <option>Marié(e)</option>
                <option>Divorcé(e)</option>
                <option>Veuf(ve)</option>
              </select>
            </div>
          </div>
        </div>

        
        <div className="form-section">
          <div className="form-section-title"><i aria-hidden="true" className="fas fa-address-book"></i> Coordonnées</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="telephone"><i aria-hidden="true" className="fas fa-phone"></i> Téléphone</label>
              <input type="tel" className="form-input" id="telephone" placeholder="+213 555 123 456" value={formData.phone} onChange={event => updateField('phone', event.target.value)} data-testid="patient-phone-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email"><i aria-hidden="true" className="fas fa-envelope"></i> Email</label>
              <input type="email" className="form-input" id="email" placeholder="patient@mail.com" value={formData.email} onChange={event => updateField('email', event.target.value)} />
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="adresse"><i aria-hidden="true" className="fas fa-map-marker-alt"></i> Adresse complète</label>
              <input type="text" className="form-input" id="adresse" placeholder="Rue, Cité, Ville..." value={formData.address} onChange={event => updateField('address', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profession"><i aria-hidden="true" className="fas fa-briefcase"></i> Profession</label>
              <input type="text" className="form-input" id="profession" placeholder="Ex: Ingénieur" value={formData.profession} onChange={event => updateField('profession', event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contactUrgence"><i aria-hidden="true" className="fas fa-user-friends"></i> Personne à contacter</label>
              <input type="text" className="form-input" id="contactUrgence" placeholder="Nom + téléphone" value={formData.emergency_contact} onChange={event => updateField('emergency_contact', event.target.value)} />
            </div>
          </div>
        </div>

        
        <div className="form-section">
          <div className="form-section-title"><i aria-hidden="true" className="fas fa-shield-alt"></i> Assurance / Sécurité sociale</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="assuranceType"><i aria-hidden="true" className="fas fa-building"></i> Type d'assurance</label>
              <select className="form-select" id="assuranceType" value={formData.insurance_type} onChange={event => updateField('insurance_type', event.target.value)}>
                <option value="">— Aucune —</option>
                <option>CNAS</option>
                <option>CASNOS</option>
                <option>Mutuelle privée</option>
                <option>Assurance internationale</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="assuranceNum"><i aria-hidden="true" className="fas fa-hashtag"></i> Numéro d'assuré</label>
              <input type="text" className="form-input" id="assuranceNum" placeholder="Ex: 1234567890" value={formData.insurance_number} onChange={event => updateField('insurance_number', event.target.value)} />
            </div>
          </div>
        </div>

      </div>

      
            </div>
            <div className="modal-footer">
      <div className="left-actions">
        <button className="btn btn-ghost" type="button" disabled={loading} onClick={() => onOpenChange(false)}>
          <i aria-hidden="true" className="fas fa-times"></i> Annuler
        </button>
      </div>
      <div className="right-actions">
        <button className="btn btn-outline" type="button" disabled={loading} onClick={saveDraft}>
          <i aria-hidden="true" className="fas fa-save"></i> Brouillon
        </button>
        <button className="btn btn-primary" id="submitBtn" type="submit" data-testid="patient-wizard-submit-btn" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Créer le patient'} <i aria-hidden="true" className="fas fa-check"></i>
        </button>
      </div>
    </div>

          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
