import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** crypto.randomUUID is restricted on plain HTTP LAN addresses. */
export function createClientId(): string {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function copyText(value: string): Promise<void> {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return } } catch { /* Use the selection API on HTTP LAN pages. */ }
  const field = document.createElement('textarea')
  field.value = value; field.style.cssText = 'position:fixed;left:-9999px;top:0'
  document.body.appendChild(field); field.select()
  try { if (!document.execCommand('copy')) throw new Error('Copie indisponible. Sélectionnez et copiez l’adresse manuellement.') }
  finally { field.remove() }
}

/** Preserve the country sign and every digit, grouping phone numbers in pairs. */
export function formatPhoneNumber(value?: string | number | null): string {
  const text = String(value ?? '').trim()
  const digits = text.replace(/\D/g, '')
  if (!digits) return text.startsWith('+') ? '+' : ''
  return (text.startsWith('+') ? '+' : '') + (digits.match(/.{1,2}/g) ?? []).join(' ')
}

/**
 * Get the correct URL for public assets
 * Handles both development and production asset paths
 */
export function assetUrl(path: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return baseUrl + cleanPath
}

/**
 * Get the correct URL path with basename prefix for internal navigation
 * @param path - The internal path (e.g., "/dashboard", "/auth/sign-in")
 * @returns The full path with basename prefix
 */
export function getAppUrl(path: string): string {
  const basename = import.meta.env.VITE_BASENAME || ''
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return basename + cleanPath
}

/**
 * Formats a full name string to French medical standard:
 * LAST NAME (NOM) -> ALL UPPERCASE
 * FIRST NAME (PRÉNOM) -> Capitalized first letter
 * Example: "jean dupont" -> "DUPONT Jean"
 * Example: "DUPONT Jean" -> "DUPONT Jean"
 * Example: "jean-baptiste moliere" -> "MOLIERE Jean-Baptiste"
 */
export function formatPatientName(input: string): string {
  if (!input || !input.trim()) return ""
  const clean = input.trim()
  
  // Separate medical exam suffix if present (e.g. "Jean Dupont - IRM Cérébrale 3T")
  const dashIndex = clean.indexOf(' - ')
  let nameOnly = clean
  let suffix = ''
  if (dashIndex !== -1) {
    nameOnly = clean.substring(0, dashIndex).trim()
    suffix = clean.substring(dashIndex)
  }

  const parts = nameOnly.split(/\s+/)
  if (parts.length === 1) {
    return parts[0].toUpperCase() + suffix
  }

  let firstNameParts: string[] = []
  let lastNameParts: string[] = []

  const firstPart = parts[0]
  const lastPart = parts[parts.length - 1]

  if (firstPart === firstPart.toUpperCase() && firstPart.length > 1 && lastPart !== lastPart.toUpperCase()) {
    // Entered as "DUPONT Jean"
    lastNameParts = [firstPart]
    firstNameParts = parts.slice(1)
  } else {
    // Entered as "Jean Dupont" or "jean dupont"
    lastNameParts = [lastPart]
    firstNameParts = parts.slice(0, parts.length - 1)
  }

  const formattedNom = lastNameParts.map(p => p.toUpperCase()).join(" ")
  const formattedPrenom = firstNameParts.map(p => {
    return p.split("-").map(sub => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase()).join("-")
  }).join(" ")

  return `${formattedNom} ${formattedPrenom}${suffix}`.trim()
}

export function calculateAge(birthDateStr?: string, defaultAge?: number | string | null): number | null {
  const parsed = defaultAge === null || defaultAge === undefined || String(defaultAge).trim() === '' ? null : Number(defaultAge)
  const fallback = parsed !== null && Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  if (!birthDateStr) return fallback
  const birth = new Date(birthDateStr)
  if (isNaN(birth.getTime())) {
    return fallback
  }
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : fallback
}

export function formatPatientAge(birthDateStr?: string, storedAge?: number | string | null): string {
  const age = calculateAge(birthDateStr, storedAge)
  return age === null ? 'Âge non renseigné' : `${age} ans`
}
