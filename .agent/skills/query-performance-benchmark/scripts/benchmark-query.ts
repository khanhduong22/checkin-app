/**
 * Query Performance Benchmark Runner Template
 *
 * Executes empirical comparative benchmarking between OLD and NEW query strategies.
 * Measures:
 *  1. Returned DB row count & Network Wire Payload (KB)
 *  2. V8 / Runtime Heap Memory Churn (heapUsed KB)
 *  3. PostgreSQL EXPLAIN (ANALYZE, BUFFERS) execution time & buffer hit/read counts
 *  4. Latency percentiles (Mean, p50, p95, Min, Max) across 100 iterations after warm-up
 *
 * Usage:
 *   bun run scripts/benchmark-query.ts
 *   or
 *   npx tsx scripts/benchmark-query.ts
 */

export interface BenchmarkMetrics {
  name: string;
  scenario: string;
  iterations: number;
  rowCount: number;
  wirePayloadKb: number;
  heapChurnKb: number;
  latencyMeanMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMinMs: number;
  latencyMaxMs: number;
  explainPlan?: {
    executionTimeMs?: number;
    planningTimeMs?: number;
    sharedHitBlocks?: number;
    sharedReadBlocks?: number;
    rowsRemovedByFilter?: number;
  };
}

export interface QueryStrategy<T = unknown> {
  name: string;
  execute: (scenario: ScenarioConfig) => Promise<T>;
  explain?: (scenario: ScenarioConfig) => Promise<string | Record<string, unknown>>;
  countRows?: (result: T) => number;
}

export interface ScenarioConfig {
  name: string;
  description: string;
  pageSize: number;
  relatedCountPerItem: number;
  userId?: string | number | null;
}

/**
 * Standard 3-scale testing scenarios
 */
export const STANDARD_SCENARIOS: ScenarioConfig[] = [
  {
    name: 'Moderate',
    description: '20 feed items, 50 related items (likes/comments) each (~1,000 DB relation records)',
    pageSize: 20,
    relatedCountPerItem: 50,
    userId: 'user_123',
  },
  {
    name: 'Active',
    description: '20 feed items, 200 related items each (~4,000 DB relation records)',
    pageSize: 20,
    relatedCountPerItem: 200,
    userId: 'user_123',
  },
  {
    name: 'Viral Scale',
    description: '20 feed items, 1,000 related items each (~20,000 DB relation records - peak load / OOM risk)',
    pageSize: 20,
    relatedCountPerItem: 1000,
    userId: 'user_123',
  },
];

/**
 * Force garbage collection across Bun, Node.js (with --expose-gc), or V8
 */
export function forceGarbageCollection(): void {
  try {
    if (typeof (globalThis as any).Bun?.gc === 'function') {
      (globalThis as any).Bun.gc(true);
    } else if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
  } catch {
    // GC not exposed, continue best-effort
  }
}

/**
 * Estimate network wire payload in Kilobytes from serialized JSON
 */
export function calculatePayloadKb(data: unknown): number {
  try {
    const jsonString = JSON.stringify(data);
    const bytes = typeof Buffer !== 'undefined'
      ? Buffer.byteLength(jsonString, 'utf8')
      : new TextEncoder().encode(jsonString).length;
    return Number((bytes / 1024).toFixed(2));
  } catch {
    return 0;
  }
}

/**
 * Parse PostgreSQL EXPLAIN (ANALYZE, BUFFERS) text plan
 */
export function parseExplainAnalyzeText(planText: string): BenchmarkMetrics['explainPlan'] {
  const result: BenchmarkMetrics['explainPlan'] = {};

  const execMatch = planText.match(/Execution Time:\s+([\d.]+)\s*ms/i);
  if (execMatch) result.executionTimeMs = parseFloat(execMatch[1]);

  const planMatch = planText.match(/Planning Time:\s+([\d.]+)\s*ms/i);
  if (planMatch) result.planningTimeMs = parseFloat(planMatch[1]);

  const hitMatch = planText.match(/shared\s+hit=(\d+)/i);
  if (hitMatch) result.sharedHitBlocks = parseInt(hitMatch[1], 10);

  const readMatch = planText.match(/shared\s+read=(\d+)/i);
  if (readMatch) result.sharedReadBlocks = parseInt(readMatch[1], 10);

  const filterMatch = planText.match(/Rows Removed by Filter:\s+(\d+)/i);
  if (filterMatch) result.rowsRemovedByFilter = parseInt(filterMatch[1], 10);

  return result;
}

/**
 * Benchmark runner engine
 */
