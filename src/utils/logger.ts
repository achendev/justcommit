import * as vscode from 'vscode';

export class Logger {
    private static readonly outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Just Commit');

    static log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [INFO] ${message}`);
    }

    static error(message: string, error?: Error): void {
        const timestamp = new Date().toISOString();
        const errorMessage = error ? `: ${error.message}\n${error.stack}` : '';
        this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}${errorMessage}`);
    }

    static show(): void {
        this.outputChannel.show();
    }
}