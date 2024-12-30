import * as vscode from 'vscode';
import { exec, ChildProcess } from 'child_process';

import { getFilePatterns } from '../utils/utils';
import { globalState } from '../state/state';

export function registerTestProfiles(controller: vscode.TestController) {
	controller.createRunProfile(
		'Run Tests',
		vscode.TestRunProfileKind.Run,
		(request, token) => runHandler(controller, request, token),
		true
	);
}

export async function discoverTests(controller: vscode.TestController) {
	const filePatterns = getFilePatterns();
	const includePattern = `{${filePatterns.join(',')}}`;

	try {
		const files = await vscode.workspace.findFiles(includePattern);
		files.forEach(file => {

			const relativePath = vscode.workspace.asRelativePath(file);
			const testName = relativePath.replace(/\.(yaml|yml)$/, '');

			const testItem = controller.createTestItem(file.path, testName, file);
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

	token.onCancellationRequested(() => {
		queue.forEach(test => run.skipped(test));
		run.end();
	});

	while (queue.length > 0) {
		const test = queue.pop()!;
		if (request.exclude?.includes(test)) {
			continue;
		}

		run.started(test);


		try {
			await executeTest(test, token);
			run.passed(test);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An unknown error occurred.';
			run.failed(test, new vscode.TestMessage(message));
		}
	}

	run.end();
}

function executeTest(test: vscode.TestItem, token: vscode.CancellationToken): Promise<ChildProcess> {
	return new Promise((resolve, reject) => {
		const process = exec(`maestro test ${test.uri?.fsPath}`, (error, stdout, stderr) => {

			if (token.isCancellationRequested) {
				return reject(new Error('Test execution cancelled.'));
			}

			if (error) {
				const errorMessage = stdout.trim() === '' ? stderr : stdout;
				reject(new Error(errorMessage));
			} else {
				resolve(process);
			}

		});

		token.onCancellationRequested(() => {
			process.kill();
			reject(new Error('Test execution cancelled.'));
		});
	});
}

export function watchTestFiles(controller: vscode.TestController) {

	if (globalState.fileWatcher) {
		globalState.fileWatcher?.dispose();
	}

	globalState.fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.{yaml,yml}");

	globalState.fileWatcher.onDidCreate(uri => {
		addTestFile(controller, uri);
		globalState.treeDataProvider?.refresh();
	});

	globalState.fileWatcher.onDidChange(uri => {
		updateTestFile(controller, uri);
		globalState.treeDataProvider?.refresh();
	});

	globalState.fileWatcher.onDidDelete(uri => {
		removeTestFile(controller, uri);
		globalState.treeDataProvider?.refresh();
	});

	return globalState.fileWatcher;
}

function addTestFile(controller: vscode.TestController, uri: vscode.Uri) {
	const relativePath = vscode.workspace.asRelativePath(uri);
	const testName = relativePath.replace(/\.(yaml|yml)$/, '');
	const testItem = controller.createTestItem(uri.path, testName, uri);
	controller.items.add(testItem);
}

function updateTestFile(controller: vscode.TestController, uri: vscode.Uri) {
	removeTestFile(controller, uri);
	addTestFile(controller, uri);
}

function removeTestFile(controller: vscode.TestController, uri: vscode.Uri) {
	controller.items.delete(uri.path);
}



export async function refreshTestExplorer(controller: vscode.TestController) {
	controller.items.forEach(item => controller.items.delete(item.id));

	await discoverTests(controller);
}