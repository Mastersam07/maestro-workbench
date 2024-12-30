import * as vscode from 'vscode';
import { MaestroWorkBenchTreeViewProvider } from '../provider/treeView';

class GlobalState {
    maestroTerminal: vscode.Terminal | undefined;
    treeDataProvider: MaestroWorkBenchTreeViewProvider | undefined;
    fileWatcher: vscode.FileSystemWatcher | undefined;
}

export const globalState = new GlobalState();