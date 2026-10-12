"use client"

import * as React from "react"
import { useThemeSettingsStore } from "@/stores/theme-settings-store"

export interface SidebarConfig {
  variant: "sidebar" | "floating" | "inset"
  collapsible: "offcanvas" | "icon" | "none"
  side: "left" | "right"
}

export interface SidebarContextValue {
  config: SidebarConfig
  updateConfig: (config: Partial<SidebarConfig>) => void
}

export const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function SidebarConfigProvider({ children }: { children: React.ReactNode }) {
  const sidebarConfig = useThemeSettingsStore((s) => s.sidebar)
  const updateSidebarStore = useThemeSettingsStore((s) => s.updateSidebar)

  const updateConfig = React.useCallback((newConfig: Partial<SidebarConfig>) => {
    updateSidebarStore(newConfig)
  }, [updateSidebarStore])

  return (
    <SidebarContext.Provider value={{ config: sidebarConfig, updateConfig }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarConfig() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarConfig must be used within a SidebarConfigProvider")
  }
  return context
}
