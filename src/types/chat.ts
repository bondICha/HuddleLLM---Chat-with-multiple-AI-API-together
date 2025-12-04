import { ChatError } from '~utils/errors';
import { SearchResultItem } from '~services/agent/web-search/base';

export interface FetchedUrlContent {
  url: string
  content: string
}

export interface ReferenceUrl {
  url: string
  title?: string
}

export interface TextAttachment {
  name: string;
  content: string;
}

export interface ChatMessageModel {
  id: string
  author: number | 'user'
  text: string
  images?: File[]
  attachments?: TextAttachment[]  // UI表示用のテキスト添付（履歴には保存しない）
  error?: ChatError
  thinking?: string
  fetchedUrls?: FetchedUrlContent[];
  searchResults?: SearchResultItem[];
  referenceUrls?: ReferenceUrl[];
}

export interface ConversationModel {
  messages: ChatMessageModel[]
}
