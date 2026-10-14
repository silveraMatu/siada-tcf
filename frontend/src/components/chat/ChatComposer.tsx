import { useState, type KeyboardEvent } from 'react'
import { AudioLines, ChevronDown, Paperclip, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ChatComposerProps = {
  onSendMessage: (message: string) => void
}

export function ChatComposer({ onSendMessage }: ChatComposerProps) {
  const [draft, setDraft] = useState('')

  function sendDraft() {
    const message = draft.trim()
    if (!message) return
    onSendMessage(message)
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter conserva el salto de línea.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendDraft()
    }
  }

  return (
    <div className="composer-area">
      <div className="composer">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          aria-label="Escribe tu mensaje"
          rows={1}
        />
        <div className="composer-toolbar">
          <div className="composer-tools">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Adjuntar archivo"
            >
              <Paperclip />
            </Button>
            <span className="tool-divider" />
            <Button variant="ghost" size="sm" className="mode-button">
              <AudioLines />
              Estudio guiado
              <ChevronDown />
            </Button>
          </div>
          <Button
            className="send-button"
            size="icon"
            aria-label="Enviar mensaje"
            disabled={!draft.trim()}
            onClick={sendDraft}
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}
