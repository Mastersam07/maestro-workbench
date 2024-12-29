import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export class MaestroWorkBenchTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private filePatterns: string[];
    private fileItemCache: Map<string, FileItem> = new Map();

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
            const treeItems = this.createTreeItemsFromPaths(allFiles, workspaceFolder);
            treeItems.forEach(item => this.fileItemCache.set(item.resourceUri.fsPath, item));
            return treeItems;
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

            let fileItem = this.fileItemCache.get(fullPath);
            if (!fileItem) {
                const isFolder = entry.isDirectory();
                fileItem = new FileItem(
                    entry.name,
                    isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    vscode.Uri.file(fullPath),
                    isFolder ? FileType.Folder : FileType.File
                );
                this.fileItemCache.set(fullPath, fileItem);
            }
            return fileItem;
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

            let fileItem = this.fileItemCache.get(fullPath);
            if (!fileItem) {
                const isFolder = typeof value === 'object';
                fileItem = new FileItem(
                    key,
                    isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    vscode.Uri.file(fullPath),
                    isFolder ? FileType.Folder : FileType.File
                );
                this.fileItemCache.set(fullPath, fileItem);
            }
            return fileItem;
        });
    }
}

enum FileType {
    File = 'file',
    Folder = 'folder',
}

class FileItem extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly contextValue: FileType
    ) {
        super(label, collapsibleState);
        this.resourceUri = resourceUri;
        this.contextValue = contextValue;

        if (contextValue === FileType.File) {
            this.command = {
                title: 'Open File',
                command: 'vscode.open',
                arguments: [resourceUri],
            };
        } else{
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }
}