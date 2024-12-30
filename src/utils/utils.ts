import * as vscode from 'vscode';
import { globalState } from '../state/state';

export function getFilePatterns(): string[] {
    const config = vscode.workspace.getConfiguration('maestroWorkbench');
    return config.get<string[]>('filePatterns', [
        "maestro/**/*.yaml",
        "maestro/**/*.yml",
        "**/.maestro/**/*.yaml",
        "**/.maestro/**/*.yml"
    ]);
}

export function getOrCreateTerminal(): vscode.Terminal {
    if (!globalState.maestroTerminal) {
        globalState.maestroTerminal = vscode.window.createTerminal({
            name: "Maestro Test",
        });

        globalState.maestroTerminal.show();
        vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (closedTerminal.name === "Maestro Test") {
                globalState.maestroTerminal = undefined;
            }
        });
    }
    return globalState.maestroTerminal;
}