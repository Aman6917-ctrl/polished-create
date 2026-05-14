#!/usr/bin/env python3
"""
Create processed_data/metadata/final_metadata.csv + processed_data/slices/*.png
for local smoke tests (random noise images — not real MRI).
Repo root = parent of ml/
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
import pandas as pd


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate dummy slice dataset for ml/train.py")
    parser.add_argument("--n-per-class", type=int, default=45, help="PNG count per diagnosis (default 45)")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    repo = Path(__file__).resolve().parent.parent.parent
    meta_dir = repo / "processed_data" / "metadata"
    img_dir = repo / "processed_data" / "slices"
    meta_dir.mkdir(parents=True, exist_ok=True)
    img_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, str]] = []
    for diagnosis in ("CN", "MCI", "AD"):
        for i in range(args.n_per_class):
            name = f"{diagnosis}_{i:04d}.png"
            path = img_dir / name
            # Random RGB image (loader expects readable file)
            noise = rng.integers(0, 256, size=(224, 224, 3), dtype=np.uint8)
            bgr = cv2.cvtColor(noise, cv2.COLOR_RGB2BGR)
            cv2.imwrite(str(path), bgr)
            rows.append({"image": name, "diagnosis": diagnosis})

    csv_path = meta_dir / "final_metadata.csv"
    pd.DataFrame(rows).to_csv(csv_path, index=False)

    print("Wrote:", csv_path)
    print("Wrote:", len(rows), "images under", img_dir)
    print("\nNext: npm run ml:train")
    print("Tip: quick CPU test → npm run ml:train -- --sample-size 120 --phase1-epochs 1 --phase2-epochs 1")


if __name__ == "__main__":
    main()
