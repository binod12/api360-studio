import vm from 'vm';

/**
 * Executes requests inside workspace collections.
 * @param {object} workspace - The workspace data { collections, requests, environments }
 * @param {string|null} envName - The environment name to run tests with
 * @param {object} options - Options: { onProgress, onLog, verbose }
 */
export async function executeCollection(workspace, envName = null, options = {}) {
  const { onProgress, onLog = console.log, verbose = true } = options;
  
  if (verbose) onLog('\n[ API360 Core Runner Executing ]\n');

  let activeEnv = null;
  if (envName) {
    activeEnv = workspace.environments.find((e) => e.name.toLowerCase() === envName.toLowerCase());
    if (!activeEnv && verbose) {
      onLog(`[WARN] Requested environment '${envName}' not found. Using global/no environment context.`);
    } else if (verbose) {
      onLog(`Applied Environment: [ ${activeEnv.name} ]`);
    }
  }

  const createSandbox = (resBody = null, resStatus = 0) => {
    return {
      console: {
        log: (...args) => onLog('       [Script Log]', ...args),
        error: (...args) => console.error('       [Script Error]', ...args),
      },
      pm: {
        environment: {
          get: (key) => activeEnv?.variables?.find(v => v.key === key)?.value,
          set: (key, val) => {
             if (activeEnv) {
                if (!activeEnv.variables) activeEnv.variables = [];
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
            onLog(`       ✓ ${name}`);
          } catch (e) {
            onLog(`       ✗ ${name}: ${e.message}`);
            throw new Error(`Assertion failed: ${name}`);
          }
        },
        expect: (val) => {
          return {
            to: {
              eql: (expected) => { if (val !== expected) throw new Error(`Expected ${expected} but got ${val}`); },
              be: {
                oneOf: (arr) => { if (!arr.includes(val)) throw new Error(`Expected ${val} to be one of ${arr.join(',')}`); }
              }
            }
          }
        }
      }
    };
  };

  const resolveVariables = (text) => {
     if (!text || !activeEnv || !activeEnv.variables) return text;
     return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
        return variable ? variable.value : match;
     });
  };

  let failures = 0;
  let totalExecuted = 0;
  
  // Calculate total requests for progress reporting
  const collectionsWithReqs = workspace.collections.map(col => {
    const requests = workspace.requests.filter(r => r.collectionId === col.id);
    return { col, requests };
  }).filter(c => c.requests.length > 0);

  const totalRequests = collectionsWithReqs.reduce((acc, c) => acc + c.requests.length, 0);

  for (const { col, requests } of collectionsWithReqs) {
    if (verbose) onLog(`\nCollection: ${col.name}`);

    for (const req of requests) {
      if (verbose) onLog(`  [${req.method}] ${req.name}`);
      
      const rUrl = resolveVariables(req.url);
      const reqHeaders = {};
      
      if (Array.isArray(req.headers)) {
        req.headers.filter(h => h.enabled && h.key).forEach(h => { 
          reqHeaders[resolveVariables(h.key)] = resolveVariables(h.value); 
        });
      }
      
      if (req.authType === 'Bearer Token' && req.bearerToken) {
          reqHeaders['Authorization'] = `Bearer ${resolveVariables(req.bearerToken)}`;
      }
      
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && !reqHeaders['Content-Type']) {
         reqHeaders['Content-Type'] = 'application/json';
      }
      
      let finalUrl = rUrl;
      try {
        const u = new URL(rUrl);
        if (Array.isArray(req.params)) {
          req.params.filter(p => p.enabled && p.key).forEach(p => u.searchParams.append(resolveVariables(p.key), resolveVariables(p.value)));
        }
        finalUrl = u.toString();
      } catch (e) {
        // Fallback if URL is incomplete / relative
      }

      // Pre-Script Execution
      if (req.preScript) {
        try {
           const sandbox = createSandbox();
           vm.createContext(sandbox);
           vm.runInNewContext(req.preScript, sandbox);
        } catch (e) {
           onLog(`       [Pre-Script Crashed] ${e.message}`);
        }
      }

      const startTime = performance.now();
      try {
        const fetchRes = await fetch(finalUrl, {
          method: req.method,
          headers: reqHeaders,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : resolveVariables(req.body || req.reqBody)
        });
        const timeMs = performance.now() - startTime;
        
        const bodyText = await fetchRes.text();
        const success = fetchRes.status >= 200 && fetchRes.status < 300;
        
        if (success) {
           if (verbose) onLog(`    ➔ ${fetchRes.status} OK (${timeMs.toFixed(0)}ms)`);
        } else {
           if (verbose) onLog(`    ➔ ${fetchRes.status} Failure (${timeMs.toFixed(0)}ms)`);
           failures++;
        }

        // Post-Response Test Execution (postScript maps to testScript)
        const testScript = req.postScript || req.testScript;
        if (testScript) {
           try {
             const sandbox = createSandbox(bodyText, fetchRes.status);
             vm.createContext(sandbox);
             vm.runInNewContext(testScript, sandbox);
           } catch (e) {
             failures++;
           }
        }

      } catch (err) {
         if (verbose) onLog(`    ➔ Network Fatal: ${err.message}`);
         failures++;
      }

      totalExecuted++;
      if (onProgress) {
        onProgress({
          completed: totalExecuted,
          total: totalRequests,
          failures,
          currentRequest: req.name
        });
      }
    }
  }

  return {
    success: failures === 0,
    failures,
    totalExecuted
  };
}
