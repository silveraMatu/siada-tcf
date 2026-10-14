import { useState } from 'react'
import {
  BookOpenCheck,
  CircleHelp,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { Conversation } from '@/features/chat/types'

type ChatSidebarProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function SidebarBrand({ onClose }: { onClose: () => void }) {
  return (
    <div className="sidebar-brand">
      <div className="brand-mark" aria-hidden="true">
        <BookOpenCheck size={19} strokeWidth={1.8} />
      </div>
      <span>siada</span>
      <Button
        className="sidebar-dismiss"
        variant="ghost"
        size="icon"
        aria-label="Cerrar menú"
        onClick={onClose}
      >
        <X />
      </Button>
    </div>
  )
}

function ConversationList({
  conversations,
  activeConversationId,
  search,
  onSelectConversation,
}: Pick<
  ChatSidebarProps,
  'conversations' | 'activeConversationId' | 'onSelectConversation'
> & { search: string }) {
  const visibleConversations = conversations.filter(({ title }) =>
    title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <ScrollArea className="conversation-scroll">
      <div className="conversation-groups">
        <p className="sidebar-section-label">Conversaciones</p>
        {visibleConversations.map((conversation) => (
          <button
            key={conversation.id}
            className={`conversation-link${conversation.id === activeConversationId ? ' conversation-link--active' : ''}`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <MessageSquareText size={16} aria-hidden="true" />
            <span>{conversation.title}</span>
            {conversation.id === activeConversationId && (
              <MoreHorizontal className="conversation-more" size={16} />
            )}
          </button>
        ))}
        {search && visibleConversations.length === 0 && (
          <p className="empty-search">No se encontraron conversaciones.</p>
        )}
      </div>
    </ScrollArea>
  )
}

function SidebarActions() {
  return (
    <div className="sidebar-bottom">
      <Separator className="sidebar-divider" />
      <div className="sidebar-footer-actions">
        <Button variant="ghost" size="sm">
          <CircleHelp />
          Ayuda
        </Button>
        <Button variant="ghost" size="sm" aria-label="Configuración">
          <Settings2 />
        </Button>
      </div>
    </div>
  )
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  mobileOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('')

  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
        />
      )}
      <aside className={`app-sidebar${mobileOpen ? ' app-sidebar--open' : ''}`}>
        <SidebarBrand onClose={onCloseMobile} />
        <Button
          className="new-chat-button"
          variant="outline"
          onClick={() => {
            onNewConversation()
            onCloseMobile()
          }}
        >
          <Plus />
          Nueva conversación
          <span className="shortcut">⌘ K</span>
        </Button>
        <label className="search-box">
          <Search size={16} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar conversación"
            aria-label="Buscar conversación"
          />
          <span className="search-shortcut">/</span>
        </label>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          search={search}
          onSelectConversation={(id) => {
            onSelectConversation(id)
            onCloseMobile()
          }}
        />
        <SidebarActions />
      </aside>
    </>
  )
}
