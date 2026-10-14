import { examCategory } from '@/stores/account-store'

export type RdvView = 'table' | 'day' | 'week' | 'month' | 'list'
export const dateOf = (appointment: any) => String(appointment.date_time || '').slice(0, 10)
export function shiftDate(date: string, days: number) {
  const value = new Date(date + 'T12:00:00Z')
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function weekStart(date: string) {
  return shiftDate(date, -((new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7))
}
export function navigateReferenceDate(date: string, view: RdvView, direction: number) {
  if (view !== 'month') return shiftDate(date, direction * (view === 'day' || view === 'table' ? 1 : 7))
  const value = new Date(date + 'T12:00:00Z')
  value.setUTCDate(1)
  value.setUTCMonth(value.getUTCMonth() + direction)
  return value.toISOString().slice(0, 10)
}
export function referenceStatus(appointment: any): string {
  const status = String(appointment.status || '').toLowerCase()
  if (['cancelled', 'canceled', 'annulé'].includes(status)) return 'cancelled'
  if (['arrived', 'arrivé'].includes(status)) return 'arrived'
  if (['completed', 'done', 'terminé'].includes(status)) return 'completed'
  if (['called', 'in_progress'].includes(status)) return status
  if (appointment.priority === 'urgent') return 'urgent'
  if (['confirmed', 'confirmé'].includes(status)) return 'confirmed'
  return 'waiting'
}
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
export function displayDate(date: string) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
export function referenceDateTitle(anchor: string, view: RdvView) {
  if (view === 'month') return new Date(anchor + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  if (view === 'week' || view === 'list') return `${displayDate(weekStart(anchor))} — ${displayDate(shiftDate(weekStart(anchor), 6))}`
  return displayDate(anchor)
}

interface ReferenceEvent {
  id: number; patientId: number; h: string; m: string; name: string; exam: string; doctor: string; room: string;
  color: string; status: string; statusLabel: string; duration: number; lane: number; lanes: number;
  confirmDisabled: boolean; cancelDisabled: boolean
}

// Rendering templates copied directly from INTERFACE  CIMA/RDV.html.
// Dates, records, status labels and action IDs replace its demonstration data.
export function renderReferenceView(appointments: any[], anchor: string, today: string, currentView: RdvView) {
  const rdvData: Record<string, ReferenceEvent[]> = {}
  const colors = { IRM: 'purple', Scanner: 'orange', Echo: 'green', Radio: 'blue', Mammo: 'pink', Other: 'blue' }
  for (const appointment of appointments) {
    const date = dateOf(appointment)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const time = /^\d{2}:\d{2}/.exec(appointment.time || String(appointment.date_time).slice(11))?.[0] || '09:00'
    const [h, m] = time.split(':')
    const status = referenceStatus(appointment)
    const event: ReferenceEvent = {
      id: Number(appointment.id), patientId: Number(appointment.patient_id || 0), h, m,
      name: escapeHtml(appointment.patient_name), exam: escapeHtml(appointment.exam_type || appointment.modality_name),
      doctor: escapeHtml(appointment.radiologist), room: escapeHtml(appointment.room || appointment.location),
      color: status === 'cancelled' ? 'red' : colors[examCategory(appointment.exam_type || appointment.modality_name)], status,
      statusLabel: { waiting: 'En attente', confirmed: 'Confirmé', urgent: 'Urgent', cancelled: 'Annulé', arrived: 'Arrivé', completed: 'Terminé', called: 'Appelé', in_progress: 'En consultation' }[status] || status,
      duration: Math.max(1, Math.min(600, parseInt(appointment.duration) || 30)), lane: 0, lanes: 1,
      confirmDisabled: ['confirmed', 'arrived', 'completed', 'cancelled', 'called', 'in_progress'].includes(String(appointment.status)),
      cancelDisabled: ['arrived', 'completed', 'done', 'cancelled', 'called', 'in_progress'].includes(String(appointment.status)),
    }
    ;(rdvData[date] ||= []).push(event)
  }
  for (const events of Object.values(rdvData)) {
    events.sort((a, b) => (a.h + a.m).localeCompare(b.h + b.m) || a.id - b.id)
    const clusters: ReferenceEvent[][] = []
    let end = -1
    for (const event of events) {
      const start = Number(event.h) * 60 + Number(event.m)
      if (start >= end) { clusters.push([]); end = start + event.duration }
      else end = Math.max(end, start + event.duration)
      clusters[clusters.length - 1].push(event)
    }
    for (const cluster of clusters) {
      const lanes: number[] = []
      for (const event of cluster) {
        const start = Number(event.h) * 60 + Number(event.m)
        let lane = lanes.findIndex(end => end <= start)
        if (lane === -1) lane = lanes.length
        lanes[lane] = start + event.duration
        event.lane = lane
      }
      for (const event of cluster) event.lanes = lanes.length
    }
  }
  const listStart = weekStart(anchor), listEnd = shiftDate(listStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(listStart, index)
    return { date, day: ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'][index], num: Number(date.slice(8)), today: date === today }
  })
  function hoursForDates(dates: string[]) {
    const hours = dates.flatMap(date => (rdvData[date] || []).map(event => Number(event.h)))
    const first = Math.max(0, Math.min(8, ...hours)), last = Math.min(23, Math.max(17, ...hours))
    return Array.from({ length: last - first + 1 }, (_, index) => `${String(first + index).padStart(2, '0')}:00`)
  }

function renderWeekView() {
  const hours = hoursForDates(weekDays.map(day => day.date));

  let html = '<div class="week-view">';
  html += '<div class="week-hour-col"><div class="week-header-cell"><div class="wd">&nbsp;</div><div class="dn">&nbsp;</div></div>';
  hours.forEach(h => {
    html += `<div class="hour-slot">${h}</div>`;
  });
  html += '</div>';

  weekDays.forEach(day => {
    html += `<div class="week-day-col">`;
    html += `<div class="week-header-cell ${day.today ? 'today' : ''}">
      <div class="wd">${day.day}</div>
      <div class="dn">${day.num}</div>
    </div>`;

    hours.forEach(h => {
      html += `<div class="hour-cell ${day.today ? 'today-col' : ''}" data-action="create" data-date="${day.date}" data-time="${h}">`;

      // RDV dans cette heure
      const events = (rdvData[day.date] || []).filter(e => parseInt(e.h) === parseInt(h));
      events.forEach(e => {
        const topPos = (parseInt(e.m) / 60) * 70;
        const height = 60;
        html += `<div class="week-event ${e.color}" style="top:${topPos}px;height:${height}px;left:calc(${e.lane / e.lanes * 100}% + 4px);right:calc(${(e.lanes - e.lane - 1) / e.lanes * 100}% + 4px);" data-action="edit" data-id="${e.id}" title="${e.name} — ${e.exam} — ${e.h}:${e.m} (${e.duration} min)" role="button" tabindex="0" aria-label="${e.name} — ${e.exam} — ${e.h}:${e.m}">
          <div class="evt-time">${e.h}:${e.m}</div>
          <div class="evt-title">${e.name}</div>
          <div class="evt-sub">${e.exam}</div>
        </div>`;
      });

      html += `</div>`;
    });

    html += '</div>';
  });

  html += '</div>';
  return html;
}

/* ============ DAY VIEW ============ */
function renderDayView() {
  const hours = hoursForDates([anchor]);
  const dayEvents = rdvData[anchor] || [];

  let html = '<div class="day-view">';

  hours.forEach(h => {
    html += `<div class="day-hour">${h}</div>`;
    html += `<div class="day-slot" data-action="create" data-date="${anchor}" data-time="${h}">`;

    const events = dayEvents.filter(e => parseInt(e.h) === parseInt(h));
    events.forEach(e => {
      html += `<div class="day-event ${e.color}" data-action="edit" data-id="${e.id}" title="${e.name} — ${e.exam} — ${e.h}:${e.m} (${e.duration} min)" role="button" tabindex="0" aria-label="${e.name} — ${e.exam} — ${e.h}:${e.m}">
        <i class="fas fa-user"></i>
        <div>
          <strong>${e.h}:${e.m}</strong> — ${e.name}
          <div style="font-size:11px;opacity:0.85;">${e.exam}</div>
        </div>
      </div>`;
    });

    html += `</div>`;
  });

  html += '</div>';
  return html;
}

/* ============ MONTH VIEW ============ */
function renderMonthView() {
  const days = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
  let html = '<div class="calendar-header">';
  days.forEach(d => html += `<div class="calendar-header-cell">${d}</div>`);
  html += '</div><div class="calendar-grid">';

  const monthDate = new Date(anchor + 'T12:00:00Z');
  const year = monthDate.getUTCFullYear(), month = monthDate.getUTCMonth();
  const startOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Cases vides
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const events = rdvData[dateStr] || [];
    const isToday = dateStr === today;

    html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-action="day" data-date="${dateStr}" role="button" tabindex="0" aria-label="${displayDate(dateStr)}">
      <div class="day-number">${d}</div>
      <div class="day-events">`;

    events.slice(0, 3).forEach(e => {
      html += `<div class="day-event ${e.color}" data-action="edit" data-id="${e.id}" title="${e.name} — ${e.exam} — ${e.h}:${e.m} (${e.duration} min)" role="button" tabindex="0" aria-label="${e.name} — ${e.exam} — ${e.h}:${e.m}">
        <i class="fas fa-circle"></i> ${e.h}:${e.m} ${e.name.split(' ')[0]}
      </div>`;
    });

    if (events.length > 3) {
      html += `<div class="more-events">+${events.length - 3} autres</div>`;
    }

    html += `</div></div>`;
  }

  // Compléter la grille
  const totalCells = startOffset + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  html += '</div>';
  return html;
}

/* ============ LIST VIEW ============ */
function renderListView() {
  let html = '<div class="list-view">';

  const sortedDates = Object.keys(rdvData).filter(date => date >= listStart && date <= listEnd).sort();

  sortedDates.forEach(date => {
    const events = rdvData[date];
    if (!events || events.length === 0) return;

    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const isToday = date === today;

    html += `<div class="list-date-group">
      <div class="list-date-title">
        ${isToday ? '📅 Aujourd\'hui — ' : ''}${dayName}
        <span class="count">${events.length} RDV</span>
      </div>`;

    events.forEach((e, i) => {
      const status = e.status;
      const statusLabel = e.statusLabel;
      const initials = e.name.split(' ').map(n => n[0]).join('').slice(0, 2);
      const avatarClass = ['c1', 'c2', 'c3', 'c4', 'c5'][i % 5];

      html += `<div class="rdv-card ${status}" data-action="edit" data-id="${e.id}" title="${e.name} — ${e.exam} — ${e.h}:${e.m} (${e.duration} min)" role="button" tabindex="0" aria-label="${e.name} — ${e.exam} — ${e.h}:${e.m}">
        <div class="rdv-time-box">
          <div class="h">${e.h}:${e.m}</div>
          <div class="d">${e.exam}</div>
        </div>
        <div class="rdv-avatar ${avatarClass}">
          ${initials}
          <div class="exam-badge"><i class="fas fa-x-ray"></i></div>
        </div>
        <div class="rdv-info">
          <div class="rdv-name">
            ${e.name}
            <span class="rdv-id">${e.patientId ? '#PAT-' + e.patientId : ''}</span>
          </div>
          <div class="rdv-details">
            <span><i class="fas fa-user-md"></i> ${e.doctor}</span>
            <span class="sep">•</span>
            <span><i class="fas fa-door-open"></i> ${e.room}</span>
          </div>
        </div>
        <span class="rdv-status ${status}">${statusLabel}</span>
        <div class="rdv-actions" >
          <button class="rdv-action check" title="Confirmer" data-action="confirm" data-id="${e.id}" ${e.confirmDisabled ? 'disabled' : ''} aria-label="Confirmer ${e.name}"><i class="fas fa-check"></i></button>
          <button class="rdv-action edit" title="Modifier" data-action="edit" data-id="${e.id}" aria-label="Modifier ${e.name}"><i class="fas fa-pen"></i></button>
          <button class="rdv-action delete" title="Annuler" data-action="cancel" data-id="${e.id}" ${e.cancelDisabled ? 'disabled' : ''} aria-label="Annuler ${e.name}"><i class="fas fa-times"></i></button>
        </div>
      </div>`;
    });

    html += `</div>`;
  });

  html += '</div>';
  return html;
}



  if (currentView === 'table') return ''
  const html = currentView === 'week' ? renderWeekView() : currentView === 'day' ? renderDayView() : currentView === 'month' ? renderMonthView() : renderListView()
  return html + (currentView === 'list' && !Object.keys(rdvData).some(date => date >= listStart && date <= listEnd) ? '<div class="list-view">Aucun rendez-vous pour cette semaine.</div>' : '')
}
