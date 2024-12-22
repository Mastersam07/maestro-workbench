import * as vscode from 'vscode';

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
            return Promise.resolve([
                new MaestroTreeItem("Maestro Files", vscode.TreeItemCollapsibleState.Collapsed, "filesSection"),
                new MaestroTreeItem("Actions", vscode.TreeItemCollapsibleState.None, "actionsSection"),
            ]);
        }

        // Add children to the collapsible "Maestro Files" section
        if (element.contextValue === "filesSection") {
            const yamlFiles = vscode.workspace.findFiles("{maestro,**/.maestro}/**/*.{yaml,yml}");
            return yamlFiles.then((files) =>
                files.map(
                    (file) =>
                        new MaestroTreeItem(
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

class MaestroTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.command = command;
    }
}
