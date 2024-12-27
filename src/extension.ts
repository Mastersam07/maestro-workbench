import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './treeView';

let maestroTerminal: vscode.Terminal | undefined;
let treeDataProvider: MaestroWorkBenchTreeViewProvider | undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined;

export function activate(context: vscode.ExtensionContext) {

	console.log('Maestro-workbench is now active!');

	function updateFileWatcherAndTreeView() {
		const config = vscode.workspace.getConfiguration('maestroWorkbench');
		const filePatterns = config.get<string[]>('filePatterns', [
			'maestro/**/*.{yaml,yml}',
			'**/.maestro/**/*.{yaml,yml}'
		]);

		if (fileWatcher) {
			fileWatcher.dispose();
		}

		fileWatcher = vscode.workspace.createFileSystemWatcher(
			`{${filePatterns.join(',')}}`
		);

		fileWatcher.onDidCreate(() => {
			if (treeDataProvider) treeDataProvider.refresh();
		});

		fileWatcher.onDidChange(() => {
			if (treeDataProvider) treeDataProvider.refresh();
		});

		fileWatcher.onDidDelete(() => {
			if (treeDataProvider) treeDataProvider.refresh();
		});

		context.subscriptions.push(fileWatcher);

		treeDataProvider = new MaestroWorkBenchTreeViewProvider(filePatterns);
		vscode.window.registerTreeDataProvider('maestroBenchTreeView', treeDataProvider);
	}

	updateFileWatcherAndTreeView();

	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('maestroWorkbench.filePatterns')) {
			vscode.window.showInformationMessage('File patterns updated. Refreshing file watcher and tree view...');
			updateFileWatcherAndTreeView();
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.refreshTree', () => {
			if (treeDataProvider) treeDataProvider.refresh();
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.openMaestroStudio', () => {
			if (!maestroTerminal) {
				maestroTerminal = vscode.window.createTerminal({
					name: "Maestro Studio",
				});

				maestroTerminal.sendText("maestro studio");
			}

			maestroTerminal.show();

			maestroTerminal.processId.then((_) => {
				vscode.window.onDidCloseTerminal((closedTerminal) => {
					if (closedTerminal.name === "Maestro Studio") {
						maestroTerminal = undefined;
					}
				});
			});
		})
	);

	context.subscriptions.push(
        vscode.commands.registerCommand('maestroWorkbench.runTest', async (resourceUri: vscode.Uri) => {
            const filePath = resourceUri.fsPath;
            vscode.window.showInformationMessage(`Running test for file: ${filePath}`);
            const terminal = vscode.window.createTerminal('Maestro Test');
            terminal.show();
            terminal.sendText(`maestro test ${filePath}`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('maestroWorkbench.runFolderTests', async (resourceUri: vscode.Uri) => {
            const folderPath = resourceUri.fsPath;
            vscode.window.showInformationMessage(`Running all tests in folder: ${folderPath}`);
            const terminal = vscode.window.createTerminal('Maestro Test');
            terminal.show();
            terminal.sendText(`maestro test ${folderPath}`);
        })
    );

	const schemaPath = vscode.Uri.file(path.join(context.extensionPath, "schema", "schema.v0.json")).toString();
	const currentSchemas = vscode.workspace.getConfiguration('yaml').get('schemas', {});

	vscode.workspace.getConfiguration('yaml').update(
		'schemas',
		{
			...currentSchemas,
			[schemaPath]: [
				'maestro.yaml',
				'**/*.maestro.yaml',
				'**/maestro/**',
				'**/.maestro/**',
			],
		},
		vscode.ConfigurationTarget.Workspace
	);
}

export function deactivate() {
	if (fileWatcher) {
		fileWatcher.dispose();
	}
}