// CustomBot.ts file (you should create this file or add to an existing file where suitable)
import { AsyncAbstractBot, MessageParams, AnwserPayload } from './abstract-bot';
import * as agent from '~services/agent';
import { ChatGPTApiBot } from './chatgpt-api';
import { ClaudeApiBot } from './claude-api';
import { getUserConfig, CustomApiConfig, CustomApiProvider, SystemPromptMode } from '~/services/user-config';
import { ChatError, ErrorCode } from '~utils/errors';
import { BedrockApiBot } from './bedrock-api';
import { GeminiApiBot } from './gemini-api'; // Import GeminiApiBot
import { PerplexityApiBot } from './perplexity-api'; // Import PerplexityApiBot
import { VertexClaudeBot } from './vertex-claude'; // Import VertexClaudeBot
import { getUserLocaleInfo } from '~utils/system-prompt-variables';

export class CustomBot extends AsyncAbstractBot {
    private customBotNumber: number;
    private config: CustomApiConfig | undefined;
    private botInstance: any = undefined;
    private savedConversationHistory: any = undefined;

    constructor(params: { customBotNumber: number }) {
        super();
        this.customBotNumber = params.customBotNumber;
    }

    // Web Access設定変更時にbotインスタンスを無効化
    invalidateBotInstance() {
        console.log(`🔄 CustomBot ${this.customBotNumber}: Invalidating bot instance due to web access change`);
        
        // 履歴を保存
        let savedHistory: any = undefined;
        if (this.botInstance && typeof this.botInstance.setConversationHistory === 'function' && typeof this.botInstance.getConversationHistory === 'function') {
            savedHistory = this.botInstance.getConversationHistory();
            console.log(`💾 CustomBot ${this.customBotNumber}: Saved conversation history`);
        }
        
        this.botInstance = undefined;
        this.config = undefined;
        this.savedConversationHistory = savedHistory;
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
        return this.doSendMessageGenerator(params);
    }


    private async createBotInstance() {
        const { customApiKey, customApiHost, customApiConfigs, commonSystemMessage } = await getUserConfig();
        const config = customApiConfigs[this.customBotNumber - 1];

        if (!config) {
            throw new ChatError(`No configuration found for bot number ${this.customBotNumber}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }
        this.config = config

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
        if (config.webAccess) {
            const { language } = getUserLocaleInfo();
            processedSystemMessage = this.enhanceSystemPromptWithWebSearch(processedSystemMessage, true, language);
        }

        const provider = config.provider || (
            config.model.includes('anthropic.claude') ? CustomApiProvider.Bedrock : CustomApiProvider.OpenAI
        );

        // 既存のswitch文と同じbotインスタンス作成ロジック
        let botInstance;
        switch (provider) {
            case CustomApiProvider.Bedrock:
                botInstance = new BedrockApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode,
                    thinkingBudget: config.thinkingBudget,
                    webAccess: config.webAccess,
                });
                break;
            case CustomApiProvider.Anthropic:
                botInstance = new ClaudeApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingBudget: config.thinkingBudget,
                    isHostFullPath: config.isHostFullPath,
                    webAccess: config.webAccess,
                }, config.thinkingMode, config.isAnthropicUsingAuthorizationHeader || false);
                break;
            case CustomApiProvider.OpenAI:
                botInstance = new ChatGPTApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: config.isHostFullPath,
                    webAccess: config.webAccess,
                    botIndex: this.customBotNumber - 1, // 0ベースのインデックス
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
            case CustomApiProvider.Perplexity:
                botInstance = new PerplexityApiBot({
                    apiKey: config.apiKey || customApiKey,
                    model: config.model,
                    host: config.host || customApiHost,
                    isHostFullPath: config.isHostFullPath,
                    webAccess: config.webAccess,
                });
                break;
            case CustomApiProvider.VertexAI_Claude:
                botInstance = new VertexClaudeBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: config.isHostFullPath,
                    webAccess: config.webAccess,
                });
                break;
            default:
                console.error(`Unsupported provider detected: ${provider}`);
                throw new ChatError(`Unsupported provider: ${provider}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }

        // 保存された履歴があれば復元
        if (this.savedConversationHistory && typeof botInstance.setConversationHistory === 'function') {
            botInstance.setConversationHistory(this.savedConversationHistory);
            console.log(`🔄 CustomBot ${this.customBotNumber}: Restored conversation history`);
            this.savedConversationHistory = undefined; // 復元後はクリア
        }

        return botInstance;
    }

    async *doSendMessageGenerator(params: MessageParams): AsyncGenerator<AnwserPayload> {
        // 初回のみbotインスタンス作成
        if (!this.botInstance) {
            this.botInstance = await this.createBotInstance();
        }

        if (this.config?.webAccess) {
            yield* agent.execute(params.prompt, (prompt) => this.botInstance.sendMessage({ ...params, prompt }), params.signal);
        } else {
            yield* this.botInstance.sendMessage(params);
        }
    }
}
