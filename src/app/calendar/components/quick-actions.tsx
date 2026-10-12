"use client"

import { 
  Clock,
  Users,
  Plus,
  Settings,
  Download,
  Share,
  Bell
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface QuickActionsProps {
  onNewEvent?: () => void
  onNewMeeting?: () => void
  onNewReminder?: () => void
  onSettings?: () => void
}

export function QuickActions({ 
  onNewEvent, 
  onNewMeeting, 
  onNewReminder, 
  onSettings 
}: QuickActionsProps) {
  const quickStats = [
    { label: "RDV Aujourd'hui", value: "2", color: "bg-blue-500" },
    { label: "Cette Semaine", value: "6", color: "bg-green-500" },
    { label: "En Attente", value: "1", color: "bg-orange-500" }
  ]

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Aperçu du Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickStats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <Badge variant="secondary">{stat.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start cursor-pointer text-xs" 
            onClick={onNewEvent}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau RDV Examen
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start cursor-pointer text-xs" 
            onClick={onNewMeeting}
          >
            <Users className="w-4 h-4 mr-2" />
            Planifier Consultation
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start cursor-pointer text-xs" 
            onClick={onNewReminder}
          >
            <Bell className="w-4 h-4 mr-2" />
            Rappel Examen SMS
          </Button>

          <Separator className="my-3" />

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start cursor-pointer text-xs" 
          >
            <Share className="w-4 h-4 mr-2" />
            Partager Planning
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start cursor-pointer text-xs" 
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start cursor-pointer text-xs" 
            onClick={onSettings}
          >
            <Settings className="w-4 h-4 mr-2" />
            Paramètres Salles
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Prochains Examens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">IRM Cérébrale 3T</p>
                <p className="text-xs text-muted-foreground">09:00 • Salle IRM 1 (M. Dupont)</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Scanner CT Abdominal</p>
                <p className="text-xs text-muted-foreground">14:00 • Salle Scanner 2 (Mme Curie)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
