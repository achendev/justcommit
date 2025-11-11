import * as vscode from 'vscode';

export class ConfigService {
    private static getConfig() {
        return vscode.workspace.getConfiguration('justcommit.gemini');
    }

    static getApiKey(): string {
        return this.getConfig().get<string>('apiKey') || '';
    }

    static getModel(): string {
        return this.getConfig().get<string>('model') || 'gemini-flash-lite-latest';
    }

    static getCustomInstructions(): string {
        return this.getConfig().get<string>('customInstructions') || "Answer with very shortly commit message based on the changes, also use categories, Feature, Refactor, Fix, etc..., don't shorhener Feature to Feat.";
    }
}