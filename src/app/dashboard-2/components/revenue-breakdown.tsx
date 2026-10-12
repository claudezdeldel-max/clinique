"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useSchoolData } from "@/hooks/use-school-data"

const chartConfig = {
  revenue: {
    label: "Recettes",
  },
  amount: {
    label: "Montant",
  },
  subscriptions: {
    label: "IRM Cérébrale 3T",
    color: "var(--chart-1)",
  },
  sales: {
    label: "Scanner CT Abdominal",
    color: "var(--chart-2)",
  },
  services: {
    label: "Échographie Doppler",
    color: "var(--chart-3)",
  },
  partnerships: {
    label: "Mammographie 3D",
    color: "var(--chart-4)",
  },
}

export function RevenueBreakdown() {
  const id = "revenue-breakdown"
  const { studentPayments = [] } = useSchoolData()
  const [activeCategory, setActiveCategory] = React.useState("subscriptions")

  const safePayments = Array.isArray(studentPayments) ? studentPayments : []

  const irmSum = safePayments.filter(p => (p.grade || "").includes("IRM")).reduce((s, p) => s + (p.paid_amount || 0), 0) || 350
  const scanSum = safePayments.filter(p => (p.grade || "").includes("Scanner")).reduce((s, p) => s + (p.paid_amount || 0), 0) || 120
  const echoSum = safePayments.filter(p => (p.grade || "").includes("Échographie")).reduce((s, p) => s + (p.paid_amount || 0), 0) || 100
  const mammoSum = safePayments.filter(p => (p.grade || "").includes("Mammo")).reduce((s, p) => s + (p.paid_amount || 0), 0) || 180

  const totalSum = irmSum + scanSum + echoSum + mammoSum || 1

  const revenueData = [
    { category: "subscriptions", value: Math.round((irmSum / totalSum) * 100), amount: irmSum, fill: "var(--color-subscriptions)" },
    { category: "sales", value: Math.round((scanSum / totalSum) * 100), amount: scanSum, fill: "var(--color-sales)" },
    { category: "services", value: Math.round((echoSum / totalSum) * 100), amount: echoSum, fill: "var(--color-services)" },
    { category: "partnerships", value: Math.round((mammoSum / totalSum) * 100), amount: mammoSum, fill: "var(--color-partnerships)" },
  ]

  const activeIndex = React.useMemo(
    () => revenueData.findIndex((item) => item.category === activeCategory),
    [activeCategory]
  )

  const categories = React.useMemo(() => revenueData.map((item) => item.category), [])

  return (
    <Card data-chart={id} className="flex flex-col cursor-pointer">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-2">
        <div>
          <CardTitle>Répartition des Recettes par Acte (Encaissé)</CardTitle>
          <CardDescription>Distribution des revenus de la clinique par type d'examen d'imagerie</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger
              className="w-[190px] rounded-lg cursor-pointer text-xs"
              aria-label="Sélectionner un examen"
            >
              <SelectValue placeholder="Examen" />
            </SelectTrigger>
            <SelectContent align="end" className="rounded-lg">
              {categories.map((key) => {
                const config = chartConfig[key as keyof typeof chartConfig]

                if (!config) {
                  return null
                }

                return (
                  <SelectItem
                    key={key}
                    value={key}
                    className="rounded-md [&_span]:flex cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: `var(--color-${key})`,
                        }}
                      />
                      {config?.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" className="cursor-pointer">
            Exporter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="flex justify-center">
            <ChartContainer
              id={id}
              config={chartConfig}
              className="mx-auto aspect-square w-full max-w-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={revenueData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={60}
                  strokeWidth={5}
                  activeShape={({
                    outerRadius = 0,
                    ...props
                  }: PieSectorDataItem) => (
                    <g>
                      <Sector {...props} outerRadius={outerRadius + 10} />
                      <Sector
                        {...props}
                        outerRadius={outerRadius + 25}
                        innerRadius={outerRadius + 12}
                      />
                    </g>
                  )}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {(revenueData[activeIndex]?.amount || 0).toLocaleString('fr-FR')} DA
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-xs"
                            >
                              Recettes Actes
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          <div className="flex flex-col justify-center space-y-3">
            {revenueData.map((item, index) => {
              const config = chartConfig[item.category as keyof typeof chartConfig]
              const isActive = index === activeIndex

              return (
                <div
                  key={item.category}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                    isActive ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveCategory(item.category)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: `var(--color-${item.category})`,
                      }}
                    />
                    <span className="font-medium text-sm">{config?.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{item.amount.toLocaleString('fr-FR')} DA</div>
                    <div className="text-xs text-muted-foreground">{item.value}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
