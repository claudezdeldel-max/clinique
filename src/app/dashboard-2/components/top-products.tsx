"use client"

import { Scan, Users, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useSchoolData } from "@/hooks/use-school-data"

export function TopProducts() {
  const { classes } = useSchoolData()

  return (
    <Card className="cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Salles & Équipements d'Imagerie
          </CardTitle>
          <CardDescription>Équipements haute précision et nombre de patients examinés</CardDescription>
        </div>
        <Badge variant="outline">Service Actif</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {classes.map((cls, index) => (
          <div key={cls.id} className="flex items-center p-3 rounded-lg border gap-3 hover:bg-accent/40 transition-colors">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs">
              #{index + 1}
            </div>
            <div className="flex gap-2 items-center justify-between flex-1 flex-wrap">
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{cls.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {cls.code}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                  <span>Radiologue: {cls.teacher}</span>
                  <span>•</span>
                  <span>{cls.room}</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center space-x-2 justify-end">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">{cls.student_count} Patients</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground justify-end">
                  <Clock className="h-3 w-3" />
                  <span>{cls.schedule}</span>
                  <Progress value={Math.min(100, (cls.student_count / 400) * 100)} className="w-12 h-1.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
