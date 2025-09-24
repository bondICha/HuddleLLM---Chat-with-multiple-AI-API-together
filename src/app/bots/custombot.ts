// CustomBot.ts file (you should create this file or add to an existing file where suitable)
import { AsyncAbstractBot, MessageParams, AnwserPayload } from './abstract-bot';
import * as agent from '~services/agent';
import { ChatGPTApiBot } from './chatgpt-api';
import { ClaudeApiBot } from './claude-api';
import { getUserConfig, CustomApiConfig, CustomApiProvider, SystemPromptMode } from '~/services/user-config';
import { ChatError, ErrorCode } from '~utils/errors';
import { BedrockApiBot } from './bedrock-api';
import { GeminiApiBot } from './gemini-api';
import { VertexClaudeBot } from './vertex-claude';
import { getUserLocaleInfo } from '~utils/system-prompt-variables';

export class CustomBot extends AsyncAbstractBot {
    private customBotNumber: number;
    private config: CustomApiConfig | undefined;

    constructor(params: { customBotNumber: number }) {
        super();
        this.customBotNumber = params.customBotNumber;
    }

    async initializeBot() {
        return await this.createBotInstance();
    }

    get chatBotName() {
        return this.config?.name
    }

    get avatar() {
        return this.config?.avatar
    }

    sendMessage(params: MessageParams): AsyncGenerator<AnwserPayload> {
        if (this.config?.webAccess) {
            return agent.execute(params.prompt, (prompt) => this.doSendMessageGenerator({ ...params, prompt }), params.signal);
        }
        return this.doSendMessageGenerator(params);
    }



    // System prompt作成の共通ロジック
    private buildSystemPrompt(config: CustomApiConfig, commonSystemMessage: string): string {
        let combinedSystemMessage = '';
        switch (config.systemPromptMode) {
            case SystemPromptMode.APPEND:
                combinedSystemMessage = `${commonSystemMessage}\n${config.systemMessage}`;
                break;
            case SystemPromptMode.OVERRIDE:
                combinedSystemMessage = config.systemMessage;
                break;
            case SystemPromptMode.COMMON:
                combinedSystemMessage = commonSystemMessage;
                break;
            default:
                combinedSystemMessage = config.systemMessage || commonSystemMessage;
                break;
        }

        // Template variables replacement
        let processedSystemMessage = this.processSystemMessage(combinedSystemMessage);
        
        // Prompt for Web Access 
        const { language } = getUserLocaleInfo();
        processedSystemMessage = this.enhanceSystemPromptWithWebSearch(processedSystemMessage, config.webAccess || false, language);

        return processedSystemMessage;
    }

    // Web Access設定変更時にSystem Promptを動的更新
    async updateSystemPrompt() {
        const { customApiConfigs, commonSystemMessage } = await getUserConfig();
        const config = customApiConfigs[this.customBotNumber - 1];
        if (!config) {
            return;
        }

        this.config = config;

        const processedSystemMessage = this.buildSystemPrompt(config, commonSystemMessage);

        // AsyncAbstractBotのsetSystemMessageを使用
        this.setSystemMessage(processedSystemMessage);
    }

    // setConversationHistoryはAsyncAbstractBotが処理する

    private async createBotInstance() {
        const { customApiKey, customApiHost, customApiConfigs, commonSystemMessage, isCustomApiHostFullPath } = await getUserConfig();
        const config = customApiConfigs[this.customBotNumber - 1];

        if (!config) {
            throw new ChatError(`No configuration found for bot number ${this.customBotNumber}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }
        this.config = config

        // 共通ロジックを使用
        const processedSystemMessage = this.buildSystemPrompt(config, commonSystemMessage);

        const provider = config.provider || (
            config.model.includes('anthropic.claude') ? CustomApiProvider.Bedrock : CustomApiProvider.OpenAI
        );

        // Hostの最終決定とFullPathの優先度は「どのHostを使うか」に従わせる
        // - 個別Hostが非空なら個別Hostを採用し、FullPathは個別設定（未設定なら false）
        // - 個別Hostが空/未設定なら共通Hostを採用し、FullPathは共通設定
        const useIndividualHost = !!(config.host && config.host.trim().length > 0);
        const resolvedHost = useIndividualHost ? config.host : customApiHost;
        const resolvedIsHostFullPath = useIndividualHost ? (config.isHostFullPath ?? false) : isCustomApiHostFullPath;

        let botInstance;
        switch (provider) {
            case CustomApiProvider.Bedrock:
                botInstance = new BedrockApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: resolvedHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode,
                    thinkingBudget: config.thinkingBudget,
                    webAccess: config.webAccess,
                    isHostFullPath: resolvedIsHostFullPath,
                });
                break;
            case CustomApiProvider.Anthropic:
                botInstance = new ClaudeApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: resolvedHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingBudget: config.thinkingBudget,
                    isHostFullPath: resolvedIsHostFullPath,
                    webAccess: config.webAccess,
                    advancedConfig: config.advancedConfig,
                }, config.thinkingMode, config.isAnthropicUsingAuthorizationHeader || false);
                break;
            case CustomApiProvider.OpenAI:
                botInstance = new ChatGPTApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: resolvedHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: resolvedIsHostFullPath,
                    webAccess: config.webAccess,
                    botIndex: this.customBotNumber - 1, // 0ベースのインデックス
                    thinkingMode: config.thinkingMode,
                    reasoningEffort: config.reasoningEffort,
                    advancedConfig: config.advancedConfig,
                });
                break;
            case CustomApiProvider.Google:
                botInstance = new GeminiApiBot({
                    geminiApiKey: config.apiKey || customApiKey,
                    geminiApiModel: config.model,
                    geminiApiSystemMessage: processedSystemMessage,
                    geminiApiTemperature: config.temperature,
                    webAccess: config.webAccess,
                });
                break;
            case CustomApiProvider.GeminiOpenAI:
                botInstance = new ChatGPTApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: resolvedHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: false, // No compatibility with OpenAI Reasoning
                    webAccess: config.webAccess,
                    isHostFullPath: true, // GeminiOpenAI は常に Full Path
                    extraBody: config.thinkingMode ? {
                        google: {
                            thinking_config: {
                                include_thoughts: true,
                                thinking_budget: config.thinkingBudget || 2000
                            }
                        }
                    } : undefined
                });
                break;
            case CustomApiProvider.QwenOpenAI:
                botInstance = new ChatGPTApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: resolvedHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode,
                    webAccess: config.webAccess,
                    isHostFullPath: resolvedIsHostFullPath,
                    extraBody: config.thinkingMode ? {
                        enable_thinking: true,
                        thinking_budget: config.thinkingBudget || 2000
                    } : undefined
                });
                break;
            case CustomApiProvider.VertexAI_Claude:
                botInstance = new VertexClaudeBot({
                    apiKey: config.apiKey || customApiKey,
                    host: resolvedHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode, // Now properly supported with correct max_tokens
                    thinkingBudget: config.thinkingBudget,
                    isHostFullPath: resolvedIsHostFullPath,
                    webAccess: config.webAccess,
                    advancedConfig: config.advancedConfig,
                });
                break;
            default:
                console.error(`Unsupported provider detected: ${provider}`);
                throw new ChatError(`Unsupported provider: ${provider}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }


        return botInstance;
    }
}
