import * as vscode from 'vscode';
import { GitService, Repository } from './services/gitService';
import { GeminiService } from './services/geminiService';
import { PromptService } from './services/promptService';
import { Logger } from './utils/logger';
import { ConfigService } from './utils/configService';
import { applyReplacements } from './utils/twoWaySync';
import { StorageService } from './services/storageService';
import { maskIPs, unmaskIPs } from './utils/masking/ipMasking';
import { maskEmails, unmaskEmails } from './utils/masking/emailMasking';
import { maskFQDNs, unmaskFQDNs } from './utils/masking/fqdnMasking';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function activate(context: vscode.ExtensionContext) {
    Logger.log('Just Commit extension is now active.');
    
    // Initialize storage service to allow persistence for masking maps
    StorageService.initialize(context);

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

                // --- OUTGOING PROCESSING ---
                progress.report({ increment: 30, message: "Processing changes..." });

                // 1. Manual Rules (Existing logic)
                if (ConfigService.isTwoWaySyncEnabled()) {
                    const rules = ConfigService.getTwoWaySyncRules();
                    if (rules) {
                        diff = applyReplacements(diff, rules, 'outgoing');
                    }
                }

                // 2. Auto-Masking (New Robust Logic)
                if (ConfigService.shouldMaskIPs()) {
                    diff = await maskIPs(diff);
                }
                if (ConfigService.shouldMaskEmails()) {
                    diff = await maskEmails(diff);
                }
                if (ConfigService.shouldMaskFQDNs()) {
                    diff = await maskFQDNs(diff);
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

                        // --- INCOMING PROCESSING ---
                        progress.report({ increment: 90, message: "Unmasking response..." });

                        // 1. Auto-Unmasking (New Robust Logic) - Reverse order of application
                        if (ConfigService.shouldMaskFQDNs()) {
                            commitMessage.message = await unmaskFQDNs(commitMessage.message);
                        }
                        if (ConfigService.shouldMaskEmails()) {
                            commitMessage.message = await unmaskEmails(commitMessage.message);
                        }
                        if (ConfigService.shouldMaskIPs()) {
                            commitMessage.message = await unmaskIPs(commitMessage.message);
                        }

                        // 2. Manual Rules Unmasking
                        if (ConfigService.isTwoWaySyncEnabled()) {
                            const rules = ConfigService.getTwoWaySyncRules();
                            if (rules) {
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