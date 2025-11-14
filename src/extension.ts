import * as vscode from 'vscode';
import { GitService, Repository } from './services/gitService';
import { GeminiService } from './services/geminiService';
import { PromptService } from './services/promptService';
import { Logger } from './utils/logger';
import { ConfigService } from './utils/configService';
import { applyReplacements } from './utils/twoWaySync';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function activate(context: vscode.ExtensionContext) {
    Logger.log('Just Commit extension is now active.');

    let disposable = vscode.commands.registerCommand('justcommit.generateCommitMessage', async (sourceControl?: vscode.SourceControl) => {
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Just Commit',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 10, message: "Finding repository..." });
                const repository: Repository | undefined = await GitService.getActiveRepository(sourceControl);
                if (!repository) {
                    vscode.window.showErrorMessage('No active Git repository found.');
                    return;
                }

                progress.report({ increment: 20, message: "Analyzing changes..." });
                let diff = await GitService.getDiff(repository);

                if (ConfigService.isTwoWaySyncEnabled()) {
                    const rules = ConfigService.getTwoWaySyncRules();
                    if (rules) {
                        progress.report({ increment: 30, message: "Applying replacements..." });
                        diff = applyReplacements(diff, rules, 'outgoing');
                    }
                }

                progress.report({ increment: 40, message: "Creating prompt for AI..." });
                const prompt = PromptService.generatePrompt(diff);
                
                let attempts = 0;
                const maxAttempts = 3;
                let lastError: any = null;

                while (attempts < maxAttempts) {
                    attempts++;
                    try {
                        progress.report({ increment: 60, message: `Generating commit message (Attempt ${attempts}/${maxAttempts})...` });
                        let commitMessage = await GeminiService.generateCommitMessage(prompt, progress);

                        if (ConfigService.isTwoWaySyncEnabled()) {
                            const rules = ConfigService.getTwoWaySyncRules();
                            if (rules) {
                                progress.report({ increment: 90, message: "Reverting replacements..." });
                                commitMessage.message = applyReplacements(commitMessage.message, rules, 'incoming');
                            }
                        }

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