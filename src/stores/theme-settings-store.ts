import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DesignStyleId, AccentVariantId } from '@/config/design-styles'
import type { SidebarConfig } from '@/contexts/sidebar-context'
import type { ImportedTheme } from '@/types/theme-customizer'

export interface ThemeSettingsState {
  designStyle: DesignStyleId
  accent: AccentVariantId
  colorSource: 'design' | 'shadcn' | 'tweakcn' | 'imported' | null
  presetKey: string
  radius: string
  importedTheme: ImportedTheme | null
  brandOverrides: Record<string, string>
  sidebar: SidebarConfig

  setDesignStyle: (design: DesignStyleId) => void
  setAccent: (accent: AccentVariantId) => void
  setShadcnPreset: (key: string) => void
  setTweakcnPreset: (key: string) => void
  setImportedTheme: (theme: ImportedTheme | null) => void
  setRadius: (radius: string) => void
  setBrandOverrides: (overrides: Record<string, string>) => void
  updateSidebar: (sidebar: Partial<SidebarConfig>) => void
  resetAll: () => void
}

const defaultSidebar: SidebarConfig = {
  variant: 'inset',
  collapsible: 'offcanvas',
  side: 'left',
}

export const useThemeSettingsStore = create<ThemeSettingsState>()(
  persist(
    (set) => ({
      designStyle: 'default',
      accent: 'ocean',
      colorSource: null,
      presetKey: '',
      radius: '0.625rem',
      importedTheme: null,
      brandOverrides: {},
      sidebar: defaultSidebar,

      setDesignStyle: (designStyle) =>
        set((state) => ({
          designStyle,
          colorSource: designStyle === 'mediscan' ? 'design' : state.colorSource,
          sidebar: designStyle === 'mediscan' ? { ...state.sidebar, variant: 'sidebar' } : state.sidebar,
        })),

      setAccent: (accent) => set({ accent }),

      setShadcnPreset: (presetKey) =>
        set({
          colorSource: 'shadcn',
          presetKey,
          importedTheme: null,
          brandOverrides: {},
        }),

      setTweakcnPreset: (presetKey) =>
        set({
          colorSource: 'tweakcn',
          presetKey,
          importedTheme: null,
          brandOverrides: {},
        }),

      setImportedTheme: (importedTheme) =>
        set({
          colorSource: 'imported',
          importedTheme,
          presetKey: '',
          brandOverrides: {},
        }),

      setRadius: (radius) => set({ radius }),

      setBrandOverrides: (brandOverrides) => set({ brandOverrides }),

      updateSidebar: (partial) =>
        set((state) => ({
          sidebar: { ...state.sidebar, ...partial },
        })),

      resetAll: () =>
        set({
          designStyle: 'default',
          accent: 'ocean',
          colorSource: null,
          presetKey: '',
          radius: '0.625rem',
          importedTheme: null,
          brandOverrides: {},
          sidebar: defaultSidebar,
        }),
    }),
    {
      name: 'clinique-theme-settings',
    }
  )
)
