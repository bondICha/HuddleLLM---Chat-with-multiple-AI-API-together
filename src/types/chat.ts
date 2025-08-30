import { ChatError } from '~utils/errors';
import { SearchResultItem } from '~services/agent/web-search/base';

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
  fetchedUrls?: FetchedUrlContent[];
  searchResults?: SearchResultItem[];
}

export interface ConversationModel {
  messages: ChatMessageModel[]
}
