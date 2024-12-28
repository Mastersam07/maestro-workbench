import * as vscode from 'vscode';

export class MaestroPseudoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<number> = this.closeEmitter.event;

    private command: string;
    private onOutputCallback: (output: string) => void;
    private onCloseCallback: () => void;

    constructor(command: string, onOutputCallback: (output: string) => void, onCloseCallback: () => void) {
        this.command = command;
        this.onOutputCallback = onOutputCallback;
        this.onCloseCallback = onCloseCallback;
    }

    open(): void {
        this.runCommand();
    }

    close(): void { }

    private runCommand(): void {
        const spawn = require('child_process').spawn;
        const process = spawn(this.command, { shell: true });

        process.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            this.writeEmitter.fire(output);
            this.onOutputCallback(output);
        });

        process.stderr.on('data', (data: Buffer) => {
            const errorOutput = data.toString();
            this.writeEmitter.fire(`\x1b[31m${errorOutput}\x1b[0m`);
        });

        process.on('close', (code: number | null) => {
            this.closeEmitter.fire(code ?? 0);
            this.onCloseCallback();
        });
    }
}
