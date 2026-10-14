// HTML and row markup copied from INTERFACE  CIMA/GSTION DES PATIENTS.html; only JSX, live data and handlers adapted.
import { useState } from 'react'
import { formatPatientAge, formatPhoneNumber } from '@/lib/utils'
import '@/styles/designs/cima-patients-table.css'

interface Patient {
  id: number
  name: string
  first_name?: string
  last_name?: string
  age?: number | string
  birth_date?: string
  gender?: string
  phone?: string
  email?: string
  blood_group?: string
  last_visit?: string
  status?: string
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getRelativeTime(dateStr?: string) {
  if (!dateStr) return ''
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  if (Number.isNaN(date.getTime())) return ''
  const diffDays = Math.round((now.getTime() - date.getTime()) / 86400000)
  if (diffDays < 0) return ''
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
  return `Il y a ${Math.floor(diffDays / 30)} mois`
}

export function CimaPatientsTable({ patients, selectedIds, onSelectOne, onOpenDossier, onPlanifyRDV, onDelete }: {
  patients: Patient[]
  selectedIds: number[]
  onSelectOne: (id: number, checked: boolean) => void
  onOpenDossier: (id: number) => void
  onPlanifyRDV: (patient: Patient) => void
  onDelete: (patient: Patient) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<'name' | 'age' | 'lastVisit' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const total = patients.length
  const totalPages = Math.ceil(total / pageSize) || 1
  const page = Math.min(currentPage, totalPages)
  const start = (page - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  const sorted = [...patients]
  if (sortField) sorted.sort((a, b) => {
    const direction = sortDir === 'asc' ? 1 : -1
    if (sortField === 'age') return ((Number(a.age) || 0) - (Number(b.age) || 0)) * direction
    if (sortField === 'lastVisit') return (a.last_visit || '').localeCompare(b.last_visit || '') * direction
    return (a.last_name || a.name).localeCompare(b.last_name || b.name, 'fr') * direction
  })
  const pageData = sorted.slice(start, end)
  const allSelected = pageData.length > 0 && pageData.every(patient => selectedIds.includes(patient.id))
  const sortBy = (field: NonNullable<typeof sortField>) => {
    setSortDir(sortField === field && sortDir === 'asc' ? 'desc' : 'asc')
    setSortField(field)
    setCurrentPage(1)
  }
  const pages: Array<number | '...'> = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else if (page <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages)
  else if (page >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  else pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)

  return <div className="cima-patients-table">
    <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/inter.css`} />
    <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/fontawesome.css`} />
    <div className="table-card">
      <div className="table-wrapper">
        <table className="patients-table" id="patientsTable" aria-label="Gestion des patients">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input type="checkbox" id="selectAll" aria-label="Sélectionner les patients de cette page" checked={allSelected} onChange={event => pageData.forEach(patient => onSelectOne(patient.id, event.target.checked))} />
              </th>
              <th className={sortField === 'name' ? 'sortable sorted' : 'sortable'} data-sort="name" aria-sort={sortField === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} tabIndex={0} onClick={() => sortBy('name')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sortBy('name') } }}>
                Patient <i className="fas fa-sort sort-icon"></i>
              </th>
              <th className={sortField === 'age' ? 'sortable sorted' : 'sortable'} data-sort="age" aria-sort={sortField === 'age' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} tabIndex={0} onClick={() => sortBy('age')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sortBy('age') } }}>
                Âge / Sexe <i className="fas fa-sort sort-icon"></i>
              </th>
              <th>Contact</th>
              <th>Groupe sanguin</th>
              <th className={sortField === 'lastVisit' ? 'sortable sorted' : 'sortable'} data-sort="lastVisit" aria-sort={sortField === 'lastVisit' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} tabIndex={0} onClick={() => sortBy('lastVisit')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sortBy('lastVisit') } }}>
                Dernière visite <i className="fas fa-sort sort-icon"></i>
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            {pageData.map((p, i) => {
              const avatarClass = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'][(start + i) % 6]
              const initials = p.first_name && p.last_name ? (p.first_name[0] + p.last_name[0]).toUpperCase() : p.name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
              const isSelected = selectedIds.includes(p.id)
              return (<tr key={p.id}>
        <td className="checkbox-cell">
          <input type="checkbox" className="row-checkbox" data-id={p.id} aria-label={`Sélectionner ${p.name}`} checked={isSelected} onChange={event => onSelectOne(p.id, event.target.checked)} />
        </td>
        <td>
          <div className="patient-cell">
            <div className={`avatar ${avatarClass}`}>
              {initials}
              <div className={`status-dot ${p.status === 'Archivé' ? 'off' : p.status === 'En attente' ? 'busy' : ''}`}></div>
            </div>
            <div className="info">
              <div className="name">{p.name}</div>
              <div className="id">{`#PAT-${p.id}`}</div>
            </div>
          </div>
        </td>
        <td>
          <div className="info-cell">
            <p>{formatPatientAge(p.birth_date, p.age)}</p>
            <p>{p.gender || '—'}</p>
          </div>
        </td>
        <td>
          <div className="info-cell">
            <p>{formatPhoneNumber(p.phone) || '—'}</p>
            <p>{p.email || '—'}</p>
          </div>
        </td>
        <td>
          <span className="badge blood"><i className="fas fa-tint"></i> {p.blood_group || '—'}</span>
        </td>
        <td>
          <div className="info-cell">
            <p>{formatDate(p.last_visit)}</p>
            <p>{getRelativeTime(p.last_visit)}</p>
          </div>
        </td>
        <td>
          <div className="row-actions">
            <button className="action-btn view" title="Voir la fiche" aria-label="Voir la fiche" type="button" data-testid={`open-dossier-${p.id}`} onClick={() => onOpenDossier(p.id)}>
              <i className="fas fa-eye"></i>
            </button>
            <button className="action-btn edit" title="Modifier" aria-label="Modifier" type="button" data-testid={`edit-patient-${p.id}`} onClick={() => onOpenDossier(p.id)}>
              <i className="fas fa-pen"></i>
            </button>
            <button className="action-btn calendar" title="Nouveau RDV" aria-label="Nouveau RDV" type="button" data-testid={`view-patient-${p.id}`} onClick={() => onPlanifyRDV(p)}>
              <i className="fas fa-calendar-plus"></i>
            </button>
            <button className="action-btn delete" title="Supprimer" aria-label="Supprimer" type="button" onClick={() => onDelete(p)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>)
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <div className="pagination-info">
          Affichage <strong id="pageStart">{total ? start + 1 : 0}</strong> à <strong id="pageEnd">{end}</strong> sur <strong id="pageTotal">{total}</strong>
        </div>
        <div className="pagination-controls" id="paginationControls">
          {totalPages > 1 && <>
            <button type="button" className="page-btn" aria-label="Page précédente" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}><i className="fas fa-chevron-left"></i></button>
            {pages.map((number, i) => <button type="button" key={i} className={`page-btn ${number === page ? 'active' : ''}`} aria-label={number === '...' ? undefined : `Page ${number}`} aria-current={number === page ? 'page' : undefined} disabled={number === '...'} onClick={() => number !== '...' && setCurrentPage(number)}>{number}</button>)}
            <button type="button" className="page-btn" aria-label="Page suivante" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}><i className="fas fa-chevron-right"></i></button>
          </>}
        </div>
        <select className="page-size-select" id="pageSize" aria-label="Patients par page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setCurrentPage(1) }}>
          <option value="5">5 / page</option>
          <option value="10">10 / page</option>
          <option value="25">25 / page</option>
          <option value="50">50 / page</option>
        </select>
      </div>
    </div>
  </div>
}
