export interface SecurityScanConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  params: { key: string; value: string }[];
  body?: string;
}

export interface SecurityTestResult {
  vulnerabilityType: string;
  payload: string;
  targetParameter: string;
  isVulnerable: boolean;
  notes: string;
}

export interface SecurityScanReport {
  scannedEndpoints: number;
  vulnerabilitiesFound: number;
  results: SecurityTestResult[];
}

const SQLI_PAYLOADS = [
  "' OR 1=1 --",
  "\" OR \"a\"=\"a",
  "'; DROP TABLE users --"
];

const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "\" onmouseover=\"alert(1)\""
];

// Reconstruct URL with given params
function buildUrl(baseUrl: string, params: {key: string, value: string}[]): string {
  try {
    const urlObj = new URL(baseUrl);
    urlObj.search = '';
    params.forEach(p => urlObj.searchParams.append(p.key, p.value));
    return urlObj.toString();
  } catch(e) {
    return baseUrl;
  }
}

export async function runSecurityScan(config: SecurityScanConfig, onProgress?: (msg: string) => void): Promise<SecurityScanReport> {
  const results: SecurityTestResult[] = [];
  
  // Test parameters
  for (const param of config.params) {
    if (!param.key) continue;

    // Test SQLi
    for (const payload of SQLI_PAYLOADS) {
      if (onProgress) onProgress(`Testing SQLi on parameter [${param.key}]`);
      const mutatedParams = config.params.map(p => p.key === param.key ? { key: p.key, value: payload } : p);
      const testUrl = buildUrl(config.url, mutatedParams);
      
      try {
        const res = await fetch(testUrl, { method: config.method, headers: config.headers, body: config.body });
        const text = await res.text();
        
        let isVuln = false;
        let notes = `Status: ${res.status}`;
        
        // Very basic heuristic for SQL error leakage
        if (text.includes("SQL syntax") || text.includes("mysql_fetch") || res.status === 500) {
          isVuln = true;
          notes = "Possible Database Error Leakage or 500 Crash";
        }
        
        results.push({
          vulnerabilityType: "SQL Injection",
          payload,
          targetParameter: `Query Param: ${param.key}`,
          isVulnerable: isVuln,
          notes
        });
      } catch(e: any) {
        // Network error doesn't confirm vuln
      }
    }

    // Test XSS
    for (const payload of XSS_PAYLOADS) {
      if (onProgress) onProgress(`Testing XSS on parameter [${param.key}]`);
      const mutatedParams = config.params.map(p => p.key === param.key ? { key: p.key, value: payload } : p);
      const testUrl = buildUrl(config.url, mutatedParams);
      
      try {
        const res = await fetch(testUrl, { method: config.method, headers: config.headers, body: config.body });
        const text = await res.text();
        
        let isVuln = false;
        let notes = `Status: ${res.status}`;
        
        if (text.includes(payload)) {
          isVuln = true;
          notes = "Payload reflected completely unescaped in response body";
        }
        
        results.push({
          vulnerabilityType: "Cross-Site Scripting (XSS)",
          payload,
          targetParameter: `Query Param: ${param.key}`,
          isVulnerable: isVuln,
          notes
        });
      } catch(e: any) {}
    }
  }

  // TODO: Add structural body mutations for POST requests (if needed)

  const vulnCount = results.filter(r => r.isVulnerable).length;
  return {
    scannedEndpoints: results.length,
    vulnerabilitiesFound: vulnCount,
    results
  };
}
