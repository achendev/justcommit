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
        return this.getConfig().get<string>('customInstructions') || "Answer with a very short commit message based on the changes. Also use categories like Feature, Refactor, Fix, etc. Don't shorten Feature to Feat. The commit message must be a single line.";
    }

    static isTwoWaySyncEnabled(): boolean {
        return this.getConfig().get<boolean>('twoWaySyncEnabled') || false;
    }

    static getTwoWaySyncRules(): string {
        return this.getConfig().get<string>('twoWaySyncRules') || '';
    }

    static shouldMaskIPs(): boolean {
        return this.getConfig().get<boolean>('autoMaskIPs') || false;
    }

    static shouldMaskEmails(): boolean {
        return this.getConfig().get<boolean>('autoMaskEmails') || false;
    }

    static shouldMaskFQDNs(): boolean {
        return this.getConfig().get<boolean>('autoMaskFQDNs') || false;
    }
}