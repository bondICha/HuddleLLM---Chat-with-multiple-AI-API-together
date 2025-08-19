import Browser from 'webextension-polyfill';
import WebSearch, { SearchResult } from './base'

export class GoogleSearch extends WebSearch {
  async search(query: string, signal?: AbortSignal): Promise<SearchResult> {
    const html = await this.fetchSerp(query)
    const items = this.extractItems(html)
    return { items }
  }

  private async fetchSerp(query: string) {
    const url = new URL('https://www.google.com/search')
    url.searchParams.set('q', query)

    const response = await Browser.runtime.sendMessage({
      type: 'FETCH_URL',
      url: url.toString(),
    }) as { success: boolean; content?: string; error?: string };

    if (!response.success || !response.content) {
      throw new Error(response.error || 'Failed to fetch Google search results');
    }

    return response.content;
  }

  private extractItems(html: string) {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const nodes = dom.querySelectorAll('div[data-hveid]');

    return Array.from(nodes)
      .map((node) => {
        const linkNode = node.querySelector('a');
        const link = linkNode?.getAttribute('href') || '';
        const titleNode = node.querySelector('h3');
        const title = titleNode?.textContent || '';

        if (!link || !title || !link.startsWith('http')) {
          return null;
        }

        return { title, link, abstract: '', provider: 'Google' };
      })
      .filter((item) => item !== null) as SearchResult['items'];
  }
}
