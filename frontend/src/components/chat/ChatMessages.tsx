import { ScrollArea } from '@/components/ui/scroll-area'
import type { Conversation } from '@/features/chat/types'
import { ChatEmptyState } from './ChatEmptyState'
import { ChatMessage } from './ChatMessage'

type ChatMessagesProps = {
  conversation: Conversation | null
}

export function ChatMessages({ conversation }: ChatMessagesProps) {
  const messages = conversation?.messages ?? []

  return (
    <ScrollArea className="messages-scroll">
      <div className="messages-column">
        {messages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          <>
            <div className="day-divider">
              <span>Hoy</span>
            </div>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  )
}
