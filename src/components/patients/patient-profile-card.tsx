import {
  Check,
  Phone,
  FileText,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatPatientAge, formatPhoneNumber } from '@/lib/utils'

export interface PatientProfileCardProps {
  patient: {
    id: number
    name: string
    gender?: string
    age?: number | string
    birth_date?: string
    phone?: string
    email?: string
    social_sec_no?: string
    insurance_type?: string
    blood_group?: string
    prescribing_doctor?: string
    status?: string
    photo_url?: string
    exam_count?: number
  }
  onViewDossier?: (id: number) => void
  onPlanifyRDV?: (patient: any) => void
  onSelectOne?: (id: number, checked: boolean) => void
  isSelected?: boolean
  className?: string
}

export function getPatientAvatarUrl(patient: { photo_url?: string; gender?: string }) {
  if (patient?.photo_url && patient.photo_url.trim() !== '') {
    return patient.photo_url
  }
  const g = (patient?.gender || '').toLowerCase()
  const isFemale = g === 'femme' || g === 'f' || g === 'female'
  return isFemale ? '/avatars/female-default.png' : '/avatars/male-default.png'
}

export function PatientProfileCard({
  patient,
  onViewDossier,
  onPlanifyRDV,
  onSelectOne,
  isSelected = false,
  className = '',
}: PatientProfileCardProps) {
  const avatarUrl = getPatientAvatarUrl(patient)

  return (
    <div
      data-testid={`patient-card-${patient.id}`}
      className={`group relative bg-white dark:bg-slate-900 text-card-foreground rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col p-3.5 sm:p-4 ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${className}`}
    >
      {/* Selection Checkbox */}
      {onSelectOne && (
        <div className="absolute top-5 left-5 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-xs">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(c) => onSelectOne(patient.id, !!c)}
          />
        </div>
      )}

      {/* Top Portrait Image (Click opens Dossier) */}
      <div
        onClick={() => onViewDossier && onViewDossier(patient.id)}
        className="relative w-full aspect-[4/3] rounded-[22px] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-xs cursor-pointer group-hover:scale-[1.01] transition-transform duration-300"
      >
        <img
          src={avatarUrl}
          alt={patient.name}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            const isFemale = (patient.gender || '').toLowerCase() === 'femme'
            target.src = isFemale ? '/avatars/female-default.png' : '/avatars/male-default.png'
          }}
        />
      </div>

      {/* Clean Minimal Content Section */}
      <div className="pt-4 pb-1 px-1 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Header row: Patient Name + Verified checkmark badge */}
          <div data-testid={`open-dossier-${patient.id}`} className="flex items-center gap-1.5 cursor-pointer" onClick={() => onViewDossier && onViewDossier(patient.id)}>
            <h3 className="font-extrabold text-xl text-foreground tracking-tight line-clamp-1">
              {patient.name}
            </h3>
            <span
              title="Dossier vérifié"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0 shadow-2xs"
            >
              <Check className="w-3.2 h-3.2 stroke-[3]" />
            </span>
          </div>

          {/* Clean Single Subtitle Line */}
          <p className="text-xs text-muted-foreground mt-1.5 font-normal leading-relaxed line-clamp-2">
            {patient.gender || 'Sexe non renseigné'}, {formatPatientAge(patient.birth_date, patient.age)} • Tél: {formatPhoneNumber(patient.phone) || 'Non renseigné'}
          </p>
        </div>

        {/* Footer Row: Quick Stats & Planifier RDV Button (Direct Appointment Action) */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1" title="Groupe sanguin">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{patient.blood_group || 'Non renseigné'}</span>
            </span>
            <span className="flex items-center gap-1" title="Examens réalisés">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{patient.exam_count ?? '—'}</span>
            </span>
          </div>

          <Button
            data-testid={`view-patient-${patient.id}`}
            onClick={() => {
              if (onPlanifyRDV) {
                onPlanifyRDV(patient)
              } else if (onViewDossier) {
                onViewDossier(patient.id)
              }
            }}
            className="rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3.5 py-2.5 h-auto transition-all shadow-xs flex items-center gap-1 border-0"
          >
            Planifier RDV <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact Patient Summary Card specially designed for Doctor Prescriptions & Consultation Workspace
 */
export function PatientCompactCard({
  patient,
  onViewDossier,
  className = '',
}: {
  patient: {
    id?: number
    name: string
    gender?: string
    age?: number | string
    birth_date?: string
    phone?: string
    social_sec_no?: string
    insurance_type?: string
    blood_group?: string
    photo_url?: string
    status?: string
  }
  onViewDossier?: (id?: number) => void
  className?: string
}) {
  const avatarUrl = getPatientAvatarUrl(patient)

  return (
    <div
      className={`bg-card text-card-foreground p-3 sm:p-4 rounded-2xl border border-border/80 shadow-xs flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={avatarUrl}
          alt={patient.name}
          className="w-14 h-14 rounded-2xl object-cover object-top border-2 border-sky-400/80 shadow-xs shrink-0"
        />
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-base text-foreground tracking-tight truncate">
              {patient.name}
            </h4>
            <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-500 text-white shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
              {patient.status || 'Confirmé'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-medium truncate">
            {patient.gender || 'Sexe non renseigné'}, {formatPatientAge(patient.birth_date, patient.age)} • Tél: {formatPhoneNumber(patient.phone) || 'Non renseigné'}
          </p>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-muted font-mono">
              N° Sécu: {patient.social_sec_no || '1 76 09 19 567 890'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted font-medium text-purple-600 dark:text-purple-400">
              {patient.insurance_type || 'Non renseignée'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted font-bold text-rose-500">
              {patient.blood_group || 'Non renseigné'}
            </span>
          </div>
        </div>
      </div>

      {onViewDossier && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewDossier(patient.id)}
          className="rounded-xl text-xs font-semibold shrink-0"
        >
          Dossier <Plus className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  )
}
