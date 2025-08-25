import { CompanyProfilePreset } from '../src/services/company-profile'

// NOTE: This file should be customized for your organization and excluded from git tracking.
// Add this file to .gitignore and create your own version with your company's specific settings.
export const COMPANY_PROFILE_CONFIGS: CompanyProfilePreset[] = [
  {
    companyName: 'BIG COMPANY',
    checkUrl: 'https://this_url_is_accessible_only_from_company_intra_network.net',
    version: '2025.8.25',
    templateData: {
      "customApiConfigs": [
        {
          "avatar": "OpenAI.Purple",
          "enabled": true,
          "host": "https://mycompany.ai_api/openai/v1",
          "id": 1,
          "isHostFullPath": false,
          "model": "gpt-4.1",
          "name": "GPT-4.1",
          "provider": "openai",
          "shortName": "4.1",
          "systemMessage": "",
          "temperature": 1,
          "apiKey": ""
        },
        {
          "avatar": "OpenAI.Yellow",
          "enabled": true,
          "host": "https://mycompany.ai_api/openai/v1",
          "id": 2,
          "isHostFullPath": false,
          "model": "o4-mini",
          "name": "o4-mini",
          "provider": "openai",
          "shortName": "o4min",
          "systemMessage": "",
          "temperature": 1,
          "apiKey": ""
        },
        {
          "avatar": "Gemini.Color",
          "enabled": true,
          "host": "https://mycompany.ai_api/gemini/v1/",
          "id": 3,
          "isHostFullPath": false,
          "model": "google/gemini-2.5-pro",
          "name": "Gemini 2.5 Pro",
          "provider": "openai",
          "shortName": "GemPr",
          "systemMessage": "",
          "temperature": 1,
          "apiKey": ""
        },
        {
          "avatar": "Bard.Color",
          "enabled": true,
          "host": "https://mycompany.ai_api/gemini/v1/",
          "id": 4,
          "isHostFullPath": false,
          "model": "google/gemini-2.5-flash",
          "name": "Gemini 2.5 Flash",
          "provider": "openai",
          "shortName": "GemF",
          "systemMessage": "",
          "temperature": 1,
          "apiKey": ""
        },
        {
          "avatar": "Claude.OrangeSquare",
          "enabled": true,
          "host": "https://mycompany.ai_api/aws-bedrock/v1",
          "id": 5,
          "isHostFullPath": false,
          "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
          "name": "Claude Sonnet 4",
          "provider": "bedrock",
          "shortName": "Claud",
          "systemMessage": "",
          "temperature": 1,
          "thinkingBudget": 6000,
          "thinkingMode": false,
          "apiKey": ""
        },
        {
          "avatar": "Anthropic.Color",
          "enabled": true,
          "host": "https://mycompany.ai_api/anthropic/models/claude-sonnet-4@20250514:streamRawPredict",
          "id": 7,
          "isHostFullPath": false,
          "model": "claude-sonnet-4",
          "name": "Vertex Claude",
          "provider": "vertexai-claude",
          "shortName": "Claud",
          "systemMessage": "",
          "temperature": 1,
          "thinkingBudget": 2000,
          "thinkingMode": false,
          "webAccess": false,
          "apiKey": ""
        }
      ],
      "customApiHost": "https://mycompany.ai_api/v1"
    }
  }
]