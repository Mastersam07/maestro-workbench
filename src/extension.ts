import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import * as fs from "fs";
import * as path from "path";
import { MaestroWorkBenchTreeViewProvider } from './treeView';

let maestroTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {

	console.log('Maestro-workbench is now active!');

	const treeDataProvider = new MaestroWorkBenchTreeViewProvider();
	vscode.window.registerTreeDataProvider('maestroBenchTreeView', treeDataProvider);

	// Provider
	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.refreshTree', () => {
			treeDataProvider.refresh();
		}),
	);

	// Launch maestro studio
	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.openMaestroStudio', () => {
			if (!maestroTerminal) {
				maestroTerminal = vscode.window.createTerminal({
					name: "Maestro Studio",
				});

				maestroTerminal.sendText("maestro studio");
			}

			maestroTerminal.show();

			maestroTerminal.processId.then((pid) => {
				vscode.window.onDidCloseTerminal((closedTerminal) => {
					if (closedTerminal.name === "Maestro Studio") {
						maestroTerminal = undefined;
					}
				});
			});
		})
	);

	// Auto complete items
	const schemaPath = path.join(context.extensionPath, "schema", "maestro.schema.v0.json");
	const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ language: "yaml", scheme: "file" },
			{
				provideCompletionItems(document, position, token, context) {
					const line = document.lineAt(position).text;
					console.log(`line: ${line}`)
					if (line.trim().startsWith("-")) {
						const commands = Object.keys(
							schema.items[1].items.oneOf.reduce((acc: any, item: any) => {
								if (item.properties) {
									return { ...acc, ...item.properties };
								}
								return acc;
							}, {})
						);

						return commands.map((cmd) => {
							const item = new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Method);
							item.detail = `Maestro Command: ${cmd}`;
							item.documentation = `Insert the ${cmd} command in your Maestro YAML flow.`;
							return item;
						});
					}
					return [];
				},
			},
			"-"
		)
	);

	// File watcher for changes
	const fileWatcher = vscode.workspace.createFileSystemWatcher(
		'{maestro,**/.maestro}/**/*.{yaml,yml}'
	);

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

	// Diagnostic
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('maestro');

	vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId === 'yaml') {
			const diagnostics: vscode.Diagnostic[] = [];
			const text = event.document.getText();

			const rootRegex = /^(\w+):/gm;
			const rootProperties = new Set();
			let match;
			while ((match = rootRegex.exec(text)) !== null) {
				rootProperties.add(match[1]);
			}

			console.log("Root-level properties found in YAML:", Array.from(rootProperties));

			if (!rootProperties.has('appId')) {
				const firstLine = event.document.lineAt(0).range;
				diagnostics.push(
					new vscode.Diagnostic(
						firstLine,
						'Missing required "appId" property in Maestro YAML.',
						vscode.DiagnosticSeverity.Error
					)
				);
			}

			if (!rootProperties.has("jsEngine")) {
				const firstLine = event.document.lineAt(0).range;
				diagnostics.push(
					new vscode.Diagnostic(
						firstLine,
						'Optional "jsEngine" property is missing. The default value is "rhino". You can specify "graaljs" if needed.',
						vscode.DiagnosticSeverity.Information
					)
				);
			}

			const lines = text.split("\n");
			const commandRegex = /^-\s*(\w+)/;
			const definedCommands = Object.keys(
				schema.items[1].items.oneOf.reduce((acc: any, item: any) => {
					if (item.properties) {
						return { ...acc, ...item.properties };
					}
					return acc;
				}, {})
			);

			lines.forEach((line, index) => {
				const match = commandRegex.exec(line.trim());
				if (match) {
					const command = match[1];
					if (!definedCommands.includes(command)) {
						const range = new vscode.Range(index, 0, index, line.length);
						const diagnostic = new vscode.Diagnostic(
							range,
							`This command is not a valid Maestro command. Visit api reference for full list of commands`,
							vscode.DiagnosticSeverity.Error
						);

						diagnostic.code = {
							value: "https://maestro.mobile.dev/api-reference/commands",
							target: vscode.Uri.parse("https://maestro.mobile.dev/api-reference/commands"),
						};

						diagnostics.push(diagnostic);
					}
				}
			});

			diagnosticCollection.set(event.document.uri, diagnostics);
		}
	});

	context.subscriptions.push(diagnosticCollection);
}

export function deactivate() { }
