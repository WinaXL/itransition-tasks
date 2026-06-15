'use strict';
/**
 * surname-levenshtein-outlier.js — Maximum Average Levenshtein Distance Outlier Finder
 *
 * Finds the surname that differs the most from all others in a large corpus.
 *
 * Strategy:
 *   1. Load all surnames from in.txt (one per line).
 *   2. Build a stratified random sample of SAMPLE_SIZE reference names
 *      (stratified by length so every length-bucket is represented).
 *   3. Split the full list across os.cpus().length Worker threads; each
 *      worker computes the average Levenshtein distance from its slice to
 *      every name in the reference sample.
 *   4. The name with the highest average score is the statistical outlier.
 *
 * Usage:
 *   node surname-levenshtein-outlier.js [path/to/in.txt]
 *
 * Complexity:  O(N × S × L²)  where S = sample size, L = avg string length.
 */

const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function levenshtein(a, b) {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  if (a === b)  return 0;

  let prev = new Uint8Array(lb + 1);
  let curr = new Uint8Array(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      const del  = prev[j]     + 1;
      const ins  = curr[j - 1] + 1;
      const sub  = prev[j - 1] + cost;
      curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
    }
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[lb];
}

if (!isMainThread) {
  const { names, sample, start, end } = workerData;
  const sLen    = sample.length;
  const results = new Float64Array(end - start);

  for (let i = start; i < end; i++) {
    const name = names[i];
    let total  = 0;
    for (let s = 0; s < sLen; s++) {
      if (name !== sample[s]) total += levenshtein(name, sample[s]);
    }
    results[i - start] = total / sLen;
  }

  parentPort.postMessage({ results: Array.from(results), start });
  return;
}

const INPUT_FILE  = process.argv[2] || path.join(__dirname, 'in.txt');
const SAMPLE_SIZE = 2000;

console.log(`Reading file: ${INPUT_FILE}`);
const names = fs.readFileSync(INPUT_FILE, 'utf8')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l.length > 0);

const seen   = new Set();
const unique = [];
for (const n of names) {
  if (!seen.has(n)) { seen.add(n); unique.push(n); }
}
console.log(`Loaded ${unique.length} unique surnames (raw: ${names.length}).`);

function stratifiedSample(arr, size) {
  const buckets = new Map();
  for (const n of arr) {
    const l = n.length;
    if (!buckets.has(l)) buckets.set(l, []);
    buckets.get(l).push(n);
  }

  const result = [];
  const totalNames = arr.length;

  for (const [, bucket] of buckets) {
    for (let i = bucket.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = bucket[i]; bucket[i] = bucket[j]; bucket[j] = tmp;
    }
    const take = Math.max(1, Math.round((bucket.length / totalNames) * size));
    for (let i = 0; i < Math.min(take, bucket.length); i++) result.push(bucket[i]);
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i]; result[i] = result[j]; result[j] = tmp;
  }
  return result.slice(0, size);
}

const sample = stratifiedSample(unique, SAMPLE_SIZE);
console.log(`Reference sample: ${sample.length} names (stratified by length).`);

const numCPUs   = os.cpus().length;
const chunkSize = Math.ceil(unique.length / numCPUs);
console.log(`Spawning ${numCPUs} worker threads over ${unique.length} names…\n`);

const scores    = new Float64Array(unique.length);
let   completed = 0;
const wallStart = Date.now();

for (let t = 0; t < numCPUs; t++) {
  const start = t * chunkSize;
  const end   = Math.min(start + chunkSize, unique.length);

  const worker = new Worker(__filename, {
    workerData: { names: unique, sample, start, end }
  });

  worker.on('message', ({ results, start: s }) => {
    for (let i = 0; i < results.length; i++) scores[s + i] = results[i];
    completed++;
    const pct = ((completed / numCPUs) * 100).toFixed(0);
    const elapsed = ((Date.now() - wallStart) / 1000).toFixed(1);
    process.stdout.write(`\r  Progress: ${completed}/${numCPUs} chunks  [${pct}%]  ${elapsed}s elapsed   `);

    if (completed === numCPUs) {
      process.stdout.write('\n\n');

      let maxScore = -Infinity;
      let maxIdx   = -1;
      for (let k = 0; k < scores.length; k++) {
        if (scores[k] > maxScore) { maxScore = scores[k]; maxIdx = k; }
      }

      const indexed = Array.from(scores).map((sc, i) => ({ name: unique[i], sc }));
      indexed.sort((a, b) => b.sc - a.sc);

      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║              TOP-10 OUTLIER SURNAMES                 ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      indexed.slice(0, 10).forEach((r, i) =>
        console.log(`║  ${String(i + 1).padStart(2)}.  ${r.name.padEnd(22)}  avg dist: ${r.sc.toFixed(4)}  ║`)
      );
      console.log('╚══════════════════════════════════════════════════════╝');

      console.log(`\nThe surname that differs the most is: ${unique[maxIdx]}`);
      console.log(`Average Levenshtein distance to ${sample.length}-name sample: ${maxScore.toFixed(4)}`);
      console.log(`Total wall time: ${((Date.now() - wallStart) / 1000).toFixed(2)}s`);
    }
  });

  worker.on('error', err => { console.error('Worker error:', err); process.exit(1); });
}
