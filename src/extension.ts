import * as vscode from 'vscode';
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './provider/treeView';
import { promptForRating } from './utils/rating';
import { globalState } from './state/state';
import { checkYamlExtension, getFilePatterns, getOrCreateTerminal, updateYamlSchemaAssociations } from './utils/utils';
import { watchTestFiles, discoverTests, registerTestProfiles } from './testExplorer/testExplorer';
import { getAvailableDevices } from './utils/device';

let deviceOutputChannel: vscode.OutputChannel;

function updateFileWatcherAndTreeView(controller: vscode.TestController, context: vscode.ExtensionContext) {
	const filePatterns = getFilePatterns();

	globalState.treeDataProvider = new MaestroWorkBenchTreeViewProvider(filePatterns);
	vscode.window.registerTreeDataProvider('maestroBenchTreeView', globalState.treeDataProvider);

	const watcher = watchTestFiles(controller);

	context.subscriptions.push(globalState.fileWatcher ?? watcher);
}

export function activate(context: vscode.ExtensionContext) {
	checkYamlExtension();

	const controller = vscode.tests.createTestController(
		'maestroWorkbenchTestProvider',
		'Maestro Tests'
	);

	context.subscriptions.push(controller);

	discoverTests(controller);
	registerTestProfiles(controller);
	promptForRating(context);
	updateFileWatcherAndTreeView(controller, context);

	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('maestroWorkbench.filePatterns')) {
			vscode.window.showInformationMessage('Maestro File patterns updated. Refreshing workbench...');
			updateFileWatcherAndTreeView(controller, context);
			updateYamlSchemaAssociations(schemaPath);
		}
	});

	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('maestroWorkbench.envVariables')) {
			vscode.window.showInformationMessage('Maestro test variables updated.');
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

	let listDevicesCommand = vscode.commands.registerCommand('maestroWorkbench.listDevices', async () => {
		const devices = await getAvailableDevices();
		
		if (!deviceOutputChannel) {
			deviceOutputChannel = vscode.window.createOutputChannel('Maestro Devices');
		}

		deviceOutputChannel.clear();
		deviceOutputChannel.show(true);

		if (devices.length === 0) {
			deviceOutputChannel.appendLine('No devices found. Please connect a device and try again.');
			return;
		}

		const groupedDevices = devices.reduce((acc, device) => {
			if (!acc[device.type]) {
				acc[device.type] = [];
			}
			acc[device.type].push(device);
			return acc;
		}, {} as Record<string, typeof devices>);

		Object.entries(groupedDevices).forEach(([type, deviceList]) => {
			deviceOutputChannel.appendLine(`\n${type}:`);
			deviceList.forEach(device => {
				deviceOutputChannel.appendLine(`  • ${device.name} (${device.id})`);
			});
		});
	});

	context.subscriptions.push(listDevicesCommand);

	const schemaPath = vscode.Uri.file(path.join(context.extensionPath, "schema", "schema.v0.json")).toString();
	updateYamlSchemaAssociations(schemaPath);
}

export function deactivate() {
	globalState.fileWatcher?.dispose();
	globalState.maestroTerminal?.dispose();
}