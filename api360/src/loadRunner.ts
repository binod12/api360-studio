export interface LoadTestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  vusers: number; // concurrent users
  iterations: number; // requests per user
}

export interface LoadTestResult {
  totalRequests: number;
  successful: number;
  failed: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  p95Latency: number;
  durationMs: number;
  errors: Record<string, number>;
}

export async function runLoadTest(config: LoadTestConfig, onProgress?: (completed: number, total: number) => void): Promise<LoadTestResult> {
  const { url, method, headers, body, vusers, iterations } = config;
  const totalRequests = vusers * iterations;
  
  let successful = 0;
  let failed = 0;
  const latencies: number[] = [];
  const errors: Record<string, number> = {};
  
  let completedCount = 0;
  const startTime = performance.now();

  const executeWorker = async () => {
    for (let i = 0; i < iterations; i++) {
        const reqStart = performance.now();
        try {
            const res = await fetch(url, {
                method,
                headers,
                body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body
            });
            const reqTime = performance.now() - reqStart;
            latencies.push(reqTime);

            if (res.ok) {
                successful++;
            } else {
                failed++;
                const errKey = `HTTP ${res.status}`;
                errors[errKey] = (errors[errKey] || 0) + 1;
            }
        } catch (err: any) {
            latencies.push(performance.now() - reqStart);
            failed++;
            const errKey = err.message || 'Network Error';
            errors[errKey] = (errors[errKey] || 0) + 1;
        }

        completedCount++;
        if (onProgress) {
            onProgress(completedCount, totalRequests);
        }
    }
  };

  // Start concurrent virtual users
  const workers = Array.from({ length: vusers }, () => executeWorker());
  await Promise.all(workers);

  const durationMs = performance.now() - startTime;
  
  // Calculate stats
  latencies.sort((a, b) => a - b);
  const minLatency = latencies.length ? latencies[0] : 0;
  const maxLatency = latencies.length ? latencies[latencies.length - 1] : 0;
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95Latency = latencies.length ? latencies[p95Index] : 0;

  return {
    totalRequests,
    successful,
    failed,
    minLatency,
    maxLatency,
    avgLatency,
    p95Latency,
    durationMs,
    errors
  };
}
