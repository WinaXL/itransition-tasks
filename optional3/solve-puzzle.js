/**
 * Hex Divisibility Puzzle
 *
 * Find the longest natural number in hex d1d2d3...dn (no leading zeros, digits
 * may repeat) such that for every prefix of length k:
 *   parseInt(d1d2...dk, 16) % k === k - 1
 *
 * The middle digit of the answer must be '3'.
 *
 * Key insight: for positions k >= 17, the hex digit d must satisfy
 *   (currentNum * 16 + d) % k === k-1  with d in [0,15].
 * Since k > 15, d % k = d, so at most ONE valid digit exists at each step.
 * This means paths become fully deterministic beyond depth 16 and terminate
 * naturally when no valid digit in [0,15] satisfies the condition.
 *
 * We also run the pandigital variant (each digit used at most once) as a
 * cross-check, since that is the classic puzzle formulation.
 */

// ── Variant A: digits may repeat (pure divisibility constraint) ───────────────
function solveRepeating() {
  const hexDigits = '0123456789abcdef'.split('');
  const hexVal = Object.fromEntries(hexDigits.map((d, i) => [d, BigInt(i)]));
  const MAX_DEPTH = 128; // safety cap

  let maxLength = 0;
  let solutions = [];

  function backtrack(current, currentNum) {
    const k = current.length;

    if (k > 0) {
      if (k > maxLength) {
        maxLength = k;
        solutions = [current];
      } else if (k === maxLength) {
        solutions.push(current);
      }
    }

    if (k >= MAX_DEPTH) return;

    const nextK = BigInt(k + 1);
    const target = nextK - 1n;

    for (const digit of hexDigits) {
      const nextNum = currentNum * 16n + hexVal[digit];
      if (nextNum % nextK === target) {
        backtrack(current + digit, nextNum);
      }
    }
  }

  // Only non-zero first digits (no leading zeros)
  for (const d of hexDigits.slice(1)) {
    backtrack(d, hexVal[d]);
  }

  return solutions;
}

// ── Variant B: each of the 16 hex digits used at most once (pandigital) ───────
function solvePandigital() {
  const hexDigits = '0123456789abcdef'.split('');
  const hexVal = Object.fromEntries(hexDigits.map((d, i) => [d, BigInt(i)]));

  let maxLength = 0;
  let solutions = [];

  function backtrack(current, currentNum, used) {
    const k = current.length;

    if (k > 0) {
      if (k > maxLength) {
        maxLength = k;
        solutions = [current];
      } else if (k === maxLength) {
        solutions.push(current);
      }
    }

    const nextK = BigInt(k + 1);
    const target = nextK - 1n;

    for (const digit of hexDigits) {
      if (used.has(digit)) continue;
      const nextNum = currentNum * 16n + hexVal[digit];
      if (nextNum % nextK === target) {
        used.add(digit);
        backtrack(current + digit, nextNum, used);
        used.delete(digit);
      }
    }
  }

  backtrack('', 0n, new Set());
  return solutions.filter(s => s[0] !== '0');
}

function solve() {
  return solveRepeating();
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('Variant A – digits may repeat:');
console.log('Searching…\n');
const solutions = solve();

console.log('Variant B – pandigital (each hex digit used at most once):');
const panSolutions = solvePandigital();
const panN = panSolutions[0]?.length ?? 0;
console.log(`  Max length: ${panN},  solutions: ${panSolutions.length}`);
if (panN > 0) {
  const panMid = Math.floor((panN - 1) / 2);
  panSolutions.forEach(s => process.stdout.write(`  ${s} (mid@${panMid}='${s[panMid]}')\n`));
}
console.log();

if (solutions.length === 0) {
  console.log('No solutions found.');
  process.exit(1);
}

const n = solutions[0].length;
console.log(`Max length found : ${n} hex digits`);
console.log(`Total solutions  : ${solutions.length}`);

// Middle index (0-based). Works cleanly when n is odd; for even n both
// floor and ceil candidates are printed.
const midIdx = Math.floor((n - 1) / 2);
const altIdx = Math.ceil((n - 1) / 2);
const oddLength = n % 2 === 1;

console.log(`\nAll solutions (middle digit highlighted at index ${midIdx}):`);
solutions.forEach((s, i) => {
  const midDigit = oddLength ? s[midIdx] : `${s[midIdx]}/${s[altIdx]}`;
  console.log(`  [${String(i + 1).padStart(2)}] ${s}   middle='${midDigit}'`);
});

// Filter for the solution whose (unique) middle digit is '3'
const answer = solutions.find(s => {
  if (oddLength) return s[midIdx] === '3';
  // Even length: accept if either of the two central digits is '3'
  return s[midIdx] === '3' || s[altIdx] === '3';
});

console.log('\n─────────────────────────────────────────');
if (answer) {
  console.log(`\nFinal answer (middle digit = '3'):\n\n  0x${answer.toUpperCase()}\n  ${answer}\n`);

  // Verify every prefix condition
  console.log('Verification of all prefix conditions:');
  for (let k = 1; k <= answer.length; k++) {
    const prefix = answer.slice(0, k);
    const num = BigInt('0x' + prefix);
    const rem = num % BigInt(k);
    const ok = rem === BigInt(k - 1);
    console.log(`  k=${String(k).padEnd(2)} prefix=${prefix.padEnd(answer.length)}  ${num} % ${k} = ${rem}  [${ok ? 'OK' : 'FAIL'}]`);
  }
} else {
  console.log('No solution found with middle digit = 3.');
  console.log('Check whether the puzzle intends a different definition of "middle".');
}
