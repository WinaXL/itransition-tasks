const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Compute GCD using Euclidean algorithm with BigInt
function gcd(a, b) {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Compute LCM via GCD with BigInt
function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

// Strict regex validation: digits only, value > 0
function isNaturalNumberStr(value) {
  if (!value) return false;
  if (!/^\d+$/.test(value)) return false;
  if (BigInt(value) === 0n) return false;
  return true;
}

app.get('/:emailSlug', (req, res) => {
  const { x, y } = req.query;

  if (!isNaturalNumberStr(x) || !isNaturalNumberStr(y)) {
    return res.type('text/plain').send('NaN');
  }

  try {
    const result = lcm(BigInt(x), BigInt(y));
    res.type('text/plain').send(result.toString());
  } catch (err) {
    res.type('text/plain').send('NaN');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
