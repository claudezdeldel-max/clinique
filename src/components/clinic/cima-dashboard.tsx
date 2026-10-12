import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { getDashboardSummary, type DashboardSummary } from '@/lib/api'
import { hasDossierAccess, useAccountStore } from '@/stores/account-store'
import { navigationPermissions, useRolePermissionsStore } from '@/stores/role-permissions-store'
import { queueDossierLink } from '@/lib/dossier-link'
import { formatPatientName } from '@/lib/utils'
import '@/styles/designs/cima-dashboard.css'
import '@/styles/designs/cima-dashboard-integration.css'

const Icon = ({ name }: { name: string }) => <i className={`fas fa-${name}`} aria-hidden="true" />
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'MS'
const number = (value: number) => value.toLocaleString('fr-FR')
function DashboardAction({ permitted, to, className, children }: { permitted: boolean; to: string; className: string; children: ReactNode }) {
  return permitted
    ? <Link className={className} to={to}>{children}</Link>
    : <button type="button" className={className} disabled title="Accès désactivé pour ce compte. Contactez l’administrateur.">{children}</button>
}
function appointmentStatus(status: string) {
  if (['completed', 'Terminé'].includes(status)) return ['done', 'Terminé']
  if (status === 'in_progress') return ['done', 'En cours']
  if (status === 'called') return ['confirmed', 'Appelé']
  if (['arrived', 'waiting', 'Arrivé'].includes(status)) return ['waiting', 'En attente']
  if (['absent', 'Absent'].includes(status)) return ['urgent', 'Absent']
  if (['confirmed', 'Confirmé'].includes(status)) return ['confirmed', 'Confirmé']
  return ['waiting', 'Prévu']
}
export function CimaDashboard() {
  const account = useAccountStore(state => state.user)
  const token = useAccountStore(state => state.token)
  const { currentRole, rolePermissions } = useRolePermissionsStore()
  const allowed = navigationPermissions(account?.role || currentRole, rolePermissions)
  const canSee = (url: string) => allowed.includes(url)
  const dossierAllowed = hasDossierAccess(account) && canSee('/comptes-rendus')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    let fetching = false
    setSummary(null); setLoading(true); setError('')
    const refresh = async () => {
      if (fetching) return
      fetching = true
      try {
        const data = await getDashboardSummary()
        if (active) { setSummary(data); setError('') }
      } catch (err) { if (active) setError((err as Error).message) }
      finally { fetching = false; if (active) setLoading(false) }
    }
    void refresh()
    const timer = window.setInterval(refresh, 10000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [token, retry])

  const kpis = summary?.kpis
  const value = (key: 'today_appointments' | 'total_patients' | 'completed_exams' | 'waiting_queue') => kpis ? number(kpis[key]) : '—'
  const appointmentDifference = summary ? summary.kpis.today_appointments - summary.comparison.appointments_yesterday : 0
  const completedDifference = summary ? summary.kpis.completed_exams - summary.comparison.completed_yesterday : 0
  const differenceLabel = (difference: number) => `${difference > 0 ? '+' : ''}${number(difference)} vs hier`
  const patientLink = (id: number) => `/patients?patientId=${id}`

  return <BaseLayout><div className="cima-dashboard" data-testid="cima-dashboard">
    <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/fontawesome.css`} />
    <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/inter.css`} />
    <div className="main">
      {loading && <p data-testid="dashboard-loading" className="cima-sync" role="status">Chargement du tableau de bord…</p>}
      {error && <div className="cima-error" role="alert">{summary ? 'Actualisation indisponible. Les dernières données reçues restent affichées. ' : 'Tableau de bord indisponible. '}{error}<button onClick={() => setRetry(value => value + 1)}>Réessayer</button></div>}
      <div className="hero"><div className="hero-content"><h2>Bonjour{account ? `, ${account.name}` : ''} 👋</h2>
        <p>Vous avez <strong>{kpis ? number(kpis.today_appointments) : '—'} rendez-vous</strong> programmés aujourd'hui{account?.features.reports && <> et <strong>{kpis?.pending_reports == null ? '—' : number(kpis.pending_reports)} résultat{kpis?.pending_reports === 1 ? '' : 's'}</strong> en attente de validation</>}.</p>
        <div className="hero-actions">
          <DashboardAction permitted={canSee('/rendez-vous')} className="btn btn-white" to="/rendez-vous?new=1"><Icon name="plus" /> Nouveau rendez-vous</DashboardAction>
          <DashboardAction permitted={dossierAllowed} className="btn btn-outline" to="/comptes-rendus"><Icon name="file-medical" /> Voir les rapports</DashboardAction>
        </div>
      </div></div>
      <div className="stats-grid" id="cima-statistiques">
        <div className="stat-card"><div className="icon blue"><Icon name="calendar-day" /></div><h3>Rendez-vous aujourd'hui</h3><div className="value" data-testid="cima-appointments-count">{value('today_appointments')}</div><div className={`trend ${appointmentDifference < 0 ? 'down' : 'up'}`}><Icon name={appointmentDifference < 0 ? 'arrow-down' : 'arrow-up'} />{summary ? differenceLabel(appointmentDifference) : '—'}</div></div>
        <div className="stat-card"><div className="icon purple"><Icon name="users" /></div><h3>Patients total</h3><div className="value" data-testid="cima-patients-count">{value('total_patients')}</div><div className="trend up"><Icon name="arrow-up" />{summary ? `+${number(summary.comparison.patients_this_month)} ce mois` : '—'}</div></div>
        <div className="stat-card"><div className="icon green"><Icon name="check-circle" /></div><h3>Examens terminés</h3><div className="value" data-testid="cima-completed-count">{value('completed_exams')}</div><div className={`trend ${completedDifference < 0 ? 'down' : 'up'}`}><Icon name={completedDifference < 0 ? 'arrow-down' : 'arrow-up'} />{summary ? differenceLabel(completedDifference) : '—'}</div></div>
        <div className="stat-card"><div className="icon orange"><Icon name="clock" /></div><h3>En attente</h3><div className="value" data-testid="cima-waiting-count">{value('waiting_queue')}</div><div className="trend down"><Icon name="clock" />Patients à appeler</div></div>
      </div>
      <div className="content-grid">
        <div className="card"><div className="card-header"><h3>Rendez-vous du jour</h3><DashboardAction permitted={canSee('/rendez-vous')} className="link" to="/rendez-vous">Voir tout →</DashboardAction></div>
          <div className="cima-table-scroll"><table className="appointments-table"><thead><tr><th>Patient</th><th>Examen</th><th>Heure</th><th>Statut</th></tr></thead><tbody>
            {summary?.today_appointments.slice(0, 5).map((item, index) => { const [style, label] = appointmentStatus(item.status); return <tr key={item.id}>
              <td><Link className="patient-cell" to={patientLink(item.patient_id)}><div className={`avatar c${index % 5 + 1}`}>{initials(item.patient_name)}</div><div><div className="name">{formatPatientName(item.patient_name)}</div><div className="id">#PAT-{item.patient_id}</div></div></Link></td>
              <td>{item.modality_name}</td><td>{item.time || '—'}</td><td><span className={`status ${style}`}>{label}</span></td>
            </tr> })}
            {summary && !summary.today_appointments.length && <tr><td colSpan={4} className="cima-empty">Aucun rendez-vous aujourd’hui.</td></tr>}
          </tbody></table></div>
        </div>
        <div className="card" data-testid="dashboard-queue-widget"><div className="card-header"><h3>File d'attente</h3><DashboardAction permitted={canSee('/queue-management')} className="link" to="/queue-management">Gérer →</DashboardAction></div>
          <div className="queue-list">{summary?.queue.map((item, index) => <Link className="queue-item" key={item.id} data-testid={`cima-queue-${item.id}`} to={(dossierAllowed && queueDossierLink(item)) || `/queue-management?search=${encodeURIComponent(item.ticket_number)}`} aria-label={`${dossierAllowed && item.patient_id ? 'Ouvrir le dossier' : 'Voir le ticket'} de ${item.patient_name}`}>
            <div className="queue-num">{String(index + 1).padStart(2, '0')}</div><div className="info"><p>{formatPatientName(item.patient_name)}</p><p>{item.modality_name || 'Examen non précisé'}</p></div><div className="time">{item.status === 'in_progress' ? 'En cours' : item.status === 'called' ? 'Appelé' : new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          </Link>)}{summary && !summary.queue.length && <p className="cima-empty">Aucun patient en attente ou en cours.</p>}</div>
        </div>
      </div>
      <div className="card cima-equipment" data-testid="equipment-grid"><div className="card-header"><h3>État des équipements</h3><DashboardAction permitted={canSee('/settings/user')} className="link" to="/settings/user">Détails →</DashboardAction></div>
        <div className="machine-grid">{summary?.equipment.map(item => {
          const activeExams = item.active_exams
          const unavailable = !['available', 'operational', 'busy'].includes(item.status)
          const busy = !unavailable && (item.status === 'busy' || activeExams > 0)
          const progress = Math.min(100, Math.max(0, Number(item.usage_pct) || 0))
          return <div className="machine-card" key={item.id}><div className="machine-head"><div className="m-icon"><Icon name={/irm/i.test(item.modality) ? 'brain' : /echo/i.test(item.modality.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ? 'wave-square' : /mammo/i.test(item.modality) ? 'heartbeat' : 'x-ray'} /></div><div className={`indicator${unavailable ? ' off' : busy ? ' busy' : ''}`} /></div>
            <h4>{item.name}</h4><p className="room">{item.room} - {unavailable ? 'Maintenance' : busy ? 'En cours' : 'Disponible'}</p><div className="progress-bar"><div className="progress-fill" style={{ width: `${unavailable ? 0 : progress}%` }} /></div><div className="usage"><span>Utilisation</span><span>{unavailable ? 0 : progress}%</span></div>
          </div>
        })}</div>{summary && !summary.equipment.length && <p className="cima-empty">Aucun équipement enregistré.</p>}
      </div>
    </div>
  </div></BaseLayout>
}
