"use client"

import { Eye, MoreHorizontal, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSchoolData } from "@/hooks/use-school-data"

export function RecentTransactions() {
  const { enrollments } = useSchoolData()

  return (
    <Card className="cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Derniers Examens & Règlements Patients
          </CardTitle>
          <CardDescription>Derniers actes de radiologie enregistrés et statut du règlement</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Eye className="h-4 w-4 mr-2" />
          Voir Tout
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {enrollments.map((enrollment) => (
          <div key={enrollment.id}>
            <div className="flex p-3 rounded-lg border gap-3 items-center hover:bg-accent/40 transition-colors">
              <Avatar className="h-9 w-9 bg-primary/10 text-primary font-medium">
                <AvatarFallback>
                  {enrollment.student_name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 items-center flex-wrap justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{enrollment.student_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{enrollment.student_email} • {enrollment.grade}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      enrollment.payment_status === "Paid" ? "default" :
                      enrollment.payment_status === "Partial" ? "secondary" : "destructive"
                    }
                    className="cursor-pointer"
                  >
                    {enrollment.payment_status === "Paid" ? "Payé / CPAM" : enrollment.payment_status === "Partial" ? "Tiers Payant" : "En attente"}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{enrollment.amount}</p>
                    <p className="text-xs text-muted-foreground">{enrollment.date}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">Voir Dossier Patient</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">Imprimer Quittance</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">Voir Compte-Rendu</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
