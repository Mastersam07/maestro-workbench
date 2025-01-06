# Contributing to Maestro Workbench

Thank you for considering contributing to Maestro Workbench! We welcome contributions that enhance the functionality and usability of this extension. This guide will help you get started with adding new commands or extending existing ones.

## Table of Contents

- [Getting Started](#getting-started)
- [Adding Support for a Maestro Command](#adding-support-for-a-maestro-command)
- [Adding a New Command](#adding-a-new-command)
- [Extending an Existing Command](#extending-an-existing-command)
- [Testing Your Changes](#testing-your-changes)
- [Submitting Your Contribution](#submitting-your-contribution)
- [Resources](#resources)

## Getting Started

1. **Fork the Repository**: Begin by forking the [Maestro Workbench repository](https://github.com/Mastersam07/maestro-workbench) to your GitHub account.

2. **Clone the Repository**: Clone your forked repository to your local machine:

   ```bash
   git clone https://github.com/your-username/maestro-workbench.git
   ```
3. **Install Dependencies**: Navigate to the project directory and install the necessary dependencies:

    ```bash
    cd maestro-workbench
    npm install
    ```
4. **Open in VS Code**: Open the project in Visual Studio Code:

    ```bash
    code .
    ```


## Adding Support for a Maestro Command

> To contribute a new command or add missing properties to an existing command in the Maestro Workbench extension, you'll need to update the JSON schema that defines the structure and validation rules for Maestro YAML files

1. **Locate the JSON Schema File:**: Locate the json schema at ./schema/schema.v0.json

2. **Understand the Schema Structure**: Each command is represented as a property within the `properties` section of `items` in the schema.

3. **Add a New Command**:
    - To introduce a new command, add a new property to the `properties` section
    - Define the command's structure, including its `type`, `required fields`, and any additional validation rules.

    ```json
    {
        "properties": {
            "newCommand": {
            "type": "object",
            "properties": {
                "parameter1": {
                "type": "string",
                "description": "Description of parameter1"
                },
                "parameter2": {
                "type": "integer",
                "description": "Description of parameter2"
                }
            },
            "required": ["parameter1"],
            "additionalProperties": false,
            "description": "Description of the new command"
            }
        }
    }
    ```

4. **Modify an Existing Command**:
    - To add missing properties to an existing command, locate the command within the `properties` section.
    - Add the new properties under the `properties` subsection of the command, specifying their types and descriptions.

    ```json
    {
        "properties": {
            "existingCommand": {
            "type": "object",
            "properties": {
                "existingParameter": {
                "type": "string",
                "description": "Description of existingParameter"
                },
                "newParameter": {
                "type": "boolean",
                "description": "Description of newParameter"
                }
            },
            "required": ["existingParameter"],
            "additionalProperties": false,
            "description": "Description of the existing command with newParameter added"
            }
        }
    }
    ```

5. **Validate the Schema**:
    - After making changes, ensure the JSON schema is valid.
    - Use tools like [JSON Schema Validator](https://www.jsonschemavalidator.net/) to check for errors.

6. **Test the Changes**:
    - Implement the updated schema in the extension..
    - Create sample Maestro YAML files that utilize the new or updated commands to verify that IntelliSense, validation, and other features work as expected.


## Adding a New Command To Maestro Workbench

> To add a new command to Maestro Workbench:

1. **Define the Command in package.json**: Locate the contributes.commands section in package.json and add your new command:

    ```bash
    {
        "contributes": {
            "commands": [
                {
                    "command": "maestroWorkbench.newCommand",
                    "title": "Maestro: New Command",
                    "category": "Maestro Workbench"
                }
            ]
        }
    }
    ```

    This definition makes your command available in the Command Palette under the "Maestro Workbench" category.

2. **Implement the Command in `extension.ts`**: Open `src/extension.ts` and register your command within the `activate` function:

    ```ts
    import * as vscode from 'vscode';

    export function activate(context: vscode.ExtensionContext) {
        // Other activation code...

        const newCommand = vscode.commands.registerCommand('maestroWorkbench.newCommand', () => {
            // Command implementation logic
            vscode.window.showInformationMessage('New Command Executed!');
        });

        context.subscriptions.push(newCommand);
    }
    ```

    This code registers and implements the functionality of your new command.


## Extending an Existing Command

> To add properties or modify the behavior of an existing command:

1. **Locate the Command Registration**: Find where the command is registered in extension.ts or related files.

2. **Modify the Command Implementation**: Update the command's logic as needed. For example, to add parameters:

    ```ts
    const existingCommand = vscode.commands.registerCommand('maestroWorkbench.existingCommand', (args) => {
        // Updated command logic utilizing args
        vscode.window.showInformationMessage(`Command executed with args: ${args}`);
    });
    ```

    Ensure that any new parameters or properties are appropriately handled within the command's implementation.

3. **Update package.json if Necessary**: If you've changed how the command appears or is invoked, reflect these changes in the contributes.commands section of package.json.


## Testing Your Changes

> To add properties or modify the behavior of an existing command:

1. **Run the Extension**: Press `F5` in VS Code to open a new window with your extension loaded.

2. **Execute the Command**: Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) and run your new or updated command to verify its functionality.

3. **Debugging: Use VS Code's debugging tools to set breakpoints and inspect variables as needed.


## Submitting Your Contribution

1. **Commit Your Changes**: Ensure your changes are well-documented and commit them with a descriptive message:

    ```bash
    git add .
    git commit -m "Add new command: Maestro: New Command"
    ```

2. **Push to Your Fork**: Push your changes to your forked repository:

    ```bash
    git push origin your-branch-name
    ```

3. **Create a Pull Request**: Navigate to the original repository and submit a pull request detailing your changes and their purpose.
