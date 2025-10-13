// CustomBot.ts file (you should create this file or add to an existing file where suitable)
import { AsyncAbstractBot, MessageParams, AnwserPayload, AbstractBot } from './abstract-bot';
import * as agent from '~services/agent';
import { ChatGPTApiBot } from './chatgpt-api';
import { ClaudeApiBot } from './claude-api';
import { getUserConfig, CustomApiConfig, CustomApiProvider, SystemPromptMode } from '~/services/user-config';
import { ChatError, ErrorCode } from '~utils/errors';
import { BedrockApiBot } from './bedrock-api';
import { GeminiApiBot } from './gemini-api';
import { VertexClaudeBot } from './vertex-claude';
// import { OpenAIImageBot } from './openai-image';
import { OpenAIResponsesBot } from './openai-responses';
import { ImageAgentWrapperBot } from './image-agent-wrapper';
import { getUserLocaleInfo } from '~utils/system-prompt-variables';

export class CustomBot extends AsyncAbstractBot {
    private customBotNumber: number;
    private config: CustomApiConfig | undefined;

    constructor(params: { customBotNumber: number }) {
        super();
        this.customBotNumber = params.customBotNumber;
    }

    async initializeBot(): Promise<AbstractBot> {
        return await this.createBotInstance();
    }

    get chatBotName() {
        return this.config?.name
    }

