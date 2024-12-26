import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './treeView';

let maestroTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {

	console.log('Maestro-workbench is now active!');

	const treeDataProvider = new MaestroWorkBenchTreeViewProvider();
	vscode.window.registerTreeDataProvider('maestroBenchTreeView', treeDataProvider);

	// Provider
	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.refreshTree', () => {
			treeDataProvider.refresh();
		}),
	);

	// Launch maestro studio
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

	const schemaPath = vscode.Uri.file(path.join(context.extensionPath, "schema", "schema.v0.json")).toString();

	vscode.workspace.getConfiguration().update(
		'yaml.schemas',
		{
			[schemaPath]: [
				'maestro.yaml',
				'**/*.maestro.yaml',
				'**/maestro/**',
				'**/.maestro/**',
			],
		},
		vscode.ConfigurationTarget.Workspace
	);

	// File watcher for changes
	const fileWatcher = vscode.workspace.createFileSystemWatcher(
		'{maestro,**/.maestro}/**/*.{yaml,yml}'
	);

	fileWatcher.onDidCreate(() => {
		console.log('File created. Refreshing tree view...');
		treeDataProvider.refresh();
	});

	fileWatcher.onDidChange(() => {
		console.log('File changed. Refreshing tree view...');
		treeDataProvider.refresh();
	});

	fileWatcher.onDidDelete(() => {
		console.log('File deleted. Refreshing tree view...');
		treeDataProvider.refresh();
	});

	context.subscriptions.push(fileWatcher);
}

export function deactivate() { }