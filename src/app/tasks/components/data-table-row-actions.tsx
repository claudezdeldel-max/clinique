"use client"

import type { Row } from "@tanstack/react-table"
import { MoreHorizontal, Trash2, Copy } from "lucide-react"
import { toast } from "sonner"
import { copyText } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { taskSchema } from "../data/schema"

const API_BASE = '/api'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const task = taskSchema.parse(row.original)

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/${task.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Patient ${task.name || task.title} supprimé`)
        window.location.reload()
      }
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleCopyId = async () => {
    try { await copyText(String(task.id)); toast.success(`Code patient ${task.id} copié`) }
    catch (err) { toast.error((err as Error).message) }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted cursor-pointer"
        >
          <MoreHorizontal />
          <span className="sr-only">Menu actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem className="cursor-pointer" onClick={handleCopyId}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copier le Code
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Supprimer
          <DropdownMenuShortcut className="text-destructive">⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
