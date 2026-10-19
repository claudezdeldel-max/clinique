"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { type CalendarEvent } from "./types"

const API_BASE = '/api'

export interface UseCalendarState {
  selectedDate: Date
  showEventForm: boolean
  editingEvent: CalendarEvent | null
  showCalendarSheet: boolean
  events: CalendarEvent[]
  loading: boolean
  rooms: { id: number; name: string; code: string; doctor: string; room: string; schedule: string; patient_count: number }[]
  radiologists: { id: number; name: string; specialization: string; department: string; status: string }[]
}

export interface UseCalendarActions {
  setSelectedDate: (date: Date) => void
  setShowEventForm: (show: boolean) => void
  setEditingEvent: (event: CalendarEvent | null) => void
  setShowCalendarSheet: (show: boolean) => void
  handleDateSelect: (date: Date) => void
  handleNewEvent: () => void
  handleNewCalendar: () => void
  handleSaveEvent: (eventData: Partial<CalendarEvent>) => void
  handleDeleteEvent: (eventId: number) => void
  handleEditEvent: (event: CalendarEvent) => void
}

export interface UseCalendarReturn extends UseCalendarState, UseCalendarActions {}

function parseDBAppointment(appt: any): CalendarEvent {
  // Parse the date_time string into a proper Date
  let eventDate: Date
  try {
    eventDate = new Date(appt.date_time)
    if (isNaN(eventDate.getTime())) {
      eventDate = new Date()
    }
  } catch {
    eventDate = new Date()
  }

  return {
    id: appt.id,
    title: appt.patient_name || appt.modality_name || 'Rendez-vous',
    date: eventDate,
    time: appt.time || eventDate.toTimeString().slice(0, 5),
    duration: appt.duration || '30 min',
    type: (appt.type as CalendarEvent['type']) || 'event',
    attendees: appt.radiologist ? [appt.radiologist] : [],
    location: appt.location || appt.modality_name || '',
    color: appt.color || '#3b82f6',
    description: appt.description || '',
  }
}

export function useCalendar(initialEvents: CalendarEvent[] = []): UseCalendarReturn {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<UseCalendarState['rooms']>([])
  const [radiologists, setRadiologists] = useState<UseCalendarState['radiologists']>([])

  // Fetch events, rooms, and radiologists from DB on mount
  const fetchEvents = useCallback(async () => {
    try {
      const [resAppts, resRooms, resRadio] = await Promise.all([
        fetch(`${API_BASE}/appointments`),
        fetch(`${API_BASE}/classes`),
        fetch(`${API_BASE}/teachers`),
      ])
      if (resAppts.ok) {
        const data = await resAppts.json()
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data.map(parseDBAppointment))
        } else {
          setEvents(initialEvents)
        }
      }
      if (resRooms.ok) {
        const data = await resRooms.json()
        if (Array.isArray(data)) setRooms(data)
      }
      if (resRadio.ok) {
        const data = await resRadio.json()
        if (Array.isArray(data)) setRadiologists(data.map((r: any) => ({ id: r.id, name: r.name, specialization: r.subject || r.specialization, department: r.department, status: r.status })))
      }
    } catch {
      setEvents(initialEvents)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setShowCalendarSheet(false)
  }, [])

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null)
    setShowEventForm(true)
  }, [])

  const handleNewCalendar = useCallback(() => {
    toast.info("Fonctionnalité de calendrier partagé à venir")
  }, [])

  const handleSaveEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    try {
      const dateTime = eventData.date
        ? new Date(eventData.date).toISOString()
        : new Date().toISOString()

      const payload = {
        patient_name: eventData.title || 'Rendez-vous',
        modality_name: eventData.location || 'IRM',
        date_time: dateTime,
        radiologist: eventData.attendees?.[0] || 'Prof. Marc Laurent',
        time: eventData.time || '09:00',
        duration: eventData.duration || '30 min',
        type: eventData.type || 'event',
        location: eventData.location || '',
        description: eventData.description || '',
        color: eventData.color || '#3b82f6',
      }

      if (eventData.id) {
        // Update existing
        const res = await fetch(`${API_BASE}/appointments/${eventData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          const parsed = parseDBAppointment(updated)
          setEvents(prev => prev.map(e => e.id === eventData.id ? parsed : e))
          toast.success("Rendez-vous mis à jour")
        }
      } else {
        // Create new
        const res = await fetch(`${API_BASE}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          const parsed = parseDBAppointment(created)
          setEvents(prev => [...prev, parsed])
          toast.success("Rendez-vous créé avec succès")
        }
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement du rendez-vous")
    }

    setShowEventForm(false)
    setEditingEvent(null)
  }, [])

  const handleDeleteEvent = useCallback(async (eventId: number) => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${eventId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId))
        toast.success("Rendez-vous supprimé")
      }
    } catch {
      toast.error("Erreur lors de la suppression")
    }
    setShowEventForm(false)
    setEditingEvent(null)
  }, [])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setShowEventForm(true)
  }, [])

  return {
    // State
    selectedDate,
    showEventForm,
    editingEvent,
    showCalendarSheet,
    events,
    loading,
    rooms,
    radiologists,
    // Actions
    setSelectedDate,
    setShowEventForm,
    setEditingEvent,
    setShowCalendarSheet,
    handleDateSelect,
    handleNewEvent,
    handleNewCalendar,
    handleSaveEvent,
    handleDeleteEvent,
    handleEditEvent,
  }
}
