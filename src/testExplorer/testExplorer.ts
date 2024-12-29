import * as vscode from 'vscode';
import { exec } from 'child_process';

import { getFilePatterns, getOrCreateTerminal } from '../utils/utils'

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

export async function runHandler(
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
			console.log('stdout:', stdout)
			console.log('error:', error)
			console.log('stderr:', stderr)
			
			if (error) {
                const errorMessage = stdout.trim() === '' ? stderr : stdout;
                reject(new Error(errorMessage));
            } else {
                resolve();
            }

		});
	});
}

export function watchTestFiles(controller: vscode.TestController) {
	const filePatterns = getFilePatterns();
	const watcher = vscode.workspace.createFileSystemWatcher(`{${filePatterns.join(',')}}`);

	watcher.onDidCreate(uri => {
		addTestFile(controller, uri);
	});

	watcher.onDidChange(uri => {
		updateTestFile(controller, uri);
	});

	watcher.onDidDelete(uri => {
		removeTestFile(controller, uri);
	});

	return watcher;
}

function addTestFile(controller: vscode.TestController, uri: vscode.Uri) {
	const testItem = controller.createTestItem(uri.toString(), uri.path);
	controller.items.add(testItem);
}

function updateTestFile(controller: vscode.TestController, uri: vscode.Uri) {
	const testItem = controller.items.get(uri.toString());
	if (testItem) { }
}

function removeTestFile(controller: vscode.TestController, uri: vscode.Uri) {
	controller.items.delete(uri.toString());
}



export async function refreshTestExplorer(controller: vscode.TestController) {
	controller.items.forEach(item => controller.items.delete(item.id));

	await discoverTests(controller);
}