import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

// Minimal interfaces for the VS Code Git extension API
interface GitExtension {
    getAPI(version: 1): API;
    readonly exports: {
        getAPI(version: 1): API;
    };
    readonly isActive: boolean;
    activate(): Thenable<any>;
}

interface API {
    repositories: Repository[];
}

export interface Repository {
    readonly state: State;
    diff(cached?: boolean): Promise<string>;
    readonly inputBox: { value: string };
    readonly rootUri: vscode.Uri;
}

interface State {
    readonly workingTreeChanges: readonly Change[];
}

enum Status {
    INDEX_MODIFIED = 0,
    INDEX_ADDED = 1,
    INDEX_DELETED = 2,
    INDEX_RENAMED = 3,
    INDEX_COPIED = 4,
    MODIFIED = 5,
    DELETED = 6,
    UNTRACKED = 7,
    IGNORED = 8,
    INTENT_TO_ADD = 9,
    BOTH_DELETED = 10,
    BOTH_ADDED = 11,
    BOTH_MODIFIED = 12
}

interface Change {
    readonly uri: vscode.Uri;
    readonly status: Status;
}

export class GitService {
    static async getActiveRepository(): Promise<Repository | undefined> {
        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!extension) {
            vscode.window.showErrorMessage('Git extension not found.');
            return undefined;
        }
        
        if (!extension.isActive) {
            await extension.activate();
        }
        
        const gitAPI = extension.exports.getAPI(1);
        const repositories = gitAPI.repositories;

        if (repositories.length === 0) {
            vscode.window.showErrorMessage('No Git repositories found.');
            return undefined;
        }

        if (repositories.length === 1) {
            return repositories[0];
        }

        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const activeFile = activeEditor.document.uri;
            const activeRepo = repositories.find(repo => {
                if (!repo.rootUri) { return false; }
                return activeFile.fsPath.startsWith(repo.rootUri.fsPath);
            });
            if (activeRepo) {
                return activeRepo;
            }
        }
        
        return repositories[0];
    }
    
    static async getDiff(repository: Repository): Promise<string> {
        try {
            const diffs: string[] = [];

            const stagedDiff = await repository.diff(true);
            if (stagedDiff.trim()) {
                diffs.push('--- Staged Changes ---\n' + stagedDiff);
            }

            const unstagedDiff = await repository.diff(false);
            if (unstagedDiff.trim()) {
                diffs.push('--- Unstaged Changes ---\n' + unstagedDiff);
            }
            
            const untrackedFiles = repository.state.workingTreeChanges
                .filter(change => change.status === Status.UNTRACKED)
                .map(change => vscode.workspace.asRelativePath(change.uri, false));

            if (untrackedFiles.length > 0) {
                diffs.push('--- New Files ---\n' + untrackedFiles.join(', '));
            }

            const combinedDiff = diffs.join('\n\n');

            if (!combinedDiff.trim()) {
                throw new Error('No changes detected in the repository.');
            }
            
            return combinedDiff;
        } catch (error) {
            Logger.error('Error getting diff', error as Error);
            throw error;
        }
    }
}