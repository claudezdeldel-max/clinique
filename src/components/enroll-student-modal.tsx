"use client"

import { useState } from "react"
import { Calendar, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSchoolData } from "@/hooks/use-school-data"

export function EnrollStudentModal() {
  const [open, setOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedClass, setSelectedClass] = useState("")

  const { students, classes, enrollInCourse } = useSchoolData()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !selectedClass) return

    const studentObj = students.find(s => s.id.toString() === selectedStudent)
    const classObj = classes.find(c => c.id.toString() === selectedClass)

    await enrollInCourse({
      student_id: parseInt(selectedStudent),
      student_name: studentObj ? studentObj.name : "Patient",
      class_id: parseInt(selectedClass),
      class_name: classObj ? classObj.name : "IRM 3T",
    })

    setSelectedStudent("")
    setSelectedClass("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="cursor-pointer gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Programmer RDV Examen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              Programmer un Examen Médical
            </DialogTitle>
            <DialogDescription>
              Planifiez la plage horaire d'examen et affectez le patient à une salle d'imagerie.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student" className="text-right text-xs">
                Patient
              </Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="col-span-3 cursor-pointer">
                  <SelectValue placeholder="Sélectionner patient" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()} className="cursor-pointer">
                      {student.name} ({student.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right text-xs">
                Examen & Salle
              </Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="col-span-3 cursor-pointer">
                  <SelectValue placeholder="Sélectionner équipement" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="cursor-pointer">
                      {cls.name} - {cls.room} ({cls.teacher})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full cursor-pointer">
              Valider le Rendez-Vous Examen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
