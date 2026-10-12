import type { ThemePreset } from '@/types/theme-customizer'
import { mediscanPreset } from '@/utils/mediscan-theme-preset'

export type DesignStyleId = 'default' | 'mediscan'
export type AccentVariantId = 'ocean' | 'emerald' | 'gold' | 'health'

export interface AccentVariant {
  id: AccentVariantId
  name: string
  from: string
  to: string
  primary: string
  ring: string
}

export interface DesignStyle {
  id: DesignStyleId
  name: string
  description: string
  preset?: ThemePreset
  accents?: AccentVariant[]
}

export const accentVariants: AccentVariant[] = [
  {
    id: 'ocean',
    name: 'Océan',
    from: '#0ea5e9',
    to: '#6366f1',
    primary: 'oklch(0.646 0.222 220)',
    ring: '#0ea5e9',
  },
  {
    id: 'emerald',
    name: 'Émeraude & Or',
    from: '#059669',
    to: '#fbbf24',
    primary: 'oklch(0.55 0.18 160)',
    ring: '#059669',
  },
  {
    id: 'gold',
    name: 'Or',
    from: '#fbbf24',
    to: '#f59e0b',
    primary: 'oklch(0.75 0.18 80)',
    ring: '#f59e0b',
  },
  {
    id: 'health',
    name: 'Santé',
    from: '#10b981',
    to: '#0ea5e9',
    primary: 'oklch(0.65 0.2 165)',
    ring: '#10b981',
  },
]

export const designStyles: DesignStyle[] = [
  {
    id: 'default',
    name: 'Default (shadcn)',
    description: 'Style standard shadcn/ui avec coins modulables et bordures fines.',
  },
  {
    id: 'mediscan',
    name: 'CIMA (MediScan)',
    description: 'Tableau de bord CIMA et navigation Finance, avec des libellés courts.',
    preset: mediscanPreset,
    accents: accentVariants,
  },
]
