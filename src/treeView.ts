import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

export class MaestroWorkBenchTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private filePatterns: string[];
    private fileItemCache: Map<string, FileItem> = new Map();
    private dependencyMap: Map<string, string[]> = new Map();

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
            console.log(`element.contextValue: ${element.contextValue}`)
            if (element.contextValue === FileType.File) {
                const dependencies = this.dependencyMap.get(element.resourceUri.fsPath) || [];
                const uniqueDependencies = new Set(dependencies);
                return Array.from(uniqueDependencies).map((dep) => {
                    const isMissing = !fs.existsSync(dep);
                    return new FileItem(
                        path.basename(dep),
                        vscode.TreeItemCollapsibleState.None,
                        vscode.Uri.file(dep),
                        FileType.Dependency,
                        isMissing ? 'Missing dependency' : 'Dependency',
                        isMissing ? 'error' : 'link'
                    );
                });
            }

            return this.getFilesInFolder(element.resourceUri.fsPath);
        } else {
            const allFiles = await this.findFiles();
            this.analyzeDependencies(allFiles);
            const treeItems = this.createTreeItemsFromPaths(allFiles, workspaceFolder);

            treeItems.forEach(item => {
                if (item.contextValue === FileType.File) {
                    const dependencies = this.dependencyMap.get(item.resourceUri.fsPath) || [];
                    item.collapsibleState =
                        dependencies.length > 0
                            ? vscode.TreeItemCollapsibleState.Collapsed
                            : vscode.TreeItemCollapsibleState.None;
                }
                this.fileItemCache.set(item.resourceUri.fsPath, item);
            });

            return treeItems;
        }
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public updateTestResult(filePath: string, result: 'pass' | 'fail' | 'running' | undefined): void {
        const fileItem = this.fileItemCache.get(filePath);
        if (fileItem) {
            fileItem.testResult = result;
            this._onDidChangeTreeData.fire(fileItem);
        }
    }

    private async findFiles(): Promise<string[]> {
        const patterns = `{${this.filePatterns.join(',')}}`;
        const files = await vscode.workspace.findFiles(patterns);
        return files.map((file) => file.fsPath);
    }

    private async getFilesInFolder(folderPath: string): Promise<FileItem[]> {
        const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

        const fileItems = entries.map((entry) => {
            const fullPath = path.join(folderPath, entry.name);
            const isFolder = entry.isDirectory();

            let fileItem = this.fileItemCache.get(fullPath);
            if (!fileItem) {
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

        const filePaths = fileItems
            .filter((item) => item.contextValue === FileType.File)
            .map((item) => item.resourceUri.fsPath);

        this.analyzeDependencies(filePaths);

        fileItems.forEach((item) => {
            if (item.contextValue === FileType.File) {
                const dependencies = this.dependencyMap.get(item.resourceUri.fsPath) || [];
                item.collapsibleState =
                    dependencies.length > 0
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None;
            }
        });

        return fileItems;
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

    private analyzeDependencies(filePaths: string[]): void {
        this.dependencyMap.clear();

        filePaths.forEach((filePath) => {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const parsedDocuments = yaml.loadAll(fileContent) as any[];

                const dependencies = new Set<string>();

                parsedDocuments.forEach((doc) => {
                    if (Array.isArray(doc)) {
                        doc.forEach((flow) => {
                            if (flow.runFlow && flow.runFlow.file) {
                                const dependencyPath = path.resolve(path.dirname(filePath), flow.runFlow.file);
                                dependencies.add(dependencyPath);
                            }
                        });
                    }
                });

                this.dependencyMap.set(filePath, Array.from(dependencies));
            } catch (error) {
                console.error(`Failed to parse YAML file ${filePath}:`, error);
            }
        });
    }
}

enum FileType {
    File = 'file',
    Folder = 'folder',
    Dependency = 'dependency',
}

class FileItem extends vscode.TreeItem {
    private _testResult: 'pass' | 'fail' | 'running' | undefined;

    constructor(
        public readonly label: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly contextValue: FileType,
        public readonly tooltip?: string,
        private readonly icon?: string
    ) {
        super(label, collapsibleState);
        this.resourceUri = resourceUri;
        this.contextValue = contextValue;

        this.setIcon();

        this.updateIcon();

        if (contextValue === FileType.File) {
            this.command = {
                title: 'Open File',
                command: 'vscode.open',
                arguments: [resourceUri],
            };
        }
    }

    get testResult(): 'pass' | 'fail' | 'running' | undefined {
        return this._testResult;
    }

    set testResult(result: 'pass' | 'fail' | 'running' | undefined) {
        this._testResult = result;
        this.updateIcon();
    }

    private setIcon() {
        if (this.icon) {
            this.iconPath = new vscode.ThemeIcon(this.icon);
        } else if (this.contextValue === FileType.File) {
            this.iconPath = vscode.ThemeIcon.File;
        } else if (this.contextValue === FileType.Folder) {
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }

    private updateIcon() {
        switch (this._testResult) {
            case 'pass':
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                break;
            case 'fail':
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
                break;
            case 'running':
                this.iconPath = new vscode.ThemeIcon('loading~spin');
                break;
            default:
                this.iconPath = vscode.ThemeIcon.File;
                break;
        }
    }
}