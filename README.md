# API360 Studio 🚀

API360 Studio is an enterprise-grade API testing client unified across three platforms. It allows developers to test REST and GraphQL endpoints leveraging a sleek, glassmorphic UI, Environment Variable pipelines, and Contract Validation natively integrated into their workflow.

This repository is structured as a **Monorepo** delivering three build targets powered by a single React source of truth:
1. **Web App** (Local Browser Testing)
2. **Native Desktop App** (MacOS/Windows)
3. **VS Code IDE Extension**

## 🏗️ Architecture

You only write UI state and logic once! The central React application lives in `/api360/src`.

When it builds, API360 uses environment detection to natively route its HTTP networking traffic through the host platform:

*   **Tauri Desktop (`/api360/src-tauri`)**: Wraps the React UI into a native macOS WebKit window. It bypasses CORS by routing all `fetch` requests through the high-performance Rust `@tauri-apps/plugin-http` engine.
*   **VS Code Extension (`/api360-vscode`)**: Mounts the React UI inside an IDE Webview panel. It bypasses browser CORS via an IPC (Inter-Process Communication) message bridge that sends requests to the Node.js IDE backend, which executes the request using `axios` and returns the payload to React.

## 🚀 CI/CD Pipelines

This repository utilizes GitHub Actions to automatically publish releases.

*   **Desktop App (`v1.x.x` Tags)**: Pushing a GitHub release tag (e.g. `v0.0.1`) invokes the `tauri-release.yml` pipeline. It checks out the React code, compiles the Mac/Windows/Linux binaries, and attaches the installable `.zip` files directly to your GitHub Release.
*   **VS Code Extension (Continuous Deployment)**: Simply updating the `"version": "x.x.x"` string inside `api360-vscode/package.json` and pushing to `main` instantly triggers the `publish-vscode.yml` pipeline. It bundles the React app into a single, CSP-safe file, builds the extension, and immediately publishes the update to the Visual Studio Code Marketplace.

## 🛠️ Local Development

### Running the Web View (React)
```bash
cd api360
npm install
npm run dev
```

### Running the Desktop App (Tauri)
```bash
cd api360
npm run tauri dev
```

### Compiling the VS Code Extension
```bash
cd api360-vscode
npm install
npm run package
npx @vscode/vsce package --no-dependencies
# Install the generated .vsix file directly into your IDE extensions panel
```

---
*Built with React, Vite, Tauri, Monaco Editor, and ❤️*
