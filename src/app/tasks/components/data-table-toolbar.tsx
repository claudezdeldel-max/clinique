"use client"

import type { Table } from "@tanstack/react-table"
import { RefreshCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/app/tasks/components/data-table-view-options"
import { AddTaskModal } from "./add-task-modal"
import type { Task } from "../data/schema"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  onAddTask?: (task: Task) => void
}

export function DataTableToolbar<TData>({
  table,
  onAddTask,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
      <div className="flex flex-1 items-center space-x-2 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, code patient ou téléphone..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="pl-9 h-10 w-full cursor-text"
          />
        </div>

        {isFiltered && (
          <Button
            variant="outline"
            onClick={() => table.resetColumnFilters()}
            className="px-3 h-10 cursor-pointer gap-1.5"
          >
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
        <DataTableViewOptions table={table} />
        <AddTaskModal onAddTask={onAddTask} />
      </div>
    </div>
  )
}
