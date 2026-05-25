import type { ChatMessageModel } from '~services/chat-history'

export function formatConversationAsMarkdown(messages: ChatMessageModel[], botName: string): string {
  return messages
    .filter((m) => m.text)
    .map((m) => {
      const role = m.author === 'user' ? 'User' : botName
      return `**${role}:** ${m.text}`
    })
    .join('\n\n')
}
