import * as vscode from 'vscode';
import * as path from 'path';

export class MaestroWorkBenchTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> =
        new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> =
        this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            const yamlFiles = vscode.workspace.findFiles("{maestro,**/.maestro}/**/*.{yaml,yml}");
            return yamlFiles.then((files) =>
                files.map(
                    (file) =>
                        new vscode.TreeItem(
                            vscode.workspace.asRelativePath(file),
                            vscode.TreeItemCollapsibleState.None
                        )
                )
            );
        }
        return Promise.resolve([]);
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
