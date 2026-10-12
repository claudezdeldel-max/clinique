"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

export function GenderDistributionCard() {
  const maleCount = 748
  const femaleCount = 732
  const total = maleCount + femaleCount
  const malePercent = ((maleCount / total) * 100).toFixed(1)
  const femalePercent = ((femaleCount / total) * 100).toFixed(1)

  return (
    <Card className="shadow-sm border-2 overflow-hidden bg-card">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 via-pink-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Répartition par Sexe (Hommes / Femmes)
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
            Total : {total} Patients
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Distribution démographique des patients de la clinique radiologique.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Progress Bar Split */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
              👨 Hommes : {maleCount} ({malePercent}%)
            </span>
            <span className="text-pink-600 dark:text-pink-400 flex items-center gap-1">
              👩 Femmes : {femaleCount} ({femalePercent}%)
            </span>
          </div>

          <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${malePercent}%` }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-500"
              title={`Hommes: ${maleCount} (${malePercent}%)`}
            />
            <div
              style={{ width: `${femalePercent}%` }}
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-500"
              title={`Femmes: ${femaleCount} (${femalePercent}%)`}
            />
          </div>
        </div>

        {/* 2 Statistic Sub-Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl border bg-blue-500/5 border-blue-200 dark:border-blue-900 space-y-1">
            <span className="text-[11px] text-muted-foreground font-semibold block">Patients Hommes</span>
            <strong className="text-xl font-black text-blue-600 dark:text-blue-400">{maleCount}</strong>
            <p className="text-[10px] text-muted-foreground">IRM & Scanner CT principaux</p>
          </div>

          <div className="p-3 rounded-xl border bg-pink-500/5 border-pink-200 dark:border-pink-900 space-y-1">
            <span className="text-[11px] text-muted-foreground font-semibold block">Patients Femmes</span>
            <strong className="text-xl font-black text-pink-600 dark:text-pink-400">{femaleCount}</strong>
            <p className="text-[10px] text-muted-foreground">Échographie & Mammographie 3D</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
