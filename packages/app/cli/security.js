const SQLI_PAYLOADS = [
  "' OR 1=1 --",
  "\" OR \"a\"=\"a",
  "'; DROP TABLE users --"
];

const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "\" onmouseover=\"alert(1)\""
];

function buildUrl(baseUrl, params) {
  try {
    const urlObj = new URL(baseUrl);
    urlObj.search = '';
    params.forEach(p => urlObj.searchParams.append(p.key, p.value));
    return urlObj.toString();
  } catch (e) {
    return baseUrl;
  }
}

/**
 * Scans an API endpoint for OWASP SQLi/XSS vulnerability signatures.
 * @param {object} config - Security Scan Config: { url, method, headers, params, body }
 * @param {function} onProgress - Progress status callback (message)
 */
export async function runSecurityScan(config, onProgress) {
  const results = [];
  const { url, method, headers = {}, params = [], body } = config;
  
  for (const param of params) {
    if (!param.key) continue;

    // Test SQLi
    for (const payload of SQLI_PAYLOADS) {
      if (onProgress) onProgress(`Testing SQLi on parameter [${param.key}]`);
      const mutatedParams = params.map(p => p.key === param.key ? { key: p.key, value: payload } : p);
      const testUrl = buildUrl(url, mutatedParams);
      
      try {
        const res = await fetch(testUrl, { method, headers, body });
        const text = await res.text();
        
        let isVulnerable = false;
        let notes = `Status: ${res.status}`;
        
        if (text.includes("SQL syntax") || text.includes("mysql_fetch") || res.status === 500) {
          isVulnerable = true;
          notes = "Possible Database Error Leakage or 500 Crash";
        }
        
        results.push({
          vulnerabilityType: "SQL Injection",
          payload,
          targetParameter: `Query Param: ${param.key}`,
          isVulnerable,
          notes
        });
      } catch (e) {
        // Network errors don't confirm vulnerabilities
      }
    }

    // Test XSS
    for (const payload of XSS_PAYLOADS) {
      if (onProgress) onProgress(`Testing XSS on parameter [${param.key}]`);
      const mutatedParams = params.map(p => p.key === param.key ? { key: p.key, value: payload } : p);
      const testUrl = buildUrl(url, mutatedParams);
      
      try {
        const res = await fetch(testUrl, { method, headers, body });
        const text = await res.text();
        
        let isVulnerable = false;
        let notes = `Status: ${res.status}`;
        
        if (text.includes(payload)) {
          isVulnerable = true;
          notes = "Payload reflected completely unescaped in response body";
        }
        
        results.push({
          vulnerabilityType: "Cross-Site Scripting (XSS)",
          payload,
          targetParameter: `Query Param: ${param.key}`,
          isVulnerable,
          notes
        });
      } catch (e) {}
    }
  }

  const vulnerabilitiesFound = results.filter(r => r.isVulnerable).length;
  return {
    scannedEndpoints: results.length,
    vulnerabilitiesFound,
    results
  };
}
