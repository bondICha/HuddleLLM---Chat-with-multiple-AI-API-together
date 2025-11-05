import { compareVersions } from 'compare-versions'
import Browser from 'webextension-polyfill'
import { getVersion } from '~utils'
// translate


export const RELEASE_NOTES = [
  {
    version: '2.13.1',
    notes: [
      'releasenote_v2131_enhanced_scroll_experience',
    ],
  },
  {
    version: '2.13.0',
    notes: [
      'releasenote_v2130_image_agent',
      'releasenote_v2130_ui_improvements',
    ],
  },
  {
    version: '2.12.6',
    notes: [
      'releasenote_v2126_openrouter_image_generation',
    ],
  },
  {
    version: '2.12.5',
    notes: [
      'releasenote_v2125_vertex_gemini_update',
    ],
  },
  {
    version: '2.12.3',
    notes: [
      'releasenote_openai_responses_image_beta',
    ],
  },
  {
    version: '2.12.2',
    notes: [
      'releasenote_v2122_model_preview_enhancement',
      'releasenote_v2122_session_restore_toggle',
      'releasenote_v2122_provider_icons',
      'releasenote_v2122_by_glm_46',
    ],
  },
  {
    version: '2.12.0',
    notes: [
      'releasenote_v2120_provider_feature',
      'releasenote_v2120_claude_sonnet_45',
      'releasenote_v2120_release_note_by_claude_sonnet_45',
    ],
  },
  {
    version: '2.11.0',
    notes: [
      'releasenote_v2110_file_attachment_support',
      'releasenote_v2110_drag_and_drop_support',
      'releasenote_v2110_pdf_support_removed',
    ],
  },
  {
    version: '2.10.11',
    notes: [
      'releasenote_v21011_fix_claude_empty_message_error',
      'releasenote_v21011_remove_image_on_history_restore',
      'releasenote_v21011_expandable_chat_input_field',
    ],
  },
  {
    version: '2.10.8',
    notes: [
      'releasenote_v2110_gemini_openai_format_and_thinking_support',
      'releasenote_v2110_model_list_api_support',
    ],
  },
  {
    version: '2.10.5',
    notes: [
      'releasenote_v2105_code_expansion_modal_enhancement',
      'releasenote_v2105_font_type_setting',
      'releasenote_v2105_this_release_note_is_made_by_grok_code',
    ],
  },
  {
    version: '2.9.0',
    notes: [
      'releasenote_v290_session_restore',
      'releasenote_v290_web_access_enhancement'
    ],
  },
  {
    version: '2.8.2',
    notes: [
      'releasenote_v282_chat_pair_feature',
      'releasenote_v282_common_system_prompt',
    ],
  },
  {
    version: '2.8.1',
    notes: [
      'releasenote_v281_url_fetch',
    ],
  },
  {
    version: '2.8.0',
    notes: [
      'releasenote_v280_vertex_claude',
      'releasenote_v280_multiple_images',
      'releasenote_v280_gemini_update',
      'releasenote_v280_markdown_improvement'    ],
  },
  {
    version: '2.7.7',
    notes: [
      'releasenote_v277_expandable_textarea',
    ],
  },
  {
    version: '2.7.5',
    notes: [
      'releasenote_v275_omnibox_search_fix',
    ],
  },
  {
    version: '2.7.4',
    notes: [
      'releasenote_v274_custom_api_endpoint_options',
      'releasenote_v274_config_system_refactor',
    ],
  },
  {
    version: '2.7.0',
    notes: [
      'releasenote_v270_omnibox_search',
      'releasenote_v270_sidebar_all_in_one_fix',
      'releasenote_v270_thinking_mode_fix',
      'releasenote_v270_add_model_button_enhancement',
      'releasenote_v270_settings_bug_fix',
    ],
  },
  {
    version: '2.6.1',
    notes: [
      'v2.6_fix_visualization',         // 見た目の調整
    ],
  },
  {
    version: '2.6.0',
    notes: [
      'v2.6_custom_model_ui',         // モデル設定UIの統一・ドロップダウン改善
      'v2.6_api_support',             // Perplexity/Bedrock固有IDなど主要APIサポート対応
      'v2.6_codeblock_improvements',  // コードブロック折り返し・ハイライト型対応
      'v2.6_misc_fixes',              // そのほか軽微な不具合修正、内部構成整理
    ],
  },
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

export async function checkReleaseNotes(): Promise<{version: string, notes: string[]}[]> {
  const version = getVersion()
  const { lastCheckReleaseNotesVersion } = await Browser.storage.sync.get('lastCheckReleaseNotesVersion')
  // バージョン記録の更新は行わない（markCurrentVersionAsRead関数に移動）
  if (!lastCheckReleaseNotesVersion) {
    return []
  }
  return RELEASE_NOTES
    .filter(({ version: v }) => compareVersions(v, lastCheckReleaseNotesVersion) > 0)
}

// 手動でリリースノートを表示するための関数（すべてのバージョンを返す）
export function getAllReleaseNotes(): {version: string, notes: string[]}[] {
  return RELEASE_NOTES.slice(0, 10) // 最新10バージョンのみ表示
}
