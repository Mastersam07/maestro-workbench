# Maestro Workbench

Maestro Workbench is a Visual Studio Code extension designed to enhance the development and testing of Maestro YAML files. It offers features such as IntelliSense, syntax highlighting, formatting, test execution, and output visualization to streamline your workflow.

## Features

- **IntelliSense and Syntax Highlighting**: Provides code completions and highlights syntax for Maestro YAML files, reducing errors and improving readability.

- **Test Execution with Feedback**: Run your Maestro tests directly from the integrated tree view and receive real-time feedback on their status—running, passed, or failed.

  https://github.com/user-attachments/assets/508c40c1-ffa9-4697-be01-d20b0508f88e

- **Snippets**: Utilize predefined code snippets to quickly scaffold Maestro commands and flows, enhancing productivity.

  https://github.com/user-attachments/assets/bb8b59f9-fc79-46be-97f7-de00a116dbfb

- **Customizable File Patterns**: Configure the extension to detect Maestro YAML files based on your project's structure by setting custom file patterns.

- **Integrated Tree View**: Visualize and manage your Maestro test files within a dedicated tree view, providing quick access and organization.

- **Real-Time Test Status Updates**: Receive immediate feedback on test statuses—running, passed, or failed—directly within the tree view, streamlining your testing workflow.

- **Maestro Studio Integration**: Launch Maestro Studio directly from the extension to design and debug your test flows in a user-friendly interface.

- **Schema Validation**: Ensure the correctness of your Maestro YAML files with integrated schema validation, highlighting errors and enforcing best practices.

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

## Known Issues

- Currently, the extension does not support automatic detection of changes in the Maestro configuration. After updating your Maestro setup, please reload the window to apply the changes.

- Some users may experience delays in test execution feedback. This is being addressed in upcoming releases.

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests for any enhancements or bug fixes.

## Star Our Repository

If you find [Maestro Workbench](https://github.com/Mastersam07/maestro-workbench) useful, please consider starring our repository on GitHub! Your support helps us continue to improve the extension.

[![GitHub stars](https://img.shields.io/github/stars/Mastersam07/maestro-workbench?style=social)](https://github.com/Mastersam07/maestro-workbench/stargazers)

## License

This extension is licensed under the [MIT License](https://github.com/Mastersam07/maestro-workbench/blob/dev/LICENSE).

---

For detailed documentation and contribution guidelines, please visit the [GitHub repository](https://github.com/Mastersam07/maestro-workbench).