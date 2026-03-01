import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('api360.openWorkspace', () => {

        const panel = vscode.window.createWebviewPanel(
            'api360Studio',
            'API360 Studio',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'webview-dist')]
            }
        );

        // Get path to the Vite build output
        const webviewPath = vscode.Uri.joinPath(context.extensionUri, 'webview-dist', 'index.html').fsPath;
        let htmlContent = '<h1>API360 Build Not Found. Run `npm run build` in the api360 folder.</h1>';

        if (fs.existsSync(webviewPath)) {
            htmlContent = fs.readFileSync(webviewPath, 'utf8');

            // Process HTML to use VS Code URIs
            const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'webview-dist', 'assets'));
            // Simple regex replace to fix relative active asset paths
            htmlContent = htmlContent.replace(/(href|src)="\/assets\//g, `$1="${scriptUri}/`);
        }

        panel.webview.html = htmlContent;

        // The IPC Message Bridge Handler
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'fetch':
                        try {
                            const start = performance.now();
                            const response = await axios({
                                method: message.options.method,
                                url: message.url,
                                data: message.options.body ? message.options.body : undefined,
                                headers: message.options.headers,
                                validateStatus: () => true, // Resolve on all HTTP status codes
                                maxRedirects: 5
                            });
                            const end = performance.now();
                            panel.webview.postMessage({
                                command: 'fetchResponse',
                                reqId: message.reqId,
                                status: response.status,
                                data: response.data,
                                time: end - start,
                                size: JSON.stringify(response.data || {}).length
                            });
                        } catch (error: any) {
                            let errorDetail = error.message || 'Unknown network error';
                            if (error.response) {
                                errorDetail = `${error.message} - Status: ${error.response.status}`;
                            } else if (error.request) {
                                errorDetail = `${error.message} - No response received from server`;
                            }
                            panel.webview.postMessage({
                                command: 'fetchError',
                                reqId: message.reqId,
                                error: errorDetail
                            });
                        }
                        return;

                    case 'saveState':
                        await context.globalState.update(message.key, message.value);
                        return;

                    case 'loadState':
                        const data = context.globalState.get(message.key);
                        panel.webview.postMessage({
                            command: 'stateLoaded',
                            key: message.key,
                            value: data
                        });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
