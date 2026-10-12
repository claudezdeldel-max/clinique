"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Printer,
  FileText,
  Activity,
  Calendar,
  Stethoscope,
  Download,
  Eye,
  Pill,
  ShieldCheck,
  ZoomIn,
  SunMedium,
  Sparkles,
  Edit3,
  Check
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { type Mail } from "@/app/mail/data"
import { PrescriptionModal } from "@/components/prescription-modal"
import { UploadScanModal } from "@/components/upload-scan-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface MailDisplayProps {
  mail: Mail | null
  onUploadScan?: (patientId: string, imageSrc: string, examType: string, note?: string) => void
  onUpdateReport?: (patientId: string, reportText: string) => void
}

export function MailDisplay({ mail, onUploadScan, onUpdateReport }: MailDisplayProps) {
  const [invertDicom, setInvertDicom] = useState(false)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [isEditingReport, setIsEditingReport] = useState(false)
  const [editedReportText, setEditedReportText] = useState("")

  useEffect(() => {
    if (mail) {
      setEditedReportText(mail.reportText)
      setIsEditingReport(false)
    }
  }, [mail])

  if (!mail) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        Aucun dossier patient sélectionné.
      </div>
    )
  }

  const handleScanUploaded = (newImageSrc: string, examType: string, note?: string) => {
    if (onUploadScan) {
      onUploadScan(mail.id, newImageSrc, examType, note)
    }
  }

  const handleSaveReport = () => {
    if (onUpdateReport) {
      onUpdateReport(mail.id, editedReportText)
    }
    setIsEditingReport(false)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Action Header */}
      <div className="flex items-center p-3 justify-between border-b gap-2 flex-wrap bg-background/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-xs border-primary/30">
            <Activity className="h-3.5 w-3.5 text-primary" />
            {mail.examType}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Ref: {mail.id}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Unique Single Upload Scan Button */}
          <UploadScanModal
            patientName={mail.name}
            onUploadSuccess={handleScanUploaded}
          />

          {/* Prescription Modal Button */}
          <PrescriptionModal
            patientName={mail.name}
            patientAge={mail.age}
            patientGender={mail.gender}
            socialSecNo={mail.socialSecNo}
            triggerButton={
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm">
                <Printer className="h-4 w-4" />
                Imprimer Ordonnance
              </Button>
            }
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Patient & Doctor Header Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/30 shadow-xs">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20 bg-primary/10 text-primary font-bold">
              <AvatarFallback>{mail.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{mail.name}</h2>
                <Badge variant="outline" className="text-xs">{mail.age} ans • {mail.gender}</Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                N° Sécurité Sociale: <strong className="text-foreground">{mail.socialSecNo}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prescripteur: <span className="font-semibold text-foreground">{mail.doctor}</span>
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="flex items-center justify-end gap-1.5 font-medium text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(new Date(mail.date), "PPpp", { locale: fr })}
            </div>
            <div className="flex items-center justify-end gap-1 text-emerald-600 font-semibold mt-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Télétransmis CPAM
            </div>
          </div>
        </div>

        {/* Radiology Image Scan Viewer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Cliché Radiologique (DICOM / HD Viewer)
            </h3>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 cursor-pointer"
                onClick={() => setInvertDicom(!invertDicom)}
              >
                <SunMedium className="h-3.5 w-3.5" />
                {invertDicom ? "Filtre Normal" : "Mode Contraste DICOM"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                onClick={() => setFullscreenOpen(true)}
              >
                <ZoomIn className="h-3.5 w-3.5" />
                Plein Écran
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 cursor-pointer">
                <Download className="h-3.5 w-3.5" />
                DICOM
              </Button>
            </div>
          </div>

          <div
            className={`relative rounded-xl overflow-hidden border shadow-sm group min-h-[300px] max-h-[380px] bg-black flex justify-center items-center cursor-pointer transition-all ${
              invertDicom ? "invert contrast-125" : ""
            }`}
            onClick={() => setFullscreenOpen(true)}
          >
            <img
              src={mail.imageUrl}
              alt={mail.examType}
              className="w-full h-[360px] object-contain group-hover:scale-[1.02] transition-transform duration-300"
            />
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Zoom & Inspection HD</span>
            </div>
            <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              <span>{mail.examType} — Cliché d'Imagerie Haute Définition</span>
            </div>
          </div>
        </div>

        {/* Compte-Rendu Radiologique Detailed Text (With Direct Edit Option) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Compte-Rendu Radiologique Officiel
            </h3>
            {isEditingReport ? (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs cursor-pointer" onClick={handleSaveReport}>
                <Check className="h-3.5 w-3.5" />
                Enregistrer le Compte-Rendu
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs cursor-pointer" onClick={() => setIsEditingReport(true)}>
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                Modifier le Compte-Rendu
              </Button>
            )}
          </div>

          {isEditingReport ? (
            <div className="space-y-2">
              <Textarea
                value={editedReportText}
                onChange={(e) => setEditedReportText(e.target.value)}
                rows={8}
                className="font-sans text-xs leading-relaxed p-4 rounded-xl border border-primary/40 focus:border-primary bg-background"
                placeholder="Rédigez ou modifiez le compte-rendu radiologique officiel..."
              />
              <p className="text-[11px] text-muted-foreground italic">
                Saisissez les observations cliniques, conclusions et résultats d'examen.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border bg-card space-y-3 text-xs leading-relaxed font-sans whitespace-pre-line text-foreground shadow-xs">
              {mail.reportText}
            </div>
          )}

          <div className="flex justify-end items-center gap-2 text-xs text-muted-foreground pt-1">
            <Stethoscope className="h-3.5 w-3.5 text-primary" />
            <span>Rédigé et signé par le <strong>Prof. Marc Laurent</strong> (Spécialiste Radiologue)</span>
          </div>
        </div>

        <Separator />

        {/* Prescribed Medications & Prescription Printing Card */}
        <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <Pill className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Ordonnance Médicale Rattachée</h4>
                <p className="text-xs text-muted-foreground">Prescription du médecin radiologue pour ce patient</p>
              </div>
            </div>
            <PrescriptionModal
              patientName={mail.name}
              patientAge={mail.age}
              patientGender={mail.gender}
              socialSecNo={mail.socialSecNo}
              triggerButton={
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm text-xs">
                  <Printer className="h-4 w-4" />
                  Imprimer l'Ordonnance
                </Button>
              }
            />
          </div>

          <div className="space-y-2">
            {mail.prescription.medications.map((med, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-zinc-900 text-xs">
                <div>
                  <span className="font-bold text-foreground">{med.name}</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{med.dosage} • Posologie: {med.posology}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Durée: {med.duration}
                </Badge>
              </div>
            ))}
          </div>

          {mail.prescription.instructions && (
            <p className="text-xs text-muted-foreground italic bg-background/60 p-2.5 rounded-lg border">
              <strong>Consignes:</strong> {mail.prescription.instructions}
            </p>
          )}
        </div>
      </div>

      {/* Fullscreen Scan Inspection Dialog (Maximized viewport width & height for maximum scan visibility) */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[98vw] sm:max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh] bg-black/95 border-zinc-800 text-white p-4 sm:p-6 flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white flex items-center justify-between pr-6 text-base font-bold">
              <span>{mail.name} — {mail.examType} (Cliché DICOM Haute Définition)</span>
            </DialogTitle>
          </DialogHeader>
          <div className={`relative flex-1 w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden ${invertDicom ? "invert contrast-125" : ""}`}>
            <img src={mail.imageUrl} alt={mail.examType} className="w-full h-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
