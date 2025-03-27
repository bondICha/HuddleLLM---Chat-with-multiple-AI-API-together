import { compareVersions } from 'compare-versions'
import Browser from 'webextension-polyfill'
import { getVersion } from '~utils'
// translate


const RELEASE_NOTES = [
  {
    version: '2.3.0',
    notes: ['Add propaganda feature'],
  },
  {
    version: '2.3.3',
    notes: ['Propaganda UI enhancement'],
  },
  {
    version: '2.3.5',
    notes: [
      `releasenote-propaganda`,
      `releasenote-code-expand`,
    ],
  },
  {
    version: '2.3.6',
    notes: [
      `releasenote-claude3-7`
    ],
  },
  {
    version: '2.4.0',
    notes: [
      `releasenote-model-suggestion-fix`,
      `releasenote-claude-bedrock-thinking`
    ],
  },
  {
    version: '2.5.0',
    notes: [
      `releasenote-thinking-mode`,
      `releasenote-conversation-history`,
      `releasenote-icon-system`,
      `releasenote-ui-improvements`,
      `releasenote-api-template`
    ],
  },
  {
    version: '2.5.1',
    notes: [
      `releasenote-icon-fix-announcement`,
      `releasenote-thinkmode-fix`,
      `releasenote-remove-conversation-history`
    ],
  },
  {
    version: '2.5.3',
    notes: [
      `releasenote-claude-think`,
      `releasenote-perplexity-reasoning`
    ],
  },
  {
    version: '2.5.4',
    notes: [
      `releasenote-gemini-2.5-pro`
    ],
  },
  {
    version: '2.5.5',
    notes: [
      `releasenote-custom-claude-api`
    ],
  },
]

// バージョンを現在のバージョンとして記録する関数
export async function markCurrentVersionAsRead(): Promise<void> {
  const version = getVersion()
  await Browser.storage.sync.set({ lastCheckReleaseNotesVersion: version })
}

export async function checkReleaseNotes(): Promise<string[]> {
  const version = getVersion()
  const { lastCheckReleaseNotesVersion } = await Browser.storage.sync.get('lastCheckReleaseNotesVersion')
  // バージョン記録の更新は行わない（markCurrentVersionAsRead関数に移動）
  if (!lastCheckReleaseNotesVersion) {
    return []
  }
  return RELEASE_NOTES
    .filter(({ version: v }) => compareVersions(v, lastCheckReleaseNotesVersion) > 0)
    .map(({ notes }) => notes)
    .flat()
}
