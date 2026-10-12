"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatPatientName, formatPhoneNumber } from "@/lib/utils"
import { UserCheck, ShieldCheck, Phone } from "lucide-react"

import type { Task } from "../data/schema"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"

export const columns: ColumnDef<Task>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Sélectionner tout"
        className="translate-y-[2px] cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Sélectionner la ligne"
        className="translate-y-[2px] cursor-pointer"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <div className="w-[60px] font-mono text-xs font-bold text-primary">{String(row.getValue("id"))}</div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nom & Prénom" />
    ),
    cell: ({ row }) => {
      const rawName = row.getValue("name") as string
      const formattedName = formatPatientName(rawName)
      return (
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="max-w-[250px] truncate font-bold text-foreground text-sm">
            {formattedName}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Âge" />
    ),
    cell: ({ row }) => {
      const age = row.getValue("age")
      return <span className="font-semibold text-sm">{age ? `${age} ans` : "—"}</span>
    },
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sexe" />
    ),
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string
      if (!gender) return <span className="text-muted-foreground">—</span>
      return (
        <Badge variant="outline" className={`text-xs font-semibold ${gender === "Femme" ? "bg-pink-500/10 text-pink-600 border-pink-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
          {gender === "Femme" ? "👩 F" : "👨 H"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Téléphone" />
    ),
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string
      return (
        <div className="flex items-center gap-1 text-xs font-medium">
          <Phone className="h-3 w-3 text-primary" />
          {formatPhoneNumber(phone) || "—"}
        </div>
      )
    },
  },
  {
    accessorKey: "social_sec_no",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="N° Sécu" />
    ),
    cell: ({ row }) => {
      const ssn = row.getValue("social_sec_no") as string
      return <span className="font-mono text-[11px] text-muted-foreground">{ssn || "—"}</span>
    },
  },
  {
    accessorKey: "prescribing_doctor",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Médecin Prescripteur" />
    ),
    cell: ({ row }) => {
      const doc = row.getValue("prescribing_doctor") as string
      return <span className="text-xs font-medium">{doc || "—"}</span>
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Enregistré le" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      return <span className="text-xs text-muted-foreground">{date || "—"}</span>
    },
  },
  {
    id: "dossier_status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statut" />
    ),
    cell: () => (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold gap-1">
        <UserCheck className="w-3 h-3" />
        Actif
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
