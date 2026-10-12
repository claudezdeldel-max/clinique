"use client"

import type { ComponentProps } from "react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Mail } from "@/app/mail/data"
import { useMail } from "@/app/mail/use-mail"

interface MailListProps {
  items: Mail[]
}

export function MailList({ items }: MailListProps) {
  const [mail, setMail] = useMail()

  return (
    <ScrollArea className="h-[calc(100vh-10rem)]">
      <div className="flex flex-col gap-2 p-3 pt-0">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left text-xs transition-all hover:bg-accent/60 cursor-pointer",
              mail.selected === item.id && "bg-muted border-primary/50 shadow-xs"
            )}
            onClick={() =>
              setMail({
                ...mail,
                selected: item.id,
              })
            }
          >
            <div className="flex w-full flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{item.name}</span>
                  {!item.read && (
                    <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(item.date), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
              <div className="text-xs font-semibold text-primary">{item.examType}</div>
              <div className="text-[11px] text-muted-foreground font-mono">N° Sécu: {item.socialSecNo}</div>
            </div>
            <div className="line-clamp-2 text-[11px] text-muted-foreground">
              {item.text.substring(0, 120)}...
            </div>
            {item.labels.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {item.labels.map((label) => (
                  <Badge key={label} variant={getBadgeVariantFromLabel(label)} className="text-[10px] px-1.5 py-0">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}

function getBadgeVariantFromLabel(
  label: string
): ComponentProps<typeof Badge>["variant"] {
  if (["Urgent"].includes(label)) {
    return "destructive"
  }
  if (["IRM 3T", "Scanner CT"].includes(label)) {
    return "default"
  }
  return "secondary"
}
