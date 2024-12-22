import * as vscode from 'vscode';
import { MaestroWorkBenchTreeViewProvider } from './treeView';

export function activate(context: vscode.ExtensionContext) {

	console.log('Maestro-workbench is now active!');

	const treeDataProvider = new MaestroWorkBenchTreeViewProvider();
	vscode.window.registerTreeDataProvider('maestroBenchTreeView', treeDataProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.refreshTree', () => {
			treeDataProvider.refresh();
		}),
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ language: 'yaml', scheme: 'file' },
			{
				provideCompletionItems(document, position, token, context) {
					const commands = [
						'tapOn',
						'assertVisible',
						'assertNotVisible',
						'runFlow',
						'repeat',
						'launchApp'
					];

					return commands.map((cmd) => {
						const item = new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Method);
						item.detail = `Maestro Command: ${cmd}`;
						item.documentation = `Insert the ${cmd} command in your Maestro YAML flow.`;
						return item;
					});
				}
			},
			'-' // Trigger completion after typing "-"
		)
	);

	const fileWatcher = vscode.workspace.createFileSystemWatcher(
		'{maestro,**/.maestro}/**/*.{yaml,yml}'
	);

	// File watcher events
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

	const diagnosticCollection = vscode.languages.createDiagnosticCollection('maestro');

	vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId === 'yaml') {
			const diagnostics: vscode.Diagnostic[] = [];
			const text = event.document.getText();

			if (!text.includes('appId:')) {
				const firstLine = event.document.lineAt(0).range;
				diagnostics.push(
					new vscode.Diagnostic(
						firstLine,
						'Missing required "appId" property in Maestro YAML.',
						vscode.DiagnosticSeverity.Error
					)
				);
			}

			diagnosticCollection.set(event.document.uri, diagnostics);
		}
	});

	context.subscriptions.push(diagnosticCollection);
}

export function deactivate() { }
