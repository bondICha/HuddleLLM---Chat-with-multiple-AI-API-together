import { ChatError } from '~utils/errors'

export interface FetchedUrlContent {
  url: string
  content: string
}

export interface ChatMessageModel {
  id: string
  author: number | 'user'
  text: string
  images?: File[]
  error?: ChatError
  thinking?: string
  fetchedUrls?: FetchedUrlContent[]
}

export interface ConversationModel {
  messages: ChatMessageModel[]
}
