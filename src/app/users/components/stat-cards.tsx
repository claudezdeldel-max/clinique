import { Card, CardContent } from "@/components/ui/card"
import { Users, Stethoscope, Activity, CheckCircle2, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const performanceMetrics = [
  {
    title: "Total Personnel",
    current: "2",
    previous: "2 actifs",
    growth: 100,
    icon: Users,
  },
  {
    title: "Médecins Radiologues",
    current: "2",
    previous: "Spécialistes",
    growth: 100,
    icon: Stethoscope,
  },
  {
    title: "Salles & Équipements",
    current: "2",
    previous: "IRM & Scanner CT",
    growth: 100,
    icon: Activity,
  },
  {
    title: "Disponibilité Staff",
    current: "100%",
    previous: "Garde 24h",
    growth: 100,
    icon: CheckCircle2,
  },
]

export function StatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {performanceMetrics.map((metric, index) => (
        <Card key={index} className="border">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <metric.icon className="text-primary size-6" />
              <Badge
                variant="outline"
                className={cn(
                  "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400"
                )}
              >
                <TrendingUp className="me-1 size-3" />
                Actif
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">{metric.title}</p>
              <div className="text-2xl font-bold">{metric.current}</div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>{metric.previous}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
