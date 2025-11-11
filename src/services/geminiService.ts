import axios from 'axios';
import { Logger } from '../utils/logger';
import { ConfigService } from '../utils/configService';
import { CommitMessage, ProgressReporter } from '../models/types';

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
}

export class GeminiService {
    static async generateCommitMessage(prompt: string, progress: ProgressReporter): Promise<CommitMessage> {
        progress.report({ message: 'Calling Gemini API...' });

        const apiKey = ConfigService.getApiKey();
        if (!apiKey) {
            throw new Error('Gemini API key is not set. Please set it in the settings.');
        }

        const model = ConfigService.getModel();
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        try {
            const response = await axios.post<GeminiResponse>(apiUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 20000 // 20 seconds timeout
            });

            const message = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!message) {
                throw new Error('Invalid response from Gemini API.');
            }

            return { message: message.trim() };

        } catch (error: any) {
            Logger.error('Error calling Gemini API', error);
            const errorMessage = error.response?.data?.error?.message || error.message || 'An unknown error occurred.';
            throw new Error(`Gemini API Error: ${errorMessage}`);
        }
    }
}