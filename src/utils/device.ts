import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Device {
    id: string;
    name: string;
    type: string;
}

export async function getAvailableDevices(): Promise<Device[]> {
    const devices: Device[] = [];

    try {
        const { stdout: adbOutput } = await execAsync('adb devices');
        const androidDevices = parseAdbDevicesOutput(adbOutput);
        devices.push(...androidDevices);
    } catch (error) {
        console.error('Error getting Android devices:', error);
    }

    try {
        const { stdout: xcrunOutput } = await execAsync('xcrun xctrace list devices');
        const iosDevices = parseXcrunDevicesOutput(xcrunOutput);
        devices.push(...iosDevices);
    } catch (error) {
        console.error('Error getting iOS devices:', error);
    }

    return devices;
}

export async function getDefaultDevice(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('maestroWorkbench');
    return config.get<string>('defaultDevice');
}

function parseAdbDevicesOutput(output: string): Device[] {
    const lines = output.split('\n');
    const devices: Device[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.includes('---')) {
            const [id, status] = line.split(/\s+/);
            if (id && status === 'device') {
                devices.push({
                    id,
                    name: id,
                    type: 'Android Device'
                });
            }
        }
    }

    return devices;
}

function parseXcrunDevicesOutput(output: string): Device[] {
    const lines = output.split('\n');
    const devices: Device[] = [];
    let currentSection = '';

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith('==')) {
            if (trimmedLine.startsWith('== Devices ==')) {
                currentSection = 'device';
            } else if (trimmedLine.startsWith('== Devices Offline ==')) {
                currentSection = 'offline';
            } else if (trimmedLine.startsWith('== Simulators ==')) {
                currentSection = 'simulator';
            }
            continue;
        }

        const match = trimmedLine.match(/^(.+?)(?:\s+\(([^)]+)\))?\s+\(([A-F0-9-]+)\)$/);
        if (match) {
            const [, name, version, id] = match;
            devices.push({
                id,
                name: version ? `${name} (${version})` : name,
                type: currentSection === 'simulator' ? 'iOS Simulator' :
                    currentSection === 'offline' ? 'iOS Device (Offline)' : 'iOS Device'
            });
        }
    }

    return devices;
}

export async function selectDevice(): Promise<string | undefined> {
    const devices = await getAvailableDevices();
    if (devices.length === 0) {
        vscode.window.showErrorMessage('No devices found. Please connect a device and try again.');
        return undefined;
    }

    const items = devices.map(device => ({
        label: `${device.name} (${device.id})`,
        description: device.type,
        deviceId: device.id
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a device to run tests on'
    });

    return selected?.deviceId;
} 