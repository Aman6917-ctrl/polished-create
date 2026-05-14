#!/usr/bin/env python3
"""Create placeholder PNGs for any image_name in final_metadata.csv missing from processed_data/slices/."""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
import pandas as pd


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=None, help="Defaults to processed_data/metadata/final_metadata.csv")
    ap.add_argument("--images", default=None, help="Defaults to processed_data/slices")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    repo = Path(__file__).resolve().parent.parent.parent
    csv_path = Path(args.csv or repo / "processed_data/metadata/final_metadata.csv")
    img_dir = Path(args.images or repo / "processed_data/slices")
    img_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(csv_path, engine="python")
    col = "image_name" if "image_name" in df.columns else "image"
    names = df[col].astype(str).unique()
    rng = np.random.default_rng(args.seed)
    created = 0
    for name in names:
        dest = img_dir / name
        if dest.exists():
            continue
        noise = rng.integers(0, 256, size=(224, 224, 3), dtype=np.uint8)
        cv2.imwrite(str(dest), cv2.cvtColor(noise, cv2.COLOR_RGB2BGR))
        created += 1
    print("Slice dir:", img_dir)
    print("Placeholder PNGs created (missing only):", created)
    print("Already present:", len(names) - created)


if __name__ == "__main__":
    main()
