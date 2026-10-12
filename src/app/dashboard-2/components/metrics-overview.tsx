"use client"

import { 
  TrendingUp, 
  Users, 
  Activity, 
  Scan, 
  UserCheck,
  Database
} from "lucide-react"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSchoolData } from "@/hooks/use-school-data"

export function MetricsOverview() {
  const { metrics, isLiveDB } = useSchoolData()

  const clinicMetrics = [
    {
      title: "Patients Traités",
      value: metrics.total_students?.value || "1 480",
      change: metrics.total_students?.change || "+6,8%",
      trend: "up",
      icon: Users,
      footer: "Examens d'imagerie réalisés",
      subfooter: "IRM, CT, Écho & Radiographie",
    },
    {
      title: "Radiologues & Personnel",
      value: metrics.active_teachers?.value || "14",
      change: metrics.active_teachers?.change || "100% actifs",
      trend: "up",
      icon: Activity,
      footer: "Médecins & Manipulateurs radio",
      subfooter: "Équipe médicale de garde",
    },
    {
      title: "Salles & Équipements Actifs",
      value: metrics.active_classes?.value || "5",
      change: metrics.active_classes?.change || "Haute Précision",
      trend: "neutral",
      icon: Scan,
      footer: "Salles d'examens d'imagerie",
      subfooter: "IRM 3T, Scanner 128, Écho, X-Ray",
    },
    {
      title: "Répartition Hommes / Femmes",
      value: "748 H / 732 F",
      change: "50,5% H • 49,5% F",
      trend: "up",
      icon: UserCheck,
      footer: "👨 748 Hommes  |  👩 732 Femmes",
      subfooter: "Total : 1 480 Patients de la clinique",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Indicateurs Clés de la Clinique
        </h2>
        <Badge variant={isLiveDB ? "default" : "outline"} className="gap-1.5 text-xs">
          <Database className="h-3 w-3" />
          {isLiveDB ? "SQLite RadioMed Connecté" : "État Local"}
        </Badge>
      </div>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 @5xl:grid-cols-4">
        {clinicMetrics.map((metric) => {
          const Icon = metric.icon

          return (
            <Card key={metric.title} className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{metric.title}</CardDescription>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold tabular-nums @[250px]/card:text-3xl text-foreground">
                  {metric.value}
                </CardTitle>
                <CardAction>
                  <Badge variant="secondary" className="gap-1 font-semibold text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    {metric.change}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1 text-sm">
                <div className="line-clamp-1 flex items-center gap-1.5 font-bold text-foreground text-xs">
                  {metric.footer}
                </div>
                <div className="text-muted-foreground text-xs">
                  {metric.subfooter}
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
