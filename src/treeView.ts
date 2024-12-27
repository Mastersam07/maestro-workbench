import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export class MaestroWorkBenchTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private filePatterns: string[];
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> =
        new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> =
        this._onDidChangeTreeData.event;

    constructor(filePatterns: string[]) {
        this.filePatterns = filePatterns;
    }


    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileItem): Promise<FileItem[]> {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return [];
        }

        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;

        if (element) {
            return this.getFilesInFolder(element.resourceUri.fsPath);
        } else {
            const allFiles = await this.findFiles();
            return this.createTreeItemsFromPaths(allFiles, workspaceFolder);
        }
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private async findFiles(): Promise<string[]> {
        const patterns = `{${this.filePatterns.join(',')}}`;
        const files = await vscode.workspace.findFiles(patterns);
        return files.map((file) => file.fsPath);
    }

    private async getFilesInFolder(folderPath: string): Promise<FileItem[]> {
        const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
        return entries.map((entry) => {
            const fullPath = path.join(folderPath, entry.name);
            const isFolder = entry.isDirectory();
            return new FileItem(
                entry.name,
                isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                vscode.Uri.file(fullPath),
                isFolder ? FileItemContextValue.Folder : FileItemContextValue.File
            );
        });
    }

    private createTreeItemsFromPaths(filePaths: string[], rootPath: string): FileItem[] {
        const tree: { [key: string]: any } = {};

        // Build a hierarchical structure
        filePaths.forEach((filePath) => {
            const relativePath = path.relative(rootPath, filePath);
            const parts = relativePath.split(path.sep);

            let currentLevel = tree;
            parts.forEach((part, index) => {
                if (!currentLevel[part]) {
                    currentLevel[part] = index === parts.length - 1 ? filePath : {};
                }
                currentLevel = currentLevel[part];
            });
        });

        return this.buildTreeItems(tree, rootPath);
    }

    private buildTreeItems(tree: any, parentPath: string): FileItem[] {
        return Object.entries(tree).map(([key, value]) => {
            const fullPath = path.join(parentPath, key);
            const isFolder = typeof value === 'object';
            return new FileItem(
                key,
                isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                vscode.Uri.file(fullPath),
                isFolder ? FileItemContextValue.Folder : FileItemContextValue.File
            );
        });
    }
}

enum FileItemContextValue {
    File = 'file',
    Folder = 'folder',
}

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly contextValue: FileItemContextValue
    ) {
        super(label, collapsibleState);
        this.resourceUri = resourceUri;
        this.contextValue = contextValue;

        if (contextValue === FileItemContextValue.File) {
            this.command = {
                title: 'Open File',
                command: 'vscode.open',
                arguments: [resourceUri],
            };
            this.iconPath = vscode.ThemeIcon.File;
        } else if (contextValue === FileItemContextValue.Folder) {
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }
}