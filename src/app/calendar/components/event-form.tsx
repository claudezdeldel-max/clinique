"use client"

import { useState } from "react"
import { CalendarIcon, Clock, MapPin, Users, Type, Tag } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { type CalendarEvent } from "../types"

interface EventFormProps {
  event?: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: Partial<CalendarEvent>) => void
  onDelete?: (eventId: number) => void
  rooms?: { id: number; name: string; code: string; doctor: string; room: string; schedule: string; patient_count: number }[]
  radiologists?: { id: number; name: string; specialization: string; department: string; status: string }[]
}

const eventTypes = [
  { value: "meeting", label: "Consultation / RDV Examen", color: "bg-blue-500" },
  { value: "event", label: "Séance d'Imagerie IRM", color: "bg-green-500" },
  { value: "personal", label: "Scanner & Scanner CT", color: "bg-pink-500" },
  { value: "task", label: "Échographie & Radio X", color: "bg-orange-500" },
  { value: "reminder", label: "Maintenance Équipement", color: "bg-purple-500" }
]

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00"
]

const durationOptions = [
  "15 min", "30 min", "45 min", "1 heure", "1h 30", "2 heures", "3 heures", "Toute la journée"
]

export function EventForm({ event, open, onOpenChange, onSave, onDelete, rooms = [], radiologists = [] }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    date: event?.date || new Date(),
    time: event?.time || "09:00",
    duration: event?.duration || "1 heure",
    type: event?.type || "meeting",
    location: event?.location || "",
    description: event?.description || "",
    attendees: event?.attendees || [],
    allDay: false,
    reminder: true
  })

  const [showCalendar, setShowCalendar] = useState(false)
  const [newAttendee, setNewAttendee] = useState("")

  const handleSave = () => {
    const eventData: Partial<CalendarEvent> = {
      ...formData,
      id: event?.id,
      color: eventTypes.find(t => t.value === formData.type)?.color || "bg-blue-500"
    }
    onSave(eventData)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id)
      onOpenChange(false)
    }
  }

  const addAttendee = () => {
    if (newAttendee.trim() && !formData.attendees.includes(newAttendee.trim())) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee.trim()]
      }))
      setNewAttendee("")
    }
  }

  const removeAttendee = (attendee: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== attendee)
    }))
  }

  const selectedEventType = eventTypes.find(t => t.value === formData.type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", selectedEventType?.color)} />
            {event ? "Modifier le Rendez-Vous" : "Nouveau Rendez-Vous Examen"}
          </DialogTitle>
          <DialogDescription>
            {event ? "Modifiez la plage horaire ou les informations du RDV" : "Programmez une plage horaire d'examen d'imagerie médicale"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2 text-xs font-semibold">
              <Type className="w-4 h-4" />
              Titre du Rendez-Vous
            </Label>
            <Input
              id="title"
              placeholder="ex: IRM Cérébrale 3T - M. Dupont..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="text-sm font-medium"
            />
          </div>

          {/* Event Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Tag className="w-4 h-4" />
                Type d'Acte Médical
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CalendarEvent["type"] }))}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <CalendarIcon className="w-4 h-4" />
                Date de l'Examen
              </Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs">
                    {format(formData.date, "PPP", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, date }))
                        setShowCalendar(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Clock className="w-4 h-4" />
                Heure de Début
              </Label>
              <Select value={formData.time} onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time} className="text-xs cursor-pointer">{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration and Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Durée de l'Examen</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map(duration => (
                    <SelectItem key={duration} value={duration} className="text-xs cursor-pointer">{duration}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Options</Label>
              <div className="flex items-center space-x-4 h-10">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={formData.allDay}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: checked }))}
                  />
                  <Label htmlFor="all-day" className="text-xs cursor-pointer">Toute la journée</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reminder"
                    checked={formData.reminder}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reminder: checked }))}
                  />
                  <Label htmlFor="reminder" className="text-xs cursor-pointer">Rappel SMS</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Salle / Équipement - Dynamic Dropdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2 text-xs font-semibold">
                <MapPin className="w-4 h-4" />
                Salle / Équipement
              </Label>
              {rooms.length > 0 ? (
                <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Sélectionner une salle" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.room || room.name} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          {room.room || room.name} — {room.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="location"
                  placeholder="ex: Salle IRM 1..."
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="text-xs"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Users className="w-4 h-4" />
                Radiologue Référent
              </Label>
              {radiologists.length > 0 ? (
                <Select
                  value={formData.attendees[0] || ''}
                  onValueChange={(value) => {
                    setFormData(prev => {
                      const filtered = prev.attendees.filter(a => !radiologists.some(r => r.name === a))
                      return { ...prev, attendees: [value, ...filtered] }
                    })
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Sélectionner un radiologue" />
                  </SelectTrigger>
                  <SelectContent>
                    {radiologists.filter(r => r.status === 'Actif').map(doc => (
                      <SelectItem key={doc.id} value={doc.name} className="text-xs cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.name}</span>
                          <span className="text-muted-foreground text-[10px]">{doc.specialization}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nom du radiologue..."
                  value={formData.attendees[0] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendees: [e.target.value, ...prev.attendees.slice(1)] }))}
                  className="text-xs"
                />
              )}
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold">
              <Users className="w-4 h-4" />
              Médecins & Manipulateurs Présents
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un médecin ou intervenant..."
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addAttendee()}
                className="text-xs"
              />
              <Button onClick={addAttendee} variant="outline" className="cursor-pointer text-xs">Ajouter</Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.attendees.map((attendee, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2 px-2 py-1 text-xs">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px] font-medium">
                        {attendee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{attendee}</span>
                    <button
                      onClick={() => removeAttendee(attendee)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      type="button"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold">Consignes de Préparation & Prescription</Label>
            <Textarea
              id="description"
              placeholder="Instructions pour le patient (à jeun, injection de produit de contraste...)..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1 cursor-pointer">
              {event ? "Enregistrer les modifications" : "Valider le Rendez-Vous"}
            </Button>
            {event && onDelete && (
              <Button onClick={handleDelete} variant="destructive" className="cursor-pointer">
                Supprimer
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)} variant="outline" className="cursor-pointer">
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
