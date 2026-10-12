import type { ThemePreset } from '@/types/theme-customizer'

export const mediscanPreset: ThemePreset = {
  label: "MediScan Pro",
  styles: {
    light: {
      background: "oklch(0.985 0.005 240)", // #f8fafc
      foreground: "oklch(0.145 0.02 240)",  // #0f172a
      card: "oklch(1 0 0)",                 // #ffffff
      "card-foreground": "oklch(0.145 0.02 240)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0.02 240)",
      primary: "oklch(0.646 0.222 220)",    // #0ea5e9
      "primary-foreground": "oklch(1 0 0)",
      secondary: "oklch(0.96 0.01 240)",    // #f1f5f9
      "secondary-foreground": "oklch(0.25 0.02 240)",
      muted: "oklch(0.96 0.01 240)",
      "muted-foreground": "oklch(0.52 0.02 240)", // #64748b
      accent: "oklch(0.93 0.04 220)",       // #e0f2fe
      "accent-foreground": "oklch(0.25 0.05 220)",
      destructive: "oklch(0.6 0.22 25)",    // #ef4444
      "destructive-foreground": "oklch(1 0 0)",
      border: "oklch(0.92 0.01 240)",       // #e2e8f0
      input: "oklch(0.92 0.01 240)",
      ring: "oklch(0.646 0.222 220)",
      "chart-1": "oklch(0.646 0.222 220)",
      "chart-2": "oklch(0.58 0.2 270)",
      "chart-3": "oklch(0.68 0.18 160)",
      "chart-4": "oklch(0.75 0.18 80)",
      "chart-5": "oklch(0.65 0.2 300)",
      sidebar: "oklch(0.145 0.02 240)",     // #0f172a
      "sidebar-foreground": "oklch(0.85 0.02 240)", // #cbd5e1
      "sidebar-primary": "oklch(0.646 0.222 220)",
      "sidebar-primary-foreground": "oklch(1 0 0)",
      "sidebar-accent": "oklch(0.22 0.03 240)",    // #1e293b
      "sidebar-accent-foreground": "oklch(1 0 0)",
      "sidebar-border": "rgba(255, 255, 255, 0.08)",
      "sidebar-ring": "oklch(0.646 0.222 220)",
      "brand-from": "#0ea5e9",
      "brand-to": "#6366f1",
      success: "#10b981",
      warning: "#f59e0b",
      info: "#06b6d4",
      "shadow-card": "0 4px 20px rgba(0,0,0,0.04)",
      "shadow-card-lg": "0 12px 30px rgba(0,0,0,0.08)",
      radius: "0.875rem",
      "font-sans": "'Inter', system-ui, sans-serif",
    },
    dark: {
      background: "oklch(0.11 0.02 240)",   // #0a0f1c
      foreground: "oklch(0.96 0.01 240)",   // #f1f5f9
      card: "oklch(0.16 0.03 240)",         // #131c2f
      "card-foreground": "oklch(0.96 0.01 240)",
      popover: "oklch(0.16 0.03 240)",
      "popover-foreground": "oklch(0.96 0.01 240)",
      primary: "oklch(0.646 0.222 220)",
      "primary-foreground": "oklch(1 0 0)",
      secondary: "oklch(0.2 0.03 240)",     // #1a2540
      "secondary-foreground": "oklch(0.96 0.01 240)",
      muted: "oklch(0.2 0.03 240)",
      "muted-foreground": "oklch(0.68 0.02 240)", // #94a3b8
      accent: "oklch(0.24 0.04 240)",        // #1e2a45
      "accent-foreground": "oklch(0.96 0.01 240)",
      destructive: "oklch(0.6 0.22 25)",
      "destructive-foreground": "oklch(1 0 0)",
      border: "oklch(0.22 0.03 240)",       // #1e293b
      input: "oklch(0.25 0.03 240)",        // #243043
      ring: "oklch(0.646 0.222 220)",
      "chart-1": "oklch(0.646 0.222 220)",
      "chart-2": "oklch(0.68 0.2 270)",
      "chart-3": "oklch(0.68 0.18 160)",
      "chart-4": "oklch(0.75 0.18 80)",
      "chart-5": "oklch(0.65 0.2 300)",
      sidebar: "oklch(0.11 0.02 240)",      // #0a0f1c
      "sidebar-foreground": "oklch(0.85 0.02 240)",
      "sidebar-primary": "oklch(0.646 0.222 220)",
      "sidebar-primary-foreground": "oklch(1 0 0)",
      "sidebar-accent": "oklch(0.24 0.04 240)",
      "sidebar-accent-foreground": "oklch(1 0 0)",
      "sidebar-border": "#1e293b",
      "sidebar-ring": "oklch(0.646 0.222 220)",
      "brand-from": "#0ea5e9",
      "brand-to": "#6366f1",
      success: "#10b981",
      warning: "#f59e0b",
      info: "#06b6d4",
      "shadow-card": "0 4px 20px rgba(0,0,0,0.3)",
      "shadow-card-lg": "0 12px 30px rgba(0,0,0,0.5)",
      radius: "0.875rem",
      "font-sans": "'Inter', system-ui, sans-serif",
    }
  }
}
