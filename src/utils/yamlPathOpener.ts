import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const YAML_FILE_EXTENSIONS = ['.yaml', '.yml'];
const JS_FILE_EXTENSIONS = ['.js'];

/**
 * Creates a new regex instance for matching file paths in quoted strings.
 * Must create a new instance each time to avoid global regex state issues.
 * @returns A new RegExp instance matching YAML and JS file paths in quotes
 */
export function createFilePathRegex(): RegExp {
    return /["']([^\s"':]*\.(?:ya?ml|js))["']/gi;
}

/**
 * Registers a command and document link provider to open YAML and JS files
 * referenced within YAML documents.
 * @param context - The extension context for managing subscriptions
 */
export function registerYamlPathOpener(context: vscode.ExtensionContext) {
    const openFileCommand = vscode.commands.registerCommand('maestroWorkbench.openYamlFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        let selectedText = editor.document.getText(editor.selection);
        if (!selectedText) {
            const line = editor.document.lineAt(editor.selection.active.line);
            const match = createFilePathRegex().exec(line.text);
            if (match?.[1]) {
                selectedText = match[1];
            }
        }

        if (!selectedText) {
            vscode.window.showErrorMessage('No text selected or found in the current line.');
            return;
        }

        const cleanPath = selectedText.trim();
        await openYamlFile(editor.document.uri, cleanPath);
    });

    const documentLinkProvider: vscode.DocumentLinkProvider = {
        provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
            const links: vscode.DocumentLink[] = [];

            for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
                
                if (lineNum % 100 === 0 && token.isCancellationRequested) {
                    return [];
                }

                const line = document.lineAt(lineNum);
                const regex = createFilePathRegex();
                let match;

                while ((match = regex.exec(line.text)) !== null) {
                    const linkPath = match[1];
                    const startPos = new vscode.Position(lineNum, match.index);
                    const endPos = new vscode.Position(lineNum, match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);

                    const targetUri = resolvePathUri(document.uri, linkPath);
                    if (targetUri) {
                        links.push(new vscode.DocumentLink(range, targetUri));
                    }
                }
            }

            return links;
        }
    };

    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider({ language: 'yaml', scheme: 'file' }, documentLinkProvider));
    context.subscriptions.push(openFileCommand);
}

/**
 * Opens a YAML or JS file in the editor.
 * @param baseUri - The URI of the current document (for resolving relative paths)
 * @param filePath - The file path to open (can be relative or absolute)
 */
async function openYamlFile(baseUri: vscode.Uri, filePath: string): Promise<void> {
    const hasValidExtension = [...YAML_FILE_EXTENSIONS, ...JS_FILE_EXTENSIONS].some(ext =>
        filePath.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
        vscode.window.showErrorMessage(
            `Invalid file type: ${filePath} (expected .yaml, .yml, or .js)`
        );
        return;
    }

    try {
        const targetUri = resolvePathUri(baseUri, filePath);
        if (!targetUri) {
            vscode.window.showErrorMessage(`File not found or not accessible: ${filePath}`);
            return;
        }

        const document = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed opening file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Resolves a file path to a URI, checking if the file exists.
 * @param baseUri - The URI of the current document (for resolving relative paths)
 * @param filePath - The file path to resolve (can be relative or absolute)
 * @returns The resolved URI if the file exists and is valid, null otherwise
 */
export function resolvePathUri(baseUri: vscode.Uri, filePath: string): vscode.Uri | null { 
    const hasYamlExtension = YAML_FILE_EXTENSIONS.some(ext =>
        filePath.toLowerCase().endsWith(ext)
    );
    const hasJsExtension = JS_FILE_EXTENSIONS.some(ext =>
        filePath.toLowerCase().endsWith(ext)
    );

    if (!hasYamlExtension && !hasJsExtension) {
        return null;
    }

    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(path.dirname(baseUri.fsPath), filePath);

    try {
        if (fs.existsSync(absolutePath) && fs.lstatSync(absolutePath).isFile()) {
            return vscode.Uri.file(absolutePath);
        }
    } catch (error) {
        return null;
    }

    return null;
}