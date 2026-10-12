"use client"

import { TrendingDown, TrendingUp, Users, Activity, Scan, UserCheck, Database } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSchoolData } from "@/hooks/use-school-data"

export function SectionCards() {
  const { metrics, isLiveDB } = useSchoolData()

  const clinicCards = [
    {
      title: "Patients Traités",
      value: metrics.total_students?.value || "0",
      change: metrics.total_students?.change || "+0",
      trend: "up" as const,
      icon: Users,
      footer: "Examens d'imagerie réalisés",
      subfooter: "IRM, Scanner, Écho & Radiographie",
    },
    {
      title: "Radiologues & Personnel",
      value: metrics.active_teachers?.value || "4",
      change: metrics.active_teachers?.change || "100% actifs",
      trend: "up" as const,
      icon: Activity,
      footer: "Médecins & Manipulateurs radio",
      subfooter: "Équipe médicale de garde",
    },
    {
      title: "Salles & Équipements Actifs",
      value: metrics.active_classes?.value || "5",
      change: metrics.active_classes?.change || "Haute Précision",
      trend: "up" as const,
      icon: Scan,
      footer: "Salles d'examens d'imagerie",
      subfooter: "IRM 3T, Scanner 128, Écho, X-Ray",
    },
    {
      title: "Taux d'Occupation IRM",
      value: metrics.avg_attendance?.value || "100%",
      change: metrics.avg_attendance?.change || "Optimisé",
      trend: "up" as const,
      icon: UserCheck,
      footer: "Utilisation des équipements",
      subfooter: "Calculé sur les salles actives",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Indicateurs Clés
        </h2>
        <Badge variant={isLiveDB ? "default" : "outline"} className="gap-1.5 text-xs">
          <Database className="h-3 w-3" />
          {isLiveDB ? "SQLite RadioMed Connecté" : "État Local"}
        </Badge>
      </div>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {clinicCards.map((card) => {
          const Icon = card.icon
          const TrendIcon = card.trend === "up" ? TrendingUp : TrendingDown

          return (
            <Card key={card.title} className="@container/card cursor-pointer hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{card.title}</CardDescription>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {card.value}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <TrendIcon />
                    {card.change}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {card.footer} <TrendIcon className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {card.subfooter}
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
