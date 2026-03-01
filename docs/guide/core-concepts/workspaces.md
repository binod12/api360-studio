# Multi-Tab Workspaces

Professional developers don't work sequentially. API360 supports rendering infinite parallel tabs, allowing you to debug disjointed contexts without cross-polluting your payload.

## State Isolation

Each Workspace Tab runs its own internal state machine. 
- Tab 1 can possess an active WebSocket streaming connection.
- Tab 2 can be actively configuring a complex GraphQL mutation.
- Tab 3 can be rendering the historical results of a past fetch operation.

When you switch tabs via the Top Nav router, the React component unmounts and remounts the cached `WorkspaceTab` interface cleanly. Data is never lost, and long-polling WebSocket connections remain connected asynchronously in the background.

## Actions

- **New Tab**: Click the `+` icon at the edge of the tab strip to mint a fresh IDE skeleton.
- **Close Tab**: Click the `x` on any unfocused tab to garbage collect it. Closing the final tab creates a generic fallback blank view.
