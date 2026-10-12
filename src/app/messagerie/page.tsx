"use client"

import React, { useState, useEffect } from 'react'
import { MessageSquare, Send, Plus } from 'lucide-react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getConversations, getMessages, sendMessage, markConversationRead, createConversation } from '@/lib/api'

export default function MessageriePage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Message form state
  const [body, setBody] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [sending, setSending] = useState(false)

  const fetchConvs = async () => {
    setLoading(true)
    try {
      const data = await getConversations()
      setConversations(data || [])
      if (data && data.length > 0 && !activeConvId) {
        setActiveConvId(data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMsgs = async (convId: number) => {
    try {
      const msgs = await getMessages(convId)
      setMessages(msgs || [])
      await markConversationRead(convId, 'Dr. Rahmane')
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchConvs()
  }, [])

  useEffect(() => {
    if (activeConvId) {
      fetchMsgs(activeConvId)
    }
  }, [activeConvId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() || !activeConvId) return
    setSending(true)
    try {
      await sendMessage(activeConvId, {
        body,
        urgent,
        sender_name: 'Dr. Rahmane',
      })
      setBody('')
      setUrgent(false)
      await fetchMsgs(activeConvId)
      await fetchConvs()
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleNewConversation = async () => {
    try {
      const created = await createConversation({
        title: 'Discussion Équipe Radiologie',
        type: 'group',
        participants: ['Dr. Rahmane', 'Salima (Secrétariat)', 'Manipulateur Radio'],
      })
      await fetchConvs()
      setActiveConvId(created.id)
    } catch (err) {
      console.error(err)
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)

  return (
    <BaseLayout title="Messagerie Interne Clinique" description="Communications instantanées entre radiologues, secrétariat et manipulateurs radio">
      <div className="h-[calc(100vh-180px)] px-4 md:px-6 flex gap-6">
        {/* Left Sidebar: Conversations List */}
        <Card className="w-80 border-2 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Discussions
            </h3>
            <Button size="sm" variant="ghost" onClick={handleNewConversation} className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Chargement...</div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeConvId
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`p-3 cursor-pointer transition-all ${
                      isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground truncate">{c.title}</span>
                      {c.unread_count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-black">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {c.last_message?.body || 'Nouvelle conversation'}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Panel: Chat Messages Timeline */}
        <Card className="flex-1 border-2 shadow-xs flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{activeConv.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Participants: {activeConv.participants?.join(', ') || 'Dr. Rahmane, Salima'}
                  </p>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map((m) => {
                  const isMe = m.sender_name === 'Dr. Rahmane'
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                        <span className="font-bold text-foreground">{m.sender_name}</span>
                        <span>•</span>
                        <span>{m.created_at?.substring(11, 16) || '10:00'}</span>
                        {m.urgent === 1 && (
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded font-black text-[9px]">
                            URGENT
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-md text-xs shadow-xs ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-card border rounded-tl-none'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-muted/20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Écrivez votre message..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="flex-1 text-xs"
                  />
                  <Button type="submit" disabled={sending} size="sm" className="bg-primary text-primary-foreground">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="urgent_msg"
                    checked={urgent}
                    onCheckedChange={(c) => setUrgent(!!c)}
                  />
                  <Label htmlFor="urgent_msg" className="text-xs text-rose-600 font-semibold cursor-pointer">
                    Marquer comme URGENT (Notification prioritaire)
                  </Label>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              Sélectionnez une conversation.
            </div>
          )}
        </Card>
      </div>
    </BaseLayout>
  )
}
