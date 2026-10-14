import { BookOpenCheck } from 'lucide-react'

export function ChatEmptyState() {
  return (
    <div className="empty-conversation">
      <div className="welcome-mark">
        <BookOpenCheck size={22} strokeWidth={1.7} />
      </div>
      <p className="welcome-eyebrow">Chat</p>
      <h2>¿Qué te gustaría escribir?</h2>
      <p className="welcome-description">
        Escribe tu primer mensaje para empezar.
      </p>
    </div>
  )
}
