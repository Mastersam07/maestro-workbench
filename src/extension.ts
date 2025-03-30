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

	const schemaPath = vscode.Uri.file(path.join(context.extensionPath, "schema", "schema.v0.json")).toString();

	const controller = vscode.tests.createTestController(
		'maestroWorkbenchTestProvider',
		'Maestro Tests'
	);

	context.subscriptions.push(controller);

	// Register document link provider for runFlow references
	const linkProvider = vscode.languages.registerDocumentLinkProvider(
		{ scheme: 'file', language: 'yaml' },
		{
			async provideDocumentLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
				const links: vscode.DocumentLink[] = [];
				const text = document.getText();
				const runFlowRegex = /-?\s*runFlow:\s*(?:['"]([^'"]+)['"]|([^\s]+))/g;
				const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

				console.log('Document text:', text);
				console.log('Looking for runFlow references...');

				if (!workspaceFolder) {
					return links;
				}

				let match;
				while ((match = runFlowRegex.exec(text)) !== null) {
					console.log('Found match:', match);
					const filePath = match[1] || match[2];
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);

					console.log('File path:', filePath);
					console.log('Start position:', startPos);
					console.log('End position:', endPos);

					// Try to resolve the file path
					const targetPath = path.resolve(path.dirname(document.uri.fsPath), filePath);
					const targetUri = vscode.Uri.file(targetPath);

					console.log('Target path:', targetPath);

					try {
						await vscode.workspace.fs.stat(targetUri);
						links.push(new vscode.DocumentLink(
							new vscode.Range(startPos, endPos),
							targetUri
						));
						console.log('Added link for:', targetPath);
					} catch (error) {
						console.log('File not found:', targetPath);
						// File doesn't exist, skip this link
						continue;
					}
				}

				console.log('Total links found:', links.length);
				return links;
			}
		}
	);

	context.subscriptions.push(linkProvider);

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
		if (!deviceOutputChannel) {
			deviceOutputChannel = vscode.window.createOutputChannel('Maestro Devices');
		}

		deviceOutputChannel.clear();
		deviceOutputChannel.show(true);
		deviceOutputChannel.appendLine('Fetching available devices...');

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Fetching Maestro Devices",
			cancellable: false
		}, async (progress) => {
			progress.report({ message: "Scanning for devices..." });
			const devices = await getAvailableDevices();
			
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
	});

	context.subscriptions.push(listDevicesCommand);
}

export function deactivate() {
	globalState.fileWatcher?.dispose();
	globalState.maestroTerminal?.dispose();
}