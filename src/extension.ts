import * as vscode from 'vscode';
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './treeView';
import { IncrementalOutputProcessor } from './terminal_output_processor';
import { exec } from 'child_process';
import { promptForRating } from './rating';

let maestroTerminal: vscode.Terminal | undefined;
let treeDataProvider: MaestroWorkBenchTreeViewProvider | undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined;

function getFilePatterns(): string[] {
	const config = vscode.workspace.getConfiguration('maestroWorkbench');
	return config.get<string[]>('filePatterns', [
		"maestro/**/*.yaml",
		"maestro/**/*.yml",
		"**/.maestro/**/*.yaml",
		"**/.maestro/**/*.yml"
	]);
}

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

	const controller = vscode.tests.createTestController(
		'maestroWorkbenchTestProvider',
		'Maestro Workbench Tests'
	);

	context.subscriptions.push(controller);

	// Discover and add test items to the controller
	discoverTests(controller);

	// Create run profiles for running tests
	controller.createRunProfile(
		'Run Tests',
		vscode.TestRunProfileKind.Run,
		(request, token) => runHandler(controller, request, token),
		true
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.runTest', (item: vscode.TestItem) => {
			runSingleTest(controller, item);
		}),
		vscode.commands.registerCommand('maestroWorkbench.runFolderTests', (folderUri: vscode.Uri) => {
			runFolderTests(controller, folderUri);
		})
	);

	const TIME_THRESHOLD = 5 * 24 * 60 * 60 * 1000;

	const firstUse = context.globalState.get<number>('firstUse', Date.now());
	const now = Date.now();

	if (now - firstUse >= TIME_THRESHOLD) {
		promptForRating(context);
	}

	function updateFileWatcherAndTreeView() {
		const filePatterns = getFilePatterns();

		treeDataProvider = new MaestroWorkBenchTreeViewProvider(filePatterns);
		vscode.window.registerTreeDataProvider('maestroBenchTreeView', treeDataProvider);

		if (fileWatcher) {
			fileWatcher.dispose();
		}

		fileWatcher = vscode.workspace.createFileSystemWatcher(
			`{${filePatterns.join(',')}}`
		);

		fileWatcher.onDidCreate(() => {
			if (treeDataProvider) { treeDataProvider.refresh(); }
		});

		fileWatcher.onDidChange(() => {
			if (treeDataProvider) { treeDataProvider.refresh(); }
		});

		fileWatcher.onDidDelete(() => {
			if (treeDataProvider) { treeDataProvider.refresh(); }
		});

		context.subscriptions.push(fileWatcher);
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
			if (treeDataProvider) { treeDataProvider.refresh(); }
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

async function discoverTests(controller: vscode.TestController) {
	const filePatterns = getFilePatterns();
	const includePattern = `{${filePatterns.join(',')}}`;

	try {
		const files = await vscode.workspace.findFiles(includePattern);
		files.forEach(file => {
			console.log('Discovered test file:', file.fsPath);
			const testItem = controller.createTestItem(file.path, file.path, file);
			controller.items.add(testItem);
		});
	} catch (error) {
		console.error('Error discovering test files:', error);
	}
}

async function runHandler(
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	token: vscode.CancellationToken
) {
	const run = controller.createTestRun(request);

	const queue: vscode.TestItem[] = request.include ? [...request.include] : [];
	if (!request.include) {
		controller.items.forEach((testItem) => {
			queue.push(testItem);
		});
	}

	while (queue.length > 0) {
		const test = queue.pop()!;
		if (request.exclude?.includes(test)) {
			continue;
		}

		run.started(test);

		try {
			await executeTest(test);
			run.passed(test);
		} catch (error) {
			if (error instanceof Error) {
				run.failed(test, new vscode.TestMessage(error.message));
			} else {
				run.failed(test, new vscode.TestMessage('An unknown error occurred.'));
			}
		}
	}

	run.end();
}

function executeTest(test: vscode.TestItem): Promise<void> {
	return new Promise((resolve, reject) => {
		exec(`maestro test ${test.uri?.fsPath}`, (error, stdout, stderr) => {
			if (error) {
				reject(new Error(stderr));
			} else {
				resolve();
			}
		});
	});
}

function runSingleTest(controller: vscode.TestController, item: vscode.TestItem) {
	const request = new vscode.TestRunRequest([item]);
	runHandler(controller, request, new vscode.CancellationTokenSource().token);
}

async function runFolderTests(controller: vscode.TestController, folderUri: vscode.Uri) {
	const pattern = new vscode.RelativePattern(folderUri.fsPath, '**/*.maestro.yaml');
	const files = await vscode.workspace.findFiles(pattern);

	const testItems = files.map((file) => {
		let testItem = controller.items.get(file.path);
		if (!testItem) {
			testItem = controller.createTestItem(file.path, file.path, file);
			controller.items.add(testItem);
		}
		return testItem;
	});

	const request = new vscode.TestRunRequest(testItems);
	runHandler(controller, request, new vscode.CancellationTokenSource().token);
}
