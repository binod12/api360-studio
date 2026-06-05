import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Save, Folder, Plus, X, PanelLeft, PanelBottom, Database, Download, AlertTriangle, CheckCircle2, Rocket, Trash2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { KeyValueEditor } from './KeyValueEditor';
import type { KeyValueStore } from './KeyValueEditor';
import { useLocalStorage } from './useLocalStorage';
import Editor from '@monaco-editor/react';
import { executeScript } from './sandbox';
import type { TestResult } from './sandbox';
import { parsePostmanCollection } from './postman';
import { ApiDesigner } from './ApiDesigner';
import { runLoadTest, type LoadTestResult } from './loadRunner';
import { runSecurityScan, type SecurityScanReport } from './securityScanner';
import { runDataDrivenTest, type DataDrivenReport } from './dataDrivenTester';
import { CLI_RUNNER_TEMPLATE } from './cliRunnerTemplate';
import JSZip from 'jszip';
import { selectWorkspaceDir, runCliCommand, isTauri, writeTextFile } from './tauriClient';
// @ts-ignore
import { generateKongConfig, generateAwsGatewayConfig, generateK8sIngress } from '../cli/apim.js';

interface WsMessage {
  id: string;
  type: 'sent' | 'received' | 'info' | 'error';
  data: string;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  method: string;
  url: string;
  timestamp: number;
}
interface Collection {
  id: string;
  name: string;
}
interface SavedRequest {
  id: string;
  name: string;
  collectionId: string;
  method: string;
  url: string;
  headers: KeyValueStore[];
  params: KeyValueStore[];
  body: string;
}
interface Environment {
  id: string;
  name: string;
  variables: KeyValueStore[];
}
interface WorkspaceTab {
  id: string;
  name: string;
  method: string;
  url: string;
  params: KeyValueStore[];
  headers: KeyValueStore[];
  reqBody: string;
  bodyType: 'json' | 'graphql';
  graphqlQuery: string;
  graphqlVariables: string;
  authType: string;
  bearerToken: string;
  basicAuthUser: string;
  basicAuthPass: string;
  response: any;
  loading: boolean;
  respTime: number;
  respStatus: number;
  respSize: number;
  contract: string;
  contractResult: { passed: boolean; error?: string } | null;
  wsStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
  wsMessages: WsMessage[];
  preScript: string;
  postScript: string;
  testResults: TestResult[];
}
import './index.css';

