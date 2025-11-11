import * as vscode from 'vscode';
import { GitService, Repository } from './services/gitService';
import { GeminiService } from './services/geminiService';
import { PromptService } from './services/promptService';
import { Logger } from './utils/logger';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function activate(context: vscode.ExtensionContext) {
    Logger.log('Just Commit extension is now active.');

    let disposable = vscode.commands.registerCommand('justcommit.generateCommitMessage', async () => {
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Just Commit',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 10, message: "Finding repository..." });
                const repository: Repository | undefined = await GitService.getActiveRepository();
                if (!repository) {
                    vscode.window.showErrorMessage('No active Git repository found.');
                    return;
                }

                progress.report({ increment: 20, message: "Analyzing changes..." });
                const diff = await GitService.getDiff(repository);

                progress.report({ increment: 40, message: "Creating prompt for AI..." });
                const prompt = PromptService.generatePrompt(diff);
                
                let attempts = 0;
                const maxAttempts = 3;
                let lastError: any = null;

                while (attempts < maxAttempts) {
                    attempts++;
                    try {
                        progress.report({ increment: 60, message: `Generating commit message (Attempt ${attempts}/${maxAttempts})...` });
                        const commitMessage = await GeminiService.generateCommitMessage(prompt, progress);
                        repository.inputBox.value = commitMessage.message;
                        lastError = null; // Clear error on success
                        break; // Exit loop on success
                    } catch (error) {
                        lastError = error;
                        Logger.error(`Failed to generate commit message on attempt ${attempts}`, error as Error);
                        if (attempts < maxAttempts) {
                            progress.report({ message: `Attempt ${attempts} failed. Retrying in 3 seconds...` });
                            await delay(3000);
                        }
                    }
                }

                if (lastError) {
                    const viewLogsOption = 'View Logs';
                    const result = await vscode.window.showErrorMessage(
                        `Failed to generate commit message after ${maxAttempts} attempts.`,
                        viewLogsOption
                    );
                    if (result === viewLogsOption) {
                        Logger.show();
                    }
                }

            } catch (error: any) {
                Logger.error('Failed to generate commit message', error);
                const viewLogsOption = 'View Logs';
                const result = await vscode.window.showErrorMessage(
                    `Failed to generate commit message: ${error.message}`,
                    viewLogsOption
                );
                if (result === viewLogsOption) {
                    Logger.show();
                }
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}