# API360 Studio

API360 Studio is a powerful, cross-platform, one-stop-shop API testing and development client. Designed to be a comprehensive offline-first alternative to tools like Postman, Stoplight, and ReadyAPI, it brings your entire API lifecycle into a single native desktop application.

Built with bleeding-edge web technologies (React 19 + Vite) but deployed as a systems-level native application using Tauri, API360 effortlessly bypasses browser CORS restrictions to test endpoints simultaneously bridging the gap from local design to CI/CD automation.

---

## 🌟 Key Features

API360 Studio natively integrates workflow tooling across four core pillars:

### 1. HTTP Client & Postman Parity
- **Robust Execution Engine:** Full support for REST, WebSocket, and GraphQL endpoints with dynamic Bearer and Basic Authentication injection.
- **Environment Contexts:** Define dynamic variables (e.g., `{{BASE_URL}}`) and seamlessly swap between environments (Staging, Production) without modifying your requests.
- **Deep Integration Importer:** Drop your existing `v2.1` Postman Collections into the UI, and the hierarchical parser will recreate your entire workspace automatically.
- **Pre & Post Request Scripting:** Native JS execution sandboxes let you set variables, compute hashes dynamically before execution, or write automated assertions against response payloads.

### 2. Design-First OpenAPI Architecture
- **Dual-Pane Designer:** Easily switch from the standard "Client" runner to "Designer" mode. Edit your OpenAPI yaml/json specifications via Microsoft's `monaco-editor` while viewing a dynamic split-screen visual preview tree.
- **Real-Time Linting:** Code governance engines spot schema anomalies locally before requests are ever dispatched.
- **Dynamic Prism Mocking:** Instantly toggle the active "Prism Mock" proxy. Incoming requests are intercepted in-flight and hydrated with the intelligent example schemas defined in your OpenAPI documents—all without deploying a backend.

### 3. Enterprise Quality Assurance
- **Data-Driven Functional Tests:** Effortlessly build execution grids. Supply a CSV dataset and map column names directly into your API payload variables to execute bulk functional testing dynamically.
- **Performance Load Runner:** An internal parallel-execution engine simulates hundreds of concurrent virtual users, plotting latency, P95 metrics, and throughput.
- **Automated Security Scanner:** Instantly trigger localized active fuzzing routines to test for OWASP vulnerabilities such as SQL injections and XSS payload leakage directly across your query parameters.

### 4. Headless CI/CD Automations
- **Zero-Dependency Pipeline Integration:** Click "Deploy to CI/CD" to generate a headless Node.js replica of the API360 runner.
- **Automated Bundling:** The bundler aggregates your entire local workspace layout alongside preconfigured GitHub Actions (`.github/workflows/api360-tests.yml`) and Jenkins pipelines. Drop the resulting archive directly into your repository!

---

## 🗺 Future Roadmap

API360 Studio has successfully achieved Minimum Viable Readiness across its original 4-Phase rollout. 

Looking forward, the roadmap will focus heavily on:
1. **gRPC & SOAP Support:** Extending network ingestion channels beyond standard REST/Graph protocols.
2. **Team Synchronization:** While inherently offline-first, introducing an optional end-to-end encrypted synchronisation layer utilizing WebRTC to share workspace data securely across organizations.
3. **Advanced Flow Builder:** Visually mapping chained API requests where responses map dynamically to follow-up execution nodes using an explicit node-graph canvas.
4. **Interactive Auth Handlers:** Implementing visual OAuth 2.0 flows and PKCE handlers directly into the authentication configurations.