    get modelName() {
        return this.config?.model
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

    private async createBotInstance(): Promise<AbstractBot> {
        const { customApiKey, customApiHost, customApiConfigs, commonSystemMessage, isCustomApiHostFullPath, providerConfigs } = await getUserConfig();
        const config = customApiConfigs[this.customBotNumber - 1];

        if (!config) {
            throw new ChatError(`No configuration found for bot number ${this.customBotNumber}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }
        this.config = config

        // 共通ロジックを使用
        const processedSystemMessage = this.buildSystemPrompt(config, commonSystemMessage);

        // Resolve effective Provider/API settings based on providerRefId only
        const providerRef = (config.providerRefId)
            ? (providerConfigs || []).find((p) => p.id === config.providerRefId)
            : undefined;

        const effectiveProvider = providerRef?.provider ?? (config.provider || (config.model.includes('anthropic.claude') ? CustomApiProvider.Bedrock : CustomApiProvider.OpenAI));

        const effectiveHost = (providerRef?.host && providerRef.host.trim().length > 0)
            ? providerRef.host
            : (config.host && config.host.trim().length > 0)
                ? config.host
                : customApiHost;

        const effectiveIsHostFullPath = providerRef
            ? (providerRef.isHostFullPath ?? false)
            : (config.host && config.host.trim().length > 0)
                ? (config.isHostFullPath ?? false)
                : isCustomApiHostFullPath;

        const effectiveApiKey = (providerRef?.apiKey && providerRef.apiKey.trim().length > 0)
            ? providerRef.apiKey
            : (config.apiKey || customApiKey);

        const anthHeader = providerRef?.isAnthropicUsingAuthorizationHeader ?? (config.isAnthropicUsingAuthorizationHeader || false);
        const effectiveAdvanced = providerRef?.advancedConfig ?? config.advancedConfig;

        let botInstance: AbstractBot;
        switch (effectiveProvider) {
            case CustomApiProvider.Bedrock:
                botInstance = new BedrockApiBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode,
                    thinkingBudget: config.thinkingBudget,
                    webAccess: config.webAccess || false,
                    isHostFullPath: effectiveIsHostFullPath,
                });
                break;
            case CustomApiProvider.Anthropic:
                botInstance = new ClaudeApiBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingBudget: config.thinkingBudget,
                    isHostFullPath: effectiveIsHostFullPath,
                    webAccess: config.webAccess || false,
                    advancedConfig: effectiveAdvanced,
                    imageToolGeneratorId: config.imageToolBinding?.generatorId,
                    imageToolOverrides: config.imageToolOverrides,
                }, config.thinkingMode, anthHeader);
                break;
            case CustomApiProvider.OpenAI:
                botInstance = new ChatGPTApiBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: effectiveIsHostFullPath,
                    webAccess: config.webAccess || false,
                    botIndex: this.customBotNumber - 1, // 0ベースのインデックス
                    thinkingMode: config.thinkingMode,
                    reasoningEffort: config.reasoningEffort,
                    advancedConfig: effectiveAdvanced,
                    imageToolGeneratorId: config.imageToolBinding?.generatorId,
                });
                break;
            case CustomApiProvider.OpenAI_Image: {
                const imageTool: any = { type: 'image_generation' }
                botInstance = new OpenAIResponsesBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model || 'gpt-5',
                    systemMessage: processedSystemMessage,
                    isHostFullPath: effectiveIsHostFullPath,
                    webAccess: false,
                    thinkingMode: config.thinkingMode,
                    reasoningEffort: config.reasoningEffort,
                    functionTools: [imageTool],
                    extraBody: undefined,
                })
                break;
            }
            case CustomApiProvider.Google:
                botInstance = new GeminiApiBot({
                    geminiApiKey: effectiveApiKey,
                    geminiApiModel: config.model,
                    geminiApiSystemMessage: processedSystemMessage,
                    geminiApiTemperature: config.temperature,
                    webAccess: config.webAccess || false,
                });
                break;
            case CustomApiProvider.OpenAI_Responses:
                botInstance = new OpenAIResponsesBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: effectiveIsHostFullPath,
                    webAccess: false,
                    thinkingMode: config.thinkingMode,
                    reasoningEffort: config.reasoningEffort,
                    functionTools: undefined,
                    extraBody: undefined,
                });
                break;
            case CustomApiProvider.GeminiOpenAI:
                botInstance = new ChatGPTApiBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: false, // No compatibility with OpenAI Reasoning
                    webAccess: config.webAccess || false,
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
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode,
                    webAccess: config.webAccess || false,
                    isHostFullPath: effectiveIsHostFullPath,
                    extraBody: config.thinkingMode ? {
                        enable_thinking: true,
                        thinking_budget: config.thinkingBudget || 2000
                    } : undefined
                });
                break;
            case CustomApiProvider.VertexAI_Claude:
                botInstance = new VertexClaudeBot({
                    apiKey: effectiveApiKey,
                    host: effectiveHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode, // Now properly supported with correct max_tokens
                    thinkingBudget: config.thinkingBudget,
                    isHostFullPath: effectiveIsHostFullPath,
                    webAccess: config.webAccess || false,
                    advancedConfig: effectiveAdvanced,
                });
                break;
            case CustomApiProvider.Image_Agent: {
                const refId = config.imageAgentChatbotRefId;
                if (!refId) {
                  throw new ChatError('Chatbot for prompting is not configured for this Image Agent.', ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
                }
              
                const targetConfigIndex = customApiConfigs.findIndex((c) => c.id === refId);
                if (targetConfigIndex === -1) {
                  throw new ChatError(`Chatbot with ID ${refId} not found.`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
                }
              
                // Create an instance of the referenced bot
                const referencedBot = new CustomBot({ customBotNumber: targetConfigIndex + 1 });
                const engine = await referencedBot.initializeBot();
              
                botInstance = new ImageAgentWrapperBot({
                  engine: engine,
                  generatorId: config.imageToolBinding?.generatorId,
                  overrides: config.imageToolOverrides,
                  sourceBotId: config.id,
                  model: config.model,
                });
                break;
              }
            default:
                console.error(`Unsupported provider detected: ${effectiveProvider}`);
                throw new ChatError(`Unsupported provider: ${effectiveProvider}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }


        // Ensure initial system message is applied on the created bot (for bots that support it)
        if (botInstance && typeof (botInstance as any).setSystemMessage === 'function') {
            (botInstance as any).setSystemMessage(processedSystemMessage);
        }
        return botInstance;
    }
}
