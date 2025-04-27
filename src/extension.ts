import * as vscode from 'vscode';
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './provider/treeView';
import { promptForRating } from './utils/rating';
import { globalState } from './state/state';
import { checkYamlExtension, getFilePatterns, getOrCreateTerminal, updateYamlSchemaAssociations } from './utils/utils';
import { watchTestFiles, discoverTests, registerTestProfiles } from './testExplorer/testExplorer';
import { getAvailableDevices } from './utils/device';
import * as fs from 'fs';

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
				console.log(`\n=== Processing document: ${document.uri.fsPath} ===`);
				const links: vscode.DocumentLink[] = [];
				const text = document.getText();
				const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

				if (!workspaceFolder) {
					console.log('No workspace folder found, returning empty links');
					return links;
				}

				// Handle runFlow references
				console.log('\n--- Processing runFlow references ---');
				const runFlowRegex = /-?\s*runFlow:\s*(?:['"]([^'"]+)['"]|([^\s]+))/g;
				let match;
				while ((match = runFlowRegex.exec(text)) !== null) {
					const filePath = match[1] || match[2];
					console.log(`Found runFlow reference: "${filePath}"`);
					
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);
					console.log(`Position: ${startPos.line}:${startPos.character} to ${endPos.line}:${endPos.character}`);

					const targetPath = path.resolve(path.dirname(document.uri.fsPath), filePath);
					console.log(`Resolved target path: ${targetPath}`);
					
					if (fs.existsSync(targetPath)) {
						console.log('Target file exists, creating link');
						links.push(new vscode.DocumentLink(
							new vscode.Range(startPos, endPos),
							vscode.Uri.file(targetPath)
						));
					} else {
						console.log('Target file does not exist, skipping link');
					}
				}

				// Handle runScript references
				console.log('\n--- Processing runScript references ---');
				const runScriptRegex = /-?\s*runScript:\s*(?:['"]([^'"]+)['"]|([^\s]+))/g;
				while ((match = runScriptRegex.exec(text)) !== null) {
					const filePath = match[1] || match[2];
					console.log(`Found runScript reference: "${filePath}"`);
					
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);
					console.log(`Position: ${startPos.line}:${startPos.character} to ${endPos.line}:${endPos.character}`);

					const targetPath = path.resolve(path.dirname(document.uri.fsPath), filePath);
					console.log(`Resolved target path: ${targetPath}`);
					
					if (fs.existsSync(targetPath)) {
						console.log('Target file exists, creating link');
						links.push(new vscode.DocumentLink(
							new vscode.Range(startPos, endPos),
							vscode.Uri.file(targetPath)
						));
					} else {
						console.log('Target file does not exist, skipping link');
					}
				}

				// Handle addMedia references (both array and object formats)
				console.log('\n--- Processing addMedia references ---');
				const addMediaRegex = /-?\s*addMedia:\s*(?:['"]([^'"]+)['"]|([^\s]+)|(\[.*?\])|({.*?}))/g;
				while ((match = addMediaRegex.exec(text)) !== null) {
					const filePath = match[1] || match[2] || match[3] || match[4];
					if (!filePath) {
						console.log('No file path found in addMedia match, skipping');
						continue;
					}

					console.log(`Found addMedia reference: "${filePath}"`);
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);
					console.log(`Position: ${startPos.line}:${startPos.character} to ${endPos.line}:${endPos.character}`);

					// Handle array format
					if (filePath.startsWith('[') && filePath.endsWith(']')) {
						console.log('Processing array format addMedia');
						try {
							const mediaFiles = JSON.parse(filePath);
							console.log(`Parsed media files array: ${JSON.stringify(mediaFiles)}`);
							mediaFiles.forEach((mediaFile: string) => {
								const targetPath = path.resolve(path.dirname(document.uri.fsPath), mediaFile);
								console.log(`Resolved target path: ${targetPath}`);
								if (fs.existsSync(targetPath)) {
									console.log('Target file exists, creating link');
									links.push(new vscode.DocumentLink(
										new vscode.Range(startPos, endPos),
										vscode.Uri.file(targetPath)
									));
								} else {
									console.log('Target file does not exist, skipping link');
								}
							});
						} catch (error) {
							console.error('Failed to parse addMedia array:', error);
						}
					}
					// Handle object format with files property
					else if (filePath.startsWith('{') && filePath.endsWith('}')) {
						console.log('Processing object format addMedia');
						try {
							const mediaObj = JSON.parse(filePath);
							console.log(`Parsed media object: ${JSON.stringify(mediaObj)}`);
							if (mediaObj.files && Array.isArray(mediaObj.files)) {
								mediaObj.files.forEach((mediaFile: string) => {
									const targetPath = path.resolve(path.dirname(document.uri.fsPath), mediaFile);
									console.log(`Resolved target path: ${targetPath}`);
									if (fs.existsSync(targetPath)) {
										console.log('Target file exists, creating link');
										links.push(new vscode.DocumentLink(
											new vscode.Range(startPos, endPos),
											vscode.Uri.file(targetPath)
										));
									} else {
										console.log('Target file does not exist, skipping link');
									}
								});
							} else {
								console.log('No files array found in media object');
							}
						} catch (error) {
							console.error('Failed to parse addMedia object:', error);
						}
					}
					// Handle single file format
					else {
						console.log('Processing single file format addMedia');
						const targetPath = path.resolve(path.dirname(document.uri.fsPath), filePath);
						console.log(`Resolved target path: ${targetPath}`);
						if (fs.existsSync(targetPath)) {
							console.log('Target file exists, creating link');
							links.push(new vscode.DocumentLink(
								new vscode.Range(startPos, endPos),
								vscode.Uri.file(targetPath)
							));
						} else {
							console.log('Target file does not exist, skipping link');
						}
					}
				}

				console.log(`\n=== Total links created: ${links.length} ===\n`);
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