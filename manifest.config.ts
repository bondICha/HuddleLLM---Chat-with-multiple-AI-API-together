import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest(async () => {
  return {
    manifest_version: 3,
    name: '__MSG_appName__',
    description: '__MSG_appDesc__',
    default_locale: 'en',
    version: '2.10.3',
    icons: {
      '16': 'src/assets/icon.png',
      '32': 'src/assets/icon.png',
      '48': 'src/assets/icon.png',
      '128': 'src/assets/icon.png',
    },
    background: {
      service_worker: 'src/background/index.ts',
      type: 'module',
    },
    action: {},
    host_permissions: [
      "https://api.openai.com/*",
      "https://api.anthropic.com/*",
      "https://api.cohere.ai/*",
      "https://generativelanguage.googleapis.com/*",
      "https://global.rakuten.com/*",
      "https://api.mistral.ai/*",
    ],
    optional_host_permissions: ['https://*/*', 'http://*/*', 'wss://*/*'],
    permissions: ['storage', 'unlimitedStorage', 'sidePanel', 'scripting', 'offscreen'],
    // content_scripts: [
    // ],
    commands: {
      'open-app': {
        suggested_key: {
          default: 'Alt+J',
          windows: 'Alt+J',
          linux: 'Alt+J',
          mac: 'Command+J',
        },
        description: 'Open HuddleLLM',
      },
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    // declarative_net_request rules are no longer needed with custom models
    // as web access is handled differently.
    "omnibox": {
      "keyword": "@hl"
    },
    web_accessible_resources: [
      {
        resources: ["config/*"],
        matches: ["<all_urls>"]
      }
    ]
  }
})
