"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

const API_BASE = '/api'

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`)
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (err) {
      console.error("Failed to fetch settings", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = async (key: string, value: any) => {
    const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value)
    try {
      const res = await fetch(`${API_BASE}/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: stringVal }),
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast.success(`Paramètres "${key}" enregistrés en base de données !`)
      } else {
        throw new Error("Erreur de sauvegarde")
      }
    } catch (err) {
      toast.error((err as Error).message || 'Le serveur est indisponible. Les paramètres n’ont pas été enregistrés.')
    }
  }

  return {
    settings,
    loading,
    updateSetting,
    refetch: fetchSettings
  }
}
