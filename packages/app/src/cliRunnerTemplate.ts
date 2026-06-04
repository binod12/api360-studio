export const CLI_RUNNER_TEMPLATE = `#!/usr/bin/env node

/**
 * API360 Studio - Headless CI/CD Runner
 * Execute your API workspaces seamlessly inside GitHub Actions, Jenkins, or any node-ready pipeline.
 */

const fs = require('fs');
const vm = require('vm');

async function main() {
  console.log('\\n[ API360 Headless Runner Initializing ]\\n');
  
  const args = process.argv.slice(2);
  const workspacePath = args.find(a => a.startsWith('--workspace='))?.split('=')[1] || 'workspace.api360.json';
  const environmentName = args.find(a => a.startsWith('--env='))?.split('=')[1] || null;

  if (!fs.existsSync(workspacePath)) {
    console.error(\`\\x1b[31m[ERROR]\\x1b[0m Workspace file not found at path: \${workspacePath}\`);
    process.exit(1);
  }

  const workspace = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
  console.log(\`Loaded Workspace spanning \${workspace.collections.length} collections and \${workspace.requests.length} requests.\`);

  let activeEnv = null;
  if (environmentName) {
    activeEnv = workspace.environments.find((e) => e.name.toLowerCase() === environmentName.toLowerCase());
    if (!activeEnv) {
      console.warn(\`\\x1b[33m[WARN]\\x1b[0m Requested environment '\${environmentName}' not found. Falling back to global variables.\`);
    } else {
      console.log(\`Applied Environment: [ \${activeEnv.name} ]\`);
    }
  }

  // Helper dictionary context mapped exactly to the runtime app evaluation engine
  const createSandbox = (resBody = null, resStatus = 0) => {
    return {
      console: {
        log: (...args) => console.log('       [Script Log]', ...args),
        error: (...args) => console.error('       [Script Error]', ...args),
      },
      pm: {
        environment: {
          get: (key) => activeEnv?.variables.find(v => v.key === key)?.value,
          set: (key, val) => {
             if(activeEnv) {
                const v = activeEnv.variables.find(v => v.key === key);
                if (v) v.value = val; else activeEnv.variables.push({key, value: val, enabled: true});
             }
          }
        },
        response: resBody ? {
          json: () => JSON.parse(resBody),
          text: () => resBody,
          code: resStatus
        } : null,
        test: (name, assertionFn) => {
          try {
            assertionFn();
            console.log(\`       \\x1b[32m✓\\x1b[0m \${name}\`);
          } catch (e) {
            console.error(\`       \\x1b[31m✗\\x1b[0m \${name}: \${e.message}\`);
            throw new Error(\`Assertion failed: \${name}\`);
          }
        },
        expect: (val) => {
          return {
            to: {
              eql: (expected) => { if (val !== expected) throw new Error(\`Expected \${expected} but got \${val}\`); },
              be: {
                oneOf: (arr) => { if (!arr.includes(val)) throw new Error(\`Expected \${val} to be one of \${arr.join(',')}\`); }
              }
            }
          }
        }
      }
    };
  };

  const resolveVariables = (text) => {
     if (!text || !activeEnv) return text;
     return text.replace(/\\{\\{(.*?)\\}\\}/g, (match, key) => {
        const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
        return variable ? variable.value : match;
     });
  };

  let failures = 0;

  for (const collection of workspace.collections) {
    console.log(\`\\n\\x1b[1mCollection: \${collection.name}\\x1b[0m\`);
    const collRequests = workspace.requests.filter(r => r.collectionId === collection.id);

    for (const req of collRequests) {
      console.log(\`  \\x1b[36m[\${req.method}]\\x1b[0m \${req.name}\`);
      
      const rUrl = resolveVariables(req.url);
      const reqHeaders = {};
      
      req.headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[resolveVariables(h.key)] = resolveVariables(h.value); });
      if (req.authType === 'Bearer Token' && req.bearerToken) {
          reqHeaders['Authorization'] = \`Bearer \${resolveVariables(req.bearerToken)}\`;
      }
      
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && !reqHeaders['Content-Type']) {
         reqHeaders['Content-Type'] = 'application/json';
      }
      
      const u = new URL(rUrl);
      req.params.filter(p => p.enabled && p.key).forEach(p => u.searchParams.append(resolveVariables(p.key), resolveVariables(p.value)));

      // Pre-Script Execution
      if (req.preRequestScript) {
        try {
           vm.createContext(createSandbox());
           vm.runInNewContext(req.preRequestScript, createSandbox());
        } catch(e) {
           console.error(\`       \\x1b[31m[Pre-Script Crashed]\\x1b[0m \${e.message}\`);
        }
      }

      const startTime = performance.now();
      try {
        const fetchRes = await fetch(u.toString(), {
          method: req.method,
          headers: reqHeaders,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : resolveVariables(req.body)
        });
        const timeMs = performance.now() - startTime;
        
        const bodyText = await fetchRes.text();
        const success = fetchRes.status >= 200 && fetchRes.status < 300;
        
        if (success) {
           console.log(\`    \\x1b[32m➔ \${fetchRes.status} OK\\x1b[0m (\${timeMs.toFixed(0)}ms)\`);
        } else {
           console.error(\`    \\x1b[31m➔ \${fetchRes.status} Failure\\x1b[0m (\${timeMs.toFixed(0)}ms)\`);
           failures++;
        }

        // Post-Response Test Execution
        if (req.testScript) {
           try {
             const sandbox = createSandbox(bodyText, fetchRes.status);
             vm.createContext(sandbox);
             vm.runInNewContext(req.testScript, sandbox);
           } catch(e) {
             failures++;
           }
        }

      } catch (err) {
         console.error(\`    \\x1b[31m➔ Network Fatal:\\x1b[0m \${err.message}\`);
         failures++;
      }
    }
  }

  console.log('\\n----------------------------------');
  if (failures > 0) {
    console.error(\`\\x1b[31m[CI/CD PIPELINE FAILED] \${failures} Request/Assertion Failures Detected.\\x1b[0m\`);
    process.exit(1);
  } else {
    console.log(\`\\x1b[32m[CI/CD PIPELINE PASSED] All tests executed successfully.\\x1b[0m\`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error("FATAL BUNDLE ERROR:", err);
  process.exit(1);
});
`;
