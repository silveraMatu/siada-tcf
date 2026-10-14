import { ChevronDown, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Conversation } from '@/features/chat/types'
import { MobileMenuButton } from './MobileMenuButton'

type ChatHeaderProps = {
  conversation: Conversation | null
  onOpenMobileMenu: () => void
}

export function ChatHeader({
  conversation,
  onOpenMobileMenu,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="header-title">
        <MobileMenuButton onClick={onOpenMobileMenu} />
        <div className="header-title-row">
          <h1>{conversation?.title ?? 'Nueva conversación'}</h1>
          <ChevronDown className="header-chevron" size={15} />
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Más opciones">
        <MoreHorizontal />
      </Button>
    </header>
  )
}
