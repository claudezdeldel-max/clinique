"use client"

import { Plus } from "lucide-react"

import { Calendars } from "./calendars"
import { DatePicker } from "./date-picker"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import type { CalendarEvent } from "../types"

interface CalendarSidebarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onNewCalendar?: () => void
  onNewEvent?: () => void
  events?: Array<{ date: Date; count: number }>
  rooms?: Array<{ id: number; name: string; teacher_name?: string; schedule?: string; room?: string }>
  appointments?: CalendarEvent[]
  className?: string
}

export function CalendarSidebar({ 
  selectedDate,
  onDateSelect,
  onNewCalendar,
  onNewEvent,
  events = [],
  rooms = [],
  appointments = [],
  className 
}: CalendarSidebarProps) {
  // Calculate busy status per room for selected date
  const isDateEqual = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  const selectedDateAppointments = selectedDate 
    ? appointments.filter(app => app.date && isDateEqual(new Date(app.date), selectedDate))
    : []

  return (
    <div className={`flex flex-col h-full bg-background rounded-lg ${className}`}>
      {/* Add New Event Button */}
      <div className="p-6 border-b">
        <Button 
          className="w-full cursor-pointer"
          onClick={onNewEvent}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Rendez-vous
        </Button>
      </div>

      {/* Date Picker */}
      <DatePicker
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        events={events}
      />

      <Separator />

      {/* Salles d'Examen / Rooms List */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Salles d'Examen & Sched
        </h4>
        <div className="space-y-2">
          {rooms.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">Chargement des salles...</div>
          ) : (
            rooms.map((rm) => {
              const roomApps = selectedDateAppointments.filter(
                app => app.location && app.location.toLowerCase().includes(rm.name.toLowerCase())
              )
              const isBusy = roomApps.length > 0

              return (
                <div key={rm.id} className="p-2.5 rounded-lg border bg-card text-card-foreground text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>{rm.name}</span>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                      isBusy ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}>
                      {isBusy ? `${roomApps.length} RDV` : "Disponible"}
                    </span>
                  </div>
                  {rm.teacher_name && (
                    <p className="text-[11px] text-muted-foreground">👨‍⚕️ {rm.teacher_name}</p>
                  )}
                  {rm.room && (
                    <p className="text-[11px] text-muted-foreground">📍 {rm.room}</p>
                  )}
                </div>
              )
            })
          )}
        </div>

        <Separator className="my-4" />

        <Calendars 
          onNewCalendar={onNewCalendar}
          onCalendarToggle={(calendarId, visible) => {
            console.log(`Calendar ${calendarId} visibility: ${visible}`)
          }}
          onCalendarEdit={(calendarId) => {
            console.log(`Edit calendar: ${calendarId}`)
          }}
          onCalendarDelete={(calendarId) => {
            console.log(`Delete calendar: ${calendarId}`)
          }}
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          className="w-full justify-start cursor-pointer text-xs"
          onClick={onNewCalendar}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Calendrier
        </Button>
      </div>
    </div>
  )
}
