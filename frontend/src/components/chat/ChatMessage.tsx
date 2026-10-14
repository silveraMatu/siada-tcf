import { BookOpenCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { ChatMessage as ChatMessageType } from '@/features/chat/types'

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isAssistant = message.role === 'assistant'

  return (
    <article className={`message message--${message.role}`}>
      {isAssistant ? (
        <Avatar className="assistant-avatar">
          <AvatarFallback>
            <BookOpenCheck size={15} />
          </AvatarFallback>
        </Avatar>
      ) : (
        <Avatar className="user-avatar">
          <AvatarFallback>
            <span className="user-avatar-dot" aria-label="Usuario" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className="message-body">
        <div className="message-meta">
          <strong>{isAssistant ? 'SIADA' : 'Tú'}</strong>
          <span>{message.time}</span>
        </div>
        <p>{message.content}</p>
      </div>
    </article>
  )
}
