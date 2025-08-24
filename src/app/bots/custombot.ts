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



    // Web Access設定変更時にbotインスタンスを無効化してAsyncAbstractBotの#botを再作成
    invalidateBotInstance() {
        console.log(`🔄 CustomBot ${this.customBotNumber}: Invalidating bot instance due to web access change`);
        
        // AsyncAbstractBotの内部botを強制的に再初期化
        this.forceReinitializeAsyncBot();
    }
    
    private forceReinitializeAsyncBot() {
        // AsyncAbstractBotのコンストラクタロジックを模倣して#botを再初期化
        this.initializeBot()
            .then((bot) => {
                // 私的フィールドの命名規則を試行
                const possibleKeys = ['#bot', '_bot', '__bot', '_AsyncAbstractBot_bot', '__AsyncAbstractBot_bot'];
                
                for (const key of possibleKeys) {
                    try {
                        (this as any)[key] = bot;
                        console.log(`✅ CustomBot ${this.customBotNumber}: Internal bot updated with key: ${key}`);
                        break;
                    } catch (e) {
                        // Continue trying other keys
                    }
                }
                
                // AsyncAbstractBotの#isInitializedも更新
                try {
                    (this as any)['#isInitialized'] = true;
                } catch (e) {
                    // Try alternative naming
                    (this as any)['_isInitialized'] = true;
                }
            })
            .catch((err) => {
                console.error(`❌ CustomBot ${this.customBotNumber}: Failed to reinitialize internal bot:`, err);
            });
    }

    // setConversationHistoryはAsyncAbstractBotが処理する

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
        const { language } = getUserLocaleInfo();
        processedSystemMessage = this.enhanceSystemPromptWithWebSearch(processedSystemMessage, config.webAccess || false, language);

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


        return botInstance;
    }
}