export async function runBenchmark<T>(
  strategy: QueryStrategy<T>,
  scenario: ScenarioConfig,
  iterations = 100,
  warmupIterations = 5
): Promise<BenchmarkMetrics> {
  // 1. Warm-up Phase
  for (let i = 0; i < warmupIterations; i++) {
    await strategy.execute(scenario);
  }

  forceGarbageCollection();

  // 2. Measure Single Iteration for Payload & Heap Churn
  const heapBefore = process.memoryUsage().heapUsed;
  const sampleResult = await strategy.execute(scenario);
  const heapAfter = process.memoryUsage().heapUsed;

  const wirePayloadKb = calculatePayloadKb(sampleResult);
  const heapChurnKb = Math.max(0, Number(((heapAfter - heapBefore) / 1024).toFixed(2)));
  const rowCount = strategy.countRows ? strategy.countRows(sampleResult) : Array.isArray(sampleResult) ? sampleResult.length : 1;

  // 3. Optional EXPLAIN (ANALYZE, BUFFERS)
  let explainPlan: BenchmarkMetrics['explainPlan'];
  if (strategy.explain) {
    try {
      const planOutput = await strategy.explain(scenario);
      if (typeof planOutput === 'string') {
        explainPlan = parseExplainAnalyzeText(planOutput);
      } else if (planOutput && typeof planOutput === 'object') {
        explainPlan = planOutput as BenchmarkMetrics['explainPlan'];
      }
    } catch (err) {
      console.warn(`[WARN] EXPLAIN ANALYZE failed for ${strategy.name}:`, err);
    }
  }

  // 4. Latency Percentiles (100 iterations)
  const latencies: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await strategy.execute(scenario);
    const duration = performance.now() - start;
    latencies.push(duration);
  }

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const latencyMeanMs = Number((sum / latencies.length).toFixed(2));
  const latencyP50Ms = Number(latencies[Math.floor(latencies.length * 0.5)].toFixed(2));
  const latencyP95Ms = Number(latencies[Math.floor(latencies.length * 0.95)].toFixed(2));
  const latencyMinMs = Number(latencies[0].toFixed(2));
  const latencyMaxMs = Number(latencies[latencies.length - 1].toFixed(2));

  return {
    name: strategy.name,
    scenario: scenario.name,
    iterations,
    rowCount,
    wirePayloadKb,
    heapChurnKb,
    latencyMeanMs,
    latencyP50Ms,
    latencyP95Ms,
    latencyMinMs,
    latencyMaxMs,
    explainPlan,
  };
}

/**
 * Format benchmark results as a standard Markdown comparison table
 */
export function formatMarkdownTable(results: { oldMetrics: BenchmarkMetrics; newMetrics: BenchmarkMetrics }[]): string {
  const lines: string[] = [
    '| Scale / Scenario | Query Strategy | DB Rows Fetched | Wire Payload (KB) | V8 Heap Churn (KB) | Latency Mean (ms) | Latency p95 (ms) | Improvement % / Verdict |',
    '| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |',
  ];

  for (const { oldMetrics, newMetrics } of results) {
    const rowDiff = oldMetrics.rowCount > 0
      ? (((oldMetrics.rowCount - newMetrics.rowCount) / oldMetrics.rowCount) * 100).toFixed(1)
      : '0';
    const payloadDiff = oldMetrics.wirePayloadKb > 0
      ? (((oldMetrics.wirePayloadKb - newMetrics.wirePayloadKb) / oldMetrics.wirePayloadKb) * 100).toFixed(1)
      : '0';
    const latencyDiff = oldMetrics.latencyMeanMs > 0
      ? (((oldMetrics.latencyMeanMs - newMetrics.latencyMeanMs) / oldMetrics.latencyMeanMs) * 100).toFixed(1)
      : '0';

    lines.push(
      `| **${oldMetrics.scenario}** | **OLD** | ${oldMetrics.rowCount.toLocaleString()} rows | ${oldMetrics.wirePayloadKb} KB | ${oldMetrics.heapChurnKb} KB | ${oldMetrics.latencyMeanMs} ms | ${oldMetrics.latencyP95Ms} ms | Baseline |`
    );
    lines.push(
      `| | **NEW (Optimized)** | **${newMetrics.rowCount.toLocaleString()} rows** | **${newMetrics.wirePayloadKb} KB** | **${newMetrics.heapChurnKb} KB** | **${newMetrics.latencyMeanMs} ms** | **${newMetrics.latencyP95Ms} ms** | 🟢 **-${rowDiff}% rows, -${payloadDiff}% payload, -${latencyDiff}% latency** |`
    );
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Example Usage Harness (Customize for your specific Repository / ORM)
// ---------------------------------------------------------------------------
async function main() {
  console.log('🚀 Starting Query Performance Benchmark...\n');

  // Example: Prisma or raw SQL query simulation
  const oldStrategy: QueryStrategy = {
    name: 'OLD Query (Unfiltered / Eager Relation)',
    execute: async (scenario) => {
      // Simulation: Loading all relations across the wire
      const items = Array.from({ length: scenario.pageSize }, (_, i) => ({
        id: i + 1,
        title: `Post ${i + 1}`,
        likes: Array.from({ length: scenario.relatedCountPerItem }, (_, j) => ({
          userId: `user_${j + 1}`,
        })),
      }));
      return items;
    },
    countRows: (res: any) => res.reduce((acc: number, item: any) => acc + item.likes.length, 0),
  };

  const newStrategy: QueryStrategy = {
    name: 'NEW Query (Scoped Relation / Filtered)',
    execute: async (scenario) => {
      // Simulation: Scoped relation to target user or skipped for anon
      const items = Array.from({ length: scenario.pageSize }, (_, i) => ({
        id: i + 1,
        title: `Post ${i + 1}`,
        likes: scenario.userId ? [{ userId: scenario.userId }] : [],
      }));
      return items;
    },
    countRows: (res: any) => res.reduce((acc: number, item: any) => acc + item.likes.length, 0),
  };

  const benchmarkResults: { oldMetrics: BenchmarkMetrics; newMetrics: BenchmarkMetrics }[] = [];

  for (const scenario of STANDARD_SCENARIOS) {
    console.log(`⏱️ Benchmarking Scenario: ${scenario.name} (${scenario.description})...`);
    const oldMetrics = await runBenchmark(oldStrategy, scenario, 50, 5);
    const newMetrics = await runBenchmark(newStrategy, scenario, 50, 5);
    benchmarkResults.push({ oldMetrics, newMetrics });
  }

  console.log('\n📊 Benchmark Comparison Markdown Table:\n');
  console.log(formatMarkdownTable(benchmarkResults));
}

if (import.meta.main || (typeof require !== 'undefined' && require.main === module)) {
  main().catch(console.error);
}
