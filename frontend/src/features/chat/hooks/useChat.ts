import { useState } from 'react'
import type { ChatMessage, Conversation } from '../types'

function createId() {
  return crypto.randomUUID()
}

function currentTime() {
  return new Date().toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function useChat() {
  // El historial se mantiene en memoria y comienza vacío en cada carga.
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  )

  const activeConversation =
    conversations.find(({ id }) => id === activeConversationId) ?? null

  function startConversation() {
    const id = createId()
    setConversations((current) => [
      { id, title: 'Nueva conversación', messages: [] },
      ...current,
    ])
    setActiveConversationId(id)
    return id
  }

  function selectConversation(id: string) {
    setActiveConversationId(id)
  }

  function sendMessage(content: string) {
    const text = content.trim()
    if (!text) return

    const message: ChatMessage = {
      id: createId(),
      role: 'user',
      content: text,
      time: currentTime(),
    }

    if (!activeConversationId) {
      // Si aún no hay chat activo, el primer mensaje crea uno automáticamente.
      const id = createId()
      setConversations((current) => [
        { id, title: text.slice(0, 36), messages: [message] },
        ...current,
      ])
      setActiveConversationId(id)
      return
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              title:
                conversation.messages.length === 0
                  ? text.slice(0, 36)
                  : conversation.title,
              messages: [...conversation.messages, message],
            }
          : conversation,
      ),
    )
  }

  return {
    conversations,
    activeConversation,
    activeConversationId,
    startConversation,
    selectConversation,
    sendMessage,
  }
}
