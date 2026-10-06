#!/usr/bin/env python3
"""Measure pickup / weapon / crate textures and store the results in the manifest.

    .venv/bin/python scripts/measure_items.py

For every entry it writes `content`: the object's length along its main axis (PCA of the
opaque pixels, so a diagonal bat measures its real length, not its bounding box), the
bottom edge and horizontal centre of the opaque pixels. src/data/items.js sizes items
from these numbers, so floor and in-hand sizes stay consistent whatever the texture framing.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "assets" / "textures" / "manifest.json"
PREFIXES = ("pickups/", "weapons/", "objects/crate")
ALPHA_MIN = 20


def measure(path):
    alpha = np.asarray(Image.open(path).convert("RGBA"))[..., 3] > ALPHA_MIN
    ys, xs = np.nonzero(alpha)
    pts = np.stack([xs, ys], axis=1).astype(float)
    centred = pts - pts.mean(axis=0)
    axis = np.linalg.eigh(np.cov(centred.T))[1][:, -1]
    proj = centred @ axis
    return {
        "length": round(float(proj.max() - proj.min() + 1), 2),
        "bottom": int(ys.max() + 1),
        "centerX": round(float((xs.min() + xs.max() + 1) / 2), 2),
    }


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for key, info in manifest.items():
        if key.startswith(PREFIXES) and not key.endswith("pickup_shadow"):
            info["content"] = measure(ROOT / info["png"])
            print(f"{key:20s} {info['content']}")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
