export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  time: string
}

export type Conversation = {
  id: string
  title: string
  messages: ChatMessage[]
}
