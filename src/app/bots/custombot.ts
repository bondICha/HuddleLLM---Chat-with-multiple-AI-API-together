// CustomBot.ts file (you should create this file or add to an existing file where suitable)
import { AsyncAbstractBot, MessageParams } from './abstract-bot';
import { ChatGPTApiBot } from './chatgpt-api';
import { ClaudeApiBot } from './claude-api';
import { getUserConfig, CustomApiConfig, CustomApiProvider, SystemPromptMode } from '~/services/user-config';
import { ChatError, ErrorCode } from '~utils/errors';
import { BedrockApiBot } from './bedrock-api';
import { GeminiApiBot } from './gemini-api'; // Import GeminiApiBot
import { PerplexityApiBot } from './perplexity-api'; // Import PerplexityApiBot
import { VertexClaudeBot } from './vertex-claude'; // Import VertexClaudeBot

export class CustomBot extends AsyncAbstractBot {
    private customBotNumber: number;
    private config: CustomApiConfig | undefined;

    constructor(params: { customBotNumber: number }) {
        super();
        this.customBotNumber = params.customBotNumber;
    }

    async initializeBot() {
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
        const processedSystemMessage = this.processSystemMessage(combinedSystemMessage);

        const provider = config.provider || (
            config.model.includes('anthropic.claude') ? CustomApiProvider.Bedrock : CustomApiProvider.OpenAI
        );

        // Decide which bot to instantiate based on the provider field
        switch (provider) {
            case CustomApiProvider.Bedrock:
                return new BedrockApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingMode: config.thinkingMode,
                    thinkingBudget: config.thinkingBudget,
                });
            case CustomApiProvider.Anthropic:
                return new ClaudeApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    thinkingBudget: config.thinkingBudget,
                    isHostFullPath: config.isHostFullPath,
                }, config.thinkingMode, config.isAnthropicUsingAuthorizationHeader || false);
            case CustomApiProvider.OpenAI:
                return new ChatGPTApiBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: config.isHostFullPath,
                });
            case CustomApiProvider.Google:
                return new GeminiApiBot({
                    geminiApiKey: config.apiKey || customApiKey,
                    geminiApiModel: config.model,
                    geminiApiSystemMessage: processedSystemMessage,
                    geminiApiTemperature: config.temperature,
                });
            case CustomApiProvider.Perplexity:
                return new PerplexityApiBot({
                    apiKey: config.apiKey || customApiKey,
                    model: config.model,
                    host: config.host || customApiHost,
                    isHostFullPath: config.isHostFullPath,
                });
            case CustomApiProvider.VertexAI_Claude:
                return new VertexClaudeBot({
                    apiKey: config.apiKey || customApiKey,
                    host: config.host || customApiHost,
                    model: config.model,
                    temperature: config.temperature,
                    systemMessage: processedSystemMessage,
                    isHostFullPath: config.isHostFullPath,
                });
            default:
                // Log the unsupported provider for debugging before throwing the error
                console.error(`Unsupported provider detected: ${provider}`);
                throw new ChatError(`Unsupported provider: ${provider}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }
    }

    get chatBotName() {
        return this.config?.name
    }

    get avatar() {
        return this.config?.avatar
    }

    async sendMessage(params: MessageParams) {
        // This should route the message sending to the correct internal bot created in initializeBot
        return this.doSendMessageGenerator(params)
    }

    

}
