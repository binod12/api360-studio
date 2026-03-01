# GraphQL Introspection & Querying

API360 offers first-class support for GraphQL without forcing you to write raw JSON schemas.

## The Body Switcher

When constructing a generic HTTP request (typically a `POST`), open the **Body** configuration tab. 
You will see a dropdown toggle. Switch it from `JSON/Raw` to **`GraphQL`**.

## The Split Editor View

The GraphQL workspace splits the Monaco Editor horizontally:
1. **Top Pane (Query)**: A semantic syntax highlighter that understands standard `query {}` and `mutation {}` operations.
2. **Bottom Pane (Variables)**: A JSON editor specifically for defining variables to map into your root queries.

## Execution Core

When you hit **Send**, API360 intercepts your payload. It seamlessly constructs the canonical GraphQL spec payload `{"query": "...", "variables": {...}}`, auto-injects `Content-Type: application/json`, and parses out the responding `data` root tree in the Response Viewer.
