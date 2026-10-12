import * as React from "react"

import { cn, formatPhoneNumber } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const previousPhone = React.useRef(formatPhoneNumber(String(props.value ?? props.defaultValue ?? '')))
  const phoneProps = type === 'tel' ? {
    value: props.value === undefined ? undefined : formatPhoneNumber(String(props.value)),
    defaultValue: props.defaultValue === undefined ? undefined : formatPhoneNumber(String(props.defaultValue)),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const before = props.value === undefined ? previousPhone.current : formatPhoneNumber(String(props.value))
      let raw = input.value
      let digitPosition = raw.slice(0, input.selectionStart ?? raw.length).replace(/\D/g, '').length
      const operation = (event.nativeEvent as InputEvent).inputType
      // Deleting a separator must delete a digit instead of putting the space back.
      if (raw !== before && raw.replace(/\D/g, '') === before.replace(/\D/g, '') && operation?.startsWith('delete')) {
        const digits = raw.replace(/\D/g, '')
        const index = operation === 'deleteContentBackward' ? Math.max(0, digitPosition - 1) : digitPosition
        raw = (raw.startsWith('+') ? '+' : '') + digits.slice(0, index) + digits.slice(index + 1)
        if (operation === 'deleteContentBackward') digitPosition = index
      }
      const formatted = formatPhoneNumber(raw)
      input.value = formatted
      let caret = formatted.startsWith('+') ? 1 : 0
      let seen = 0
      while (caret < formatted.length && seen < digitPosition) {
        if (/\d/.test(formatted[caret])) seen++
        caret++
      }
      input.setSelectionRange(caret, caret)
      previousPhone.current = formatted
      props.onChange?.(event)
    },
  } : {}
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
      {...phoneProps}
    />
  )
}

export { Input }
