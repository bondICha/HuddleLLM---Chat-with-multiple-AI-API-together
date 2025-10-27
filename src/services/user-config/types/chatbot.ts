/**
 * Chatbot configuration types
 */

import { SystemPromptMode, CustomApiProvider } from './base'
import { AdvancedConfig } from './provider'
import { ImageFunctionToolSettings, AgenticImageBotSettings, ToolDefinition } from './image-settings'

/**
 * Custom API configuration interface
 * Holds configuration information for custom API chatbots
 */
export interface CustomApiConfig {
  id?: number; // Unused, kept for backward compatibility
  name: string;
  shortName: string;
  host: string;
  model: string;
  temperature: number;
  systemMessage: string;
  systemPromptMode: SystemPromptMode;
  avatar: string;
  apiKey: string;
  thinkingMode?: boolean; // Thinking mode (or Reasoning)
  thinkingBudget?: number; // Anthropic thinking budget
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'; // OpenAI reasoning effort
  provider: CustomApiProvider;
  webAccess?: boolean;
  isAnthropicUsingAuthorizationHeader?: boolean;
  /** Gemini auth mode: 'header' | 'query' (for individual settings) */
  geminiAuthMode?: 'header' | 'query';
  enabled?: boolean; // Enable/disable state
  isHostFullPath?: boolean; // Whether host is a full path (default: false)
  advancedConfig?: AdvancedConfig;
  /** Provider reference ID */
  providerRefId?: string;

  /** Image function tool settings (for OpenAI_Image) */
  imageFunctionToolSettings?: ImageFunctionToolSettings;

  /** Agentic image generation settings (for ImageAgent) */
  agenticImageBotSettings?: AgenticImageBotSettings;

  /** Tool definition for image generation (used with Image Agent) */
  toolDefinition?: ToolDefinition;

  /** @deprecated Will be replaced by toolDefinition */
  imageScheme?: 'sd' | 'novita' | 'openai_responses' | 'openrouter_image' | 'qwen_openai' | 'seedream_openai' | 'custom';

  // OpenAI Responses API specific toggles
  responsesWebSearch?: boolean; // Enable web_search_preview tool
  /** JSON string for Responses API tools (function calling, web_search_preview, etc.) */
  responsesFunctionTools?: string;
}

/**
 * Chat pair configuration
 * Holds saved chat pair information
 */
export interface ChatPair {
  id: string; // Unique ID
  name: string; // Pair name (default: bot names joined by |)
  botIndices: number[]; // Selected bot indices
  createdAt: number; // Creation timestamp
  updatedAt: number; // Update timestamp
}
