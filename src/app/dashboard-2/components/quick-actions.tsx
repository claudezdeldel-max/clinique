import { BirthDateFields } from '@/components/patients/birth-date-fields'
import { calculateAge } from '@/lib/utils'
"use client"

import { useState } from "react"
import { UserPlus, Settings, FileText, Download, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSchoolData } from "@/hooks/use-school-data"
import { AddPaymentModal } from "@/components/add-payment-modal"
import { EnrollStudentModal } from "@/components/enroll-student-modal"

export function QuickActions() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [grade, setGrade] = useState("IRM Cérébrale 3T")
  const [birthDate, setBirthDate] = useState("")
  const [phone, setPhone] = useState("")
  const { addStudent } = useSchoolData()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await addStudent({ name, email, grade: String(calculateAge(birthDate) ?? ''), birth_date: birthDate, requested_exam: grade, parent_phone: phone })
    setName("")
    setEmail("")
    setPhone("")
    setBirthDate("")
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. Nouveau Patient */}
      <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setName(""); setEmail(""); setPhone(""); setBirthDate("") } }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="cursor-pointer gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Nouveau Patient
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Enregistrer un Nouveau Patient
              </DialogTitle>
              <DialogDescription>
                Ajouter un patient dans la base RadioMed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-xs">
                  Nom & Prénom
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Jean Dupont"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="j.dupont@email.com"
                  className="col-span-3"
                />
              </div>
              <BirthDateFields id="quick_patient" value={birthDate} onChange={setBirthDate} />
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="grade" className="text-right text-xs">
                  Type d'Examen
                </Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner l'examen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IRM Cérébrale 3T">IRM Cérébrale 3T</SelectItem>
                    <SelectItem value="Scanner CT Abdominal">Scanner CT Abdominal</SelectItem>
                    <SelectItem value="Échographie Doppler">Échographie Doppler</SelectItem>
                    <SelectItem value="Radiographie Osseuse X">Radiographie Osseuse X</SelectItem>
                    <SelectItem value="Mammographie 3D">Mammographie 3D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right text-xs">
                  Téléphone
                </Label>
                <Input type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Programmer RDV Examen */}
      <EnrollStudentModal />

      {/* 3. Règlement Examen & Ticket */}
      <AddPaymentModal />

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer">
            <FileText className="h-4 w-4 mr-2" />
            Transmettre comptes-rendus
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            Exporter la base
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres équipements
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
