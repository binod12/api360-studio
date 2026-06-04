const axios = require('axios');
const crypto = require('crypto');

// Simulate the exact IPC payload react drops into `vscode.postMessage`
const reqId = crypto.randomUUID();
const mockIpcEvent = {
    command: 'fetch',
    reqId: reqId,
    url: 'https://json2jsonp.com/?url=http://domain.com/some/json&callback=cbfunc',
    options: {
        method: 'GET',
        headers: {},
        body: undefined
    }
};

(async () => {
    console.log("Mocking React VS Code Ext IPC Bridge...");
    console.log("Emitting Fetch Request ID: " + reqId);
    
    try {
        const start = performance.now();
        const response = await axios({
            method: mockIpcEvent.options.method,
            url: mockIpcEvent.url,
            data: mockIpcEvent.options.body ? mockIpcEvent.options.body : undefined,
            headers: mockIpcEvent.options.headers,
            validateStatus: () => true,
            maxRedirects: 5
        });
        const end = performance.now();
        
        // This is exactly what extension.ts replies with
        const mockIpcResponse = {
            command: 'fetchResponse',
            reqId: mockIpcEvent.reqId,
            status: response.status,
            data: response.data,
            time: end - start,
            size: JSON.stringify(response.data || {}).length
        };
        
        console.log("\n✅ VS Code Extension node.js returned IPC payload:");
        console.log("Status:", mockIpcResponse.status);
        console.log("Time (ms):", mockIpcResponse.time);
        console.log("Size (bytes):", mockIpcResponse.size);
        console.log("Data Snippet:", JSON.stringify(mockIpcResponse.data || {}).substring(0, 80));
        
    } catch (error) {
        let errorDetail = error.message || 'Unknown network error';
        if (error.response) {
            errorDetail = `${error.message} - Status: ${error.response.status}`;
        } else if (error.request) {
            errorDetail = `${error.message} - No response received from server`;
        }
        console.log("\n❌ VS Code Extension node.js threw IPC error payload:");
        console.log(errorDetail);
    }
})();
