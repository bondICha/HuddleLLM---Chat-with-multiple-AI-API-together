// CustomBot.ts file (you should create this file or add to an existing file where suitable)
import { AsyncAbstractBot, MessageParams } from './abstract-bot';
import { ChatGPTApiBot } from './chatgpt-api';
import { ClaudeApiBot } from './claude-api';
import { getUserConfig, customApiConfig, CustomApiProvider } from '~/services/user-config';
import { ChatError, ErrorCode } from '~utils/errors';
import { BedrockApiBot } from './bedrock-api';

export class CustomBot extends AsyncAbstractBot {
    private customBotNumber: number;
    private config: customApiConfig | undefined;

    constructor(params: { customBotNumber: number }) {
        super();
        this.customBotNumber = params.customBotNumber;
    }

    async initializeBot() {
        const { customApiKey, customApiHost, customApiConfigs } = await getUserConfig();
        const config = customApiConfigs[this.customBotNumber - 1]; // Adjust for zero-index array

        if (!config) {
            throw new ChatError(`No configuration found for bot number ${this.customBotNumber}`, ErrorCode.CUSTOMBOT_CONFIGURATION_ERROR);
        }
        this.config = config

        // プロバイダーが設定されていない場合は、モデル名に基づいて推測する（後方互換性のため）
        const provider = config.provider || (
            config.model.includes('anthropic.claude') ? CustomApiProvider.Bedrock : CustomApiProvider.OpenAI
        );

        // Decide which bot to instantiate based on the provider field
        switch (provider) {
            case CustomApiProvider.Bedrock:
                return new BedrockApiBot({
                    claudeApiKey: config.apiKey || customApiKey,
                    claudeApiHost: config.host || customApiHost,
                    claudeApiModel: config.model,
                    claudeApiTemperature: config.temperature,
                    claudeApiSystemMessage: config.systemMessage,
                    // Pass the thinkingMode and thinkingBudget values
                    thinkingMode: config.thinkingMode,
                    thinkingBudget: config.thinkingBudget,
                });
            case CustomApiProvider.Anthropic:
                return new ClaudeApiBot({
                    claudeApiKey: config.apiKey || customApiKey,
                    claudeApiHost: config.host || customApiHost,
                    claudeApiModel: config.model,
                    claudeApiTemperature: config.temperature,
                    claudeApiSystemMessage: config.systemMessage,
                    claudeThinkingBudget: config.thinkingBudget,
                }, config.thinkingMode, true); // useCustomAuthorizationHeader = true
            case CustomApiProvider.OpenAI:
                return new ChatGPTApiBot({
                    openaiApiKey: config.apiKey || customApiKey,
                    openaiApiHost: config.host || customApiHost,
                    chatgptApiModel: config.model,
                    chatgptApiTemperature: config.temperature,
                    chatgptApiSystemMessage: config.systemMessage,
                });
            default:
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
