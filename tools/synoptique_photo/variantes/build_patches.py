"""Rustines des variantes d'installation (sans radiateur, sans plancher, sans ECS).

Pour chaque décor (jour, nuit, et leurs variantes météo), fabrique trois images
WebP détourées (canal alpha), posées par la carte au-dessus du fond :

* patch_sans_radiateur : radiateur de l'étage et tuyaux du circuit 1 effacés
  (clonage du mur voisin, dans le décor lui-même) ;
* patch_sans_plancher : coupe du plancher chauffant et collecteur remplacés
  (édition masquée du modèle d'image, tons ajustés au décor), tuyaux du
  circuit 2 effacés par clonage ;
* patch_sans_ecs : bas de l'unité intérieure (ballon) remplacé par le mur et
  le sol (édition masquée), module devenu mural.

usage : python build_patches.py <dossier www/pac_synoptique> <dossier des éditions IA> [décor ...]

Les éditions IA (oai_ecs[_nuit].png, oai_plancher[_nuit].png) sont produites par oai_edit.mjs
avec mask_*.png et prompt_*.txt de ce dossier, sur les fonds jour et nuit.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

WWW, AI = Path(sys.argv[1]), Path(sys.argv[2])
SETS = sys.argv[3:] or ["jour", "nuit", "jour_pluie", "jour_neige", "jour_brouillard", "nuit_pluie", "nuit_neige", "nuit_brouillard"]

# --- zones clonées : (x0, y0, x1, y1, dx, dy) = rectangle cible, décalage de la source
# zones effacées : (x0, y0, x1, y1, dx, dy) = rectangle, décalage de la zone propre qui donne le grain du mur
# Zones effacées : (x0, y0, x1, y1, dx, dy, mode)
#   « v » / « h » : lumière interpolée (verticalement / horizontalement) d'un pixel de mur connu
#                   à l'autre, grain d'un carré de mur propre ; puis UNE fusion de Poisson sur toutes
#                   ces zones (raccords exacts avec le mur réel tout autour) ;
#   « top »       : lumière reprise du mur juste au-dessus (pas de fusion : le bas touche le module) ;
#   « copy »      : recopie décalée (dx, dy) avec correction de teinte (plinthe, sol) ;
#   « copy0 »     : recopie décalée sans correction (ombre portée du module, uniforme verticalement).
C1_ERASE = [
    (938, 262, 1069, 284, 0, 0, "top"),         # départ C1 qui plonge dans le dessus du module
    (1059, 284, 1069, 299, 0, 60, "copy0"),     # ombre du flanc du module (entrée du retour C1)
    (1069, 262, 1602, 298, 0, 0, "v"),          # tuyaux C1 le long du plafond, coude compris
    (1550, 298, 1600, 580, 0, 0, "h"),          # descente vers le radiateur
    (1550, 580, 1884, 771, 0, 0, "sep"),        # bas de la descente, radiateur, robinets, ombre (jusqu'à la plinthe)
]
C2_ERASE = [
    (1059, 300, 1069, 342, 0, 46, "copy0"),     # ombre du flanc du module (sortie des tuyaux C2)
    (1069, 300, 1346, 342, 0, 0, "v"),          # tuyaux C2 sortant du module, coude compris
    (1300, 342, 1344, 645, 0, 0, "h"),          # descente vers le collecteur
    (1296, 645, 1458, 772, 0, 0, "sep"),        # collecteur et ses tubes, sur le mur
    (1296, 772, 1458, 841, -170, 0, "copy"),    # tubes devant la plinthe et sur le sol
]
TEXTURE_BLOCK = (1100, 380, 1290, 600)          # carré de mur propre (grain du plâtre), dans chaque décor
# tuyaux de l'autre circuit (jamais référence de lumière), et plinthe/sol (bord « libre » de l'interpolation)
C2_PIPES = [(1059, 301, 1346, 337), (1305, 337, 1339, 712), (1318, 645, 1452, 832)]
C1_PIPES = [(936, 265, 1602, 296), (1555, 296, 1588, 722), (1588, 588, 1862, 748)]
FLOOR_Y = 772
GRAIN_NEAR = (1620, 420, 1860, 570)   # mur propre au-dessus du radiateur : amplitude du grain du mur de droite

# zones composées depuis les éditions IA (plus larges ou plus étroites que le masque de génération)
AI_COMPOSE = {
    "plancher": [(1345, 842, 2048, 1152)],   # sol seul ; le collecteur est effacé à part
    "ecs": [(852, 512, 1070, 876)],          # jusqu'au mur latéral : tuyaux frigo redessinés par l'IA
}
FEATHER = 3.0


def load(path):
    return np.asarray(Image.open(path).convert("RGB"))[..., ::-1].copy()  # BGR


def ai_mask(name):
    m = np.zeros((1152, 2048), np.uint8)
    for x0, y0, x1, y1 in AI_COMPOSE[name]:
        m[y0:y1, x0:x1] = 255
    return m


def ring(mask, width=8):
    k = np.ones((2 * width + 1, 2 * width + 1), np.uint8)
    return cv2.dilate(mask, k) & ~cv2.dilate(mask, np.ones((3, 3), np.uint8))


def tone_match(src, ref, mask):
    """Aligne moyenne et écart type (Lab) de src sur ref, mesurés sur l'anneau autour du masque."""
    r = ring(mask, 10) > 0
    s, d = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32), cv2.cvtColor(ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    out = s.copy()
    for c in range(3):
        ms, ss = s[..., c][r].mean(), s[..., c][r].std() + 1e-3
        md, sd = d[..., c][r].mean(), d[..., c][r].std() + 1e-3
        g = float(np.clip(sd / ss, 0.8, 1.25))  # ajustement doux
        out[..., c] = (s[..., c] - ms) * g + md
    return cv2.cvtColor(out.clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def rect_mask(rects, grow=0):
    m = np.zeros((1152, 2048), np.uint8)
    for x0, y0, x1, y1, *_ in rects:
        m[max(0, y0 - grow):y1 + grow, max(0, x0 - grow):x1 + grow] = 255
    return m


def _run_value(line, known, start, step, limit=420, run=8):
    """(médiane, position) des « run » premiers pixels connus rencontrés depuis start (sens step)."""
    i, n = start, len(line)
    vals, first = [], None
    while 0 <= i < n and abs(i - start) < limit:
        if known[i]:
            if first is None:
                first = i
            vals.append(line[i])
            if len(vals) >= run:
                return np.median(np.array(vals), 0), first
        else:
            vals, first = [], None
        i += step
    return None, None


def _smooth1d(arr, sigma=4.0):
    return cv2.GaussianBlur(arr.reshape(-1, 1, 3).astype(np.float32), (1, 0), sigmaX=0, sigmaY=sigma).reshape(-1, 3)


def _fill_missing(vals):
    good = [v for v in vals if v is not None]
    mean = np.mean(good, 0) if good else np.zeros(3)
    return [v if v is not None else mean for v in vals]


def low_light(f, known, x0, y0, x1, y1, mode):
    """Lumière de fond de la zone : interpolation linéaire à travers toute la partie inconnue
    du mur (d'un pixel connu à l'autre), donc continue entre zones voisines."""
    if mode in ("h", "v"):
        horiz = mode == "h"
        a0, a1 = (x0, x1) if horiz else (y0, y1)        # axe d'interpolation
        b0, b1 = (y0, y1) if horiz else (x0, x1)        # axe des lignes
        A, B, PA, PB = [], [], [], []
        for b in range(b0, b1):
            line, k = (f[b], known[b]) if horiz else (f[:, b], known[:, b])
            va, pa = _run_value(line, k, a0 - 1, -1)
            vb, pb = _run_value(line, k, a1, 1)
            if va is None: va, pa = vb, a0 - 1
            if vb is None: vb, pb = va, a1
            A.append(va); B.append(vb); PA.append(pa if pa is not None else a0 - 1); PB.append(pb if pb is not None else a1)
        A, B = _smooth1d(np.array(_fill_missing(A))), _smooth1d(np.array(_fill_missing(B)))
        PA, PB = np.array(PA, np.float32), np.array(PB, np.float32)
        pos = np.arange(a0, a1, dtype=np.float32)[None, :]
        tt = ((pos - PA[:, None]) / np.maximum(PB - PA, 1)[:, None]).clip(0, 1)[..., None]
        low = A[:, None, :] * (1 - tt) + B[:, None, :] * tt   # (lignes, axe, 3)
        return low if horiz else low.transpose(1, 0, 2)
    cols = []
    for x in range(x0, x1):
        col, k = f[:, x], known[:, x]
        v, _ = _run_value(col, k, y0 - 1, -1) if mode == "top" else _run_value(col, k, y1, 1)
        cols.append(v)
    cols = _smooth1d(np.array(_fill_missing(cols)))
    return np.repeat(cols[None, :, :], y1 - y0, 0)


def harmonic_fill(f, unknown, ignore):
    """Interpolation harmonique multi-échelle : bord fixé sur les pixels connus, bord libre
    (sans flux) contre les pixels « ignore » (plinthe, autres tuyaux) qui ne servent pas de référence."""
    ys, xs = np.nonzero(unknown)
    mg = 8
    y0, y1 = max(ys.min() - mg, 0), min(ys.max() + mg + 1, f.shape[0])
    x0, x1 = max(xs.min() - mg, 0), min(xs.max() + mg + 1, f.shape[1])
    v = f[y0:y1, x0:x1].astype(np.float32).copy()
    u = unknown[y0:y1, x0:x1].astype(bool)
    ig = ignore[y0:y1, x0:x1].astype(bool) & ~u

    def solve(v, u, ig, iters):
        k = ~u & ~ig
        if u.any() and min(u.shape) > 24 and u.sum() > 64:
            h2, w2 = u.shape[0] // 2 * 2, u.shape[1] // 2 * 2
            blk = lambda a: a[:h2, :w2].reshape(h2 // 2, 2, w2 // 2, 2)
            ck = blk(k).sum((1, 3)); cu = blk(u).sum((1, 3))
            vs = (v[:h2, :w2] * k[:h2, :w2, None]).reshape(h2 // 2, 2, w2 // 2, 2, 3).sum((1, 3)) / np.maximum(ck, 1)[..., None]
            us = cu > 0
            igs = (ck == 0) & ~us
            vs = solve(vs, us, igs, iters)
            up = cv2.resize(vs, (w2, h2), interpolation=cv2.INTER_LINEAR)
            v = v.copy()
            sel = u[:h2, :w2]
            v[:h2, :w2][sel] = up[sel]
        elif u.any():
            v = v.copy(); v[u] = v[k].mean(0) if k.any() else 128
        w = (~ig).astype(np.float32)
        nb = [(1, 0), (-1, 0), (1, 1), (-1, 1)]
        wsum = sum(np.roll(w, s, a) for s, a in nb)
        for _ in range(iters):
            acc = sum(np.roll(v * w[..., None], s, a) for s, a in nb)
            avg = acc / np.maximum(wsum, 1e-6)[..., None]
            v[u] = avg[u]
        return v

    v = solve(v, u, ig, 120)
    out = f.astype(np.float32).copy()
    out[y0:y1, x0:x1][u] = v[u]
    return out


def _hf(a):
    a = a.astype(np.float32)
    return a - cv2.GaussianBlur(a, (0, 0), 2.5)


def wall_grain(img, w, h, ox, oy, near=None):
    """Hautes fréquences du carré de mur propre, répétées sur w × h ; amplitude ajustée sur le
    mur voisin « near » (x0, y0, x1, y1) quand il est fourni."""
    x0, y0, x1, y1 = TEXTURE_BLOCK
    hf = _hf(img[y0:y1, x0:x1])
    if near is not None:
        nx0, ny0, nx1, ny1 = near
        target = _hf(img[ny0:ny1, nx0:nx1]).std()
        hf = hf * float(np.clip(target / max(hf.std(), 1e-3), 0.6, 1.6))
    H, W = hf.shape[:2]
    ys = (np.arange(h) + oy) % H
    xs = (np.arange(w) + ox) % W
    return hf[ys][:, xs]


def erase(img, rects, protect=()):
    """Efface les objets des rectangles (voir les modes plus haut)."""
    m = rect_mask(rects)
    known = (m | rect_mask(protect, 3)) == 0
    f = img.astype(np.float32)
    out = f.copy()
    poisson = np.zeros(img.shape[:2], np.uint8)
    grain_img = np.full(f.shape, 128, np.float32)
    for x0, y0, x1, y1, dx, dy, mode in rects:
        if mode in ("copy", "copy0"):
            src = f[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
            off = 0
            if mode == "copy":
                e = 4
                tgt = np.concatenate([f[y0:y1, x0 - e:x0], f[y0:y1, x1:x1 + e]], 1).mean(1)
                srce = np.concatenate([f[y0 + dy:y1 + dy, x0 + dx - e:x0 + dx], f[y0 + dy:y1 + dy, x1 + dx:x1 + dx + e]], 1).mean(1)
                off = _smooth1d(np.clip(tgt - srce, -12, 12), 3)[:, None, :]
            out[y0:y1, x0:x1] = src + off
            continue
        grain = wall_grain(img, x1 - x0, y1 - y0, x0 * 7, y0 * 3, near=GRAIN_NEAR)
        out[y0:y1, x0:x1] = low_light(f, known, x0, y0, x1, y1, mode) + grain
        if mode in ("h", "v"):
            poisson[y0:y1, x0:x1] = 255
            grain_img[y0:y1, x0:x1] = 128 + grain
    if poisson.any():
        # lumière = interpolation harmonique du mur réel tout autour ; grain du plâtre ajouté
        pm = poisson > 0
        ignore = rect_mask(protect, 2) > 0
        ignore[FLOOR_Y:] = True
        ignore |= rect_mask([r for r in rects if r[6] == "sep"]) > 0   # calculées ensuite, appuyées sur ce résultat
        low = harmonic_fill(out, pm, ignore)
        out[pm] = low[pm] + (grain_img[pm] - 128)
    # grandes zones : lumière séparable (profil du mur au-dessus + variation verticale du mur
    # à gauche), recalée exactement sur les bords gauche et droit
    for x0, y0, x1, y1, dx, dy, mode in rects:
        if mode != "sep":
            continue
        med = lambda a: np.median(a.reshape(-1, a.shape[-2] if a.ndim == 3 else 1, 3), 0) if False else None
        A = np.median(out[y0 - 7:y0 - 1, x0:x1], 0)                   # (w, 3) profil au-dessus
        A = _smooth1d(A, 3)
        Lc = np.median(out[y0 - 1:y1, x0 - 6:x0 - 1], 1)               # colonne de gauche (h+1, 3)
        Rc = np.median(out[y0 - 1:y1, x1 + 1:x1 + 6], 1)               # colonne de droite
        Lc, Rc = _smooth1d(Lc, 3), _smooth1d(Rc, 3)
        B = Lc[1:] - Lc[0]                                             # variation verticale (h, 3)
        model = A[None, :, :] + B[:, None, :]
        r_left = Lc[1:] - model[:, 0]
        r_right = Rc[1:] - model[:, -1]
        tt = np.linspace(0, 1, x1 - x0, dtype=np.float32)[None, :, None]
        low = model + r_left[:, None, :] * (1 - tt) + r_right[:, None, :] * tt
        out[y0:y1, x0:x1] = low + wall_grain(img, x1 - x0, y1 - y0, x0 * 7, y0 * 3, near=GRAIN_NEAR)
    return out.clip(0, 255).astype(np.uint8), m


def clone(img, rects):
    """Recopie dans chaque rectangle le mur décalé, fusion de Poisson (raccord de lumière invisible)."""
    out = img.copy()
    mask = np.zeros(img.shape[:2], np.uint8)
    h, w = img.shape[:2]
    for x0, y0, x1, y1, dx, dy in rects:
        src = cv2.warpAffine(out, np.float32([[1, 0, -dx], [0, 1, -dy]]), (w, h), borderMode=cv2.BORDER_REFLECT)
        m = np.zeros((h, w), np.uint8)
        m[y0:y1, x0:x1] = 255
        out = cv2.seamlessClone(src, out, m.copy(), ((x0 + x1) // 2, (y0 + y1) // 2), cv2.NORMAL_CLONE)  # copie : OpenCV modifie le masque
        mask |= m
    return out, mask


def clone_offset(img, rects):  # ancienne méthode (décalage de teinte constant), gardée pour comparaison
    out = img.copy().astype(np.float32)
    mask = np.zeros(img.shape[:2], np.uint8)
    for x0, y0, x1, y1, dx, dy in rects:
        tgt = out[y0:y1, x0:x1]
        src = out[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
        # correction : écart moyen entre les bords haut/bas (ou gauche/droite) de la cible et de la source
        m = 3
        if dx == 0:   # bande horizontale : bords gauche et droit
            e_t = np.concatenate([out[y0:y1, x0 - m:x0], out[y0:y1, x1:x1 + m]], 1)
            e_s = np.concatenate([out[y0 + dy:y1 + dy, x0 - m:x0], out[y0 + dy:y1 + dy, x1:x1 + m]], 1)
        else:         # bande verticale : bords haut et bas
            e_t = np.concatenate([out[y0 - m:y0, x0:x1], out[y1:y1 + m, x0:x1]], 0)
            e_s = np.concatenate([out[y0 - m + dy:y0 + dy, x0 + dx:x1 + dx], out[y1 + dy:y1 + m + dy, x0 + dx:x1 + dx]], 0)
        off = e_t.reshape(-1, 3).mean(0) - e_s.reshape(-1, 3).mean(0)
        out[y0:y1, x0:x1] = src + np.clip(off, -12, 12)
        mask[y0:y1, x0:x1] = 255
    return out.clip(0, 255).astype(np.uint8), mask


def feather(mask):
    a = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), FEATHER)
    return np.maximum(a, cv2.erode(mask, np.ones((3, 3), np.uint8)).astype(np.float32)).clip(0, 255)


def save_patch(base, patched, mask, out_path):
    a = feather(mask)
    ys, xs = np.nonzero(a > 1)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.dstack([patched[y0:y1, x0:x1, ::-1], a[y0:y1, x0:x1].astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(out_path, "WEBP", quality=90, method=6)
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]


def build(set_name):
    base = load(WWW / set_name / "base.webp")
    tod = "nuit" if set_name.startswith("nuit") else "jour"
    boxes = {}
    # sans radiateur : clonage seul
    img, m = erase(base, C1_ERASE, protect=C2_PIPES)
    boxes["sans_radiateur"] = save_patch(base, img, m, WWW / set_name / "patch_sans_radiateur.webp")
    # sans plancher : édition IA (tons ajustés) puis clonage des tuyaux C2
    mk = ai_mask("plancher")
    ai = load(AI / (f"oai_plancher{'_nuit' if tod == 'nuit' else ''}.png"))
    ai = tone_match(ai, base, mk)
    work, m2 = erase(base, C2_ERASE, protect=C1_PIPES)
    a = feather(mk)[..., None] / 255.0
    work = (ai * a + work * (1 - a)).astype(np.uint8)
    boxes["sans_plancher"] = save_patch(base, work, mk | m2, WWW / set_name / "patch_sans_plancher.webp")
    # sans ECS : édition IA seule
    mk = ai_mask("ecs")
    ai = tone_match(load(AI / (f"oai_ecs{'_nuit' if tod == 'nuit' else ''}.png")), base, mk)
    boxes["sans_ecs"] = save_patch(base, ai, mk, WWW / set_name / "patch_sans_ecs.webp")
    return boxes


if __name__ == "__main__":
    all_boxes = {}
    for s in SETS:
        all_boxes[s] = build(s)
        print(s, all_boxes[s], flush=True)
    # les rectangles doivent être identiques d'un décor à l'autre (la carte n'en connaît qu'un par rustine)
    ref = all_boxes[SETS[0]]
    for s, b in all_boxes.items():
        if b != ref:
            print("ATTENTION : emprise différente pour", s, b)
    print("PATCHES (card_template.js) :", json.dumps(ref))
