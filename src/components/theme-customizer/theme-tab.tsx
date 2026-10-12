"use client"

import React from 'react'
import { Palette, Dices, Upload, ExternalLink, Sun, Moon, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useThemeManager } from '@/hooks/use-theme-manager'
import { useCircularTransition } from '@/hooks/use-circular-transition'
import { useThemeSettingsStore } from '@/stores/theme-settings-store'
import { designStyles, accentVariants } from '@/config/design-styles'
import { colorThemes, tweakcnThemes } from '@/config/theme-data'
import { radiusOptions, baseColors } from '@/config/theme-customizer-constants'
import { ColorPicker } from '@/components/color-picker'
import type { AccentVariantId } from '@/config/design-styles'
import "./circular-transition.css"

interface ThemeTabProps {
  onImportClick: () => void
}

export function ThemeTab({ onImportClick }: ThemeTabProps) {
  const { isDarkMode, brandColorsValues, handleColorChange } = useThemeManager()
  const { toggleTheme } = useCircularTransition()

  const {
    designStyle,
    accent,
    colorSource,
    presetKey,
    radius,
    setDesignStyle,
    setAccent,
    setShadcnPreset,
    setTweakcnPreset,
    setRadius,
  } = useThemeSettingsStore()

  const handleLightMode = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDarkMode === false) return
    toggleTheme(event)
  }

  const handleDarkMode = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDarkMode === true) return
    toggleTheme(event)
  }

  const handleRandomShadcn = () => {
    const randomTheme = colorThemes[Math.floor(Math.random() * colorThemes.length)]
    setShadcnPreset(randomTheme.value)
  }

  const handleRandomTweakcn = () => {
    const randomTheme = tweakcnThemes[Math.floor(Math.random() * tweakcnThemes.length)]
    setTweakcnPreset(randomTheme.value)
  }

  return (
    <div className="p-4 space-y-6">
      {/* 1. Style d'interface (Interface Design Style) */}
      <div data-testid="theme-design-section" className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Style d'interface</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {designStyles.map((style) => {
            const isSelected = designStyle === style.id
            return (
              <div
                key={style.id}
                data-testid={`theme-design-${style.id}`}
                data-selected={isSelected ? "true" : "false"}
                onClick={() => setDesignStyle(style.id)}
                className={`relative p-3.5 border rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                    : "border-border hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-foreground">{style.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>

                {/* Visual miniature preview */}
                <div className="h-10 rounded-lg border bg-background overflow-hidden flex p-1 gap-1">
                  <div
                    className={`w-3.5 rounded flex flex-col gap-0.5 p-0.5 ${
                      style.id === "mediscan"
                        ? "bg-gradient-to-b from-slate-900 to-slate-800"
                        : "bg-muted"
                    }`}
                  >
                    <div className="h-0.5 w-full bg-primary rounded-full"></div>
                    <div className="h-0.5 w-2/3 bg-muted-foreground/40 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-muted/30 rounded flex flex-col justify-between p-1">
                    <div className="h-1 w-3/4 bg-foreground/60 rounded"></div>
                    <div
                      className={`h-2.5 w-full rounded ${
                        style.id === "mediscan"
                          ? "bg-gradient-to-r from-sky-500 to-indigo-500"
                          : "bg-primary"
                      }`}
                    ></div>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                  {style.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Accent Variants (Visible if MediScan Pro is active) */}
      {designStyle === "mediscan" && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">Variante d'accent</Label>
            <div className="grid grid-cols-4 gap-2">
              {accentVariants.map((varAccent) => {
                const isSelected = accent === varAccent.id
                return (
                  <button
                    key={varAccent.id}
                    data-testid={`theme-accent-${varAccent.id}`}
                    type="button"
                    onClick={() => setAccent(varAccent.id as AccentVariantId)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full shadow-xs border border-border/40 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${varAccent.from}, ${varAccent.to})`,
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground truncate w-full">
                      {varAccent.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* 3. Shadcn UI Theme Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Thèmes Shadcn UI</Label>
          <Button variant="outline" size="sm" onClick={handleRandomShadcn} className="cursor-pointer">
            <Dices className="h-3.5 w-3.5 mr-1.5" />
            Aléatoire
          </Button>
        </div>

        <Select
          value={colorSource === "shadcn" ? presetKey : ""}
          onValueChange={(value) => setShadcnPreset(value)}
        >
          <SelectTrigger data-testid="theme-shadcn-select" className="w-full cursor-pointer">
            <SelectValue placeholder="Choisir un thème Shadcn" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="p-2">
              {colorThemes.map((theme) => (
                <SelectItem key={theme.value} value={theme.value} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-border/20"
                        style={{ backgroundColor: theme.preset.styles.light.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-border/20"
                        style={{ backgroundColor: theme.preset.styles.light.secondary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-border/20"
                        style={{ backgroundColor: theme.preset.styles.light.accent }}
                      />
                    </div>
                    <span>{theme.name}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 4. Tweakcn Theme Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Thèmes Tweakcn</Label>
          <Button variant="outline" size="sm" onClick={handleRandomTweakcn} className="cursor-pointer">
            <Dices className="h-3.5 w-3.5 mr-1.5" />
            Aléatoire
          </Button>
        </div>

        <Select
          value={colorSource === "tweakcn" ? presetKey : ""}
          onValueChange={(value) => setTweakcnPreset(value)}
        >
          <SelectTrigger data-testid="theme-tweakcn-select" className="w-full cursor-pointer">
            <SelectValue placeholder="Choisir un thème Tweakcn" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="p-2">
              {tweakcnThemes.map((theme) => (
                <SelectItem key={theme.value} value={theme.value} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-border/20"
                        style={{ backgroundColor: theme.preset.styles.light.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-border/20"
                        style={{ backgroundColor: theme.preset.styles.light.secondary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-border/20"
                        style={{ backgroundColor: theme.preset.styles.light.accent }}
                      />
                    </div>
                    <span>{theme.name}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 5. Radius Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Rayon des coins (Radius)</Label>
        <div className="grid grid-cols-5 gap-2">
          {radiusOptions.map((option) => (
            <div
              key={option.value}
              data-testid={`theme-radius-${option.name}`}
              className={`relative cursor-pointer rounded-md p-2.5 border transition-colors text-center ${
                radius === option.value
                  ? "border-primary bg-primary/10 font-bold"
                  : "border-border hover:border-border/60"
              }`}
              onClick={() => setRadius(option.value)}
            >
              <div className="text-xs font-medium">{option.name}</div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 6. Mode Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Mode d'affichage</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            data-testid="theme-mode-light"
            variant={!isDarkMode ? "secondary" : "outline"}
            size="sm"
            onClick={handleLightMode}
            className="cursor-pointer mode-toggle-button relative overflow-hidden"
          >
            <Sun className="h-4 w-4 mr-1 transition-transform duration-300" />
            Clair
          </Button>
          <Button
            data-testid="theme-mode-dark"
            variant={isDarkMode ? "secondary" : "outline"}
            size="sm"
            onClick={handleDarkMode}
            className="cursor-pointer mode-toggle-button relative overflow-hidden"
          >
            <Moon className="h-4 w-4 mr-1 transition-transform duration-300" />
            Sombre
          </Button>
        </div>
      </div>

      <Separator />

      {/* 7. Import Theme Button */}
      <div className="space-y-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onImportClick}
          className="w-full cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Importer un thème
        </Button>
      </div>

      {/* 8. Brand Colors Section */}
      <Accordion type="single" collapsible className="w-full border-b rounded-lg">
        <AccordionItem value="brand-colors" className="border border-border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
            <Label className="text-sm font-medium cursor-pointer">Couleurs personnalisées</Label>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2 space-y-3 border-t border-border bg-muted/20">
            {baseColors.map((color) => (
              <div key={color.cssVar} className="flex items-center justify-between">
                <ColorPicker
                  label={color.name}
                  cssVar={color.cssVar}
                  value={brandColorsValues[color.cssVar] || ""}
                  onChange={handleColorChange}
                />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Tweakcn link */}
      <div className="p-4 bg-muted rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Personnalisation avancée</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pour créer et exporter vos palettes en temps réel, visitez{" "}
          <a
            href="https://tweakcn.com/editor/theme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            tweakcn.com
          </a>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full cursor-pointer"
          onClick={() => window.open('https://tweakcn.com/editor/theme', '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Ouvrir Tweakcn
        </Button>
      </div>
    </div>
  )
}
