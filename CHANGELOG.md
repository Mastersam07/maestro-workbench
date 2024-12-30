# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - 2024-12-30

### Changed

- Apply schema configuration for maestro file patterns only

## [0.2.1] - 2024-12-30

### Fixed

update global schema configuration for maestro file patterns only

- Resolved issue with jsonSchema

## [0.2.0] - 2024-12-29

### Added

- Test explorer:
  - View all tests in test explorer.
  - Run tests in test explorer.
  - Stop running/queued up tests.
  - View test logs.

## [0.1.0] - 2024-12-28

### Added

- Initial release of Maestro Workbench with core features:
  - YAML Schema Validation and IntelliSense.
  - Test Execution via CLI integration.
  - File Management with a dedicated tree view.
  - Documentation Access with links to official resources.

## [Unreleased]

### Added

- **YAML Schema Validation and IntelliSense**
  - Auto-complete for Maestro commands (`tapOn`, `assertVisible`, `runFlow`, etc.).
  - Validation for command parameters (e.g., `visible`, `id`, `text`, etc.).
  - Inline documentation and examples for commands via tooltips.
  - Insert templates/snippets for common Maestro commands.

- **Test Execution**
  - Run Maestro flows directly from VS Code via CLI integration.
  - Display basic test results in a terminal output.

- **File Management**
  - Dedicated tree view for managing Maestro YAML files.
  - Highlight dependencies between flows (e.g., `runFlow` referencing another file).

- **Documentation Access**
  - Integrated links to Maestro's official documentation.
  - Quick-start guide for new users.

### Changed

- Improved performance of the tree view for large projects.
- Enhanced error messages for YAML validation to provide more context.

### Fixed

- Resolved issue where IntelliSense suggestions were not appearing for certain Maestro commands.
- Fixed bug causing the extension to crash when opening non-YAML files.

[0.1.0]: https://github.com/Mastersam07/maestro-workbench/releases/tag/v0.1.0
