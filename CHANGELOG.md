# Changelog

All notable changes to this project will be documented in this file.

## [0.9.4] - 2024-04-02

### Added

- Collapsible tree view in test explorer ([#70](https://github.com/Mastersam07/maestro-workbench/issues/70))

### Fixed

- Fixed buggy treeview ([#65](https://github.com/Mastersam07/maestro-workbench/issues/65))
- Fixed VSCode Config being created / amended in unrelated projects ([#73](https://github.com/Mastersam07/maestro-workbench/issues/73))

## [0.9.3] - 2024-03-21

### Added

- Support for test variables
- Support for selecting and setting test device

### Fixed

- Fixed schema validation issues by properly managing YAML schema associations
- Removed duplicate schema entries from global settings
- Ensured schema configurations are properly scoped to workspace settings
- Fixed issue where test schema configurations were being added to user settings

## [0.9.2] - 2025-02-19

### Fixed

- Schema: Support for all element selectors in AssertVisible / AssertNotVisible

## [0.9.1] - 2025-02-18

### Fixed

- Schema: Support for missing element selector options
- Schema: Support for providing element selector index by JS expression
- Schema: Fix required properties for extendedWaitUntil

## [0.9.0] - 2025-01-21

### Added

- Support for all maestro commands
- Improved intellisense

## [0.4.3] - 2025-01-09

### Fixed

- Corrected addMedia command
- [addMedia command only supports the array form](https://github.com/Mastersam07/maestro-workbench/pull/20)

## [0.4.2] - 2025-01-09

### Fixed

- Set current working directory on running test process
- [Unable to run tests that take screenshots](https://github.com/Mastersam07/maestro-workbench/issues/17)

## [0.4.1] - 2025-01-06

### Fixed

- Resolved an issue where multiple schema associations from different extension versions were not properly updated, ensuring only the latest schema is associated with Maestro YAML files.


## [0.4.0] - 2025-01-02

### Fixed

- Failed initialization on certan ends

### Added

- Enforce `redhat.vscode-yaml` as dependency of maestro workbench

## [0.3.2] - 2025-01-02

### Fixed

- Allow dynamic timeout values for the following commands:
  - scrollUntilVisible
  - waitForAnimationToEnd.
  - extendedWaitUntil.

## [0.3.1] - 2025-01-02

### Added

- Flow configurations:
  - Added support for env.
  - Added support for onFlowStart.
  - Added support for onFlowComplete.

## [0.3.0] - 2024-12-30

### Added

- Workbench:
  - View flow dependencies (e.g., runFlow references, runScript references).

### Fixed

- Update test explorer on adding and removing test flow
- Update workbench with on adding and removing test flow

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
