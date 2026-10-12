import { BirthDateFields } from '@/components/patients/birth-date-fields'
"use client"

import { useState } from "react"
import { Plus, Phone, UserPlus } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPatientName, calculateAge, formatPatientAge, formatPhoneNumber } from "@/lib/utils"

import type { Task } from "../data/schema"

const taskFormSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Le nom du patient est requis"),
  birth_date: z.string().optional(),
  gender: z.string().default("Homme"),
  phone: z.string().optional(),
  description: z.string().optional(),
  status: z.string().default("completed"),
  category: z.string().default("dossier"),
  priority: z.string().default("normal"),
})

type TaskFormData = z.infer<typeof taskFormSchema>

interface AddTaskModalProps {
  onAddTask?: (task: Task) => void
  trigger?: React.ReactNode
}

export function AddTaskModal({ onAddTask, trigger }: AddTaskModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>({
    id: "",
    title: "",
    birth_date: "",
    gender: "Homme",
    phone: "",
    description: "",
    status: "completed",
    category: "dossier",
    priority: "normal",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const generateTaskId = () => {
    const prefix = "PAT"
    const number = Math.floor(Math.random() * 900) + 100
    return `${prefix}-${number}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Format Patient Name: LAST NAME IN UPPERCASE, First Name Capitalized
      const formattedTitle = formatPatientName(formData.title)

      const validatedData = taskFormSchema.parse({
        ...formData,
        title: formattedTitle,
        id: generateTaskId(),
      })

      const genderBadge = formData.gender === "Femme" ? "👩 Femme" : "👨 Homme"

      const newTask: Task = {
        id: validatedData.id,
        name: validatedData.title,
        birth_date: formData.birth_date,
        age: calculateAge(formData.birth_date) ?? undefined,
        phone: formData.phone,
        title: `${validatedData.title} (${formatPatientAge(formData.birth_date)} • ${genderBadge}) • Tél: ${formatPhoneNumber(formData.phone) || "Non renseigné"}`,
        status: "completed",
        category: "dossier",
        priority: "normal",
      }

      onAddTask?.(newTask)

      setFormData({
        id: "",
        title: "",
        birth_date: "",
        gender: "Homme",
        phone: "",
        description: "",
        status: "completed",
        category: "dossier",
        priority: "normal",
      })
      setErrors({})
      setOpen(false)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(newErrors)
      }
    }
  }

  const handleCancel = () => {
    setFormData({
      id: "",
      title: "",
      birth_date: "",
      gender: "Homme",
      phone: "",
      description: "",
      status: "completed",
      category: "dossier",
      priority: "normal",
    })
    setErrors({})
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm" className="cursor-pointer font-bold bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" />
            + Nouveau Patient
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <UserPlus className="w-5 h-5" />
            Créer un Dossier Patient
          </DialogTitle>
          <DialogDescription>
            Enregistrez un nouveau patient (Nom en MAJUSCULE, Prénom, Sexe, Âge et contact).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Patient Name */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="font-semibold text-xs">Nom & Prénom du Patient *</Label>
            <Input
              id="title"
              placeholder="ex: Dupuis Alexandre"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={errors.title ? "border-red-500" : ""}
              required
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Gender & Age inputs side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gender" className="font-semibold text-xs">Sexe du Patient</Label>
              <Select
                value={formData.gender}
                onValueChange={(val) => setFormData(prev => ({ ...prev, gender: val }))}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Sélectionner le sexe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Homme">👨 Homme</SelectItem>
                  <SelectItem value="Femme">👩 Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
          <BirthDateFields id="legacy_patient" value={formData.birth_date || ""} onChange={value => setFormData(prev => ({ ...prev, birth_date: value }))} />

          {/* Phone input */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1 font-semibold text-xs">
              <Phone className="w-3.5 h-3.5 text-primary" /> Contact Téléphone
            </Label>
            <Input type="tel"
              id="phone"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          {/* Task Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="font-semibold text-xs">Obs. & Antécédents Médicaux</Label>
            <Textarea
              id="description"
              placeholder="Antécédents chirurgicaux, allergies, observations..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel} className="cursor-pointer">
              Annuler
            </Button>
            <Button type="submit" className="cursor-pointer bg-primary text-primary-foreground font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer le Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
