# Getting Started with API360

Welcome to API360, your comprehensive, local-first API integrated development environment.

API360 provides a beautiful, dark-mode interface designed to rival professional developer tools—built on web technologies, rendering with zero-latency.

## Installation & Running

API360 can be run in multiple ways, depending on where you prefer to work:

1. **Web Browser (Vite Dev Server)**:
   Run `npm run dev` in the `api360/` directory, and open `http://localhost:5173`.

2. **Native Desktop Application (Tauri)**:
   Run `npm run tauri build` to compile dedicated binaries (Mac, Windows, Linux) that operate fully locally with unlimited filesystem access.

3. **VS Code Extension**:
   API360 mounts seamlessly as a WebView panel inside your editor. 

## Fluid Workspace Architecture

API360 is built using `react-resizable-panels`, meaning you can mold the UI exactly to your liking:
- **Left Sidebar**: Drag the vertical boundary to expand or hide your Collections and History.
- **Request Terminal**: Drag the horizontal boundary below the payload editor to expand the Response Viewer. 

## Next Steps

Dive into the [HTTP Client](./core-concepts/http-client) documentation to learn how to dispatch your first request.
