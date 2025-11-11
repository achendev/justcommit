import { ConfigService } from '../utils/configService';

export class PromptService {
    static generatePrompt(diff: string): string {
        const customInstructions = ConfigService.getCustomInstructions();

        return `${customInstructions}

Git diff to analyze:
${diff}

Please provide ONLY the commit message, without any additional text or explanations.`;
    }
}