import * as vscode from 'vscode';
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './provider/treeView';
import { promptForRating } from './utils/rating';
import { globalState } from './state/state';
import { getFilePatterns, getOrCreateTerminal, updateYamlSchemaAssociations } from './utils/utils';
import { watchTestFiles, discoverTests, registerTestProfiles } from './testExplorer/testExplorer';

function updateFileWatcherAndTreeView(controller: vscode.TestController, context: vscode.ExtensionContext) {
	const filePatterns = getFilePatterns();

	globalState.treeDataProvider = new MaestroWorkBenchTreeViewProvider(filePatterns);
	vscode.window.registerTreeDataProvider('maestroBenchTreeView', globalState.treeDataProvider);

	const watcher = watchTestFiles(controller);

	context.subscriptions.push(globalState.fileWatcher ?? watcher);
}

export function activate(context: vscode.ExtensionContext) {

	const controller = vscode.tests.createTestController(
		'maestroWorkbenchTestProvider',
		'Maestro Tests'
	);

	context.subscriptions.push(controller);

	discoverTests(controller);

	registerTestProfiles(controller);

	const TIME_THRESHOLD = 5 * 24 * 60 * 60 * 1000;

	const firstUse = context.globalState.get<number>('firstUse', Date.now());
	const now = Date.now();

	if (now - firstUse >= TIME_THRESHOLD) {
		promptForRating(context);
	}

	updateFileWatcherAndTreeView(controller, context);

	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('maestroWorkbench.filePatterns')) {
			vscode.window.showInformationMessage('Maestro File patterns updated. Refreshing workbench...');
			updateFileWatcherAndTreeView(controller, context);
			updateYamlSchemaAssociations(schemaPath);
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.refreshTree', () => {
			if (globalState.treeDataProvider) { globalState.treeDataProvider.refresh(); }
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.openMaestroStudio', () => {
			const terminal = getOrCreateTerminal();
			terminal.sendText("maestro studio");
		})
	);

	const schemaPath = vscode.Uri.file(path.join(context.extensionPath, "schema", "schema.v0.json")).toString();

	updateYamlSchemaAssociations(schemaPath);
}

export function deactivate() {
	globalState.fileWatcher?.dispose();
	globalState.maestroTerminal?.dispose();
}