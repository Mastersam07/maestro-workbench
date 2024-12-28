import * as vscode from 'vscode';
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './treeView';
import { IncrementalOutputProcessor } from './terminal_output_processor';
import { exec } from 'child_process';

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

			const outputProcessor = new IncrementalOutputProcessor(
				(_, __) => { },
				(fileName, status, errorReason) => {
					treeDataProvider?.updateTestResult(fileName, status);
					if (status === 'fail') {
						vscode.window.showErrorMessage(`Test for "${fileName}" FAILED.\n\nReason:\n${errorReason}`);
					} else {
						vscode.window.showInformationMessage(`Test for "${fileName}" PASSED.`);
					}
				}
			);

			outputProcessor.setCurrentFile(filePath);

			const process = exec(`maestro test ${filePath}`);

			process.stdout?.on('data', (chunk) => {
				outputProcessor.processChunk(chunk.toString());
			});

			process.stderr?.on('data', (chunk) => {
				outputProcessor.processChunk(chunk.toString());
			});

			process.on('close', () => {
				outputProcessor.finalizeProcessing();
			});

			process.on('error', (err) => {
				vscode.window.showErrorMessage(`Error running test for "${filePath}": ${err.message}`);
				treeDataProvider?.updateTestResult(filePath, 'fail');
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.runFolderTests', async (item: vscode.TreeItem) => {
			const folderPath = item.resourceUri!.fsPath;

			const testFiles = await vscode.workspace.findFiles(
				new vscode.RelativePattern(folderPath, '**/*.{yaml,yml}')
			);

			if (!testFiles.length) {
				vscode.window.showInformationMessage(`No test files found in folder: ${folderPath}`);
				return;
			}

			testFiles.forEach((file) => {
				treeDataProvider?.updateTestResult(file.fsPath, 'running');
			});


			treeDataProvider?.updateTestResult(folderPath, 'running');

			const outputProcessor = new IncrementalOutputProcessor(
				(folderStatus, folderErrorReason) => {
					treeDataProvider?.updateTestResult(folderPath, folderStatus);
					if (folderStatus === 'fail') {
						vscode.window.showErrorMessage(`Tests in folder "${folderPath}" FAILED.\n\nReason:\n${folderErrorReason}`);
					} else {
						vscode.window.showInformationMessage(`Tests in folder "${folderPath}" PASSED.`);
					}
				},
				(fileName, fileStatus, fileErrorReason) => {
					const filePath = path.join(folderPath, fileName);
					treeDataProvider?.updateTestResult(`${filePath}.yaml`, fileStatus);
					if (fileStatus === 'fail') {
						vscode.window.showErrorMessage(`Test for "${filePath}" FAILED.\n\nReason:\n${fileErrorReason}`);
					} else {
						vscode.window.showInformationMessage(`Test for "${filePath}" PASSED.`);
					}
				}
			);

			const process = exec(`maestro test ${folderPath}`);

			process.stdout?.on('data', (chunk) => {
				outputProcessor.processChunk(chunk.toString());
			});

			process.stderr?.on('data', (chunk) => {
				outputProcessor.processChunk(chunk.toString());
			});

			process.on('close', () => {
				outputProcessor.finalizeProcessing();
			});

			process.on('error', (err) => {
				vscode.window.showErrorMessage(`Error running tests in folder "${folderPath}": ${err.message}`);
				treeDataProvider?.updateTestResult(folderPath, 'fail');
			});
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