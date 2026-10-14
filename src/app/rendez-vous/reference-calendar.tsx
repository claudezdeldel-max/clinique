import { useLayoutEffect, useRef } from 'react'
import referenceCss from './rdv-reference.css?raw'
import referenceToolbar from './rdv-toolbar.html?raw'
import { escapeHtml, renderReferenceView, referenceDateTitle, type RdvView } from './rdv-reference'
import { examCategory } from '@/stores/account-store'

interface ReferenceCalendarProps {
  view: RdvView; date: string; today: string; appointments: any[]; doctors: Array<{ id: number; name: string }>;
  exam: string; doctor: string; status: string;
  onView: (view: RdvView) => void; onNavigate: (direction: number) => void; onToday: () => void;
  onExam: (exam: string) => void; onDoctor: (doctor: string) => void; onStatus: (status: string) => void;
  onDay: (date: string) => void; onCreate: (date: string, time: string) => void;
  onEdit: (id: number) => void; onConfirm: (id: number) => void; onCancel: (id: number) => void;
}

export function ReferenceCalendar(props: ReferenceCalendarProps) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!host.current) return
    const element = host.current
    const root = element.shadowRoot || element.attachShadow({ mode: 'open' })
    const focused = (root.activeElement as HTMLElement | null)?.dataset.filter
    const toolbar = referenceToolbar.replace('<!-- DOCTOR_OPTIONS -->', props.doctors.map(doctor => `<option value="${escapeHtml(doctor.name)}">${escapeHtml(doctor.name)}</option>`).join(''))
    root.innerHTML = `<link rel="stylesheet" href="${import.meta.env.BASE_URL}cima/fontawesome.css"><style>${referenceCss}</style>${toolbar}<div class="calendar-container" data-testid="rdv-reference-calendar">${renderReferenceView(props.appointments, props.date, props.today, props.view)}</div>`
    for (const icon of root.querySelectorAll('i')) icon.setAttribute('aria-hidden', 'true')
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      const selected = button.dataset.view === props.view
      button.classList.toggle('active', selected)
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(selected))
    }
    root.getElementById('currentDate')!.textContent = referenceDateTitle(props.date, props.view)
    const setFilter = (filter: string, value: string) => { const select = root.querySelector<HTMLSelectElement>(`[data-filter="${filter}"]`)!; select.value = value }
    setFilter('exam', props.exam === 'all' ? 'all' : examCategory(props.exam))
    setFilter('doctor', props.doctor); setFilter('status', props.status)
    if (props.view === 'table') {
      for (const selector of ['.date-navigation', '.filters-toolbar', '.calendar-container']) (root.querySelector(selector) as HTMLElement).style.display = 'none'
    }
    const syncTheme = () => element.setAttribute('data-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const onClick = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-view],[data-action]')
      if (!target || (target instanceof HTMLButtonElement && target.disabled)) return
      if (target.dataset.view) { props.onView(target.dataset.view as RdvView); return }
      const id = Number(target.dataset.id)
      switch (target.dataset.action) {
        case 'previous': props.onNavigate(-1); break
        case 'next': props.onNavigate(1); break
        case 'today': props.onToday(); break
        case 'day': props.onDay(target.dataset.date!); break
        case 'create': props.onCreate(target.dataset.date!, target.dataset.time!); break
        case 'edit': props.onEdit(id); break
        case 'confirm': props.onConfirm(id); break
        case 'cancel': props.onCancel(id); break
      }
    }
    const onChange = (event: Event) => {
      const select = event.target as HTMLSelectElement
      if (select.dataset.filter === 'exam') props.onExam(select.value)
      if (select.dataset.filter === 'doctor') props.onDoctor(select.value)
      if (select.dataset.filter === 'status') props.onStatus(select.value)
    }
    const onKey = (event: Event) => {
      const keyEvent = event as KeyboardEvent
      const target = event.target as HTMLElement
      if ((keyEvent.key === 'Enter' || keyEvent.key === ' ') && target.getAttribute('role') === 'button' && !(target instanceof HTMLButtonElement)) {
        keyEvent.preventDefault(); onClick(event)
      }
    }
    root.addEventListener('click', onClick); root.addEventListener('change', onChange); root.addEventListener('keydown', onKey)
    if (focused) root.querySelector<HTMLElement>(`[data-filter="${focused}"]`)?.focus({ preventScroll: true })
    return () => { observer.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); root.removeEventListener('keydown', onKey) }
  }, [props])

  return <>
    <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/inter.css`} />
    <link rel="stylesheet" href={`${import.meta.env.BASE_URL}cima/fontawesome.css`} />
    <div ref={host} data-testid="rdv-reference" />
  </>
}
