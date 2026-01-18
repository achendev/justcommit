import * as vscode from 'vscode';

export class StorageService {
    private static context: vscode.ExtensionContext;

    static initialize(context: vscode.ExtensionContext) {
        this.context = context;
    }

    static get<T>(key: string, defaultValue: T): T {
        if (!this.context) {
            throw new Error("StorageService not initialized");
        }
        return this.context.globalState.get<T>(key, defaultValue);
    }

    static async update(key: string, value: any): Promise<void> {
        if (!this.context) {
            throw new Error("StorageService not initialized");
        }
        await this.context.globalState.update(key, value);
    }
}