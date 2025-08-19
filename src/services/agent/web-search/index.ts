import { cachified } from '@epic-web/cachified';
import { truncate } from 'lodash-es';
import type { SearchResultItem } from './base';
import { BingNewsSearch } from './bing-news';
import { GoogleSearch } from './google';;
import Browser from 'webextension-polyfill';
import { htmlToText } from '~app/utils/html-utils';

const MAX_CONTEXT_ITEMS = 15

const providers = [new GoogleSearch(), new BingNewsSearch()]

async function _searchRelatedContext(query: string, signal?: AbortSignal) {
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.search(query, signal);
        console.debug('web search result', query, result.items);
        return result;
      } catch (err) {
        console.error(err);
        return { items: [] };
      }
    }),
  );

  const items: SearchResultItem[] = [];

  // add items in turn
  let i = 0;
  let hasMore = false;
  do {
    hasMore = false;
    for (const result of results) {
      const item = result.items[i];
      if (item) {
        hasMore = true;
        items.push(item);
      } else {
        continue;
      }
    }
    i++;
  } while (hasMore && items.length < MAX_CONTEXT_ITEMS);

  console.debug('web search items', items);

  return items;
}

const cache = new Map()

export async function searchRelatedContext(query: string, signal?: AbortSignal): Promise<SearchResultItem[]> {
  return cachified({
    cache,
    key: `search-context:${query}`,
    ttl: 1000 * 60 * 5,
    getFreshValue: () => _searchRelatedContext(query, signal),
  })
}
