## Phase one Roadmap

### Phase 1: Core Features
#### 🎯 Goal: Establish the foundation of the extension with essential features.
- [ ] **YAML Schema Validation and IntelliSense**
  - [x] Auto-complete for Maestro commands (`tapOn`, `assertVisible`, `runFlow`, etc.).
  - [x] Validation for command parameters (e.g., `visible`, `id`, `text`, etc.).
  - [x] Inline documentation and examples for commands via tooltips.
  - [x] Insert templates/snippets for common Maestro commands.

- [ ] **Test Execution**
  - [ ] Set up CLI integration with Maestro.
  - [ ] Create a "Run Test" button for YAML files.
  - [ ] Capture and display CLI test results in the terminal within VS Code.
  - [ ] Ensure support for Maestro-specific CLI arguments

- [ ] **File Management**
  - [ ] Create a dedicated Maestro tree view in the VS Code sidebar.
  - [ ] Automatically detect flow files and display them in the tree.
  - [ ] Highlight flow dependencies (e.g., runFlow references).
  - [ ] Add context menu options for YAML files in the tree view:
        - Run flow
        - Open referenced flow (for `runFlow`)

- [ ] **Documentation Access**
  - [ ] Add a "Maestro Documentation" link in the command palette.
  - [ ] Integrate a quick-start guide accessible within the extension.
  - [ ] Provide links to official Maestro docs when hovering over commands.