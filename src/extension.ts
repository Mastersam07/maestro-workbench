import * as vscode from 'vscode';
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './treeView';
import { MaestroPseudoTerminal } from './terminal';
import { IncrementalOutputProcessor } from './terminal_output_processor';

let maestroTerminal: vscode.Terminal | undefined;
let treeDataProvider: MaestroWorkBenchTreeViewProvider | undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined;

function getOrCreateTerminal(): vscode.Terminal {
	if (!maestroTerminal) {
		maestroTerminal = vscode.window.createTerminal({
			name: "Maestro Test",
		});

		maestroTerminal.show();
		vscode.window.onDidCloseTerminal((closedTerminal) => {
			if (closedTerminal.name === "Maestro Test") {
				maestroTerminal = undefined;
			}
		});
	}
	return maestroTerminal;
}

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
			const terminal = getOrCreateTerminal();
			terminal.sendText("maestro studio");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.runTest', async (item: vscode.TreeItem) => {
			const filePath = item.resourceUri!.fsPath;
			vscode.window.showInformationMessage(`Running test for file: ${filePath}`);

			treeDataProvider?.updateTestResult(filePath, 'running');

			const outputProcessor = new IncrementalOutputProcessor((status, errorReason) => {
				if (status === 'fail') {
					treeDataProvider?.updateTestResult(filePath, status);
					vscode.window.showErrorMessage(`Test for "${filePath}" FAILED.\n\nReason:\n${errorReason}`);
				} else {
					treeDataProvider?.updateTestResult(filePath, status);
					vscode.window.showInformationMessage(`Test for "${filePath}" PASSED.`);
				}
			});

			const pseudoTerminal = new MaestroPseudoTerminal(
				`maestro test ${filePath}`,
				(chunk: string) => {
					outputProcessor.processChunk(chunk);
				},
				() => {
					outputProcessor.finalizeProcessing();
				}
			);

			vscode.window.createTerminal({
				name: `Maestro Test: ${path.basename(filePath)}`,
				pty: pseudoTerminal
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.runFolderTests', async (item: vscode.TreeItem) => {
			const folderPath = item.resourceUri!.fsPath;

			// Find all test files in the folder
			const testFiles = await vscode.workspace.findFiles(
				new vscode.RelativePattern(folderPath, '**/*.{yaml,yml}')
			);

			if (!testFiles.length) {
				vscode.window.showInformationMessage(`No test files found in folder: ${folderPath}`);
				return;
			}

			// Set the folder status to 'running'
			treeDataProvider?.updateTestResult(folderPath, 'running');

			const terminal = getOrCreateTerminal();
			terminal.show();
			// terminal.sendText(`maestro test ${folderPath}`);

			let atLeastOneFailed = false;

			for (const testFile of testFiles) {
				const filePath = testFile.fsPath;

				// Set individual test file status to 'running'
				treeDataProvider?.updateTestResult(filePath, 'running');

				// Simulate test execution
				await new Promise((resolve) => {
					setTimeout(() => {
						const result = Math.random() > 0.5 ? 'pass' : 'fail'; // Randomized result

						// Update the file's status
						treeDataProvider?.updateTestResult(filePath, result);

						// Track if at least one test failed
						if (result === 'fail') {
							atLeastOneFailed = true;
						}

						resolve(result);
					}, 1000); // Simulate 1 second per test
				});
			}

			// Update the folder's status based on test results
			const folderResult = atLeastOneFailed ? 'fail' : 'pass';
			treeDataProvider?.updateTestResult(folderPath, folderResult);

			vscode.window.showInformationMessage(
				`Tests completed in folder: ${folderPath}. Result: ${folderResult.toUpperCase()}`
			);
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