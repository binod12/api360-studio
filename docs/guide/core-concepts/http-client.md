# Designing Requests: The HTTP Client

API360 provides a complete suite of standard HTTP request controls. At the top of the application, the **URL Bar** is the central command center for dispatching network fetches.

## The URL Payload

1. **Method Selector**: A dropdown to select your HTTP verb (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`). There are also premium modes like `WS` and `WSS` for WebSockets.
2. **URL Input**: Enter the FQDN of your endpoint. API360 natively supports live string interpolation using `{{EnvironmentVariables}}`.
3. **Send Node**: The primary button triggers the API chain. (Keyboard shortcut: `Cmd/Ctrl + Enter`)

## Configuration Tabs

Underneath the URL bar, an array of configuration menus allows you to manipulate the outbound payload:

- **Params**: Easily inject standard URL query parameters (e.g., `?limit=10&sort=desc`). Values are automatically URL-encoded and synced natively to the visible URL input.
- **Headers**: Define Key-Value mappings for critical headers like `Content-Type` and `Accept`.
- **Auth**: A dedicated UI to abstract common authentication scopes like `Bearer` Tokens, meaning you don't have to manually encode Authorization headers.
- **Body**: A deeply integrated [Monaco Editor](https://microsoft.github.io/monaco-editor/) providing semantic highlighting for JSON and Raw payloads. Automatically formats syntax and validates braces.

## Response Viewer

Upon receiving a network response, the lower half of the UI paints the results:
- **Status Indicators**: Instantly read the HTTP Status Code, execution `Time` (ms), and transfer `Size` (KB).
- **Body Output**: A readonly Monaco Editor visually structures the returning JSON payload.
- **Badge Assertions**: If you have Contract tests or Scripts attached, badging chips will dynamically state whether the endpoint Passed or Failed your quality thresholds.
