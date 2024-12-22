import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
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
        vscode.commands.registerCommand('maestroWorkbench.openMaestroStudio', async () => {
            try {
                const command = os.platform() === 'win32' ? 'maestro.cmd' : 'maestro';
                const child = cp.spawn(command, ['studio'], {
                    shell: true,
                    cwd: vscode.workspace.workspaceFolders
                        ? vscode.workspace.workspaceFolders[0].uri.fsPath
                        : undefined,
                });

                child.stdout.on('data', (data) => {
                    vscode.window.showInformationMessage(`Maestro Studio: ${data.toString()}`);
                });

                child.stderr.on('data', (data) => {
                    vscode.window.showErrorMessage(`Maestro Studio Error: ${data.toString()}`);
                });

                child.on('close', (code) => {
                    if (code === 0) {
                        vscode.window.showInformationMessage('Maestro Studio exited successfully.');
                    } else {
                        vscode.window.showErrorMessage(`Maestro Studio exited with code ${code}.`);
                    }
                });
            } catch (error) {
				console.log(error)
				const message = (error as Error).message;
                vscode.window.showErrorMessage(`Failed to launch Maestro Studio: ${message}`);
            }
        })
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
			'-'
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
