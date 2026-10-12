"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

export interface RadioScan {
  id: string
  title: string
  url: string
  date: string
  modality: string
  notes?: string
}

export interface PrescriptionItem {
  id: number
  medication: string
  dosage: string
  duration: string
  instructions: string
}

export interface Consultation {
  id: number
  patient_name: string
  patient_age: number | null
  birth_date?: string
  phone?: string
  exam_type: string
  doctor_name: string
  date: string
  weight: number
  height: number
  bmi: number
  blood_pressure: string
  heart_rate: number
  temperature: number
  spo2: number
  blood_sugar: number
  clinical_notes: string
  radiology_report: string
  scans_json: string | RadioScan[]
  prescription_json: string | PrescriptionItem[]
  medical_history: string
  status: string
}

const API_BASE = '/api'

export function parseScans(scansJson: string | RadioScan[] | undefined): RadioScan[] {
  if (!scansJson) return []
  if (Array.isArray(scansJson)) return scansJson
  try {
    return JSON.parse(scansJson)
  } catch {
    return []
  }
}

export function parsePrescriptions(prescJson: string | PrescriptionItem[] | undefined): PrescriptionItem[] {
  if (!prescJson) return []
  if (Array.isArray(prescJson)) return prescJson
  try {
    return JSON.parse(prescJson)
  } catch {
    return []
  }
}

export function useConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConsultations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/consultations`)
      if (!res.ok) throw new Error("Erreur de chargement")
      const data = await res.json()
      setConsultations(data)
    } catch (err) {
      console.error(err)
      toast.error("Erreur de chargement des consultations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  const createConsultation = async (newConsult: Partial<Consultation>) => {
    try {
      const res = await fetch(`${API_BASE}/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConsult),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      const created = await res.json()
      setConsultations(prev => [created, ...prev])
      toast.success(`Consultation de ${created.patient_name} enregistrée !`)
      return created
    } catch (err) {
      toast.error("Échec d'enregistrement de la consultation")
      throw err
    }
  }

  const updateConsultation = async (id: number, fields: Partial<Consultation>) => {
    try {
      const res = await fetch(`${API_BASE}/consultations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error("Erreur de mise à jour")
      const updated = await res.json()
      setConsultations(prev => prev.map(c => c.id === id ? updated : c))
      toast.success("Dossier de consultation mis à jour avec succès !")
      return updated
    } catch (err) {
      toast.error("Échec de mise à jour de la consultation")
      throw err
    }
  }

  const deleteConsultation = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/consultations/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur de suppression")
      setConsultations(prev => prev.filter(c => c.id !== id))
      toast.success("Consultation supprimée")
    } catch (err) {
      toast.error("Erreur de suppression")
    }
  }

  return {
    consultations,
    loading,
    refetch: fetchConsultations,
    createConsultation,
    updateConsultation,
    deleteConsultation,
  }
}