function App() {
  const defaultTab = (): WorkspaceTab => ({
    id: crypto.randomUUID(),
    name: 'Untitled Request',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    params: [{ key: '', value: '', enabled: true }],
    headers: [{ key: '', value: '', enabled: true }],
    reqBody: '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}',
    bodyType: 'json',
    graphqlQuery: 'query {\n  \n}',
    graphqlVariables: '{\n  \n}',
    authType: 'None',
    bearerToken: '',
    basicAuthUser: '',
    basicAuthPass: '',
    response: null,
    loading: false,
    respTime: 0,
    respStatus: 0,
    respSize: 0,
    contract: '',
    contractResult: null,
    wsStatus: 'DISCONNECTED',
    wsMessages: [],
    preScript: '',
    postScript: '',
    testResults: [],
  });

  const [workspaceTabs, setWorkspaceTabs] = useLocalStorage<WorkspaceTab[]>('api360_tabs', [defaultTab()]);
  const [activeTabId, setActiveTabId] = useLocalStorage<string>('api360_active_tab_id', '');

  // fallback if activeTabId is invalid
  const activeTabObj = workspaceTabs.find(t => t.id === activeTabId) || workspaceTabs[0];

  useEffect(() => {
    if (!activeTabId && workspaceTabs.length > 0) setActiveTabId(workspaceTabs[0].id);
  }, [workspaceTabs, activeTabId, setActiveTabId]);

  const updateActiveTab = (updates: Partial<WorkspaceTab>) => {
    if (!activeTabObj) return;
    setWorkspaceTabs(prev => prev.map(t => t.id === activeTabObj.id ? { ...t, ...updates } : t));
  };

  const method = activeTabObj?.method ?? 'GET';
  const url = activeTabObj?.url ?? '';
  const params = activeTabObj?.params ?? [];
  const headers = activeTabObj?.headers ?? [];
  const reqBody = activeTabObj?.reqBody ?? '';
  const bodyType = activeTabObj?.bodyType ?? 'json';
  const graphqlQuery = activeTabObj?.graphqlQuery ?? '';
  const graphqlVariables = activeTabObj?.graphqlVariables ?? '';
  const authType = activeTabObj?.authType ?? 'None';
  const bearerToken = activeTabObj?.bearerToken ?? '';
  const basicAuthUser = activeTabObj?.basicAuthUser ?? '';
  const basicAuthPass = activeTabObj?.basicAuthPass ?? '';
  const response = activeTabObj?.response ?? null;
  const loading = activeTabObj?.loading ?? false;
  const respTime = activeTabObj?.respTime ?? 0;
  const respStatus = activeTabObj?.respStatus ?? 0;
  const respSize = activeTabObj?.respSize ?? 0;
  const contract = activeTabObj?.contract ?? '';
  const contractResult = activeTabObj?.contractResult ?? null;
  const wsStatus = activeTabObj?.wsStatus ?? 'DISCONNECTED';
  const wsMessages = activeTabObj?.wsMessages ?? [];
  const preScript = activeTabObj?.preScript ?? '';
  const postScript = activeTabObj?.postScript ?? '';
  const testResults = activeTabObj?.testResults ?? [];

  const setMethod = (v: string | ((prev: string) => string)) => updateActiveTab({ method: typeof v === 'function' ? v(method) : v });
  const setUrl = (v: string | ((prev: string) => string)) => {
    let newName = activeTabObj?.name;
    const newVal = typeof v === 'function' ? v(url) : v;
    try {
      new URL(newVal);
      if (activeTabObj?.name === 'Untitled Request' || activeTabObj?.name === activeTabObj?.url) newName = newVal;
    } catch (e) { }
    updateActiveTab({ url: newVal, name: newName });
  };
  const setParams = (v: KeyValueStore[] | ((prev: KeyValueStore[]) => KeyValueStore[])) => updateActiveTab({ params: typeof v === 'function' ? v(params) : v });
  const setHeaders = (v: KeyValueStore[] | ((prev: KeyValueStore[]) => KeyValueStore[])) => updateActiveTab({ headers: typeof v === 'function' ? v(headers) : v });
  const setReqBody = (v: string | ((prev: string) => string)) => updateActiveTab({ reqBody: typeof v === 'function' ? v(reqBody) : v });
  const setBodyType = (v: 'json' | 'graphql' | ((prev: 'json' | 'graphql') => 'json' | 'graphql')) => updateActiveTab({ bodyType: typeof v === 'function' ? v(bodyType) : v });
  const setGraphqlQuery = (v: string | ((prev: string) => string)) => updateActiveTab({ graphqlQuery: typeof v === 'function' ? v(graphqlQuery) : v });
  const setGraphqlVariables = (v: string | ((prev: string) => string)) => updateActiveTab({ graphqlVariables: typeof v === 'function' ? v(graphqlVariables) : v });
  const setAuthType = (v: string | ((prev: string) => string)) => updateActiveTab({ authType: typeof v === 'function' ? v(authType) : v });
  const setBearerToken = (v: string | ((prev: string) => string)) => updateActiveTab({ bearerToken: typeof v === 'function' ? v(bearerToken) : v });
  const setBasicAuthUser = (v: string | ((prev: string) => string)) => updateActiveTab({ basicAuthUser: typeof v === 'function' ? v(basicAuthUser) : v });
  const setBasicAuthPass = (v: string | ((prev: string) => string)) => updateActiveTab({ basicAuthPass: typeof v === 'function' ? v(basicAuthPass) : v });
  const setResponse = (v: any) => updateActiveTab({ response: typeof v === 'function' ? v(response) : v });
  const setLoading = (v: boolean | ((prev: boolean) => boolean)) => updateActiveTab({ loading: typeof v === 'function' ? v(loading) : v });
  const setRespTime = (v: number | ((prev: number) => number)) => updateActiveTab({ respTime: typeof v === 'function' ? v(respTime) : v });
  const setRespStatus = (v: number | ((prev: number) => number)) => updateActiveTab({ respStatus: typeof v === 'function' ? v(respStatus) : v });
  const setRespSize = (v: number | ((prev: number) => number)) => updateActiveTab({ respSize: typeof v === 'function' ? v(respSize) : v });
  const setContract = (v: string | ((prev: string) => string)) => updateActiveTab({ contract: typeof v === 'function' ? v(contract) : v });
  const setContractResult = (v: { passed: boolean; error?: string } | null) => updateActiveTab({ contractResult: v });
  const setWsStatus = (v: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED') => updateActiveTab({ wsStatus: v });
  const setWsMessages = (v: WsMessage[] | ((prev: WsMessage[]) => WsMessage[])) => updateActiveTab({ wsMessages: typeof v === 'function' ? v(wsMessages) : v });
  const setPreScript = (v: string | ((prev: string) => string)) => updateActiveTab({ preScript: typeof v === 'function' ? v(preScript) : v });
  const setPostScript = (v: string | ((prev: string) => string)) => updateActiveTab({ postScript: typeof v === 'function' ? v(postScript) : v });
  const setTestResults = (v: TestResult[]) => updateActiveTab({ testResults: v });

  const [activeTab, setActiveTab] = useState('Params');
  const [wsMessageInput, setWsMessageInput] = useState('{\n  "action": "ping"\n}');
  const wsClients = useRef<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appMode, setAppMode] = useLocalStorage<'client' | 'designer'>('api360_app_mode', 'client');
  const [openApiDoc, setOpenApiDoc] = useLocalStorage<string>('api360_openapi_doc', '{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "Sample API",\n    "version": "1.0.0"\n  },\n  "paths": {}\n}');
  const [isMockEnabled, setIsMockEnabled] = useLocalStorage<boolean>('api360_mock_enabled', false);

  const [history, setHistory] = useLocalStorage<HistoryItem[]>('api360_history', []);
  const [collections, setCollections] = useLocalStorage<Collection[]>('api360_collections', [{ id: 'default', name: 'My Collection' }]);
  const [savedRequests, setSavedRequests] = useLocalStorage<SavedRequest[]>('api360_saved_requests', []);

  const [environments, setEnvironments] = useLocalStorage<Environment[]>('api360_environments', [{ id: 'default', name: 'Global', variables: [{ key: 'BASE_URL', value: 'https://api.example.com', enabled: true }] }]);
  const [activeEnvId, setActiveEnvId] = useLocalStorage<string>('api360_active_env', 'default');
  const [workspacePath, setWorkspacePath] = useLocalStorage<string>('api360_workspace_path', '');
  const isSyncingRef = useRef(false);

  const deleteCollection = (colId: string) => {
    setCollections(prev => prev.filter(c => c.id !== colId));
    setSavedRequests(prev => prev.filter(r => r.collectionId !== colId));
  };

  const deleteRequest = (reqId: string) => {
    setSavedRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const loadWorkspaceFromDir = async (pathStr: string) => {
    let stdoutData = '';
    try {
      isSyncingRef.current = true;
      await runCliCommand(
        'read',
        [`--workspace=${pathStr}`],
        null,
        (line) => { stdoutData += line + '\n'; },
        (errLine) => { console.error("CLI Load Err:", errLine); }
      );
      if (stdoutData.trim()) {
        const parsed = JSON.parse(stdoutData.trim());
        if (parsed.collections) setCollections(parsed.collections);
        if (parsed.requests) setSavedRequests(parsed.requests);
        if (parsed.environments) setEnvironments(parsed.environments);
      }
    } catch (err: any) {
      console.error("Failed to load workspace from folder:", err);
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 200);
    }
  };

  const saveWorkspaceToDir = async (pathStr: string, currentData: { collections: any[], requests: any[], environments: any[] }) => {
    try {
      await runCliCommand(
        'write',
        [`--workspace=${pathStr}`, '--json'],
        JSON.stringify(currentData),
        () => {},
        (errLine) => { console.error("CLI Save Err:", errLine); }
      );
    } catch (err: any) {
      console.error("Failed to save workspace to folder:", err);
    }
  };

  useEffect(() => {
    if (isTauri() && workspacePath) {
      loadWorkspaceFromDir(workspacePath);
    }
  }, [workspacePath]);

  useEffect(() => {
    if (isTauri() && workspacePath && !isSyncingRef.current) {
      saveWorkspaceToDir(workspacePath, { collections, requests: savedRequests, environments });
    }
  }, [collections, savedRequests, environments]);

  const handleSelectWorkspace = async () => {
    const dir = await selectWorkspaceDir();
    if (dir) {
      setWorkspacePath(dir);
      await loadWorkspaceFromDir(dir);
    }
  };

  const handleExportApim = async (target: 'kong' | 'aws' | 'k8s') => {
    let specObj;
    try {
      specObj = JSON.parse(openApiDoc);
    } catch (e: any) {
      alert("Invalid OpenAPI JSON specification. Please resolve syntax errors before exporting.");
      return;
    }

    let outputConfig = '';
    let fileName = '';
    
    if (target === 'kong') {
      outputConfig = generateKongConfig(specObj);
      fileName = 'kong.yml';
    } else if (target === 'aws') {
      outputConfig = generateAwsGatewayConfig(specObj);
      fileName = 'aws-api-gateway.json';
    } else if (target === 'k8s') {
      outputConfig = generateK8sIngress(specObj);
      fileName = 'k8s-ingress.yaml';
    }

    if (isTauri() && workspacePath) {
      try {
        const specPath = `${workspacePath}/specs/openapi.json`;
        const outPath = `${workspacePath}/apim/${fileName}`;
        
        // Write the openapi spec to the specs/openapi.json file
        await writeTextFile(specPath, JSON.stringify(specObj, null, 2));
        
        // Run the CLI generator to build and save the APIM config
        await runCliCommand(
          'apim',
          [
            `--openapi=${specPath}`,
            `--target=${target}`,
            `--out=${outPath}`
          ],
          null,
          () => {},
          (err) => console.error("CLI APIM Generation Error:", err)
        );
        
        alert(`Successfully generated APIM config in workspace:\n${outPath}`);
      } catch (err: any) {
        alert("Failed to export APIM configuration via CLI: " + err.message);
      }
    } else {
      // Browser fallback
      const blob = new Blob([outputConfig], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCollectionId, setSaveCollectionId] = useState('default');

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [loadVusers, setLoadVusers] = useState(10);
  const [loadIterations, setLoadIterations] = useState(5);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadTotal, setLoadTotal] = useState(0);
  const [loadResult, setLoadResult] = useState<LoadTestResult | null>(null);
  const [isLoadRunning, setIsLoadRunning] = useState(false);

  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSecurityRunning, setIsSecurityRunning] = useState(false);
  const [securityProgress, setSecurityProgress] = useState('');
  const [securityResult, setSecurityResult] = useState<SecurityScanReport | null>(null);

  const [isDataDrivenModalOpen, setIsDataDrivenModalOpen] = useState(false);
  const [csvDataInput, setCsvDataInput] = useState('userId, action\n1, login\n2, logout\n3, view_profile');
  const [dataDrivenResult, setDataDrivenResult] = useState<DataDrivenReport | null>(null);
  const [isDataDrivenRunning, setIsDataDrivenRunning] = useState(false);

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const responsePanelRef = useRef<ImperativePanelHandle>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResponseCollapsed, setIsResponseCollapsed] = useState(false);

  const toggleSidebar = () => {
    if (!sidebarPanelRef.current) return;
    if (isSidebarCollapsed) {
      sidebarPanelRef.current.expand();
    } else {
      sidebarPanelRef.current.collapse();
    }
  };

  const toggleResponse = () => {
    if (!responsePanelRef.current) return;
    if (isResponseCollapsed) {
      responsePanelRef.current.expand();
    } else {
      responsePanelRef.current.collapse();
    }
  };

  const handleImportCollection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const result = parsePostmanCollection(jsonStr);
        setCollections(prev => [...prev, ...result.collections]);
        setSavedRequests(prev => [...prev, ...result.requests]);
      } catch (err: any) {
        console.error("Failed to import collection:", err);
        alert(`Failed to import postman collection: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  // Sync URL query params with the params state
  useEffect(() => {
    try {
      const urlObj = new URL(url);
      const newParams: KeyValueStore[] = [];
      urlObj.searchParams.forEach((value, key) => {
        if (!params.find(p => p.key === key && p.value === value)) {
          newParams.push({ key, value, enabled: true });
        }
      });

      // Basic merge (this is a simplified 1-way sync for MVP)
      if (newParams.length > 0 && params.length === 1 && params[0].key === '') {
        setParams([...newParams, { key: '', value: '', enabled: true }]);
      }
    } catch (e) {
      // invalid URL
    }
  }, [url]);

  const handleParamsChange = (newParams: KeyValueStore[]) => {
    setParams(newParams);
    try {
      const urlObj = new URL(url);
      urlObj.search = '';
      newParams.filter(p => p.enabled && p.key).forEach(p => {
        urlObj.searchParams.append(p.key, p.value);
      });
      setUrl(urlObj.toString());
    } catch (e) { }
  };

  useEffect(() => {
    if (['WS', 'WSS'].includes(method)) {
      if (activeTab === 'Body' || activeTab === 'Contract') setActiveTab('Message');
    } else {
      if (activeTab === 'Message') setActiveTab('Body');
    }
  }, [method, activeTab]);


  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const options: RequestInit = { method };

      // Add default headers for JSON if body is present
      const reqHeaders: Record<string, string> = {};
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (bodyType === 'graphql') {
          // We'll fully build the graphql body after variable resolution below
          reqHeaders['Content-Type'] = 'application/json';
        } else {
          options.body = reqBody;
          reqHeaders['Content-Type'] = 'application/json';
        }
      }
      // Set custom headers
      headers.filter(h => h.enabled && h.key).forEach(h => {
        reqHeaders[h.key] = h.value;
      });

      // Environment Variable Resolution Engine
      const activeEnv = environments.find(e => e.id === activeEnvId);
      const resolveVariables = (text: string) => {
        if (!text || !activeEnv) return text;
        return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
          const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
          return variable ? variable.value : match;
        });
      };

      const resolvedUrl = resolveVariables(url);

      // --- DYNAMIC MOCK SERVER INTERCEPTOR ---
      if (isMockEnabled && openApiDoc) {
        try {
           const spec = JSON.parse(openApiDoc);
           let mockResponse: any = { mocked: true, message: "Prism mock response (No matching path found in Spec)" };
           try {
             const urlObj = new URL(resolvedUrl);
             const pathMatches = Object.keys(spec.paths || {}).filter(p => urlObj.pathname.includes(p.replace(/\{.*\}/g, '')));
             if (pathMatches.length > 0) {
               const methodSpec = spec.paths[pathMatches[0]][method.toLowerCase()];
               if (methodSpec && methodSpec.responses) {
                  const successCode = Object.keys(methodSpec.responses).find(k => k.startsWith('2')) || '200';
                  const content = methodSpec.responses[successCode]?.content;
                  if (content && content['application/json']?.example) {
                     mockResponse = content['application/json'].example;
                  } else {
                     mockResponse = { mocked: true, message: `Prism mock: schema found for ${method} ${pathMatches[0]} but no example provided` };
                  }
               }
             }
           } catch(e) {}
           
           setRespTime(5);
           setRespStatus(200);
           setRespSize(new Blob([JSON.stringify(mockResponse)]).size);
           setResponse(mockResponse);
           setLoading(false);
           return;
        } catch(e) {
           console.warn("Mock enabled but spec invalid");
        }
      }
      // ----------------------------------------

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (bodyType === 'graphql') {
          let parsedVars = {};
          try {
            parsedVars = graphqlVariables ? JSON.parse(resolveVariables(graphqlVariables)) : {};
          } catch (e) {
            console.warn("Invalid GraphQL variables", e);
          }
          options.body = JSON.stringify({
            query: resolveVariables(graphqlQuery),
            variables: parsedVars
          });
        } else {
          options.body = resolveVariables(reqBody);
        }
      }

      // Resolve variables inside headers too
      for (const k in reqHeaders) {
        reqHeaders[k] = resolveVariables(reqHeaders[k]);
      }

      if (authType === 'Bearer Token' && bearerToken) {
        reqHeaders['Authorization'] = `Bearer ${bearerToken}`;
      } else if (authType === 'Basic Auth' && (basicAuthUser || basicAuthPass)) {
        reqHeaders['Authorization'] = `Basic ${btoa(`${basicAuthUser}:${basicAuthPass}`)}`;
      }

      options.headers = reqHeaders;

      let finalUrl = resolvedUrl;
      const sandboxEnvVars: Record<string, string> = {};

      if (preScript.trim()) {
        const preContext = {
          request: { url: finalUrl, method, headers: reqHeaders, body: options.body },
          environment: {
            get: (k: string) => sandboxEnvVars[k] || activeEnv?.variables.find(v => v.key === k)?.value,
            set: (k: string, v: string) => { sandboxEnvVars[k] = v; }
          },
          variables: {}
        };
        const preRes = executeScript(preScript, preContext);
        if (preRes.error) {
          throw new Error(`Pre-request Script Error: ${preRes.error}`);
        }
        finalUrl = preRes.context.request!.url;
        options.headers = preRes.context.request!.headers as HeadersInit;
        options.body = preRes.context.request!.body;
      }

      let resFinalStatus = 0;
      let resFinalTime = 0;
      let resFinalSize = 0;

      let res;
      let respData;

      // Use Tauri Native Fetch to bypass CORS (works in Desktop build)
      if ((window as any).__TAURI_INTERNALS__) {
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
        res = await tauriFetch(finalUrl, options);

        const end = performance.now();
        resFinalTime = Math.round(end - start);
        resFinalStatus = res.status;
        setRespTime(resFinalTime);
        setRespStatus(resFinalStatus);

        const text = await res.text();
        resFinalSize = new Blob([text]).size;
        setRespSize(resFinalSize);

        try { respData = JSON.parse(text); } catch { respData = text; }
        setResponse(respData);

      } else if ((window as any).vscode) {
        // VS Code Native Inter-Process Communication (IPC) Fetch
        const reqId = crypto.randomUUID();

        const fetchPromise = new Promise<{ status: number, data: any, time: number, size: number }>((resolve, reject) => {
          const handler = (event: MessageEvent) => {
            const msg = event.data;
            if (msg && msg.reqId === reqId) {
              window.removeEventListener('message', handler);
              if (msg.command === 'fetchResponse') {
                resolve({ status: msg.status, data: msg.data, time: msg.time, size: msg.size });
              } else if (msg.command === 'fetchError') {
                reject(new Error(msg.error));
              }
            }
          };
          window.addEventListener('message', handler);

          // Fallback timeout in case backend drops the message entirely (e.g. fatal node exception)
          setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error("Request timed out internally (No response from VS Code backend)"));
          }, 30000);
        });

        (window as any).vscode.postMessage({
          command: 'fetch',
          reqId,
          url: finalUrl,
          options: {
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body
          }
        });

        const result = await fetchPromise;
        resFinalTime = Math.round(result.time);
        resFinalStatus = result.status;
        resFinalSize = result.size;
        setRespTime(resFinalTime);
        setRespStatus(resFinalStatus);
        setRespSize(resFinalSize);
        // data comes back already parsed if it was json, or raw string if not
        respData = result.data;
        setResponse(respData);

      } else {
        console.warn('Tauri API not available, falling back to pure XMLHttpRequest (CORS applies)');
        // Fallback for browser-based validation that bypasses monkey-patched window.fetch
        res = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(options.method || 'GET', finalUrl);
          if (options.headers) {
            Object.entries(options.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
          }
          xhr.onload = () => {
            resolve(new Response(xhr.response, { status: xhr.status }));
          };
          xhr.onerror = () => reject(new TypeError('Network request failed'));
          xhr.ontimeout = () => reject(new TypeError('Network timeout'));
          if (options.body) { xhr.send(options.body as any); } else { xhr.send(); }
        });

        const end = performance.now();
        resFinalTime = Math.round(end - start);
        resFinalStatus = res.status;
        setRespTime(resFinalTime);
        setRespStatus(resFinalStatus);

        const text = await res.text();
        resFinalSize = new Blob([text]).size;
        setRespSize(resFinalSize);

        try { respData = JSON.parse(text); } catch { respData = text; }
        setResponse(respData);
      }

      // Save to history upon successful transmission
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        method,
        url,
        timestamp: Date.now()
      };

      setHistory((prev) => {
        // Keep only the last 50 requests
        const updated = [newHistoryItem, ...prev.filter(h => h.url !== url || h.method !== method)];
        return updated.slice(0, 50);
      });

      setResponse(respData);

      setResponse(respData);

      // --- Post-Request Script Execution ---
      if (postScript.trim()) {
        const postContext = {
          response: {
            status: resFinalStatus,
            time: resFinalTime,
            size: resFinalSize,
            body: respData,
            headers: {} // Stub for browser API limits
          },
          environment: {
            get: (k: string) => sandboxEnvVars[k] || activeEnv?.variables.find(v => v.key === k)?.value,
            set: (k: string, v: string) => { sandboxEnvVars[k] = v; }
          },
          variables: {}
        };
        const postRes = executeScript(postScript, postContext);
        setTestResults(postRes.tests || []);
        if (postRes.error) {
          console.error(`Post-request Script Error:`, postRes.error);
        }
      } else {
        setTestResults([]);
      }

      // Contract Validation Engine
      if (contract.trim() && typeof respData === 'object' && respData !== null) {
        try {
          const Ajv = (await import('ajv')).default;
          const ajv = new Ajv({ allErrors: false });
          const schema = JSON.parse(contract);
          const validate = ajv.compile(schema);
          const valid = validate(respData);

          if (valid) {
            setContractResult({ passed: true });
          } else {
            const errorMsg = ajv.errorsText(validate.errors, { separator: '\n' });
            setContractResult({ passed: false, error: errorMsg });
          }
        } catch (err: any) {
          setContractResult({ passed: false, error: `Schema Error: ${err.message}` });
        }
      } else {
        setContractResult(null);
      }

    } catch (error: any) {
      const end = performance.now();
      setRespTime(Math.round(end - start));
      setRespStatus(0);
      setResponse({ error: error.message || 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  const toggleWebSocket = async () => {
    // If it's already connecting or connected, gracefully disconnect
    if (wsStatus === 'CONNECTING' || wsStatus === 'CONNECTED') {
      const existingClient = wsClients.current[activeTabObj.id];
      if (existingClient) {
        if ((window as any).__TAURI_INTERNALS__) {
          await existingClient.disconnect();
        } else {
          existingClient.close();
        }
      }
      setWsStatus('DISCONNECTED');
      return;
    }

    setWsStatus('CONNECTING');

    try {
      // Resolve env vars for URL
      const activeEnv = environments.find(e => e.id === activeEnvId);
      let resolvedUrl = url;
      if (activeEnv) {
        resolvedUrl = url.replace(/\{\{(.*?)\}\}/g, (match, key) => {
          const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
          return variable ? variable.value : match;
        });
      }

      const reqHeaders: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = activeEnv ? h.value.replace(/\{\{(.*?)\}\}/g, (match, key) => { const v = activeEnv.variables.find(v => v.key === key.trim() && v.enabled); return v ? v.value : match; }) : h.value; });

      const resToken = activeEnv ? bearerToken.replace(/\{\{(.*?)\}\}/g, (match, key) => { const v = activeEnv.variables.find(v => v.key === key.trim() && v.enabled); return v ? v.value : match; }) : bearerToken;
      if (authType === 'Bearer Token' && resToken) reqHeaders['Authorization'] = `Bearer ${resToken}`;

      const resUser = activeEnv ? basicAuthUser.replace(/\{\{(.*?)\}\}/g, (match, key) => { const v = activeEnv.variables.find(v => v.key === key.trim() && v.enabled); return v ? v.value : match; }) : basicAuthUser;
      const resPass = activeEnv ? basicAuthPass.replace(/\{\{(.*?)\}\}/g, (match, key) => { const v = activeEnv.variables.find(v => v.key === key.trim() && v.enabled); return v ? v.value : match; }) : basicAuthPass;
      if (authType === 'Basic Auth' && resUser) reqHeaders['Authorization'] = `Basic ${btoa(resUser + ':' + resPass)}`;

      // MVP Browser WebSocket implementation
      if ((window as any).__TAURI_INTERNALS__) {
        const WebSocketPlugin = (await import('@tauri-apps/plugin-websocket')).default;
        const ws = await WebSocketPlugin.connect(resolvedUrl, { headers: reqHeaders });
        wsClients.current[activeTabObj.id] = ws;

        setWsStatus('CONNECTED');
        setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'info', data: `Connected to ${resolvedUrl} (Tauri)`, timestamp: Date.now() }]);

        ws.addListener((msg: any) => {
          if (msg.type === 'Text') {
            setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'received', data: msg.data, timestamp: Date.now() }]);
          } else if (msg.type === 'Close') {
            setWsStatus('DISCONNECTED');
            setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'info', data: 'Disconnected (Server Closed)', timestamp: Date.now() }]);
            delete wsClients.current[activeTabObj.id];
          }
        });
      } else {
        const ws = new window.WebSocket(resolvedUrl);
        wsClients.current[activeTabObj.id] = ws;

        ws.onopen = () => {
          setWsStatus('CONNECTED');
          setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'info', data: `Connected to ${resolvedUrl}`, timestamp: Date.now() }]);
        };

        ws.onmessage = (event) => {
          setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'received', data: event.data, timestamp: Date.now() }]);
        };

        ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
          setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'error', data: `WebSocket Error Occurred`, timestamp: Date.now() }]);
        };

        ws.onclose = () => {
          setWsStatus('DISCONNECTED');
          setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'info', data: 'Disconnected', timestamp: Date.now() }]);
          delete wsClients.current[activeTabObj.id];
        };
      }

    } catch (err: any) {
      setWsStatus('DISCONNECTED');
      setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'error', data: `Connection failed: ${err.message}`, timestamp: Date.now() }]);
    }
  };

  const fetchIntrospectionSchema = async () => {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const options: RequestInit = { method: 'POST' };

      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = h.value; });

      const activeEnv = environments.find(e => e.id === activeEnvId);
      const resolveVariables = (text: string) => {
        if (!text || !activeEnv) return text;
        return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
          const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
          return variable ? variable.value : match;
        });
      };

      const resolvedUrl = resolveVariables(url);

      for (const k in reqHeaders) { reqHeaders[k] = resolveVariables(reqHeaders[k]); }

      if (authType === 'Bearer Token' && bearerToken) {
        reqHeaders['Authorization'] = `Bearer ${bearerToken}`;
      } else if (authType === 'Basic Auth' && (basicAuthUser || basicAuthPass)) {
        reqHeaders['Authorization'] = `Basic ${btoa(`${basicAuthUser}:${basicAuthPass}`)}`;
      }

      options.headers = reqHeaders;

      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              ...FullType
            }
            directives {
              name
              description
              locations
              args {
                ...InputValue
              }
            }
          }
        }
        fragment FullType on __Type {
          kind
          name
          description
          fields(includeDeprecated: true) {
            name
            description
            args {
              ...InputValue
            }
            type {
              ...TypeRef
            }
            isDeprecated
            deprecationReason
          }
          inputFields {
            ...InputValue
          }
          interfaces {
            ...TypeRef
          }
          enumValues(includeDeprecated: true) {
            name
            description
            isDeprecated
            deprecationReason
          }
          possibleTypes {
            ...TypeRef
          }
        }
        fragment InputValue on __InputValue {
          name
          description
          type { ...TypeRef }
          defaultValue
        }
        fragment TypeRef on __Type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                      ofType {
                        kind
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      options.body = JSON.stringify({ query: introspectionQuery });

      let resFinalStatus = 0;
      let resFinalTime = 0;
      let resFinalSize = 0;
      let respData;

      if ((window as any).__TAURI_INTERNALS__) {
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
        const res = await tauriFetch(resolvedUrl, options);
        resFinalTime = Math.round(performance.now() - start);
        resFinalStatus = res.status;
        const text = await res.text();
        resFinalSize = new Blob([text]).size;
        try { respData = JSON.parse(text); } catch { respData = text; }
      } else if ((window as any).vscode) {
        const reqId = crypto.randomUUID();
        const fetchPromise = new Promise<{ status: number, data: any, time: number, size: number }>((resolve, reject) => {
          const handler = (event: MessageEvent) => {
            const msg = event.data;
            if (msg && msg.reqId === reqId) {
              window.removeEventListener('message', handler);
              if (msg.command === 'fetchResponse') resolve({ status: msg.status, data: msg.data, time: msg.time, size: msg.size });
              else if (msg.command === 'fetchError') reject(new Error(msg.error));
            }
          };
          window.addEventListener('message', handler);
        });
        (window as any).vscode.postMessage({ command: 'fetch', reqId, url: resolvedUrl, options });
        const result = await fetchPromise;
        resFinalTime = Math.round(result.time);
        resFinalStatus = result.status;
        resFinalSize = result.size;
        respData = result.data;
      } else {
        const res = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(options.method || 'POST', resolvedUrl);
          if (options.headers) {
            Object.entries(options.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
          }
          xhr.onload = () => resolve(new Response(xhr.response, { status: xhr.status }));
          xhr.onerror = () => reject(new TypeError('Network request failed'));
          if (options.body) xhr.send(options.body as any); else xhr.send();
        });
        resFinalTime = Math.round(performance.now() - start);
        resFinalStatus = res.status;
        const text = await res.text();
        resFinalSize = new Blob([text]).size;
        try { respData = JSON.parse(text); } catch { respData = text; }
      }

      setRespTime(resFinalTime);
      setRespStatus(resFinalStatus);
      setRespSize(resFinalSize);
      setResponse(respData);
      setTestResults([]);
      setContractResult(null);
      if (isResponseCollapsed && responsePanelRef.current) {
        responsePanelRef.current.expand();
      }

    } catch (error: any) {
      setRespTime(Math.round(performance.now() - start));
      setRespStatus(0);
      setResponse({ error: error.message || 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  const sendWsMessage = async () => {
    const ws = wsClients.current[activeTabObj.id];
    if (ws) {
      if ((window as any).__TAURI_INTERNALS__) {
        await ws.send(wsMessageInput);
        setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'sent', data: wsMessageInput, timestamp: Date.now() }]);
      } else if (ws.readyState === window.WebSocket.OPEN) {
        ws.send(wsMessageInput);
        setWsMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'sent', data: wsMessageInput, timestamp: Date.now() }]);
      }
    }
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'var(--status-success)';
    if (code >= 400 && code < 500) return 'var(--status-warning)';
    if (code >= 500) return 'var(--status-error)';
    return 'var(--text-muted)';
  };

  const tabs = ['WS', 'WSS'].includes(method)
    ? ['Params', 'Headers', 'Auth', 'Message']
    : ['Params', 'Headers', 'Auth', 'Body', 'Scripts', 'Contract'];

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <PanelGroup direction="horizontal">
        <Panel
          ref={sidebarPanelRef}
          defaultSize={20}
          minSize={10}
          maxSize={40}
          collapsible={true}
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        >
          <aside className="sidebar glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #a0a6b5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>API360</h1>
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <button 
                  onClick={() => setAppMode('client')} 
                  style={{ flex: 1, padding: '4px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500, background: appMode === 'client' ? 'var(--bg-tertiary)' : 'transparent', color: appMode === 'client' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Client
                </button>
                <button 
                  onClick={() => setAppMode('designer')} 
                  style={{ flex: 1, padding: '4px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500, background: appMode === 'designer' ? 'var(--bg-tertiary)' : 'transparent', color: appMode === 'designer' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Designer
                </button>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Collections</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isTauri() && (
                      <button
                        onClick={handleSelectWorkspace}
                        style={{ color: workspacePath ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                        title={workspacePath ? `Active Workspace: ${workspacePath}` : "Open Git-native Workspace Folder"}
                      >
                        <Folder size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ color: 'var(--text-muted)' }}
                      title="Import Postman Collection"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => setIsDeployModalOpen(true)}
                      style={{ color: 'var(--status-success)' }}
                      title="Export CI/CD Pipeline"
                    >
                      <Rocket size={14} />
                    </button>
                    <button
                      onClick={() => setIsCollectionModalOpen(true)}
                      style={{ color: 'var(--text-muted)' }}
                      title="New Collection"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".json"
                    onChange={handleImportCollection}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {collections.map(col => (
                    <div key={col.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 500, padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <Folder size={14} color="var(--accent-blue)" /> <span className="text-truncate">{col.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete collection "${col.name}"?`)) {
                              deleteCollection(col.id);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete Collection"
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px', marginTop: '4px' }}>
                        {savedRequests.filter(r => r.collectionId === col.id).map(r => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setMethod(r.method);
                              setUrl(r.url);
                              setHeaders(r.headers.length ? r.headers : [{ key: '', value: '', enabled: true }]);
                              setParams(r.params.length ? r.params : [{ key: '', value: '', enabled: true }]);
                              if (r.body) setReqBody(r.body);
                            }}
                            style={{ 
                              padding: '6px 8px', 
                              background: 'var(--bg-tertiary)', 
                              borderRadius: '6px', 
                              border: '1px solid transparent', 
                              color: 'var(--text-primary)', 
                              cursor: 'pointer', 
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            className="text-truncate"
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                          >
                            <div className="text-truncate" style={{ flex: 1 }}>
                              <span style={{ color: `var(--method-${r.method.toLowerCase()})`, fontWeight: 600, marginRight: '6px' }}>{r.method}</span>
                              {r.name}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete request "${r.name}"?`)) {
                                  deleteRequest(r.id);
                                }
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Delete Request"
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-error)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                History
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--border-highlight)' }}>No history yet</div>
                  ) : (
                    history.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setMethod(item.method);
                          setUrl(item.url);
                        }}
                        style={{
                          padding: '8px',
                          background: 'var(--bg-tertiary)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        className="text-truncate history-item"
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <span style={{ color: `var(--method-${item.method.toLowerCase()})`, fontWeight: 600, marginRight: '8px' }}>{item.method}</span>
                        {item.url}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        </Panel>

        <PanelResizeHandle className="resize-handle-vertical" style={{ width: '4px', cursor: 'col-resize', background: 'transparent' }}>
          <div style={{ width: '1px', height: '100%', background: 'var(--border-color)', margin: '0 auto' }} />
        </PanelResizeHandle>

        <Panel minSize={30}>
          <main style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            {appMode === 'designer' ? (
              <ApiDesigner value={openApiDoc} onChange={setOpenApiDoc} onExportApim={handleExportApim} />
            ) : (
              <>
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', WebkitAppRegion: 'drag' } as React.CSSProperties}>
              {workspaceTabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  style={{
                    padding: '8px 16px',
                    minWidth: '150px',
                    maxWidth: '200px',
                    borderRight: '1px solid var(--border-color)',
                    backgroundColor: tab.id === activeTabId ? 'var(--bg-primary)' : 'transparent',
                    color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    borderTop: tab.id === activeTabId ? '2px solid var(--accent-blue)' : '2px solid transparent'
                  }}
                >
                  <div className="text-truncate" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }} title={tab.name}>
                    <span style={{ color: `var(--method-${tab.method.toLowerCase()})`, fontWeight: 600, fontSize: '0.75rem' }}>{tab.method}</span>
                    {tab.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTabs = workspaceTabs.filter(t => t.id !== tab.id);
                      if (newTabs.length === 0) newTabs.push(defaultTab());
                      setWorkspaceTabs(newTabs);
                      if (tab.id === activeTabId) setActiveTabId(newTabs[newTabs.length - 1].id);
                    }}
                    style={{ color: 'var(--text-muted)', padding: '2px', borderRadius: '4px', marginLeft: '6px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newTab = defaultTab();
                  setWorkspaceTabs([...workspaceTabs, newTab]);
                  setActiveTabId(newTab.id);
                }}
                style={{ padding: '8px 16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', zIndex: 10 }}>
              <div style={{ display: 'flex', flex: 1, background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', padding: '4px', boxShadow: 'var(--shadow-sm)' }}>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: `var(--method-${method.toLowerCase()})`, fontWeight: 600, padding: '0 12px', cursor: 'pointer' }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="WS">WS</option>
                  <option value="WSS">WSS</option>
                </select>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                <input
                  type="text"
                  placeholder={['WS', 'WSS'].includes(method) ? "Enter WebSocket URL (e.g. wss://echo.websocket.org)" : "Enter request URL"}
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (['WS', 'WSS'].includes(method) ? toggleWebSocket() : sendRequest())}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '0 12px', fontSize: '0.95rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                  <button onClick={toggleSidebar} title="Toggle Sidebar" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSidebarCollapsed ? 'transparent' : 'var(--bg-secondary)', color: isSidebarCollapsed ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                    <PanelLeft size={16} />
                  </button>
                  <button onClick={toggleResponse} title="Toggle Response Pane" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isResponseCollapsed ? 'transparent' : 'var(--bg-secondary)', color: isResponseCollapsed ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                    <PanelBottom size={16} />
                  </button>
                </div>

                <select
                  value={activeEnvId}
                  onChange={e => setActiveEnvId(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', maxWidth: '140px' }}
                  title="Active Environment"
                >
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setIsEnvModalOpen(true)}
                  style={{ width: '32px', height: '32px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Manage Environments"
                >
                  <Folder size={16} />
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input type="checkbox" checked={isMockEnabled} onChange={e => setIsMockEnabled(e.target.checked)} /> Prism Mock
              </label>

              <button
                onClick={() => setIsSaveModalOpen(true)}
                style={{ minWidth: '80px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0 16px', borderRadius: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Save size={16} /> Save
              </button>

              <button
                onClick={() => setIsLoadModalOpen(true)}
                style={{ minWidth: '100px', background: 'var(--bg-tertiary)', color: 'var(--accent-blue)', border: '1px solid var(--border-color)', padding: '0 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                Load Test
              </button>

              <button
                onClick={() => setIsSecurityModalOpen(true)}
                style={{ minWidth: '100px', background: 'var(--bg-tertiary)', color: 'var(--status-warning)', border: '1px solid var(--border-color)', padding: '0 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                Scan API
              </button>

              <button
                onClick={() => setIsDataDrivenModalOpen(true)}
                style={{ minWidth: '100px', background: 'var(--bg-tertiary)', color: 'var(--status-success)', border: '1px solid var(--border-color)', padding: '0 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                Data-Driven
              </button>

              {['WS', 'WSS'].includes(method) ? (
                <button
                  onClick={() => toggleWebSocket()}
                  disabled={wsStatus === 'CONNECTING'}
                  style={{ minWidth: '120px', background: wsStatus === 'CONNECTED' ? 'var(--status-error)' : 'var(--status-success)', color: '#fff', padding: '0 20px', borderRadius: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: wsStatus === 'CONNECTING' ? 0.7 : 1 }}
                >
                  {wsStatus === 'CONNECTING' ? <Loader2 size={16} className="lucide-spin" /> : <><Play size={16} fill="currentColor" /> {wsStatus === 'CONNECTED' ? 'Disconnect' : 'Connect'}</>}
                </button>
              ) : (
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  style={{ minWidth: '100px', background: 'var(--accent-blue)', color: '#fff', padding: '0 20px', borderRadius: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: 'var(--accent-blue-glow) 0 4px 12px -2px', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? <Loader2 size={16} className="lucide-spin" /> : <><Play size={16} fill="currentColor" /> Send</>}
                </button>
              )}
            </div>

            <PanelGroup direction="vertical">
              <Panel style={{ flex: 1, borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '2px', padding: '0 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  {tabs.map(tab => (
                    <div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{ padding: '12px 16px', color: tab === activeTab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: tab === activeTab ? '2px solid var(--accent-blue)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s' }}
                    >
                      {tab}
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
                  {activeTab === 'Params' && (
                    <KeyValueEditor items={params} onChange={handleParamsChange} placeholderKey="Query Param Key" />
                  )}
                  {activeTab === 'Headers' && (
                    <KeyValueEditor items={headers} onChange={setHeaders} placeholderKey="Header Name" />
                  )}
                  {activeTab === 'Auth' && (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '80px' }}>Auth Type</label>
                        <select
                          value={authType}
                          onChange={e => setAuthType(e.target.value)}
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', width: '200px' }}
                        >
                          <option value="None">None</option>
                          <option value="Bearer Token">Bearer Token</option>
                          <option value="Basic Auth">Basic Auth</option>
                        </select>
                      </div>
                      {authType === 'Bearer Token' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '80px' }}>Token</label>
                          <input
                            type="text"
                            placeholder="Enter token"
                            value={bearerToken}
                            onChange={e => setBearerToken(e.target.value)}
                            style={{ flex: 1, maxWidth: '400px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem' }}
                          />
                        </div>
                      )}
                      {authType === 'Basic Auth' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '80px' }}>Username</label>
                            <input
                              type="text"
                              placeholder="Username"
                              value={basicAuthUser}
                              onChange={e => setBasicAuthUser(e.target.value)}
                              style={{ flex: 1, maxWidth: '400px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', width: '80px' }}>Password</label>
                            <input
                              type="password"
                              placeholder="Password"
                              value={basicAuthPass}
                              onChange={e => setBasicAuthPass(e.target.value)}
                              style={{ flex: 1, maxWidth: '400px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'Body' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name={`bodyType-${activeTabId}`} checked={bodyType === 'json'} onChange={() => setBodyType('json')} /> Raw JSON
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name={`bodyType-${activeTabId}`} checked={bodyType === 'graphql'} onChange={() => { setBodyType('graphql'); setMethod('POST'); }} /> GraphQL
                          </label>
                        </div>
                        {bodyType === 'graphql' && (
                          <button
                            onClick={fetchIntrospectionSchema}
                            disabled={loading || !url}
                            style={{ padding: '4px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: (loading || !url) ? 0.5 : 1, cursor: (loading || !url) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                          >
                            <Database size={12} /> Fetch Schema
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        {bodyType === 'json' ? (
                          <Editor
                            height="100%"
                            defaultLanguage="json"
                            theme="vs-dark"
                            value={reqBody}
                            onChange={(val) => setReqBody(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', padding: { top: 16 } }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 2, borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, right: 16, zIndex: 10, padding: '4px', background: 'var(--bg-tertiary)', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>QUERY</div>
                              <Editor
                                height="100%"
                                defaultLanguage="graphql"
                                theme="vs-dark"
                                value={graphqlQuery}
                                onChange={(val) => setGraphqlQuery(val || '')}
                                options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 16 } }}
                              />
                            </div>
                            <div style={{ padding: '6px 16px', background: 'var(--bg-secondary)', fontSize: '0.75rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>GRAPHQL VARIABLES</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <Editor
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={graphqlVariables}
                                onChange={(val) => setGraphqlVariables(val || '')}
                                options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 8 } }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {activeTab === 'Scripts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', fontSize: '0.75rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                        PRE-REQUEST SCRIPT
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          theme="vs-dark"
                          value={preScript}
                          onChange={(val) => setPreScript(val || '')}
                          options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 8 } }}
                        />
                      </div>
                      <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', fontSize: '0.75rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                        POST-REQUEST SCRIPT
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          theme="vs-dark"
                          value={postScript}
                          onChange={(val) => setPostScript(val || '')}
                          options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 8 } }}
                        />
                      </div>
                    </div>
                  )}
                  {activeTab === 'Contract' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Define the expected JSON Schema for this endpoint. Validation runs automatically on Send.
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          theme="vs-dark"
                          value={contract}
                          onChange={(val) => setContract(val || '')}
                          options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', padding: { top: 16 } }}
                        />
                      </div>
                    </div>
                  )}
                  {activeTab === 'Message' && (
                    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', borderTop: '0' }}>
                      <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, height: '150px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                          <Editor
                            height="100%"
                            language="json"
                            theme="vs-dark"
                            value={wsMessageInput}
                            onChange={(val) => setWsMessageInput(val || '')}
                            options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13 }}
                          />
                        </div>
                        <button
                          onClick={sendWsMessage}
                          disabled={wsStatus !== 'CONNECTED'}
                          style={{ padding: '0 24px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '8px', fontWeight: 600, opacity: wsStatus !== 'CONNECTED' ? 0.5 : 1 }}
                        >
                          Send Message
                        </button>
                      </div>

                      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {wsMessages.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontSize: '0.9rem' }}>No messages yet. Connect to a WebSocket to start streaming.</div>
                        ) : (
                          wsMessages.map(msg => (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: msg.type === 'sent' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: msg.type === 'sent' ? 'flex-end' : 'flex-start' }}>
                                {msg.type.toUpperCase()} • {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                              <div style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                background: msg.type === 'sent' ? 'var(--accent-blue)' : msg.type === 'received' ? 'var(--bg-primary)' : msg.type === 'error' ? 'var(--status-error)' : 'var(--bg-tertiary)',
                                color: msg.type === 'info' ? 'var(--text-muted)' : '#fff',
                                border: msg.type === 'received' ? '1px solid var(--border-color)' : 'none'
                              }}>
                                {msg.data}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {!['WS', 'WSS'].includes(method) && (
                <>
                  <PanelResizeHandle className="resize-handle-horizontal" style={{ height: '4px', cursor: 'row-resize', background: 'transparent' }}>
                    <div style={{ height: '1px', width: '100%', background: 'var(--border-color)', margin: 'auto 0' }} />
                  </PanelResizeHandle>

                  <Panel
                    ref={responsePanelRef}
                    defaultSize={50}
                    minSize={20}
                    collapsible={true}
                    onCollapse={(collapsed) => setIsResponseCollapsed(collapsed)}
                  >
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
                      <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '24px', fontSize: '0.875rem', background: 'var(--bg-tertiary)' }}>
                        {respStatus === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>No Response</span>
                        ) : (
                          <>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Status: <span style={{ color: getStatusColor(respStatus), fontWeight: 600 }}>{respStatus}</span></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Time: <span style={{ color: 'var(--text-primary)' }}>{respTime}ms</span></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Size: <span style={{ color: 'var(--text-primary)' }}>{(respSize / 1024).toFixed(2)} KB</span></span>

                            {testResults.length > 0 && (
                              <span style={{
                                marginLeft: !contractResult ? 'auto' : '10px',
                                background: testResults.every(t => t.passed) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: testResults.every(t => t.passed) ? 'var(--status-success)' : 'var(--status-error)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {testResults.every(t => t.passed) ? '✅' : '❌'} {testResults.filter(t => t.passed).length}/{testResults.length} Tests Passed
                              </span>
                            )}

                            {contractResult && (
                              <span style={{
                                marginLeft: testResults.length > 0 ? '10px' : 'auto',
                                background: contractResult.passed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: contractResult.passed ? 'var(--status-success)' : 'var(--status-error)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {contractResult.passed ? '✅ Contract Passed' : '❌ Contract Failed'}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {contractResult && !contractResult.passed && (
                        <div style={{ flexShrink: 0, background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', color: 'var(--status-error)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', fontFamily: 'monospace' }}>
                          <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Validation Errors:</span>
                          {contractResult.error}
                        </div>
                      )}

                      {testResults.some(t => !t.passed) && (
                        <div style={{ flexShrink: 0, background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', color: 'var(--status-error)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', fontFamily: 'monospace' }}>
                          <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Test Failures:</span>
                          {testResults.filter(t => !t.passed).map((t, i) => (
                            <div key={i}>❌ {t.name}: {t.error}</div>
                          ))}
                        </div>
                      )}

                      <div style={{ flex: 1, position: 'relative' }}>
                        {!response ? (
                          <div className="flex-center" style={{ height: '100%', color: 'var(--border-highlight)' }}>
                            {loading ? <Loader2 size={32} className="lucide-spin" /> : 'Hit Send to get a response'}
                          </div>
                        ) : (
                          <Editor
                            height="100%"
                            defaultLanguage="json"
                            language={response && typeof response === 'string' && response.trim().startsWith('<') ? 'html' : 'json'}
                            theme="vs-dark"
                            value={response ? (typeof response === 'object' ? JSON.stringify(response, null, 2) : response) : ''}
                            options={{ minimap: { enabled: false }, readOnly: true, fontSize: 13, wordWrap: 'on', padding: { top: 16 } }}
                          />
                        )}
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
              </>
            )}
          </main>
        </Panel>
      </PanelGroup>

      {isSaveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Save Request</h2>
              <button onClick={() => setIsSaveModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name</label>
              <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Get User Profile" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.9rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Collection</label>
              <select value={saveCollectionId} onChange={e => setSaveCollectionId(e.target.value)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.9rem' }}>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button onClick={() => setIsSaveModalOpen(false)} style={{ padding: '8px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Cancel</button>
              <button
                onClick={() => {
                  if (!saveName) return;
                  const newReq: SavedRequest = {
                    id: crypto.randomUUID(),
                    name: saveName,
                    collectionId: saveCollectionId,
                    method,
                    url,
                    headers: headers.filter(h => h.key),
                    params: params.filter(p => p.key),
                    body: reqBody
                  };
                  setSavedRequests([...savedRequests, newReq]);
                  setIsSaveModalOpen(false);
                  setSaveName('');
                }}
                style={{ padding: '8px 16px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '6px', fontWeight: 500 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )
      }

      {
        isCollectionModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '400px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setIsSaveModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name</label>
                <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Get User Profile" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Collection</label>
                <select value={saveCollectionId} onChange={e => setSaveCollectionId(e.target.value)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.9rem' }}>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setIsSaveModalOpen(false)} style={{ padding: '8px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Cancel</button>
                <button
                  onClick={() => {
                    if (!saveName) return;
                    const newReq: SavedRequest = {
                      id: crypto.randomUUID(),
                      name: saveName,
                      collectionId: saveCollectionId,
                      method,
                      url,
                      headers: headers.filter(h => h.key),
                      params: params.filter(p => p.key),
                      body: reqBody
                    };
                    setSavedRequests([...savedRequests, newReq]);
                    setIsSaveModalOpen(false);
                    setSaveName('');
                  }}
                  style={{ padding: '8px 16px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '6px', fontWeight: 500 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        isCollectionModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '400px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>New Collection</h2>
                <button onClick={() => setIsCollectionModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Collection Name</label>
                <input value={collectionName} onChange={e => setCollectionName(e.target.value)} placeholder="e.g. Stripe API" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.9rem' }} autoFocus />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => { setIsCollectionModalOpen(false); setCollectionName(''); }} style={{ padding: '8px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Cancel</button>
                <button
                  onClick={() => {
                    if (!collectionName) return;
                    setCollections([...collections, { id: crypto.randomUUID(), name: collectionName }]);
                    setIsCollectionModalOpen(false);
                    setCollectionName('');
                  }}
                  style={{ padding: '8px 16px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '6px', fontWeight: 500 }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        isEnvModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '800px', height: '600px', background: 'var(--bg-secondary)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Manage Environments</h2>
                <button onClick={() => setIsEnvModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ width: '220px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)' }}>
                  <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => {
                        const newEnv = { id: crypto.randomUUID(), name: 'New Environment', variables: [{ key: '', value: '', enabled: true }] };
                        setEnvironments([...environments, newEnv]);
                        setEditingEnvId(newEnv.id);
                      }}
                      style={{ width: '100%', padding: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Plus size={14} /> Add Environment
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {environments.map(env => (
                      <div
                        key={env.id}
                        onClick={() => setEditingEnvId(env.id)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '4px', background: editingEnvId === env.id ? 'var(--bg-primary)' : 'transparent', color: editingEnvId === env.id ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: editingEnvId === env.id ? 500 : 400 }}
                      >
                        {env.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
                  {editingEnvId ? (() => {
                    const env = environments.find(e => e.id === editingEnvId);
                    if (!env) return null;
                    return (
                      <>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name:</label>
                          <input
                            value={env.name}
                            onChange={e => {
                              setEnvironments(environments.map(ev => ev.id === env.id ? { ...ev, name: e.target.value } : ev));
                            }}
                            style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', color: 'var(--text-primary)' }}
                          />
                          <button
                            onClick={() => {
                              if (environments.length <= 1) return; // don't delete last one
                              setEnvironments(environments.filter(ev => ev.id !== env.id));
                              setEditingEnvId(null);
                              if (activeEnvId === env.id) setActiveEnvId(environments.filter(ev => ev.id !== env.id)[0].id);
                            }}
                            style={{ color: 'var(--status-error)', fontSize: '0.85rem', padding: '6px 12px' }}>
                            Delete
                          </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <KeyValueEditor
                            items={env.variables}
                            onChange={(newVars) => {
                              setEnvironments(environments.map(ev => ev.id === env.id ? { ...ev, variables: newVars } : ev));
                            }}
                            placeholderKey="Variable Name"
                          />
                        </div>
                      </>
                    );
                  })() : (
                    <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>Select an environment to edit</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        isLoadModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '600px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Performance Load Runner</h2>
                <button onClick={() => { setIsLoadModalOpen(false); setLoadResult(null); }} style={{ color: 'var(--text-muted)' }} disabled={isLoadRunning}><X size={20} /></button>
              </div>
              
              {!loadResult && !isLoadRunning && (
                 <>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Virtual Users (Concurrency)</label>
                      <input type="number" value={loadVusers} onChange={e => setLoadVusers(parseInt(e.target.value) || 1)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px' }} min={1} max={1000} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Iterations per User</label>
                      <input type="number" value={loadIterations} onChange={e => setLoadIterations(parseInt(e.target.value) || 1)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px' }} min={1} max={100} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                     <button
                        onClick={async () => {
                           setIsLoadRunning(true);
                           setLoadResult(null);
                           setLoadProgress(0);
                           setLoadTotal(loadVusers * loadIterations);
                           
                           const activeEnv = environments.find(e => e.id === activeEnvId);
                           const resolveVariables = (text: string) => {
                             if (!text || !activeEnv) return text;
                             return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
                               const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
                               return variable ? variable.value : match;
                             });
                           };
                           
                           const reqHeaders: Record<string, string> = {};
                           headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = resolveVariables(h.value); });
                           let rUrl = resolveVariables(url);
                           if (authType === 'Bearer Token' && bearerToken) reqHeaders['Authorization'] = `Bearer ${resolveVariables(bearerToken)}`;
                           if (['POST', 'PUT', 'PATCH'].includes(method)) reqHeaders['Content-Type'] = 'application/json';

                           try {
                              if (isTauri()) {
                                await runCliCommand(
                                  'load',
                                  [
                                    `--url=${rUrl}`,
                                    `--method=${method}`,
                                    `--headers=${JSON.stringify(reqHeaders)}`,
                                    reqBody ? `--body=${resolveVariables(reqBody)}` : '',
                                    `--vusers=${loadVusers}`,
                                    `--iterations=${loadIterations}`,
                                    '--json'
                                  ].filter(Boolean),
                                  null,
                                  (line) => {
                                    try {
                                      const prog = JSON.parse(line);
                                      if (prog.type === 'progress') {
                                        setLoadProgress(prog.completed);
                                      } else if (prog.type === 'result') {
                                        setLoadResult(prog.data);
                                      }
                                    } catch (e) {}
                                  },
                                  (err) => console.error("CLI Load error:", err)
                                );
                              } else {
                                const res = await runLoadTest({
                                  url: rUrl,
                                  method,
                                  headers: reqHeaders,
                                  body: resolveVariables(reqBody),
                                  vusers: loadVusers,
                                  iterations: loadIterations
                                }, (c) => setLoadProgress(c));
                                setLoadResult(res);
                              }
                           } catch (err: any) {
                             alert("Load Error: " + err.message);
                           } finally {
                             setIsLoadRunning(false);
                           }
                        }}
                        style={{ padding: '10px 24px', background: 'var(--status-error)', color: '#fff', borderRadius: '8px', fontWeight: 600, display: 'flex', gap: '8px' }}
                     >
                        <Play size={18} fill="currentColor" /> Start Traffic
                     </button>
                  </div>
                 </>
              )}

              {isLoadRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
                   <Loader2 size={48} className="lucide-spin" color="var(--accent-blue)" />
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Blasting Requests...</div>
                   <div style={{ color: 'var(--text-muted)' }}>{loadProgress} / {loadTotal} complete</div>
                   <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(loadProgress/loadTotal)*100}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 0.2s' }}></div>
                   </div>
                </div>
              )}

              {loadResult && !isLoadRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Requests</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{loadResult.totalRequests}</div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Success Rate</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: loadResult.failed === 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
                          {((loadResult.successful / loadResult.totalRequests) * 100).toFixed(1)}%
                        </div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Latency</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-blue)' }}>{loadResult.avgLatency.toFixed(2)} ms</div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>P95 Latency</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-warning)' }}>{loadResult.p95Latency.toFixed(2)} ms</div>
                     </div>
                  </div>
                  {Object.keys(loadResult.errors).length > 0 && (
                     <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid var(--status-error)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--status-error)', marginBottom: '8px' }}>Errors Encountered:</div>
                        {Object.entries(loadResult.errors).map(([err, count]) => (
                           <div key={err} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{err}</span>
                              <span style={{ fontWeight: 600 }}>{count}x</span>
                           </div>
                        ))}
                     </div>
                  )}
                  <button onClick={() => setLoadResult(null)} style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, marginTop: '8px' }}>Run Another Test</button>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        isSecurityModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '700px', maxHeight: '85vh', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Automated Security Scanner</h2>
                <button onClick={() => { setIsSecurityModalOpen(false); setSecurityResult(null); }} style={{ color: 'var(--text-muted)' }} disabled={isSecurityRunning}><X size={20} /></button>
              </div>

              {!securityResult && !isSecurityRunning && (
                <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Run a quick fuzzing scan against the current endpoints query parameters to check for common unescaped SQL injections and XSS vulnerabilities.</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <button
                        onClick={async () => {
                           setIsSecurityRunning(true);
                           setSecurityResult(null);
                           setSecurityProgress('Starting scan...');
                           
                           const activeEnv = environments.find(e => e.id === activeEnvId);
                           const resolveVariables = (text: string) => {
                             if (!text || !activeEnv) return text;
                             return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
                               const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
                               return variable ? variable.value : match;
                             });
                           };
                           
                           const reqHeaders: Record<string, string> = {};
                           headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = resolveVariables(h.value); });
                           let rUrl = resolveVariables(url);
                           if (authType === 'Bearer Token' && bearerToken) reqHeaders['Authorization'] = `Bearer ${resolveVariables(bearerToken)}`;
                           if (['POST', 'PUT', 'PATCH'].includes(method)) reqHeaders['Content-Type'] = 'application/json';

                           // pass active params
                           const validParams = params.filter(p => p.enabled && p.key).map(p => ({
                             key: resolveVariables(p.key),
                             value: resolveVariables(p.value)
                           }));

                           try {
                              if (isTauri()) {
                                await runCliCommand(
                                  'scan',
                                  [
                                    `--url=${rUrl}`,
                                    `--method=${method}`,
                                    `--headers=${JSON.stringify(reqHeaders)}`,
                                    `--params=${JSON.stringify(validParams)}`,
                                    reqBody ? `--body=${resolveVariables(reqBody)}` : '',
                                    '--json'
                                  ].filter(Boolean),
                                  null,
                                  (line) => {
                                    try {
                                      const prog = JSON.parse(line);
                                      if (prog.type === 'progress') {
                                        setSecurityProgress(prog.message);
                                      } else if (prog.type === 'result') {
                                        setSecurityResult(prog.data);
                                      }
                                    } catch (e) {}
                                  },
                                  (err) => console.error("CLI Scan error:", err)
                                );
                              } else {
                                const res = await runSecurityScan({
                                  url: rUrl,
                                  method,
                                  headers: reqHeaders,
                                  params: validParams,
                                  body: resolveVariables(reqBody)
                                }, (msg) => setSecurityProgress(msg));
                                setSecurityResult(res);
                              }
                            } catch (err: any) {
                             alert("Security Scan Error: " + err.message);
                           } finally {
                             setIsSecurityRunning(false);
                           }
                        }}
                        style={{ padding: '10px 24px', background: 'var(--status-warning)', color: '#000', borderRadius: '8px', fontWeight: 600, display: 'flex', gap: '8px' }}
                     >
                        <AlertTriangle size={18} /> Launch Scan
                     </button>
                  </div>
                </div>
              )}

              {isSecurityRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
                   <Loader2 size={48} className="lucide-spin" color="var(--status-warning)" />
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Scanning for Vulnerabilities...</div>
                   <div style={{ color: 'var(--text-muted)' }}>{securityProgress}</div>
                </div>
              )}

              {securityResult && !isSecurityRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vulnerabilities Found</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: securityResult.vulnerabilitiesFound > 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
                           {securityResult.vulnerabilitiesFound}
                        </div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tests Run</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{securityResult.scannedEndpoints}</div>
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Scan Report</div>
                    {securityResult.results.length === 0 ? (
                       <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '16px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>No parameters were parsed to scan. Ensure you have active query parameters.</div>
                    ) : (
                       securityResult.results.map((r, i) => (
                         <div key={i} style={{ padding: '12px', background: r.isVulnerable ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)', border: `1px solid ${r.isVulnerable ? 'var(--status-error)' : 'var(--border-color)'}`, borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: r.isVulnerable ? 'var(--status-error)' : 'var(--status-success)', fontSize: '0.9rem' }}>
                              {r.isVulnerable ? <AlertTriangle size={14}/> : <CheckCircle2 size={14} />} {r.vulnerabilityType}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              <span>Target:</span> <span style={{ color: 'var(--text-primary)'}}>{r.targetParameter}</span>
                              <span>Payload:</span> <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', overflowX: 'auto' }}>{r.payload}</code>
                              <span>Notes:</span> <span style={{ color: 'var(--text-primary)'}}>{r.notes}</span>
                            </div>
                         </div>
                       ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        isDataDrivenModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '800px', maxHeight: '85vh', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Data-Driven Functional Tests</h2>
                <button onClick={() => { setIsDataDrivenModalOpen(false); setDataDrivenResult(null); }} style={{ color: 'var(--text-muted)' }} disabled={isDataDrivenRunning}><X size={20} /></button>
              </div>

              {!dataDrivenResult && !isDataDrivenRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Execute this request repeatedly against a provided CVS dataset. Column names map directly to <code>{`{{ variable }}`}</code> references.</p>
                  
                  <textarea 
                    value={csvDataInput}
                    onChange={e => setCsvDataInput(e.target.value)}
                    style={{ width: '100%', height: '200px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace' }}
                    placeholder="id, name&#10;1, alice&#10;2, bob"
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                     <button
                        onClick={async () => {
                           setIsDataDrivenRunning(true);
                           setDataDrivenResult(null);
                           
                           const activeEnv = environments.find(e => e.id === activeEnvId);
                           const resolveBaseVars = (text: string) => {
                             if (!text || !activeEnv) return text;
                             return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
                               const variable = activeEnv.variables.find(v => v.key === key.trim() && v.enabled);
                               return variable ? variable.value : match; // leave unresolved for CSV engine to catch
                             });
                           };
                           
                           const reqHeaders: Record<string, string> = {};
                           headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = resolveBaseVars(h.value); });
                           if (authType === 'Bearer Token' && bearerToken) reqHeaders['Authorization'] = `Bearer ${resolveBaseVars(bearerToken)}`;
                           if (['POST', 'PUT', 'PATCH'].includes(method)) reqHeaders['Content-Type'] = 'application/json';

                           try {
                             const res = await runDataDrivenTest(
                               csvDataInput,
                               resolveBaseVars(url),
                               method,
                               reqHeaders,
                               resolveBaseVars(reqBody)
                             );
                             setDataDrivenResult(res);
                           } catch (err: any) {
                             alert("Data-Driven Error: " + err.message);
                           } finally {
                             setIsDataDrivenRunning(false);
                           }
                        }}
                        style={{ padding: '10px 24px', background: 'var(--status-success)', color: '#fff', borderRadius: '8px', fontWeight: 600, display: 'flex', gap: '8px' }}
                     >
                        <Play size={18} fill="currentColor" /> Run Dataset
                     </button>
                  </div>
                </div>
              )}

              {isDataDrivenRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
                   <Loader2 size={48} className="lucide-spin" color="var(--status-success)" />
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Executing Rows...</div>
                </div>
              )}

              {dataDrivenResult && !isDataDrivenRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rows Processed</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{dataDrivenResult.totalRows}</div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passed (2xx Status)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-success)' }}>{dataDrivenResult.passedCount}</div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed Tests</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: dataDrivenResult.failedCount > 0 ? 'var(--status-error)' : 'var(--text-primary)' }}>{dataDrivenResult.failedCount}</div>
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Execution Trace</div>
                    {dataDrivenResult.results.map((r, i) => (
                      <div key={i} style={{ padding: '12px', background: r.passed ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${r.passed ? 'var(--status-success)' : 'var(--status-error)'}`, borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <div style={{ fontWeight: 600, color: r.passed ? 'var(--status-success)' : 'var(--status-error)' }}>Iteration #{r.iteration}</div>
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {r.status} | {r.timeMs.toFixed(0)} ms</div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '6px', borderRadius: '4px', overflowX: 'auto', fontFamily: 'monospace' }}>
                          {JSON.stringify(r.row)}
                        </div>
                        {r.error && <div style={{ fontSize: '0.85rem', color: 'var(--status-error)', marginTop: '8px' }}>{r.error}</div>}
                      </div>
                    ))}
                  </div>
                  
                  <button onClick={() => setDataDrivenResult(null)} style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, marginTop: '8px' }}>Edit Dataset</button>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        isDeployModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel" style={{ width: '600px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Export CI/CD Pipeline Bundle</h2>
                <button onClick={() => setIsDeployModalOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Generate a Node.js Headless Runner containing all your active Collections, Requests, and Environments. Drop the extracted contents directly into your repository to enable automated functional regression tests in GitHub Actions, Jenkins, or arbitrary pipelines.
                </p>

                <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                   <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>Bundle Contents:</div>
                   <ul style={{ listStyle: 'circle', paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                     <li><code>api360-runner.js</code> (Zero-dependency Node executor engine)</li>
                     <li><code>workspace.api360.json</code> (Your entire workspace)</li>
                     <li><code>.github/workflows/api360-tests.yml</code></li>
                     <li><code>Jenkinsfile</code></li>
                   </ul>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                   <button
                      onClick={() => setIsDeployModalOpen(false)}
                      style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 600 }}
                   >
                      Cancel
                   </button>
                   <button
                      onClick={async () => {
                         const zip = new JSZip();
                         // Package config
                         zip.file("workspace.api360.json", JSON.stringify({ collections, requests: savedRequests, environments }, null, 2));
                         // Package CLI
                         zip.file("api360-runner.js", CLI_RUNNER_TEMPLATE);
                         // GitHub Actions
                         zip.folder(".github/workflows")?.file("api360-tests.yml", [
                           "name: API360 Functional Tests",
                           "on: [push, pull_request]",
                           "jobs:",
                           "  test:",
                           "    runs-on: ubuntu-latest",
                           "    steps:",
                           "      - uses: actions/checkout@v3",
                           "      - name: Setup Node",
                           "        uses: actions/setup-node@v3",
                           "        with:",
                           "          node-version: '18'",
                           "      - name: Execute API360 Headless Tests",
                           "        run: node api360-runner.js --workspace=workspace.api360.json"
                         ].join('\\n'));
                         // Jenkinsfile
                         zip.file("Jenkinsfile", [
                           "pipeline {",
                           "    agent any",
                           "    stages {",
                           "        stage('API Tests') {",
                           "            steps {",
                           "                sh 'node api360-runner.js --workspace=workspace.api360.json'",
                           "            }",
                           "        }",
                           "    }",
                           "}"
                         ].join('\\n'));

                         const blob = await zip.generateAsync({ type: "blob" });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement("a");
                         a.href = url;
                         a.download = "api360-deployment-bundle.zip";
                         a.click();
                         URL.revokeObjectURL(url);
                         setIsDeployModalOpen(false);
                      }}
                      style={{ padding: '10px 24px', background: 'var(--status-success)', color: '#fff', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                   >
                      <Download size={16} /> Download Bundle (.zip)
                   </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
