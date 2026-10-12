import React, { useEffect } from 'react'
import { useThemeSettingsStore } from '@/stores/theme-settings-store'
import { useTheme } from '@/hooks/use-theme'
import { designStyles, accentVariants } from '@/config/design-styles'
import { colorThemes, tweakcnThemes } from '@/config/theme-data'

export function ThemeBootstrap() {
  const { theme } = useTheme()
  const {
    designStyle,
    accent,
    colorSource,
    presetKey,
    radius,
    importedTheme,
    brandOverrides,
  } = useThemeSettingsStore()

  const isDarkMode = React.useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    const root = document.documentElement

    // Set data-design and data-accent attributes
    root.setAttribute('data-design', designStyle)
    root.setAttribute('data-accent', accent || '')

    // Clear previous theme inline variables if switching to default
    if (designStyle === 'default' && !colorSource) {
      const inlineStyles = root.style
      for (let i = inlineStyles.length - 1; i >= 0; i--) {
        const property = inlineStyles[i]
        if (property.startsWith('--') && property !== '--radius') {
          root.style.removeProperty(property)
        }
      }
    }

    // Determine current base style variables
    let stylesToApply: Record<string, string> = {}

    if (designStyle === 'mediscan') {
      const mediscanStyle = designStyles.find((d) => d.id === 'mediscan')
      if (mediscanStyle?.preset) {
        stylesToApply = isDarkMode
          ? mediscanStyle.preset.styles.dark
          : mediscanStyle.preset.styles.light
      }

      // Apply selected accent variant
      const selectedAccent = accentVariants.find((a) => a.id === accent) || accentVariants[0]
      stylesToApply = {
        ...stylesToApply,
        'brand-from': selectedAccent.from,
        'brand-to': selectedAccent.to,
        primary: selectedAccent.primary,
        ring: selectedAccent.ring,
      }
    }

    // Override with colorSource if selected
    if (colorSource === 'shadcn' && presetKey) {
      const found = colorThemes.find((t) => t.value === presetKey)
      if (found?.preset) {
        stylesToApply = {
          ...stylesToApply,
          ...(isDarkMode ? found.preset.styles.dark : found.preset.styles.light),
        }
      }
    } else if (colorSource === 'tweakcn' && presetKey) {
      const found = tweakcnThemes.find((t) => t.value === presetKey)
      if (found?.preset) {
        stylesToApply = {
          ...stylesToApply,
          ...(isDarkMode ? found.preset.styles.dark : found.preset.styles.light),
        }
      }
    } else if (colorSource === 'imported' && importedTheme) {
      const importedVars = isDarkMode ? importedTheme.dark : importedTheme.light
      stylesToApply = {
        ...stylesToApply,
        ...importedVars,
      }
    }

    // Apply radius
    if (radius) {
      stylesToApply['radius'] = radius
    }

    // Apply brand overrides if present
    Object.entries(brandOverrides).forEach(([key, val]) => {
      if (val) {
        stylesToApply[key.replace(/^--/, '')] = val
      }
    })

    // Apply all computed CSS variables to documentElement
    Object.entries(stylesToApply).forEach(([key, val]) => {
      root.style.setProperty(`--${key}`, val)
    })
  }, [designStyle, accent, colorSource, presetKey, radius, importedTheme, brandOverrides, isDarkMode])

  return null
}
