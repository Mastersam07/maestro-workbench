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

    const maestroPatterns = new Set(filePatterns);

    // Find all schema entries that might conflict with our patterns
    const conflictingSchemas = Object.entries(currentSchemas).filter(([_, patterns]) => {
        // Check if any of the patterns overlap with our Maestro patterns
        return patterns.some(pattern => 
            Array.from(maestroPatterns).some(maestroPattern => 
                pattern === maestroPattern || 
                pattern.includes(maestroPattern) || 
                maestroPattern.includes(pattern)
            )
        );
    });

    if (conflictingSchemas.length > 0) {
        const response = await vscode.window.showWarningMessage(
            'Multiple YAML schemas are configured for Maestro files. This may cause validation conflicts. Would you like to resolve this?',
            'Yes',
            'No'
        );

        if (response === 'Yes') {
            const updatedSchemas = { ...currentSchemas };
            
            conflictingSchemas.forEach(([schema]) => {
                delete updatedSchemas[schema];
            });

            updatedSchemas[schemaPath] = filePatterns;

            await yamlConfig.update('schemas', updatedSchemas, vscode.ConfigurationTarget.Workspace);
            
            vscode.window.showInformationMessage('YAML schema configuration has been updated to prevent conflicts.');
        }
    } else {
        if (!currentSchemas[schemaPath]) {
            const updatedSchemas = { ...currentSchemas };
            updatedSchemas[schemaPath] = filePatterns;
            await yamlConfig.update('schemas', updatedSchemas, vscode.ConfigurationTarget.Workspace);
        }
    }
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