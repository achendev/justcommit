export interface CommitMessage {
    message: string;
}

export interface ProgressReporter {
    report(value: { message?: string; increment?: number }): void;
}