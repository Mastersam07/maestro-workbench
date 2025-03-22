<div align="center">
<h1>
<img src="./assets/icon.png" alt="Maestro logo" width="250">

<b>Maestro Workbench</b>
</h1>

[![Version](https://img.shields.io/visual-studio-marketplace/v/Mastersam.maestro-workbench?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=Mastersam.maestro-workbench)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/Mastersam.maestro-workbench?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=Mastersam.maestro-workbench)

</div>

---
[![🚀 Maestro Workbench Release](https://github.com/Mastersam07/maestro-workbench/actions/workflows/release.yaml/badge.svg?branch=dev)](https://github.com/Mastersam07/maestro-workbench/actions/workflows/release.yaml)


Maestro Workbench is a Visual Studio Code extension designed to enhance the development and testing of Maestro YAML files. It offers features such as IntelliSense, syntax highlighting, formatting, test execution, and output visualization to streamline your workflow.

## Features

- **IntelliSense and Syntax Highlighting**: Provides code completions and highlights syntax for Maestro YAML files, reducing errors and improving readability.

- **Schema Validation**: Ensure the correctness of your Maestro YAML files with integrated schema validation, highlighting errors and enforcing best practices.

  https://github.com/user-attachments/assets/35543dba-094e-43eb-bba4-443ba16205ad

- **Test Execution with Feedback**: Run your Maestro tests directly from the test explorer, receive real-time feedback on their status—running, passed, or failed and view outputs.

  https://github.com/user-attachments/assets/27043757-1dd6-4227-a206-7e961fa8a3e7

  https://github.com/user-attachments/assets/0bd7246e-3e42-41af-83af-d14211f56803

- **Snippets**: Utilize predefined code snippets to quickly scaffold Maestro commands and flows, enhancing productivity.

  https://github.com/user-attachments/assets/bacb850d-e74a-4008-9fed-30434d4254dd

- **Customizable File Patterns**: Configure the extension to detect Maestro YAML files based on your project's structure by setting custom file patterns.

  https://github.com/user-attachments/assets/4c72c7e0-2eeb-4ab3-9bf7-8fec572b2b6f

- **Environment Variable Support**: Define environment variables within your workspace settings and reference system environment variables using `{ENV:VAR_NAME}` syntax. Support for default values is also available, e.g., `{ENV:API_KEY:default123}`.

- **Integrated Tree View**: Visualize and manage your Maestro test files within a dedicated tree view, providing quick access and organization as well as viewing flow dependencies.

  https://github.com/user-attachments/assets/b2b8d083-b1fa-4ae3-a5c3-e9a2f7f388d4

- **Maestro Studio Integration**: Launch Maestro Studio directly from the extension.

- **Test Explorer Integration**
  - View all Maestro test files in the test explorer
  - Run individual tests or all tests at once
  - Automatic device selection for test execution
  - Support for both Android and iOS devices
  - Environment variable management for tests

- **Device Management**
  - List available Android and iOS devices
  - Select device for test execution
  - Set default device in settings
  - Support for physical devices, simulators, and offline devices

- **File Management**
  - Tree view for Maestro test files
  - Automatic test discovery
  - File watching for changes
  - YAML schema validation

## Configuration

### Device Settings

You can configure the default device for test execution in VS Code settings:

```json
{
    "maestroWorkbench.defaultDevice": "device-id"
}
```

Leave this empty to be prompted for device selection each time you run tests.

### Environment Variables

Configure environment variables for your tests:

```json
{
    "maestroWorkbench.envVariables": {
        "API_URL": "https://example.com",
        "TOKEN": "{ENV:TOKEN}",
        "AUTH_TOKEN": "{ENV:API_KEY:default_token}"
    }
}
```

Environment variables can be:
- Direct values: `"API_URL": "https://example.com"`
- System environment variables: `"TOKEN": "{ENV:TOKEN}"`
- System environment variables with defaults: `"AUTH_TOKEN": "{ENV:API_KEY:default_token}"`

## Usage

### Running Tests

1. Open the Test Explorer view in VS Code
2. Select one or more test files to run
3. Click the "Run Tests" button or use the test explorer's run command
4. If no default device is set, select a device from the list
5. Tests will run on the selected device

### Managing Devices

1. Use the "List Available Devices" command to view all connected devices
2. Devices are grouped by type (Android Device, iOS Device, iOS Simulator)
3. Each device entry shows:
   - Device name
   - Device ID
   - Device type and status

### Setting Default Device

1. Open VS Code settings
2. Search for "maestroWorkbench.defaultDevice"
3. Enter the device ID of your preferred device
4. The device will be used automatically when running tests

## Commands

- `maestroWorkbench.listDevices`: List all available devices
- `maestroWorkbench.runTest`: Run a specific test file
- `maestroWorkbench.runFolderTests`: Run all tests in a folder
- `maestroWorkbench.refreshTree`: Refresh the test explorer
- `maestroWorkbench.openMaestroStudio`: Open Maestro Studio

## Requirements

Ensure that you have Maestro installed on your system to utilize the testing features of this extension. You can download and install Maestro from the [official repository](https://maestro.mobile.dev/getting-started/installing-maestro).

## Extension Settings

Maestro Workbench allows customization of file patterns to detect Maestro YAML files in your workspace. You can configure this in your workspace or user settings.

**Default File Patterns:**

```json
"maestroWorkbench.filePatterns": [
    "maestro/**/*.yaml",
    "maestro/**/*.yml",
    "**/.maestro/**/*.yaml",
    "**/.maestro/**/*.yml"
]
```

To modify these patterns, navigate to your VS Code settings and update the maestroWorkbench.filePatterns configuration.

* `maestroWorkbench.filePatterns`: Glob patterns to locate Maestro files
* `maestroWorkbench.defaultDevice`: Default device to run tests on
* `maestroWorkbench.envVariables`: Environment variables for test execution

## Known Issues

- Device selection is required for each test run if no default device is set
- Some iOS simulator features may require Xcode to be running

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests for any enhancements or bug fixes. For detailed guidelines, refer to our [CONTRIBUTING.md](https://github.com/Mastersam07/maestro-workbench/blob/dev/CONTRIBUTING.md).

## Star Our Repository

If you find [Maestro Workbench](https://github.com/Mastersam07/maestro-workbench) useful, please consider starring our repository on GitHub! Your support helps us continue to improve the extension.

[![GitHub stars](https://img.shields.io/github/stars/Mastersam07/maestro-workbench?style=social)](https://github.com/Mastersam07/maestro-workbench/stargazers)

## License

This extension is licensed under the [MIT License](https://github.com/Mastersam07/maestro-workbench/blob/dev/LICENSE).

---

For detailed documentation and contribution guidelines, please visit the [GitHub repository](https://github.com/Mastersam07/maestro-workbench).
