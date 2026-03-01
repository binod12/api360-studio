# WebSocket Streaming Client

HTTP is stateless. When you need real-time, bi-directional polling, API360 ships with an integrated WebSocket streaming terminal.

## Connection Lifecycle

1. **Protocol Switch**: Select `WS` or `WSS` from the Method dropdown.
2. **Connect**: Instead of a "Send" action, the primary CTA changes to the **Connect** socket icon.
3. **Keep-Alive Architecture**: The WS client does not block the UI. If you switch tabs or construct parallel payloads, the socket process asynchronously continues streaming packets via a background daemon.
4. **Disconnect**: You manually sever the TCP connection via the red terminal button.

## The Chat Terminal

A new **Message** UI pane replaces the standard Config tabs:
- **Sending Packets**: Compose raw JSON messages in the top prompt. Send will dispatch the event stream to the server.
- **Receiving Packets**: The bottom timeline paints incoming server messages styled natively to distinguish inbound payloads vs outbound pings. This view aggregates chronological payloads elegantly compared to rigid static responses.
