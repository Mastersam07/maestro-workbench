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

export async function updateYamlSchemaAssociations(schemaPath: string) {
    const yamlConfig = vscode.workspace.getConfiguration('yaml');

    const currentSchemas = yamlConfig.get<{ [key: string]: string[] }>('schemas') || {};

    const filePatterns = getFilePatterns();

    const updatedSchemas = {
        ...currentSchemas,
        [schemaPath]: filePatterns,
    };

    await yamlConfig.update('schemas', updatedSchemas, vscode.ConfigurationTarget.Global);
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