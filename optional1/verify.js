// ============================================================================
//  End-to-end verifier for the 5-language quine relay.
//  JS -> Python -> TS -> Java -> C# -> JS, then strict byte compare.
//  Each stage's stdout is captured as RAW BYTES and written verbatim to the
//  next stage's source file (no newline added), so the comparison is exact.
// ============================================================================
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BD = path.join(__dirname, 'relay_build');
const run = (cmd, opts = {}) =>
  execSync(cmd, { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'inherit'], ...opts });

const orig = fs.readFileSync(path.join(__dirname, 'quine.js'));
console.log(`[0] original quine.js          : ${orig.length} bytes`);

// 1) JS -> Python
const py = run(`node "${path.join(__dirname, 'quine.js')}"`);
fs.writeFileSync(path.join(BD, 'stage.py'), py);
console.log(`[1] JS  -> Python (stage.py)   : ${py.length} bytes`);

// 2) Python -> TypeScript
const ts = run(`python "${path.join(BD, 'stage.py')}"`);
fs.writeFileSync(path.join(BD, 'stage.ts'), ts);
console.log(`[2] PY  -> TypeScript (stage.ts): ${ts.length} bytes`);

// 3) TypeScript -> Java
const java = run(`npx ts-node --transpile-only --project "${path.join(BD, 'tsconfig.json')}" "${path.join(BD, 'stage.ts')}"`);
fs.writeFileSync(path.join(BD, 'Main.java'), java);
console.log(`[3] TS  -> Java (Main.java)    : ${java.length} bytes`);

// 4) Java -> C#
run(`javac Main.java`, { cwd: BD });
const cs = run(`java Main`, { cwd: BD });
fs.writeFileSync(path.join(BD, 'csrun', 'Program.cs'), cs);
console.log(`[4] JAVA-> C# (Program.cs)     : ${cs.length} bytes`);

// 5) C# -> JS
run(`dotnet build "${path.join(BD, 'csrun')}" -c Release -o "${path.join(BD, 'csrun', 'out')}" -v q --nologo`,
    { stdio: ['ignore', 'ignore', 'inherit'] });
const js = run(`dotnet "${path.join(BD, 'csrun', 'out', 'csrun.dll')}"`);
fs.writeFileSync(path.join(BD, 'final.js'), js);
console.log(`[5] C#  -> JS (final.js)       : ${js.length} bytes`);

// ---- strict comparison ----------------------------------------------------
console.log('\n--- diff (original vs final) ---');
if (Buffer.compare(orig, js) === 0) {
  console.log('IDENTICAL: 0 differing bytes.');
  console.log('\n==================================================');
  console.log('  RELAY VERIFIED: 100% PERFECT MATCH ✓');
  console.log('  JS -> Python -> TS -> Java -> C# -> JS');
  console.log('==================================================');
  process.exit(0);
} else {
  let i = 0;
  while (i < orig.length && i < js.length && orig[i] === js[i]) i++;
  console.log(`MISMATCH at byte ${i}`);
  console.log(`  original[..]: ${JSON.stringify(orig.slice(Math.max(0, i - 20), i + 20).toString())}`);
  console.log(`  final   [..]: ${JSON.stringify(js.slice(Math.max(0, i - 20), i + 20).toString())}`);
  process.exit(1);
}
