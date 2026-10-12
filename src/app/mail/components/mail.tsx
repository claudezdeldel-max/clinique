"use client"

import * as React from "react"
import {
  FileText,
  Search,
  Scan,
  Activity,
  CheckCircle2,
  FileCheck,
  Stethoscope,
  Users
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccountSwitcher } from "@/app/mail/components/account-switcher"
import { MailDisplay } from "@/app/mail/components/mail-display"
import { MailList } from "@/app/mail/components/mail-list"
import { Nav } from "@/app/mail/components/nav"
import { type Mail } from "@/app/mail/data"
import { useMail } from "@/app/mail/use-mail"
import { PrescriptionModal } from "@/components/prescription-modal"

interface MailProps {
  accounts: {
    label: string
    email: string
    icon: React.ReactNode
  }[]
  mails: Mail[]
  defaultLayout?: number[]
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

export function Mail({
  accounts,
  mails,
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [mail] = useMail()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mailsList, setMailsList] = React.useState<Mail[]>(mails)

  React.useEffect(() => {
    setMailsList(mails)
  }, [mails])

  const selectedPatient = mailsList.find((item) => item.id === mail.selected) || mailsList[0]

  const filteredMails = mailsList.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.examType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.socialSecNo.includes(searchTerm)
  )

  const handleUploadScan = (patientId: string, imageSrc: string, examType: string, note?: string) => {
    setMailsList(prev => prev.map(p => {
      if (p.id === patientId || p.id === selectedPatient?.id) {
        return {
          ...p,
          imageUrl: imageSrc,
          examType: examType || p.examType,
          reportText: note ? `COMPTE-RENDU MIS À JOUR:\n${note}\n\n${p.reportText}` : p.reportText,
          date: new Date().toISOString()
        }
      }
      return p
    }))
  }

  const handleUpdateReport = (patientId: string, newReportText: string) => {
    setMailsList(prev => prev.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          reportText: newReportText,
          date: new Date().toISOString()
        }
      }
      return p
    }))
  }

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(sizes)}`
        }}
        className="h-full items-stretch rounded-lg border overflow-hidden bg-background"
      >
        {/* Left Panel: Unit & Folder Navigation */}
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={22}
          onCollapse={() => {
            setIsCollapsed(true)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)}`
          }}
          onResize={() => {
            setIsCollapsed(false)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)}`
          }}
          className={cn(isCollapsed && "w-full transition-all duration-300 ease-in-out")}
        >
          <div
            className={cn(
              "flex h-[52px] items-center justify-center",
              isCollapsed ? "h-[52px]" : "px-2"
            )}
          >
            <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} />
          </div>
          <Separator className="mx-0" />
          <div className="m-3">
            <PrescriptionModal
              patientName={selectedPatient?.name}
              patientAge={selectedPatient?.age}
              patientGender={selectedPatient?.gender}
              socialSecNo={selectedPatient?.socialSecNo}
            />
          </div>
          <Separator className="mx-0" />
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: "Tous les Dossiers",
                label: `${mailsList.length}`,
                icon: Users,
                variant: "default",
              },
              {
                title: "IRM 3T",
                label: "1",
                icon: Scan,
                variant: "ghost",
              },
              {
                title: "Scanner CT",
                label: "1",
                icon: Activity,
                variant: "ghost",
              },
              {
                title: "Comptes-Rendus Validés",
                label: `${mailsList.length}`,
                icon: CheckCircle2,
                variant: "ghost",
              },
              {
                title: "Ordonnances Émises",
                label: `${mailsList.length}`,
                icon: FileCheck,
                variant: "ghost",
              },
            ]}
          />
          <Separator className="mx-0" />
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: "Télétransmission CPAM",
                label: "Actif",
                icon: FileText,
                variant: "ghost",
              },
              {
                title: "Service Radiologie",
                label: "Garde 24h",
                icon: Stethoscope,
                variant: "ghost",
              },
            ]}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle Panel: Patient List */}
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <Tabs defaultValue="all" className="gap-1 flex flex-col h-full">
            <div className="flex items-center px-4 py-3 justify-between">
              <h1 className="text-foreground text-base font-bold flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                Dossiers Patients
              </h1>
            </div>
            <Separator />
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 p-3 backdrop-blur">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4 cursor-pointer" />
                <Input
                  placeholder="Rechercher patient, N° Sécu, examen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 cursor-text text-xs"
                />
              </div>
            </div>
            <TabsContent value="all" className="m-0 flex-1 overflow-y-auto">
              <MailList items={filteredMails} />
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Selected Patient Record & Radiology Viewer */}
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={30}>
          <MailDisplay
            mail={selectedPatient}
            onUploadScan={handleUploadScan}
            onUpdateReport={handleUpdateReport}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
