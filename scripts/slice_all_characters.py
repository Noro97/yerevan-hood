#!/usr/bin/env python3
"""Slice the modular character rig (head / torso / arm / leg) out of art/characters/src.

    .venv/bin/python scripts/slice_all_characters.py [--preview path.png]

Every part is cut with a background flood fill (so light clothing stays opaque),
scaled uniformly (no aspect distortion) and exported at RES texture pixels per
game unit. Pivots and torso sockets are measured from the art and written to
assets/textures/manifest.json.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "characters" / "src"
OUT = ROOT / "assets" / "textures" / "characters"
MANIFEST = ROOT / "assets" / "textures" / "manifest.json"

RES = 4
PAD = 2
CHARS = ["player", "thug1", "thug2", "thug3", "gunner", "shielder", "boss"]

# Mean torso height in game units. Heads, arms and legs are sized from the
# proportions on the per-character parts sheets, so this is the only size knob.
TORSO_UNITS = 51

# (x, y, w, h) search regions on heads.jpg / arms.jpg; the part itself is the
# largest connected shape inside, so neighbours bleeding in are dropped.
HEAD_REGIONS = {
    "player": (24, 157, 174, 312), "thug1": (194, 157, 201, 304), "thug2": (391, 156, 193, 312),
    "thug3": (590, 157, 188, 302), "gunner": (785, 156, 199, 308), "shielder": (980, 160, 201, 303),
    "boss": (1177, 154, 180, 314),
}
ARM_REGIONS = {
    "player": (34, 80, 163, 568), "thug1": (227, 80, 168, 526), "thug2": (391, 80, 192, 568),
    "thug3": (610, 80, 172, 533), "gunner": (802, 80, 163, 571), "shielder": (991, 80, 189, 549),
    "boss": (1190, 80, 158, 573),
}
# Torso bounds (x1, y1, x2, y2) on <char>_parts.jpg, plus masks that cut off
# sleeves drawn onto the jacket (the rig has separate arms).
TORSO_BOUNDS = {
    "player": (580, 45, 910, 435), "thug1": (470, 30, 890, 440), "thug2": (550, 30, 930, 460),
    "thug3": (540, 30, 900, 465), "gunner": (575, 25, 860, 440), "shielder": (450, 10, 990, 450),
    "boss": (555, 40, 880, 435),
}
TORSO_MASKS = {
    "thug2": lambda x, y: ((x < 615) & (y > 270)) | ((x > 855) & (y > 380)),
    "shielder": lambda x, y: (x < 565) | (x > 895),
}
# legs.jpg: single trouser leg from row 1, shoe from the row-2 pair.
LEG_UPPER = {
    "player": (66, 44, 176, 335), "thug1": (262, 42, 378, 335), "thug2": (455, 43, 565, 335),
    "thug3": (640, 43, 750, 335), "gunner": (826, 42, 934, 335), "shielder": (1009, 41, 1126, 335),
    "boss": (1201, 41, 1312, 335),
}
LEG_SHOE = {
    "player": (42, 660, 88, 739), "thug1": (235, 660, 295, 739), "thug2": (440, 660, 500, 740),
    "thug3": (616, 660, 672, 739), "gunner": (786, 660, 850, 740), "shielder": (982, 660, 1035, 738),
    "boss": (1198, 660, 1270, 740),
}
SHOE_OVERLAP = 20
SHOULDER_INSET = 0.76
HIP_RATIO = 0.45


def load(name):
    return np.asarray(Image.open(SRC / name).convert("RGB"))


def matte(rgb):
    """Foreground mask: everything not connected to the region border through near-white pixels."""
    lo = rgb.min(axis=2).astype(int)
    hi = rgb.max(axis=2).astype(int)
    bg_like = (lo >= 225) & (hi - lo <= 24)
    lab, _ = ndimage.label(bg_like)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    fg = ~np.isin(lab, border[border > 0])
    # NOTE: JPEG ringing leaves a 1px light halo between the white page and the ink outline.
    return ndimage.binary_erosion(fg, iterations=1)


def components(mask, min_area):
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    if n == 0:
        return []
    areas = ndimage.sum(mask, lab, range(1, n + 1))
    return [lab == i + 1 for i in np.argsort(areas)[::-1] if areas[i] >= min_area]


def largest(mask):
    comps = components(mask, 1)
    if not comps:
        raise ValueError("no foreground in region")
    return comps[0]


def bbox(mask):
    ys, xs = np.where(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def soft_alpha(mask):
    blur = ndimage.gaussian_filter(mask.astype(np.float32), 0.8)
    return np.clip(blur * 2 - 1, 0, 1) * mask


def cut_region(img, region):
    x, y, w, h = region
    m = 8
    x0, y0 = max(0, x - m), max(0, y - m)
    sub = img[y0:y + h + m, x0:x + w + m]
    return sub, largest(matte(sub))


def to_rgba(rgb, mask):
    x0, y0, x1, y1 = bbox(mask)
    alpha = (soft_alpha(mask)[y0:y1, x0:x1] * 255).astype(np.uint8)
    return np.dstack([rgb[y0:y1, x0:x1], alpha]), mask[y0:y1, x0:x1]


def band_center_x(mask, frac_from, frac_to):
    h = mask.shape[0]
    rows = mask[int(h * frac_from):max(int(h * frac_from) + 1, int(h * frac_to))]
    xs = np.where(rows)[1]
    return xs.mean(), xs.min(), xs.max()


def export(rgba, units_per_px, path):
    """Resize uniformly into game units * RES, pad, save. Returns (scale px->tex px, pad px, size)."""
    s = units_per_px * RES
    h, w = rgba.shape[:2]
    tw, th = max(1, round(w * s)), max(1, round(h * s))
    im = Image.fromarray(rgba, "RGBA").convert("RGBa").resize((tw, th), Image.LANCZOS).convert("RGBA")
    pad = PAD * RES
    canvas = Image.new("RGBA", (tw + 2 * pad, th + 2 * pad), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad))
    canvas.save(path, optimize=True)
    return s, pad, canvas.size


def entry(key, size, ax, ay, extra=None):
    e = {
        "png": f"assets/textures/characters/{key}.png",
        "width": round(size[0] / RES, 2), "height": round(size[1] / RES, 2),
        "anchorX": round(ax, 4), "anchorY": round(ay, 4), "res": RES, "pad": PAD,
    }
    if extra:
        e.update(extra)
    return e


def sheet_parts(c):
    """Head / arm / pants shapes on the per-character sheet, used only to calibrate proportions."""
    img = load(f"{c}_parts.jpg")
    comps = components(matte(img), img.shape[0] * img.shape[1] * 0.004)
    mid = img.shape[1] / 2, img.shape[0] / 2
    found = {}
    for m in comps:
        x0, y0, x1, y1 = bbox(m)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        quad = ("top" if cy < mid[1] else "bottom") + ("_left" if cx < mid[0] else "_right")
        found.setdefault(quad, (x1 - x0, y1 - y0))
    return {"head": found["top_left"][1], "arm": found["bottom_left"][1], "pants": found["bottom_right"][1]}


def cut_torso(c):
    img = load(f"{c}_parts.jpg").copy()
    x1, y1, x2, y2 = TORSO_BOUNDS[c]
    if c in TORSO_MASKS:
        ys, xs = np.mgrid[0:img.shape[0], 0:img.shape[1]]
        img[TORSO_MASKS[c](xs, ys)] = 255
    sub = img[y1:y2, x1:x2]
    return to_rgba(sub, largest(matte(sub)))


def cut_leg(c, legs_img):
    ux1, uy1, ux2, uy2 = LEG_UPPER[c]
    upper, umask = to_rgba(*cut_region(legs_img, (ux1, uy1, ux2 - ux1, uy2 - uy1)))
    sx1, sy1, sx2, sy2 = LEG_SHOE[c]
    shoe_sub = legs_img[sy1:sy2, sx1:sx2]
    shoe, _ = to_rgba(shoe_sub, largest(matte(shoe_sub)))

    ankle_x, _, _ = band_center_x(umask, 0.9, 1.0)
    uh, uw = upper.shape[:2]
    sh, sw = shoe.shape[:2]
    left = min(0, round(ankle_x - sw / 2))
    right = max(uw, round(ankle_x + sw / 2))
    top_shoe = uh - SHOE_OVERLAP
    canvas = Image.new("RGBA", (right - left, max(uh, top_shoe + sh)), (0, 0, 0, 0))
    canvas.alpha_composite(Image.fromarray(upper, "RGBA"), (-left, 0))
    canvas.alpha_composite(Image.fromarray(shoe, "RGBA"), (round(ankle_x - sw / 2) - left, top_shoe))
    rgba = np.asarray(canvas)
    return rgba, rgba[..., 3] > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="write an assembled-rig preview PNG here")
    args = ap.parse_args()

    heads_img, arms_img, legs_img = load("heads.jpg"), load("arms.jpg"), load("legs.jpg")

    torsos = {c: cut_torso(c) for c in CHARS}
    heads = {c: to_rgba(*cut_region(heads_img, HEAD_REGIONS[c])) for c in CHARS}
    arms = {c: to_rgba(*cut_region(arms_img, ARM_REGIONS[c])) for c in CHARS}
    legs = {c: cut_leg(c, legs_img) for c in CHARS}
    ref = {c: sheet_parts(c) for c in CHARS}

    def mean_h(parts):
        return np.mean([p[0].shape[0] for p in parts.values()])

    torso_k = TORSO_UNITS / mean_h(torsos)
    ref_torso = np.mean([torsos[c][0].shape[0] for c in CHARS])
    unit = {
        "torso": torso_k,
        "head": torso_k * np.mean([ref[c]["head"] for c in CHARS]) / mean_h(heads),
        "arm": torso_k * np.mean([ref[c]["arm"] for c in CHARS]) / mean_h(arms),
        "leg": torso_k * np.mean([ref[c]["pants"] for c in CHARS]) / mean_h(legs),
    }
    print("units per source px:", {k: round(v, 4) for k, v in unit.items()},
          "| ref torso px", round(ref_torso))

    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)

    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for c in CHARS:
        # head: pivot at the bottom of the neck
        rgba, m = heads[c]
        s, pad, size = export(rgba, unit["head"], OUT / f"{c}_head.png")
        nx, _, _ = band_center_x(m, 0.92, 1.0)
        manifest[f"characters/{c}_head"] = entry(f"{c}_head", size, (pad + nx * s) / size[0], (pad + m.shape[0] * s) / size[1])

        # torso: pivot at the hem centre; sockets measured from the silhouette
        rgba, m = torsos[c]
        s, pad, size = export(rgba, unit["torso"], OUT / f"{c}_torso.png")
        h, w = m.shape
        ax_px = pad + w * s / 2
        ay_px = pad + h * s
        neck_x, _, _ = band_center_x(m, 0.0, 0.06)
        _, sl, sr = band_center_x(m, 0.10, 0.22)
        to_u = lambda px, origin: round((pad + px * s - origin) / RES, 2)
        # Symmetric around the neckline so open jackets and aprons don't skew the rig.
        shoulder = (sr - sl) / 2 * SHOULDER_INSET
        hip = shoulder * HIP_RATIO
        sockets = {
            "neck": [to_u(neck_x, ax_px), to_u(h * 0.05, ay_px)],
            "shoulderL": [to_u(neck_x - shoulder, ax_px), to_u(h * 0.12, ay_px)],
            "shoulderR": [to_u(neck_x + shoulder, ax_px), to_u(h * 0.12, ay_px)],
            "hipL": [to_u(neck_x - hip, ax_px), to_u(h * 0.92, ay_px)],
            "hipR": [to_u(neck_x + hip, ax_px), to_u(h * 0.92, ay_px)],
        }
        manifest[f"characters/{c}_torso"] = entry(f"{c}_torso", size, ax_px / size[0], ay_px / size[1], {"sockets": sockets})

        # arm: pivot inside the shoulder cap
        rgba, m = arms[c]
        s, pad, size = export(rgba, unit["arm"], OUT / f"{c}_arm.png")
        cx, l, r = band_center_x(m, 0.0, 0.1)
        manifest[f"characters/{c}_arm"] = entry(f"{c}_arm", size, (pad + cx * s) / size[0], (pad + (r - l) * 0.45 * s) / size[1])

        # leg: pivot at the hip joint
        rgba, m = legs[c]
        s, pad, size = export(rgba, unit["leg"], OUT / f"{c}_leg.png")
        cx, l, r = band_center_x(m, 0.0, 0.08)
        manifest[f"characters/{c}_leg"] = entry(f"{c}_leg", size, (pad + cx * s) / size[0], (pad + (r - l) * 0.3 * s) / size[1])

        partial = []
        for part in ("head", "torso", "arm", "leg"):
            a = np.asarray(Image.open(OUT / f"{c}_{part}.png"))[..., 3]
            vis = a > 0
            partial.append(f"{part} {100 * ((a > 0) & (a < 255)).sum() / vis.sum():.0f}%")
        report.append(f"{c:9s} partial-alpha: " + ", ".join(partial))

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    print("\n".join(report))
    print(f"wrote {len(CHARS) * 4} parts to {OUT.relative_to(ROOT)} and updated manifest.json")

    if args.preview:
        write_preview(manifest, Path(args.preview))


def write_preview(manifest, path):
    """Assemble each character in idle pose from the measured sockets (rig preview only)."""
    scale = 3
    cell_w, cell_h = 90 * scale, 170 * scale
    sheet = Image.new("RGBA", (cell_w * len(CHARS), cell_h), (58, 44, 80, 255))

    def place(canvas, key, x_u, y_u, flip=False):
        info = manifest[key]
        im = Image.open(ROOT / info["png"]).convert("RGBA")
        k = scale / info["res"]
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        ax = info["anchorX"]
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
            ax = 1 - ax
        canvas.alpha_composite(im, (round(x_u * scale - ax * im.width), round(y_u * scale - info["anchorY"] * im.height)))

    for i, c in enumerate(CHARS):
        cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        ox, ground = 45, 160
        torso = manifest[f"characters/{c}_torso"]
        sk = torso["sockets"]
        leg_len = manifest[f"characters/{c}_leg"]["height"] - 2 * PAD
        hip_y = ground - leg_len * (1 - 0.06)
        torso_y = hip_y - sk["hipL"][1]
        place(cell, f"characters/{c}_arm", ox + sk["shoulderL"][0], torso_y + sk["shoulderL"][1], flip=True)
        place(cell, f"characters/{c}_leg", ox + sk["hipL"][0], torso_y + sk["hipL"][1], flip=True)
        place(cell, f"characters/{c}_leg", ox + sk["hipR"][0], torso_y + sk["hipR"][1])
        place(cell, f"characters/{c}_torso", ox, torso_y)
        place(cell, f"characters/{c}_head", ox + sk["neck"][0], torso_y + sk["neck"][1] + 6)
        place(cell, f"characters/{c}_arm", ox + sk["shoulderR"][0], torso_y + sk["shoulderR"][1])
        sheet.alpha_composite(cell, (i * cell_w, 0))
    sheet.save(path)
    print(f"preview: {path}")


if __name__ == "__main__":
    main()
