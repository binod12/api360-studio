export interface DataDrivenResult {
  iteration: number;
  row: Record<string, string>;
  status: number;
  timeMs: number;
  passed: boolean;
  error?: string;
  responsePreview?: string;
}

export interface DataDrivenReport {
  totalRows: number;
  passedCount: number;
  failedCount: number;
  results: DataDrivenResult[];
}

export async function runDataDrivenTest(
  csvData: string, 
  baseUrl: string, 
  method: string, 
  baseHeaders: Record<string, string>, 
  baseBody: string,
  onProgress?: (index: number, total: number) => void
): Promise<DataDrivenReport> {
  
  const lines = csvData.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) throw new Error("CSV must contain at least a header row and one data row.");

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const rowObj: Record<string, string> = {};
    headers.forEach((h, i) => { rowObj[h] = values[i] || ''; });
    return rowObj;
  });

  const results: DataDrivenResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Simple inline variable replacement for this engine instance
    const resolve = (text: string) => {
       if (!text) return text;
       return text.replace(/\{\{(.*?)\}\}/g, (match, key) => row[key.trim()] ?? match);
    };

    const url = resolve(baseUrl);
    const body = resolve(baseBody);
    const reqHeaders: Record<string, string> = {};
    for (const k in baseHeaders) reqHeaders[k] = resolve(baseHeaders[k]);

    const start = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body
      });
      const timeMs = performance.now() - start;
      const text = await res.text();
      
      results.push({
        iteration: i + 1,
        row,
        status: res.status,
        passed: res.ok,
        timeMs,
        responsePreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
    } catch(err: any) {
      results.push({
        iteration: i + 1,
        row,
        status: 0,
        passed: false,
        timeMs: performance.now() - start,
        error: err.message
      });
    }

    if (onProgress) onProgress(i + 1, rows.length);
  }

  return {
    totalRows: rows.length,
    passedCount: results.filter(r => r.passed).length,
    failedCount: results.filter(r => !r.passed).length,
    results
  };
}
