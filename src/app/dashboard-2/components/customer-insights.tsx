"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, UserIcon, Activity, ArrowUpIcon } from "lucide-react"
import { useSchoolData } from "@/hooks/use-school-data"

const chartConfig = {
  present: {
    label: "Examens Réalisés",
    color: "var(--chart-1)",
  },
  absent: {
    label: "RDV Annulés / Reportés",
    color: "var(--chart-3)",
  },
}

const patientDemographics = [
  { group: "18 - 35 ans", count: 380, percentage: "25,7%", avgTime: "25 min", status: "Optimal" },
  { group: "36 - 50 ans", count: 420, percentage: "28,4%", avgTime: "30 min", status: "Optimal" },
  { group: "51 - 65 ans", count: 410, percentage: "27,7%", avgTime: "35 min", status: "Optimal" },
  { group: "+65 ans / Séniors", count: 270, percentage: "18,2%", avgTime: "40 min", status: "Prioritaire" },
]

const radiologyUnits = [
  { department: "Imagerie Cérébrale & ORL", doctors: 4, modalities: "IRM 3T, Scanner 128", head: "Prof. Marc Laurent" },
  { department: "Imagerie Osteo-Articulaire", doctors: 3, modalities: "Radio X, Échographie", head: "Dr. Sophie Martin" },
  { department: "Imagerie Abdominale & Pelvienne", doctors: 4, modalities: "Scanner CT, Échographie Doppler", head: "Dr. Karim Benali" },
  { department: "Imagerie de la Femme & Mammo", doctors: 3, modalities: "Mammographie 3D, Échographie", head: "Dr. Sophie Martin" },
]

export function CustomerInsights() {
  const [activeTab, setActiveTab] = useState("attendance")
  const { attendance } = useSchoolData()

  const chartData = attendance.map(item => ({
    month: item.month,
    present: item.present_count,
    absent: item.absent_count,
  }))

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Statistiques Médicales & Délais de Prise en Charge
        </CardTitle>
        <CardDescription>Rapports d'examens mensuels, répartition des patients et équipes par unité médicale</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg h-12">
            <TabsTrigger
              value="attendance"
              className="cursor-pointer flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Activité Mensuelle</span>
            </TabsTrigger>
            <TabsTrigger
              value="demographics"
              className="cursor-pointer flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
            >
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Tranches d'Âge Patients</span>
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="cursor-pointer flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Unités d'Imagerie</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-6 space-y-6">
            <div className="grid grid-cols-10 gap-6">
              {/* Chart Area */}
              <div className="col-span-10 xl:col-span-7">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Volume des Actes et Examens par Mois</h3>
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="present" fill="var(--color-present)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="absent" fill="var(--color-absent)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Key Metrics */}
              <div className="col-span-10 xl:col-span-3 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Indicateurs de Performance Médicale</h3>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Délai Moyen d'Attente Résultat</div>
                  <div className="text-2xl font-bold text-emerald-600">35 minutes</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <ArrowUpIcon className="h-3 w-3" /> Transmis en télé-radiologie
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Compte-Rendus Validés</div>
                  <div className="text-2xl font-bold">1 445 actes</div>
                  <div className="text-xs text-muted-foreground mt-1">Signés par médecin radiologue</div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Satisfacton Patients</div>
                  <div className="text-2xl font-bold">98,6%</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <ArrowUpIcon className="h-3 w-3" /> Accueil & Prise en charge
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="demographics" className="mt-6">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-4 px-6 font-semibold">Tranche d'Âge Patient</TableHead>
                    <TableHead className="text-right py-4 px-6 font-semibold">Volume Patients</TableHead>
                    <TableHead className="text-right py-4 px-6 font-semibold">Part des Examens</TableHead>
                    <TableHead className="text-right py-4 px-6 font-semibold">Durée Moyenne d'Examen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientDemographics.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-4 px-6">{row.group}</TableCell>
                      <TableCell className="text-right py-4 px-6">{row.count}</TableCell>
                      <TableCell className="text-right py-4 px-6">{row.percentage}</TableCell>
                      <TableCell className="text-right py-4 px-6 font-semibold text-emerald-600">
                        {row.avgTime}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-4 px-6 font-semibold">Unité d'Imagerie Spécialisée</TableHead>
                    <TableHead className="text-right py-4 px-6 font-semibold">Effectif Médical</TableHead>
                    <TableHead className="py-4 px-6 font-semibold">Équipements & Modalités</TableHead>
                    <TableHead className="py-4 px-6 font-semibold">Responsable d'Unité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {radiologyUnits.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-4 px-6">{row.department}</TableCell>
                      <TableCell className="text-right py-4 px-6 font-semibold">{row.doctors}</TableCell>
                      <TableCell className="py-4 px-6 text-muted-foreground">{row.modalities}</TableCell>
                      <TableCell className="py-4 px-6">{row.head}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
