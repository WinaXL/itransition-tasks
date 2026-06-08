const express = require('express');
const app = express();
const PORT = 3000;

// Compute GCD using Euclidean algorithm
function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Compute LCM via GCD
function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

// Returns true only for integers strictly greater than zero
function isNaturalNumber(value) {
  if (value === undefined || value === null || value === '') return false;
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

// Single GET endpoint — :emailSlug matches any email-derived path segment
app.get('/:emailSlug', (req, res) => {
  const { x, y } = req.query;

  if (!isNaturalNumber(x) || !isNaturalNumber(y)) {
    return res.send('NaN');
  }

  const result = lcm(Number(x), Number(y));
  res.send(String(result));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
