// ============================================================================
//  Quine Relay generator  (JS -> Python -> TS -> Java -> C# -> JS)
// ----------------------------------------------------------------------------
//  This is a BUILD TOOL. Its only job is to assemble the self-contained
//  `quine.js`. The deliverable quine carries no file access and no source
//  APIs: every stage rebuilds the next purely from an embedded numeric
//  payload `P`.
//
//  Idea: a program for language L is exactly  PRE[L] + P + POST[L].
//  `P` is the ';'-joined, ','-separated decimal char-codes of all 10
//  fragments  [PRE0,POST0, PRE1,POST1, ... PRE4,POST4].  Because P is only
//  digits/commas/semicolons it needs ZERO escaping inside any "..." literal.
//  Each stage: split P -> decode -> emit PRE[next] + P + POST[next].
// ============================================================================

// --- 0: JavaScript --------------------------------------------------------
const PRE0  = 'var D="';
const POST0 = '";var p=D.split(";");function d(s){return s.split(",").map(function(c){return String.fromCharCode(parseInt(c,10))}).join("")}var k=1;process.stdout.write(d(p[2*k])+D+d(p[2*k+1]))';

// --- 1: Python ------------------------------------------------------------
const PRE1  = 'D="';
const POST1 = '"\n' +
  'import sys\n' +
  'p=D.split(";")\n' +
  'd=lambda s:"".join(chr(int(c)) for c in s.split(","))\n' +
  'k=2\n' +
  'sys.stdout.write(d(p[2*k])+D+d(p[2*k+1]))';

// --- 2: TypeScript --------------------------------------------------------
const PRE2  = 'var D="';
const POST2 = '";var p=D.split(";");function d(s){return s.split(",").map(function(c){return String.fromCharCode(parseInt(c,10))}).join("")}var k=3;process.stdout.write(d(p[2*k])+D+d(p[2*k+1]))';

// --- 3: Java --------------------------------------------------------------
const PRE3  = 'public class Main{static String de(String s){String r="";for(String c:s.split(",")){r=r+(char)Integer.parseInt(c);}return r;}public static void main(String[] a){String D="';
const POST3 = '";String[] p=D.split(";");int k=4;System.out.print(de(p[2*k])+D+de(p[2*k+1]));}}';

// --- 4: C# ----------------------------------------------------------------
const PRE4  = 'using System;class P{static string de(string s){string r="";foreach(string c in s.Split(\',\')){r=r+(char)int.Parse(c);}return r;}static void Main(){string D="';
const POST4 = '";string[] p=D.Split(\';\');int k=0;Console.Write(de(p[2*k])+D+de(p[2*k+1]));}}';

const pieces = [PRE0, POST0, PRE1, POST1, PRE2, POST2, PRE3, POST3, PRE4, POST4];

function enc(s) {
  let codes = [];
  for (let i = 0; i < s.length; i++) codes.push(s.charCodeAt(i));
  return codes.join(',');
}

const P = pieces.map(enc).join(';');
const quine = PRE0 + P + POST0;

require('fs').writeFileSync('quine.js', quine);
console.log('quine.js written: ' + quine.length + ' bytes, payload ' + P.length + ' chars.');
