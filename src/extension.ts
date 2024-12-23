import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MaestroWorkBenchTreeViewProvider } from './treeView';

let maestroTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Maestro-workbench is now active!');

	const treeDataProvider = new MaestroWorkBenchTreeViewProvider();
	vscode.window.registerTreeDataProvider('maestroBenchTreeView', treeDataProvider);

	// Register tree refresh command
	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.refreshTree', () => {
			treeDataProvider.refresh();
		}),
	);

	// Register command to open Maestro Studio
	context.subscriptions.push(
		vscode.commands.registerCommand('maestroWorkbench.openMaestroStudio', () => {
			if (!maestroTerminal) {
				maestroTerminal = vscode.window.createTerminal({
					name: 'Maestro Studio',
				});
				maestroTerminal.sendText('maestro studio');
			}
			maestroTerminal.show();

			maestroTerminal.processId.then(() => {
				vscode.window.onDidCloseTerminal((closedTerminal) => {
					if (closedTerminal.name === 'Maestro Studio') {
						maestroTerminal = undefined;
					}
				});
			});
		}),
	);

	// Load schema and diagnostics
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('maestro');
	const schemaPath = path.join(context.extensionPath, 'schema', 'maestro.schema.v0.json');
	const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

	// Flatten schema for auto-completion and nested properties
	const flattenSchema = (schemaNode: any, pathPrefix: string = ''): Record<string, any> => {
		const commands: Record<string, any> = {};
		if (schemaNode.type === 'object' && schemaNode.properties) {
			Object.entries(schemaNode.properties).forEach(([key, value]: [string, any]) => {
				const newPath = pathPrefix ? `${pathPrefix}.${key}` : key;
				commands[newPath] = value;
				if (value.type === 'object' || value.oneOf || value.allOf || value.anyOf) {
					Object.assign(commands, flattenSchema(value, newPath));
				}
			});
		}
		return commands;
	};

	const flattenedCommands = flattenSchema(schema);

	// Autocomplete Provider
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ language: 'yaml', scheme: 'file' },
			{
				provideCompletionItems(document, position) {
					const line = document.lineAt(position).text.trim();
					const suggestions: vscode.CompletionItem[] = [];

					// Check if the user is starting a new command (e.g., "- command")
					if (line.startsWith('-')) {
						Object.entries(schema.items[1].items.oneOf).forEach(([_, commandSchema]: [string, any]) => {
							const commandName = Object.keys(commandSchema.properties || {})[0];
							if (commandName) {
								const item = new vscode.CompletionItem(commandName, vscode.CompletionItemKind.Method);
								item.detail = `Maestro Command: ${commandName}`;
								item.documentation = commandSchema.properties[commandName]?.description || '';
								suggestions.push(item);
							}
						});
					} else {
						// Handle nested auto-completion for command parameters
						Object.entries(flattenedCommands).forEach(([key, value]) => {
							if (key.startsWith(line)) {
								const property = key.split('.').pop();
								const item = new vscode.CompletionItem(property || '', vscode.CompletionItemKind.Property);
								item.detail = `Property: ${property}`;
								item.documentation = value.description || '';
								if (value.default) {
									item.insertText = `${property}: ${value.default}`;
								} else if (value.enum) {
									item.insertText = `${property}: ${value.enum[0]}`;
								} else {
									item.insertText = `${property}: `;
								}
								suggestions.push(item);
							}
						});
					}

					return suggestions;
				},
			},
			'-', // Trigger auto-completion after `-`
			':' // Trigger auto-completion after `:`
		)
	);

	// Diagnostics for YAML validation
	vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId === 'yaml') {
			const diagnostics: vscode.Diagnostic[] = [];
			const text = event.document.getText();

			// Check for required root properties
			const rootRegex = /^(\w+):/gm;
			const rootProperties = new Set<string>();
			let match;
			while ((match = rootRegex.exec(text)) !== null) {
				rootProperties.add(match[1]);
			}

			if (!rootProperties.has('appId')) {
				diagnostics.push(
					new vscode.Diagnostic(
						event.document.lineAt(0).range,
						'Missing required "appId" property in Maestro YAML.',
						vscode.DiagnosticSeverity.Error
					)
				);
			}

			// Check for invalid commands
			const lines = text.split('\n');
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
							`Unknown command "${command}". This command is not a valid Maestro command.`,
							vscode.DiagnosticSeverity.Error
						);
						diagnostic.code = {
							value: 'https://maestro.mobile.dev/api-reference/commands',
							target: vscode.Uri.parse('https://maestro.mobile.dev/api-reference/commands'),
						};
						diagnostics.push(diagnostic);
					}
				}
			});

			diagnosticCollection.set(event.document.uri, diagnostics);
		}
	});

	context.subscriptions.push(diagnosticCollection);

	// File Watcher
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
}

export function deactivate() {}
