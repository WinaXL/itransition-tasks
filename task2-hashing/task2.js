'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const EMAIL = 'maxat.kaliyev.2005@gmail.com';

const files = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.data'))
  .sort(); 

if (files.length !== 256) {
  throw new Error(`Expected 256 files, found ${files.length}`);
}

const hashes = files.map(file => {
  const filePath = path.join(DIR, file);
  let buffer;
  try {
    buffer = fs.readFileSync(filePath); 
  } catch (err) {
    throw new Error(`Failed to read file "${file}": ${err.message}`);
  }
  return crypto.createHash('sha3-256').update(buffer).digest('hex'); 
});

function computeSortKey(hash) {
  let product = 1n;
  for (const ch of hash) {
    product *= BigInt(parseInt(ch, 16) + 1);
  }
  return product;
}

hashes.sort((a, b) => {
  const ka = computeSortKey(a);
  const kb = computeSortKey(b);
  if (ka < kb) return -1;
  if (ka > kb) return 1;
  return 0;
});

const combined = hashes.join('') + EMAIL;
const finalHash = crypto.createHash('sha3-256').update(combined).digest('hex');

console.log(finalHash);
