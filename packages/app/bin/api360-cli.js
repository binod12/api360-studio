#!/usr/bin/env node

/**
 * API360 Studio - Decoupled CLI & Core Runner
 * Orchestrates functional testing, load runner, security scanning, and APIM generation.
 */

import fs from 'fs';
import path from 'path';
import { readWorkspace } from '../cli/workspace.js';
import { executeCollection } from '../cli/runner.js';
import { runLoadTest } from '../cli/load.js';
import { runSecurityScan } from '../cli/security.js';
import { generateKongConfig, generateAwsGatewayConfig, generateK8sIngress } from '../cli/apim.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || ['--help', '-h', 'help'].includes(command)) {
    printHelp();
    process.exit(0);
  }

  const getArgValue = (name) => {
    const prefix = `--${name}=`;
    const found = args.find(a => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : null;
  };

  const isJsonMode = args.includes('--json');

  switch (command) {
    case 'read': {
      const workspacePath = getArgValue('workspace');
      if (!workspacePath) {
        console.error('Error: --workspace=<path> is required.');
        process.exit(1);
      }
      try {
        const workspace = readWorkspace(workspacePath);
        console.log(JSON.stringify(workspace, null, 2));
        process.exit(0);
      } catch (err) {
        console.error('Failed to read workspace:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'write': {
      const workspacePath = getArgValue('workspace');
      if (!workspacePath) {
        console.error('Error: --workspace=<path> is required.');
        process.exit(1);
      }
      
      let inputData = '';
      process.stdin.on('data', chunk => {
        inputData += chunk;
      });
      
      process.stdin.on('end', () => {
        try {
          const workspaceData = JSON.parse(inputData);
          writeWorkspace(workspacePath, workspaceData);
          if (isJsonMode) {
            console.log(JSON.stringify({ type: 'result', success: true }));
          } else {
            console.log('Workspace written successfully.');
          }
          process.exit(0);
        } catch (err) {
          console.error('Failed to write workspace:', err.message);
          process.exit(1);
        }
      });
      break;
    }

    case 'run': {
      const workspacePath = getArgValue('workspace');
      const envName = getArgValue('env');

      if (!workspacePath) {
        console.error('Error: --workspace=<path> is required.');
        process.exit(1);
      }

      try {
        const workspace = readWorkspace(workspacePath);
        const result = await executeCollection(workspace, envName, {
          verbose: !isJsonMode,
          onLog: (msg, ...meta) => {
            if (!isJsonMode) {
              console.log(msg, ...meta);
            }
          },
          onProgress: (prog) => {
            if (isJsonMode) {
              console.log(JSON.stringify({ type: 'progress', ...prog }));
            }
          }
        });

        if (isJsonMode) {
          console.log(JSON.stringify({ type: 'result', data: result }));
        }

        process.exit(result.success ? 0 : 1);
      } catch (err) {
        console.error('Fatal execution error:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'load': {
      const url = getArgValue('url');
      const method = getArgValue('method') || 'GET';
      const headersStr = getArgValue('headers') || '{}';
      const body = getArgValue('body') || undefined;
      const vusers = parseInt(getArgValue('vusers') || '5', 10);
      const iterations = parseInt(getArgValue('iterations') || '10', 10);

      if (!url) {
        console.error('Error: --url=<url> is required.');
        process.exit(1);
      }

      let headers = {};
      try {
        headers = JSON.parse(headersStr);
      } catch (e) {
        console.error('Error: --headers parameter must be valid JSON.');
        process.exit(1);
      }

      if (!isJsonMode) {
        console.log(`Starting performance load test on ${url} (${vusers} VUsers, ${iterations} Iterations)...`);
      }

      try {
        const result = await runLoadTest({ url, method, headers, body, vusers, iterations }, (completed, total) => {
          if (isJsonMode) {
            console.log(JSON.stringify({ type: 'progress', completed, total }));
          } else {
            process.stdout.write(`Progress: ${completed}/${total}\r`);
          }
        });

        if (isJsonMode) {
          console.log(JSON.stringify({ type: 'result', data: result }));
        } else {
          console.log('\n\n--- Load Test Result Summary ---');
          console.log(`Total Requests:  ${result.totalRequests}`);
          console.log(`Successful:      ${result.successful}`);
          console.log(`Failed:          ${result.failed}`);
          console.log(`P95 Latency:     ${result.p95Latency.toFixed(2)} ms`);
          console.log(`Avg Latency:     ${result.avgLatency.toFixed(2)} ms`);
          console.log(`Duration:        ${(result.durationMs / 1000).toFixed(2)} s`);
          if (Object.keys(result.errors).length > 0) {
            console.log('Errors:', JSON.stringify(result.errors, null, 2));
          }
        }
        process.exit(0);
      } catch (err) {
        console.error('Performance testing crash:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'scan': {
      const url = getArgValue('url');
      const method = getArgValue('method') || 'GET';
      const headersStr = getArgValue('headers') || '{}';
      const paramsStr = getArgValue('params') || '[]';
      const body = getArgValue('body') || undefined;

      if (!url) {
        console.error('Error: --url=<url> is required.');
        process.exit(1);
      }

      let headers = {};
      let params = [];
      try {
        headers = JSON.parse(headersStr);
        params = JSON.parse(paramsStr);
      } catch (e) {
        console.error('Error: --headers and --params parameters must be valid JSON.');
        process.exit(1);
      }

      if (!isJsonMode) {
        console.log(`Starting security vulnerability scan on ${url}...`);
      }

      try {
        const result = await runSecurityScan({ url, method, headers, params, body }, (msg) => {
          if (isJsonMode) {
            console.log(JSON.stringify({ type: 'progress', message: msg }));
          } else {
            console.log(`  [Scan] ${msg}`);
          }
        });

        if (isJsonMode) {
          console.log(JSON.stringify({ type: 'result', data: result }));
        } else {
          console.log('\n--- Security Scan Result Summary ---');
          console.log(`Scanned Param Combinations: ${result.scannedEndpoints}`);
          console.log(`Vulnerabilities Found:       ${result.vulnerabilitiesFound}`);
          result.results.forEach(res => {
            const status = res.isVulnerable ? '⚠️ VULNERABLE' : '✓ SECURE';
            console.log(`  [${status}] ${res.vulnerabilityType} on ${res.targetParameter} (Payload: ${res.payload}) - Note: ${res.notes}`);
          });
        }
        process.exit(0);
      } catch (err) {
        console.error('Security scan crash:', err.message);
        process.exit(1);
      }
      break;
    }

    case 'apim': {
      const openapiPath = getArgValue('openapi');
      const target = getArgValue('target');
      const outPath = getArgValue('out');

      if (!openapiPath || !target) {
        console.error('Error: --openapi=<path> and --target=<kong|aws|k8s> are required.');
        process.exit(1);
      }

      if (!fs.existsSync(openapiPath)) {
        console.error(`Error: OpenAPI file not found at ${openapiPath}`);
        process.exit(1);
      }

      try {
        // Read and parse JSON/YAML spec
        const rawContent = fs.readFileSync(openapiPath, 'utf8');
        let specObj;
        if (openapiPath.endsWith('.json')) {
          specObj = JSON.parse(rawContent);
        } else {
          // Simplified YAML-like loader if js-yaml isn't there, or fall back to basic regex
          // To ensure zero dependencies, we check if it is JSON first, if not we parse it as basic text or JSON
          try {
            specObj = JSON.parse(rawContent);
          } catch (e) {
            // Very simple yaml key-value parser fallback, standard spec should preferably be JSON for parser simplicity
            // or we throw alert requiring JSON for advanced structures.
            console.warn('[WARN] parsing YAML specs. Using simple parser fallback.');
            specObj = parseSimpleYaml(rawContent);
          }
        }

        let outputConfig = '';
        if (target === 'kong') {
          outputConfig = generateKongConfig(specObj);
        } else if (target === 'aws') {
          outputConfig = generateAwsGatewayConfig(specObj);
        } else if (target === 'k8s') {
          outputConfig = generateK8sIngress(specObj);
        } else {
          console.error(`Error: Unsupported target gateway '${target}'. Choose kong, aws, or k8s.`);
          process.exit(1);
        }

        if (outPath) {
          fs.writeFileSync(outPath, outputConfig);
          if (!isJsonMode) console.log(`Config written to file: ${outPath}`);
        } else {
          console.log(outputConfig);
        }
        process.exit(0);
      } catch (err) {
        console.error('APIM config generation error:', err.message);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function parseSimpleYaml(yamlText) {
  // A super basic YAML-to-Object parser for simple specs
  const lines = yamlText.split('\n');
  const result = { openapi: '3.0.0', info: { title: 'Imported Spec' }, paths: {} };
  let currentPath = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (line.startsWith('  /')) { // Path declaration in basic swagger
      currentPath = trimmed.replace(/:$/, '');
      result.paths[currentPath] = {};
    } else if (line.startsWith('    ') && currentPath) { // Method declaration
      const method = trimmed.replace(/:$/, '');
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        result.paths[currentPath][method] = {};
      }
    }
  }
  return result;
}

function printHelp() {
  console.log(`
API360 Studio - CLI & Core Runner Help

Usage:
  api360-cli <command> [arguments]

Commands:
  run     Executes collections of APIs in series.
          Arguments:
            --workspace=<path>      Path to workspace folder
            --env=<name>            Active environment name (optional)
            --json                  Output progress as structured JSON lines

  read    Reads a Git-native workspace and prints the unified JSON.
          Arguments:
            --workspace=<path>      Path to workspace folder

  write   Writes a unified JSON workspace back to Git-native files.
          Arguments:
            --workspace=<path>      Path to workspace folder
          (Expects JSON workspace payload passed via stdin)

  load    Runs a parallel virtual-user load test on an endpoint.
          Arguments:
            --url=<endpoint>        Target URL
            --method=<method>       HTTP Method (default: GET)
            --headers=<json-str>    HTTP headers JSON string (default: {})
            --body=<body>           Request payload (for POST/PUT/PATCH)
            --vusers=<count>        Number of concurrent virtual users (default: 5)
            --iterations=<count>    Requests executed per virtual user (default: 10)
            --json                  Output progress as structured JSON lines

  scan    Fuzzes endpoint query parameters for OWASP SQLi/XSS.
          Arguments:
            --url=<endpoint>        Target URL with parameters
            --method=<method>       HTTP Method
            --headers=<json-str>    HTTP headers JSON string
            --params=<json-str>     Target query parameters array JSON string
            --body=<body>           Request payload
            --json                  Output progress as structured JSON lines

  apim    Generates declarative config for APIM Gateways.
          Arguments:
            --openapi=<path>        Path to OpenAPI JSON/YAML document
            --target=<gateway>      Deployment target: kong, aws, or k8s
            --out=<file-path>       Save result directly to a file (optional)
  `);
}

main();
