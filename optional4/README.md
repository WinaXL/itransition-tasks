# Optional 4 — Digit Image Classification

Classify handwritten digit images from `digits.zip` using a small CNN trained on MNIST.

## Setup

```bash
cd optional4
pip install -r requirements.txt
```

## Run

```bash
python solve-digits.py
```

On first run the script:

1. Downloads `digits.zip` (if not present in this folder).
2. Downloads MNIST and trains a 3-epoch CNN (or loads `mnist_cnn.pth` if cached).
3. Classifies every image in the zip and prints a 10-element count array `[0…9]`.

Generated artifacts (`mnist_data/`, `mnist_cnn.pth`, `digits.zip`) are gitignored and recreated locally.
