<h1 align="center">
  <img src="https://raw.githubusercontent.com/binod12/api360-studio/main/api360-vscode/icon.png" width="80" alt="API360 Logo">
  <br>
  API360 Studio
</h1>

<p align="center">
  <strong>The Enterprise API Testing Client—Built natively into VS Code.</strong>
</p>

## Overview

**API360 Studio** is an advanced REST, GraphQL, and WebSocket API client designed to bring the power of dedicated tools like Postman or Insomnia directly into your IDE. 

### Why a VS Code Extension?
In many enterprise environments, installing third-party executable software is strictly forbidden due to internal network security policies. Because modern developers are already explicitly authorized to use Visual Studio Code, **API360 Studio bypasses this limitation** by running natively over VS Code's embedded Chromium Webview. 

This brings top-tier API testing, contract validation, and sandboxing directly to your fingertips without ever requiring a system administrator to approve a new Desktop application install. It goes hand-in-hand with your development workflow, completely integrated where you already write your code.

---

## 🚀 Core Features

- **Fluid Interface**: A resizable, deeply customizable layout separating your History, Request Configuration, and Response parsing.
- **REST & GraphQL Support**: Native JSON payload switchers and GraphQL query variables alongside headers and query parameters.
- **Real-time WebSockets**: Initiate full-duplex TCP connections with an integrated streaming message UI terminal.
- **Contract Testing Engine**: Prevent regression bugs by writing strict JSON Schemas. If the API returns a malformed response, API360 explicitly fails the contract validation.
- **Isolated JS Sandboxes**: Write `Pre-Request` and `Post-Request` scripts in vanilla ECMAScript. Manipulate environment variables, inject dynamic authentication tokens, and write layout assertions. 
- **Workspace Isolation**: Manage unlimited concurrent tabs, each operating within its own completely separate memory sandbox, preventing token bleed.
- **Environment Management**: Define global configuration profiles (`STAGING`, `PRODUCTION`) and extract dynamic strings using `{{variable}}` syntax across headers and URLs.

---

## 🛠 Project Architecture & Roadmap

We are continuously evolving this project to bring an undisputed monolithic testing capability inside VS Code. 

- [x] **Phase 1-8:** Cross-platform Tauri Architecture & Custom Webview Event Bridges.
- [x] **Phase 9:** Fluid Tab Workspaces and IndexedDB Persistence. 
- [x] **Phase 10:** Environment Injection Systems.
- [x] **Phase 11:** GraphQL Execution.
- [x] **Phase 12:** Real-time WebSockets Engine.
- [x] **Phase 13:** Contract Testing Schema Valdiation (`Ajv`).
- [x] **Phase 14:** Sandboxed Javascript Engines for scripting environments.
- [x] **Phase 15:** Advanced Resizable UIs and Drag Boundaries.
- [x] **Phase 16-20:** Security (SAST/DAST) scanning, auto-deployments, and local `semgrep` engines.

---

## Getting Started

1. Open the VS Code Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux).
2. Type and execute: `API360: Open Workspace`.
3. A fully interactive API client will open in a new IDE tab adjacent to your code editor!

Enjoy testing without context switching.
