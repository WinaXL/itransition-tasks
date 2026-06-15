'use strict';
/**
 * surname_problem.js — Max-Min Levenshtein Outlier Finder
 *
 * "Which surname differs the most from EACH of the others?"
 *
 * Correct interpretation (NOT average distance):
 *   For every surname we find its MINIMUM Levenshtein distance to ANY other
 *   surname in the dataset (its nearest neighbour). The answer is the surname
 *   whose nearest neighbour is the FARTHEST away — i.e. we maximize the minimum
 *   distance (the most ISOLATED name). This avoids the "long name" bias of the
 *   average metric: SCHIMMELPFENNIG has a huge average distance, but if a near
 *   variant exists its min distance is tiny, so it does NOT differ from each.
 *
 * Deterministic: processes ALL unique surnames, no random sampling.
 *
 * Optimizations:
 *   1. worker_threads parallelism across all CPU cores.
 *   2. Length pruning: skip pair if |lenA - lenB| >= current best min for A.
 *   3. Bounded Levenshtein: abort a comparison as soon as the whole DP row
 *      is >= the current best min for A (it cannot lower the minimum).
 *   4. Distinct strings have distance >= 1, so once a name's running min hits
 *      1 we stop scanning it entirely.
 *   5. Names are sorted so near-duplicates (shared prefixes) cluster together,
 *      letting most names find a distance-1 neighbour almost immediately.
 *
 * Usage:
 *   node optional2/surname_problem.js [path/to/in.txt]
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// ─── Bounded Levenshtein (reused buffers, row-min early exit) ────────────────
// Returns the true distance, OR a value >= `limit` if it provably reaches it.
const _prev = new Uint16Array(64);
const _curr = new Uint16Array(64);

function boundedLevenshtein(a, b, limit) {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  // Length pruning at the function level too.
  if (Math.abs(la - lb) >= limit) return limit;

  let prev = _prev;
  let curr = _curr;

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    const ac = a.charCodeAt(i - 1);
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      let v = prev[j - 1] + cost;
      const del = prev[j] + 1;     if (del < v) v = del;
      const ins = curr[j - 1] + 1; if (ins < v) v = ins;
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    // Every future row can only grow the minimum reachable value, so if the
    // best value in this entire row is already >= limit, abort.
    if (rowMin >= limit) return limit;
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[lb];
}

// ─── Worker thread body ──────────────────────────────────────────────────────
if (!isMainThread) {
  const { names, start, end } = workerData;
  const N = names.length;
  const minDist = new Uint16Array(end - start);

  for (let i = start; i < end; i++) {
    const a   = names[i];
    const la  = a.length;
    let   cur = 0xffff; // running minimum distance for surname `a`

    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const b = names[j];
      // Optimization 2: length pruning before any DP work.
      const ld = la - b.length;
      if ((ld < 0 ? -ld : ld) >= cur) continue;

      const d = boundedLevenshtein(a, b, cur);
      if (d < cur) {
        cur = d;
        if (cur <= 1) break; // distinct strings: cannot get below 1
      }
    }
    minDist[i - start] = cur;
  }

  parentPort.postMessage({ start, minDist }, [minDist.buffer]);
  return;
}

// ─── Main thread ─────────────────────────────────────────────────────────────
const INPUT_FILE = process.argv[2] || path.join(__dirname, 'in.txt');

console.log(`Reading file: ${INPUT_FILE}`);
const raw = fs.readFileSync(INPUT_FILE, 'utf8')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l.length > 0);

const seen   = new Set();
const unique = [];
for (const n of raw) {
  if (!seen.has(n)) { seen.add(n); unique.push(n); }
}
// Sort so near-duplicates cluster → fast distance-1 hits.
unique.sort();
console.log(`Loaded ${unique.length} unique surnames (raw: ${raw.length}).`);

const numCPUs   = Math.max(1, os.cpus().length);
const chunkSize = Math.ceil(unique.length / numCPUs);
console.log(`Spawning ${numCPUs} worker threads over ${unique.length} names…\n`);

const globalMin = new Uint16Array(unique.length);
let   completed = 0;
const wallStart = Date.now();

for (let t = 0; t < numCPUs; t++) {
  const start = t * chunkSize;
  const end   = Math.min(start + chunkSize, unique.length);
  if (start >= end) { completed++; continue; }

  const worker = new Worker(__filename, {
    workerData: { names: unique, start, end }
  });

  worker.on('message', ({ start: s, minDist }) => {
    globalMin.set(minDist, s);
    completed++;
    const pct     = ((completed / numCPUs) * 100).toFixed(0);
    const elapsed = ((Date.now() - wallStart) / 1000).toFixed(1);
    process.stdout.write(`\r  Progress: ${completed}/${numCPUs} chunks  [${pct}%]  ${elapsed}s elapsed   `);

    if (completed === numCPUs) {
      process.stdout.write('\n\n');

      let best = -1, bestIdx = -1;
      for (let k = 0; k < globalMin.length; k++) {
        if (globalMin[k] > best) { best = globalMin[k]; bestIdx = k; }
      }

      const indexed = [];
      for (let k = 0; k < globalMin.length; k++) {
        indexed.push({ name: unique[k], d: globalMin[k] });
      }
      indexed.sort((x, y) => y.d - x.d);

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║      TOP-15 MOST ISOLATED SURNAMES (max nearest-neighbour)   ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      indexed.slice(0, 15).forEach((r, i) =>
        console.log(`║  ${String(i + 1).padStart(2)}.  ${r.name.padEnd(24)}  min dist to any other: ${String(r.d).padStart(2)}  ║`)
      );
      console.log('╚════════════════════════════════════════════════════════════╝');

      console.log(`\nThe surname that differs the most from EACH of the others is: ${unique[bestIdx]}`);
      console.log(`Its nearest neighbour is ${best} edits away (max-min Levenshtein).`);
      console.log(`Total wall time: ${((Date.now() - wallStart) / 1000).toFixed(2)}s`);
    }
  });

  worker.on('error', err => { console.error('Worker error:', err); process.exit(1); });
}
