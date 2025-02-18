import * as vscode from 'vscode';
import { globalState } from '../state/state';

export async function getEnvironmentVariables(testItem?: vscode.TestItem): Promise<{ [key: string]: string }> {
    const config = vscode.workspace.getConfiguration('maestroWorkbench');
    let envVariables = config.get<{ [key: string]: string }>('envVariables', {});

    if (testItem && globalState.envOverrides.has(testItem.id)) {
        envVariables = { ...envVariables, ...globalState.envOverrides.get(testItem.id) };
    }

    const filteredEnv: { [key: string]: string } = Object.fromEntries(
        Object.entries(process.env)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => [key, value as string])
    );

    const mergedEnv = { ...filteredEnv, ...envVariables };

    return mergedEnv;
}

export async function constructTestCommand(testItem: vscode.TestItem): Promise<string> {
    const envVariables = await getEnvironmentVariables(testItem);
    const envArgs = Object.entries(envVariables).map(([key, value]) => `-e ${key}="${value}"`).join(' ');
    return `maestro test ${envArgs} ${testItem.uri?.fsPath}`;
}

export function loadEnvVariable(key: string): string | undefined {
    return process.env[key];
}
