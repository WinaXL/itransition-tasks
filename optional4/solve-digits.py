#!/usr/bin/env python3
"""
Solve the HR optional digit-counting task.

Downloads (or uses a local copy of) digits.zip, trains a small CNN on MNIST,
then classifies every image and prints a 10-element count array.
"""

import os
import sys
import zipfile
import urllib.request
from pathlib import Path
from collections import Counter

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import torchvision
import torchvision.transforms as transforms
from PIL import Image


# ── Model ─────────────────────────────────────────────────────────────────────

class CNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),                           # → 14×14
            nn.Dropout(0.25),
            nn.Conv2d(64, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),                           # → 7×7
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 128), nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 10),
        )

    def forward(self, x):
        return self.classifier(self.features(x))


# ── Training ──────────────────────────────────────────────────────────────────

def train(device: torch.device) -> CNN:
    mnist_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ])

    print("Downloading MNIST (cached after first run)...")
    dataset = torchvision.datasets.MNIST(
        root="./mnist_data", train=True, download=True, transform=mnist_transform
    )
    loader = DataLoader(dataset, batch_size=256, shuffle=True, num_workers=0)

    model = CNN().to(device)
    opt = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    model.train()
    for epoch in range(3):
        total_loss, correct = 0.0, 0
        for step, (x, y) in enumerate(loader):
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            opt.step()
            total_loss += loss.item()
            correct += (out.argmax(1) == y).sum().item()
            if step % 60 == 0:
                print(
                    f"  epoch {epoch+1}/3  step {step:3d}/{len(loader)}"
                    f"  loss {total_loss/(step+1):.4f}",
                    end="\r", flush=True,
                )
        acc = correct / len(dataset) * 100
        print(f"  Epoch {epoch+1}/3 complete - train acc: {acc:.2f}%          ")

    return model


# ── Inference ─────────────────────────────────────────────────────────────────

def predict(model: CNN, zip_path: Path, device: torch.device) -> Counter:
    # Images are dark-background / bright-digit (same convention as MNIST).
    # Resize to 28×28, convert to greyscale, apply MNIST normalisation.
    preprocess = transforms.Compose([
        transforms.Grayscale(),
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ])

    model.eval()
    counts: Counter = Counter()
    batch_tensors: list = []
    BATCH = 512

    def flush(tensors):
        batch = torch.stack(tensors).to(device)
        with torch.no_grad():
            preds = model(batch).argmax(1).cpu().tolist()
        for p in preds:
            counts[p] += 1

    print(f"\nReading images from: {zip_path}")
    with zipfile.ZipFile(zip_path, "r") as zf:
        image_files = [
            n for n in zf.namelist()
            if n.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        total = len(image_files)
        print(f"Found {total} images — classifying…")

        for i, name in enumerate(image_files):
            with zf.open(name) as f:
                img = Image.open(f)
                img.load()
            batch_tensors.append(preprocess(img))

            if len(batch_tensors) == BATCH or i == total - 1:
                flush(batch_tensors)
                batch_tensors = []

            if (i + 1) % 2000 == 0:
                print(f"  …{i+1}/{total} done", flush=True)

    return counts


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    device = torch.device("cpu")

    # 1. Locate digits.zip (cwd, script dir, or download).
    script_dir = Path(__file__).resolve().parent
    local_zip = Path("digits.zip")
    if not local_zip.exists():
        local_zip = script_dir / "digits.zip"
    if not local_zip.exists():
        url = "https://www.dropbox.com/s/y9bs6r4nc7pj48c/digits.zip?dl=1"
        print("Downloading digits.zip …")
        local_zip = script_dir / "digits.zip"
        urllib.request.urlretrieve(url, local_zip)
        print("Download complete.")

    print(f"Using zip: {local_zip.resolve()}")

    # 2. Train or load cached model.
    model_cache = Path("mnist_cnn.pth")
    if model_cache.exists():
        print("Loading cached model …")
        model = CNN().to(device)
        model.load_state_dict(torch.load(model_cache, map_location=device))
    else:
        model = train(device)
        torch.save(model.state_dict(), model_cache)
        print(f"Model weights saved -> {model_cache}")

    # 3. Classify all digit images.
    counts = predict(model, local_zip, device)

    # 4. Report results.
    result = [counts.get(d, 0) for d in range(10)]
    total_images = sum(result)
    print(f"\n{'-'*40}")
    print(f"Total images classified: {total_images}")
    print(f"{'-'*40}")
    for d in range(10):
        print(f"  Digit {d}: {result[d]:5d}")
    print(f"{'-'*40}")
    print(f"\nResult array:")
    print(result)


if __name__ == "__main__":
    main()
