"use client"

import * as React from "react"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function SidebarNotification() {
  const [isVisible, setIsVisible] = React.useState(true)

  if (!isVisible) return null

  return (
    <Card className="mb-3 py-0 border-primary/20 bg-primary/5 dark:border-neutral-700 dark:bg-neutral-800">
      <CardContent className="p-4 relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Fermer la notification</span>
        </Button>
        
        <div className="pr-6">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-primary mb-1 mt-1">
            <Sparkles className="h-4 w-4 text-primary" />
            RadioMed OS - SQLite Actif
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Clinique de radiologie, gestion des patients, examens d'imagerie et quittances médicales imprimables.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
