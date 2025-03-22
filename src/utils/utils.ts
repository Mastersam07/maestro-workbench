import * as vscode from 'vscode';
import { globalState } from '../state/state';

export function getFilePatterns(): string[] {
    const config = vscode.workspace.getConfiguration('maestroWorkbench');
    return config.get<string[]>('filePatterns', [
        "maestro/**/*.yaml",
        "maestro/**/*.yml",
        "**/.maestro/**/*.yaml",
        "**/.maestro/**/*.yml"
    ]);
}

export function getOrCreateTerminal(): vscode.Terminal {
    if (!globalState.maestroTerminal) {
        globalState.maestroTerminal = vscode.window.createTerminal({
            name: "Maestro Test",
        });

        globalState.maestroTerminal.show();
        vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (closedTerminal.name === "Maestro Test") {
                globalState.maestroTerminal = undefined;
            }
        });
    }
    return globalState.maestroTerminal;
}

/**
 * Updates the YAML schema associations in VS Code settings to ensure only our schema is used
 * for Maestro YAML files. This prevents conflicts with other YAML schemas.
 * Note: This function only manages the main extension schema patterns and does not affect
 * test-specific schema configurations.
 */
export async function updateYamlSchemaAssociations(schemaPath: string = './schema/schema.v0.json') {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');
    const currentSchemas = yamlConfig.get<{ [key: string]: string[] }>('schemas') || {};
    const filePatterns = getFilePatterns();

    // Create updated schemas by removing ALL entries that point to our schema file
    const updatedSchemas = Object.fromEntries(
        Object.entries(currentSchemas).filter(([schema]) => {
            // Remove any schema entry that points to our schema file, regardless of the path
            return !schema.endsWith('schema.v0.json');
        })
    );

    // First, remove any schema registrations from global settings
    const globalSchemas = Object.fromEntries(
        Object.entries(currentSchemas).filter(([schema]) => 
            !schema.endsWith('schema.v0.json')
        )
    );
    await yamlConfig.update('schemas', globalSchemas, vscode.ConfigurationTarget.Global);

    // Then update workspace settings with our current configuration
    updatedSchemas[schemaPath] = filePatterns;
    await yamlConfig.update('schemas', updatedSchemas, vscode.ConfigurationTarget.Workspace);
}

export function checkYamlExtension() {
    const yamlExtension = vscode.extensions.getExtension('redhat.vscode-yaml');

    if (!yamlExtension) {
        vscode.window
            .showWarningMessage('The YAML extension is not installed. Some features of Maestro Workbench may not work correctly. Would you like to install it?', 'Install', 'Cancel')
            .then(selection => {
                if (selection === 'Install') {
                    vscode.commands.executeCommand('workbench.extensions.search', 'redhat.vscode-yaml');
                }
            });
    } else if (!yamlExtension.isActive) {
        Promise.resolve(yamlExtension.activate()).then(() => {
            vscode.window.showInformationMessage('YAML extension activated successfully for Maestro Workbench.');
        }).catch(() => {
            vscode.window.showErrorMessage('Failed to activate the YAML extension. Some features may not work correctly.');
        });
    }
}