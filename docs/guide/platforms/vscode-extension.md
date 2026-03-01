# VS Code Extension

Because API360's networking payload logic is entirely decoupled from the UI framework, the application is shipped as an entirely cohesive Visual Studio Code extension.

You can live-debug your local API, run Contract assertions, test WebSockets, and chain Post-request scripts—all natively attached via a split editor to the exact backend code you are modifying.

## IDE Integration Details

1. **Inline Bundling**: Because VS Code restricts third-party local hosting capabilities within extensions, API360 utilizes `vite-plugin-singlefile`. It compresses everything (HTML, Vanilla CSS, React Component Chunks, JS evaluation interpreters) into a single optimized DOM string!
2. **IPC Fetch Bridge**: Standard `fetch()` calls fail natively inside VS Code windows. To combat this, `App.tsx` conditionally routes payloads explicitly over VS Code's `postMessage` pipeline to the `extension.ts` backend wrapper. We run the native NodeJS Axios network call in the backend context safely, and message the resulting blob down to the UI React thread safely!
3. **Workspace Tracking**: Tab isolation natively saves IDE configurations across re-openings utilizing standard VS Code `globalState` databases.

## Loading The Extension Locally

Because the API360 plugin repository resides independently from your web monorepo workspace, you can easily deploy it locally without publishing it to the public Microsoft marketplace!

```bash
cd api360-vscode
npm install
npm run package
code --install-extension api360-0.0.1.vsix
```
