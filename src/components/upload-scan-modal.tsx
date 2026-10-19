"use client"

import { useState, useRef } from "react"
import { Upload, Image as ImageIcon, CheckCircle2, FileUp, Scan } from "lucide-react"
import { toast } from 'sonner'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UploadScanModalProps {
  patientName?: string
  onUploadSuccess: (newImageSrc: string, examType: string, reportNote?: string) => void
  triggerButton?: React.ReactNode
}

export function UploadScanModal({ patientName, onUploadSuccess, triggerButton }: UploadScanModalProps) {
  const [open, setOpen] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [examType, setExamType] = useState("IRM Cérébrale 3T")
  const [reportNote, setReportNote] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imagePreview) return

    try {
      // Upload to server
      const res = await fetch('/api/scans/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: imagePreview, filename: `scan-${Date.now()}.png` }),
      })
      if (res.ok) {
        const { url } = await res.json()
        onUploadSuccess(url, examType, reportNote)
      } else {
        const error = await res.json().catch(() => ({ error: 'Enregistrement impossible.' }))
        throw new Error(error.error)
      }
    } catch (err) {
      toast.error((err as Error).message || 'Le serveur est indisponible. Le fichier est conservé pour réessayer.')
      return
    }

    setOpen(false)
    setImagePreview(null)
    setReportNote("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-medium shadow-sm">
            <Upload className="h-4 w-4" />
            Uploader Radio / Cliché HD
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Scan className="h-5 w-5 text-emerald-600" />
              Uploader une Radiographie / Cliché DICOM
            </DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau cliché d'imagerie pour {patientName ? <strong className="text-foreground">{patientName}</strong> : "ce patient"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* File Upload Area */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Sélectionner le Cliché (JPG, PNG, DICOM)</Label>
              
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging ? "border-emerald-500 bg-emerald-50/20" : "border-border hover:border-emerald-500/50 bg-muted/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />

                {imagePreview ? (
                  <div className="relative w-full max-h-48 rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                    <img src={imagePreview} alt="Aperçu Radio" className="max-h-48 object-contain" />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <CheckCircle2 className="h-3 w-3" /> Cliché Prêt
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full">
                      <FileUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Cliquez ou glissez un fichier ici</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Formats acceptés: Radiographies, Scanner CT, IRM HD (Max 25 Mo)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Exam Type Select */}
            <div className="space-y-2">
              <Label htmlFor="exam-type" className="text-xs font-semibold">Type d'Examen Radiologique</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger className="w-full text-xs cursor-pointer">
                  <SelectValue placeholder="Sélectionner l'acte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IRM Cérébrale 3T" className="text-xs cursor-pointer">IRM Cérébrale 3T</SelectItem>
                  <SelectItem value="Scanner CT Abdominal" className="text-xs cursor-pointer">Scanner CT Abdominaux-Pelvien</SelectItem>
                  <SelectItem value="Échographie Doppler" className="text-xs cursor-pointer">Échographie Doppler Vasculaire</SelectItem>
                  <SelectItem value="Radiographie X Thoracique" className="text-xs cursor-pointer">Radiographie X Thoracique</SelectItem>
                  <SelectItem value="Mammographie 3D" className="text-xs cursor-pointer">Mammographie 3D Tomosynthèse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold">Note / Compte-Rendu Complémentaire</Label>
              <Textarea
                id="notes"
                placeholder="Ajoutez une note d'observation sur ce nouveau cliché..."
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer text-xs">
              Annuler
            </Button>
            <Button type="submit" disabled={!imagePreview} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs gap-1.5">
              <ImageIcon className="h-4 w-4" />
              Valider & Associer le Cliché
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
