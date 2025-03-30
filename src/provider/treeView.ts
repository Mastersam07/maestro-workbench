import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import YAML from 'yaml';
import { minimatch } from 'minimatch';

export class MaestroWorkBenchTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private filePatterns: string[];
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
                        isMissing ? 'error' : undefined
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
            });

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

        const fileItems = entries.map((entry) => {
            const fullPath = path.join(folderPath, entry.name);

            const isFolder = entry.isDirectory();
            return new FileItem(
                entry.name,
                isFolder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                vscode.Uri.file(fullPath),
                isFolder ? FileType.Folder : FileType.File
            );
        });

        const filteredItems = fileItems.filter(item => {
            if (item.contextValue === FileType.Folder) {
                return true;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
            const relativePath = path.relative(workspaceRoot, item.resourceUri.fsPath);

            return this.shouldIncludeFile(relativePath);
        });

        const filePaths = filteredItems
            .filter((item) => item.contextValue === FileType.File)
            .map((item) => item.resourceUri.fsPath);

        this.analyzeDependencies(filePaths);

        filteredItems.forEach((item) => {
            if (item.contextValue === FileType.File) {
                const dependencies = this.dependencyMap.get(item.resourceUri.fsPath) || [];
                item.collapsibleState =
                    dependencies.length > 0
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None;
            }
        });

        return filteredItems;
    }

    private shouldIncludeFile(relativePath: string): boolean {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        return this.filePatterns.some(pattern =>
            minimatch(normalizedPath, pattern, { dot: true })
        );
    }

    private createTreeItemsFromPaths(filePaths: string[], rootPath: string): FileItem[] {
        const tree: { [key: string]: any } = {};

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
                isFolder ? FileType.Folder : FileType.File
            );
        });
    }

    private analyzeDependencies(filePaths: string[]): void {
        this.dependencyMap.clear();

        filePaths.forEach((filePath) => {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const parsedDocuments = YAML.parseAllDocuments(fileContent) as any[];

                const dependencies = new Set<string>();

                parsedDocuments.forEach((doc) => {
                    const parsed = doc.toJS();
                    const flows = Array.isArray(parsed) ? parsed : [parsed];

                    flows.forEach((flow) => {
                        if (!flow) return;

                        if (flow.runFlow && flow.runFlow.file) {
                            const dependencyPath = path.resolve(path.dirname(filePath), flow.runFlow.file);
                            dependencies.add(dependencyPath);
                        }

                        if (flow.runScript && flow.runScript.file) {
                            const dependencyPath = path.resolve(path.dirname(filePath), flow.runScript.file);
                            dependencies.add(dependencyPath);
                        }

                        if (flow.addMedia) {
                            if (Array.isArray(flow.addMedia)) {
                                flow.addMedia.forEach((mediaFile: string) => {
                                    const dependencyPath = path.resolve(path.dirname(filePath), mediaFile);
                                    dependencies.add(dependencyPath);
                                });
                            } else if (flow.addMedia.files && Array.isArray(flow.addMedia.files)) {
                                flow.addMedia.files.forEach((mediaFile: string) => {
                                    const dependencyPath = path.resolve(path.dirname(filePath), mediaFile);
                                    dependencies.add(dependencyPath);
                                });
                            }
                        }
                    });
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

        if (contextValue === FileType.File || contextValue === FileType.Dependency) {
            this.command = {
                title: 'Open File',
                command: 'vscode.open',
                arguments: [resourceUri],
            };
        }
    }

    private setIcon() {
        if (this.contextValue === FileType.Dependency) {
            if (this.icon === 'error') {
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconErrored'));
            } else if (this.icon === 'link') {
                this.iconPath = new vscode.ThemeIcon('link', new vscode.ThemeColor('testing.iconPassed'));
            }
        } else if (this.contextValue === FileType.File) {
            this.iconPath = vscode.ThemeIcon.File;
        } else if (this.contextValue === FileType.Folder) {
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }
}