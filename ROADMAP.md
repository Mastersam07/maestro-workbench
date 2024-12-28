# Maestro Workbench Roadmap

## Vision
Maestro Workbench aims to simplify mobile UI testing by integrating Maestro directly into Visual Studio Code. It will provide an intuitive interface, robust IntelliSense, YAML validation, and testing capabilities to empower developers and QA engineers to build, manage, and execute test flows seamlessly.

---

## Roadmap

### Phase 1: Core Features
#### 🎯 Goal: Establish the foundation of the extension with essential features.
- [x] **YAML Schema Validation and IntelliSense**
  - [x] Auto-complete for Maestro commands (`tapOn`, `assertVisible`, `runFlow`, etc.).
  - [x] Validation for command parameters (e.g., `visible`, `id`, `text`, etc.).
  - [x] Inline documentation and examples for commands via tooltips.
  - [x] Insert templates/snippets for common Maestro commands.

- [x] **Test Execution**
  - [x] Run Maestro flows directly from VS Code via CLI integration.
  - [ ] Display basic test results in a terminal output.

- [x] **File Management**
  - [x] Dedicated tree view for managing Maestro YAML files.
  - [ ] Highlight dependencies between flows (e.g., `runFlow` referencing another file). [See here](https://github.com/Mastersam07/maestro-workbench/tree/feat-flow-dependencies)

- [ ] **Documentation Access**
  - [ ] Integrated links to Maestro's official documentation.
  - [ ] Quick-start guide for new users.

---

### Phase 2: Enhanced Testing Features
#### 🎯 Goal: Improve test execution and debugging capabilities.
- [ ] **Enhanced Test Results Panel**
  - [x] Visual display of test results with success/failure summaries.
  - [ ] Show detailed logs for each command (e.g., errors, assertions).

- [ ] **Live Debugging**
  - [ ] Step-by-step execution of flows.
  - [ ] Pause and inspect app state at any command.

- [ ] **Device Integration**
  - [ ] Connect to physical or emulated devices for real-time test execution.
  - [ ] Live view of the app during testing.

- [ ] **Environment Management**
  - [ ] UI for managing environment variables (`env` block).
  - [ ] Support multiple environment profiles (e.g., staging, production).

---

### Phase 3: Advanced Productivity Tools
#### 🎯 Goal: Streamline the creation and management of test flows.
- [ ] **Command Helpers**
  - [ ] Visual selector helper for defining `visible` and `notVisible` conditions.
  - [ ] JavaScript editor with syntax highlighting for `runScript` or `evalScript`.

- [ ] **Flow Dependency Mapping**
  - [ ] Visualize relationships between flows and subflows as a graph.

- [ ] **Output Variable Management**
  - [ ] Display and edit `output` variables in real-time.

- [ ] **Reusable Templates**
  - [ ] Predefined templates for common flows (e.g., login, onboarding).

---

### Phase 4: Collaboration and Performance Insights
#### 🎯 Goal: Enable team collaboration and deeper testing insights.
- [ ] **Flow Sharing**
  - [ ] Export and share test flows.
  - [ ] Combine multiple YAML files into a single flow.

- [ ] **Version Control Integration**
  - [ ] Highlight changes to test flows in Git.
  - [ ] Provide best practices for organizing test flows in repositories.

- [ ] **Performance Metrics**
  - [ ] Measure command execution time.
  - [ ] Display performance insights (e.g., memory usage, app load time).

---

### Phase 5: Cross-Platform Support
#### 🎯 Goal: Optimize the extension for diverse testing needs.
- [ ] **Platform-Specific IntelliSense**
  - [ ] Suggest platform-specific commands (e.g., `back` for Android).
  - [ ] Highlight unsupported commands for the current platform.

- [ ] **Device Manager**
  - [ ] Connect and switch between multiple devices or simulators.
  - [ ] Auto-detect connected devices.

---

## Contribution
We welcome contributions to Maestro Workbench! Please check the `CONTRIBUTING.md` file in this repository for guidelines on how to contribute.

---

## Feedback
If you have suggestions, feature requests, or encounter any issues, please open an issue in this repository. Your feedback is crucial in shaping the development of Maestro Workbench!

---

## License
This project is licensed under the MIT License.
