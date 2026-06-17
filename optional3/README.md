# Optional 3 — Hex Divisibility Puzzle

Find the longest natural number in hex `d1d2d3…dn` (no leading zeros; digits may repeat) such that for every prefix of length `k`:

```
parseInt(d1d2…dk, 16) % k === k − 1
```

The middle digit of the answer must be `3`.

## Algorithm

- **Variant A (repeating digits):** backtracking with `BigInt` arithmetic. Beyond depth 16 each step has at most one valid digit, so paths become deterministic.
- **Variant B (pandigital):** each of the 16 hex digits used at most once — classic formulation, included as a cross-check.

## Run

```bash
node optional3/solve-puzzle.js
```

Prints all maximal-length solutions, highlights the one whose middle digit is `3`, and verifies every prefix condition.
