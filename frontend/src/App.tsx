import { useState } from 'react'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatHeader } from '@/components/layout/ChatHeader'
import { ChatSidebar } from '@/components/layout/ChatSidebar'
import { useChat } from '@/features/chat/hooks/useChat'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    conversations,
    activeConversation,
    activeConversationId,
    startConversation,
    selectConversation,
    sendMessage,
  } = useChat()

  // La página solo conecta sus componentes; el estado del chat vive en useChat.
  return (
    <main className="chat-app">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={startConversation}
        onSelectConversation={selectConversation}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <section className="chat-main">
        <ChatHeader
          conversation={activeConversation}
          onOpenMobileMenu={() => setSidebarOpen(true)}
        />
        <div className="chat-content">
          <ChatMessages conversation={activeConversation} />
          <ChatComposer onSendMessage={sendMessage} />
        </div>
      </section>
    </main>
  )
}

export default App
