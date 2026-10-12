import { cn } from '@/lib/utils'

interface AvatarInitialsProps {
  name: string
  id?: string | number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarInitials({ name, id, className, size = 'md' }: AvatarInitialsProps) {
  const getInitials = (str: string) => {
    if (!str) return 'P'
    const parts = str.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return str.slice(0, 2).toUpperCase()
  }

  // Pick deterministic gradient c1..c5 based on string code
  const gradients = [
    'from-sky-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-purple-500 to-violet-600',
  ]

  const num = typeof id === 'number' ? id : (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const gradClass = gradients[Math.abs(num) % gradients.length]

  const sizeClasses = {
    sm: 'size-7 text-xs font-bold rounded-lg',
    md: 'size-9 text-sm font-extrabold rounded-xl',
    lg: 'size-12 text-base font-black rounded-2xl',
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-xs',
        gradClass,
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
