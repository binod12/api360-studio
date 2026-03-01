# Desktop Application (Native Webview)

Using a web browser as an HTTP IDE can introduce crippling restrictions related to CORS `Access-Control-Allow-Origin` and un-inspectable localhost networking. 

To provide a fully robust network sandbox, API360 wraps its Vite React framework inside the ultra-lightweight **Tauri Rust** toolchain.

## Building The Release Binaries

To produce standalone executables, you must install the native Rust toolchain and cargo environment logic to your host machine.

### Windows (.msi)
```bash
npm run tauri build
```
This will yield a compiled Windows Installer underneath `src-tauri/target/release/bundle/`. 

### macOS (.app)
MacOS builds are similarly triggered via the `tauri build` configuration pipeline resulting in a `.app` container that is natively executable without NodeJS.

## The Tauri Bypass

Because the Desktop variations natively execute over the local filesystem (WKWebView or WebView2) via Rust, the API360 HTTP engine transparently maps down to the local OS networking interface securely bypassing sandbox constraints like CORS. It's impossible to generate `CORS preflight failed` errors via the desktop app!
