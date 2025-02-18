import * as vscode from 'vscode';
import { MaestroWorkBenchTreeViewProvider } from '../provider/treeView';

class GlobalState {
    maestroTerminal: vscode.Terminal | undefined;
    treeDataProvider: MaestroWorkBenchTreeViewProvider | undefined;
    fileWatcher: vscode.FileSystemWatcher | undefined;

    public envOverrides: Map<string, { [key: string]: string }> = new Map();
}

export const globalState = new GlobalState();