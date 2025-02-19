import * as vscode from 'vscode';

export async function getEnvironmentVariables(testItem?: vscode.TestItem): Promise<{ [key: string]: string }> {
    const config = vscode.workspace.getConfiguration('maestroWorkbench');
    let envVariables = config.get<{ [key: string]: string }>('envVariables', {});

    const resolvedEnv: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(envVariables)) {
        const envMatch = value.match(/^\{ENV:([^:]+)(?::(.+))?\}$/);
        if (envMatch) {
            const envVarName = envMatch[1];
            const defaultValue = envMatch[2] || '';
            resolvedEnv[key] = process.env[envVarName] || defaultValue;
        } else {
            resolvedEnv[key] = value;
        }
    }

    return resolvedEnv;
}

export async function constructTestCommand(testItem: vscode.TestItem): Promise<string> {
    const envVariables = await getEnvironmentVariables(testItem);
    const envArgs = Object.entries(envVariables).map(([key, value]) => `-e ${key}="${value}"`).join(' ');
    return `maestro test ${envArgs} ${testItem.uri?.fsPath}`;
}
