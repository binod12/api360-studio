# The API360 VS Code Extension

API360 was built from day one with a core philosophy: **Tools should live where the code lives.**

While standalone desktop applications (like the API360 Tauri App) are powerful, they require developers to constantly context-switch between their IDE and a separate HTTP client window. Furthermore, in strict corporate or enterprise environments, installing unapproved third-party software binaries (`.exe`, `.dmg`) is often strictly prohibited by IT compliance policies.

By packaging API360 directly as a **Visual Studio Code Extension**, we solve both of these pain points simultaneously.

## The Enterprise "Shift-Left" Philosophy

1. **Zero-Friction Installation**: Developers can install the API360 extension directly within their existing approved IDE environment. No administrative privileges required.
2. **Contextual Development**: You can live-debug your local API, run Contract assertions, test WebSockets, and chain Post-request scripts—all natively attached via a split editor to the exact backend code you are concurrently modifying.
3. **Air-Gapped Security**: The API360 extension operates 100% locally. It does not require a cloud account, it does not phone home telemetry, and your proprietary API payloads never leave your corporate network.

## Technical Architecture

Architecting a modern React application inside VS Code presents unique technical challenges. We solved these by entirely decoupling our UI layer from our Networking layer.

### 1. The Single-File React Bundle
VS Code WebView panels have heavily restricted Content Security Policies (CSP) that block loading hundreds of disjointed JavaScript and CSS chunks. 

API360 leverages Vite and `vite-plugin-singlefile` to violently compress the entire application—React DOM, Monaco Editor instances, JSON Schema Validators, and Vanilla CSS—into a **single, base64-encoded `index.html` string**. This allows the extension to render a blindingly fast, offline-capable UI without tripping VS Code security warnings.

### 2. The IPC Fetch Bridge (Escaping the Sandbox)
Standard browser `fetch()` calls fail natively from inside VS Code WebView panels when hitting local servers due to CORS restrictions. 

To combat this, the API360 React app conditionally intercepts all outbound network requests when running inside the IDE. It packages the raw HTTP intent into a JSON payload and fires it over VS Code's `postMessage` Inter-Process Communication (IPC) pipeline. The Node.js `extension.ts` backend wrapper intercepts this message, natively executes the request utilizing the host machine's networking stack (bypassing CORS entirely), and pipes the resulting blob safely back down to the UI thread!

### 3. Persistent Workspace State
Tab isolation natively saves IDE configurations across re-openings utilizing standard VS Code `globalState` caching databases. When you close VS Code and reopen it the next morning, API360 instantly reinstantiates your exact Request tabs and payload history.

## Installing The Extension Locally

Because the API360 plugin repository resides independently from your web monorepo workspace, you can easily package and deploy it locally without publishing it to the public Microsoft marketplace!

### Prerequisites
You must have the official VS Code CLI packaging tool (`vsce`) installed globally:
```bash
npm install -g @vscode/vsce
```

### Build & Deploy
Navigate into the extension directory, install the required dependencies, and execute the packaging pipeline. The script will automatically trigger a fresh Vite production build from the main API360 workspace, consume the `index.html` blob, and compile a `.vsix` installer.

```bash
cd api360-vscode
npm install
npm run package
code --install-extension api360-0.0.1.vsix
```

Once installed, simply open the VS Code Command Palette (`Cmd/Ctrl + Shift + P`), type **`API360: Open Workspace`**, and hit Enter! Our studio will mount smoothly right next to your code.
