# API360 Studio

API360 is a powerful, lightweight, cross-platform API testing client designed to be a fast, offline-first alternative to tools like Postman or Insomnia. 

Built with web technologies but deployed as a native desktop application, API360 effortlessly bypasses browser CORS restrictions to test any endpoint seamlessly.

---

## 🏗 System Architecture & Overview

API360 employs a hybrid application architecture, leveraging a fast web frontend embedded within a native systems-level backend.

*   **Frontend Interface (React + Vite):** The user interface is a Single Page Application (SPA) providing a highly reactive, state-driven experience. It handles all JSON parsing, syntax highlighting via Monaco, and local state management.
*   **Native Backend (Tauri + Rust):** The application runs inside the Tauri framework. Unlike Electron, which bundles an entire Chromium browser (resulting in huge app sizes and heavy memory usage), Tauri uses the host operating system's native webview (WebKitGTK on Linux, WkWebView on macOS, and WebView2 on Windows). 
*   **Network Layer (CORS Bypass):** Standard browser `fetch` requests strictly enforce Cross-Origin Resource Sharing (CORS) policies, which block client-side API testing. API360 solves this by intercepting requests and routing them through Tauri's Rust-based `@tauri-apps/plugin-http` client. The operating system executes the network request natively, completely bypassing browser security sandboxes.
*   **Persistence Layer:** All collections, request histories, and configurations are securely stored offline on the user's machine utilizing HTML5 Local Storage.

## 💻 Technology Stack

*   **Core Frameworks:** React 19, Vite, TypeScript
*   **Desktop Shell:** Tauri 2.0 (Rust)
*   **Code Editor:** `@monaco-editor/react` (The core engine that powers VS Code)
*   **Styling & UI:** Vanilla CSS with custom Glassmorphic design tokens and `lucide-react` icons.
*   **CI/CD Pipeline:** Automated GitHub Actions workflows for cross-platform binary compilation (Linux, macOS, Windows).

---

## 🗺 Roadmap & Current Status

API360 was built in iterative phases. The core Minimum Viable Product (MVP) is **100% Complete**.

### ✅ Completed Phases (MVP)
1.  **Phase 1: Foundation.** Vite/React project initialization and core layout setup.
2.  **Phase 2: Core HTTP Interface.** Implementation of URL bar, Method dropdown, Params/Headers Key-Value editors, and the Monaco JSON body editor.
3.  **Phase 3: Native Networking.** Integration of Tauri Rust backend to proxy HTTP requests and bypass CORS.
4.  **Phase 4: Local Storage Engine.** Built a custom `useLocalStorage` hook to persist the last 50 executed requests dynamically.
5.  **Phase 5: Cross-Platform Builds.** Configured automated GitHub Actions workflows to build `.dmg` (Mac), `api360-portable.zip` (Windows Portable), and Linux binaries.
6.  **Phase 6: Collections & Authentication.** Added a Glassmorphic React modal to create sidebar collection folders. Implemented dynamic Bearer Token and Basic Auth header injection logic.

### 🚀 Future Roadmap (Post-MVP)
With the foundation solid, the following features are planned for future iterations:
- [ ] **Environment Variables:** Support for dynamic variables like `{{BASE_URL}}` or `{{API_KEY}}` that can be swapped based on selected environments (e.g., Staging vs. Production).
- [ ] **Tabbed Workspaces:** Allow users to open multiple requests in separate tabs side-by-side without losing state.
- [ ] **GraphQL Support:** Dedicated query editor with schema fetching and autocomplete for GraphQL endpoints.
- [ ] **WebSocket/gRPC Testing:** Extend the networking protocol support beyond standard REST/HTTP.
- [ ] **Pre/Post Request Scripting:** Add the ability to write small JavaScript snippets to execute before a request runs (to generate custom hash signatures) or after it runs (to assert test conditions, similar to Postman scripts).

---

## ⚙️ Local Development

To run the application locally in development mode:

```bash
# Install dependencies
npm install

# Run the web frontend only (CORS will apply to external domains)
npm run dev

# Run the full Native Desktop App (Requires Rust installed)
npm run tauri dev
```
