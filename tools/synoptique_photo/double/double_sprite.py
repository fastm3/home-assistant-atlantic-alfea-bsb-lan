"""Groupe double dessiné une fois par le modèle d'image (décor de jour), découpé puis reporté sur les 8 décors.

python double_sprite.py extract                 -> double/sprite_mask.png
python double_sprite.py apply base.png out.png  -> décor avec groupe double (teinte adaptée au décor)
"""
import os
import sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(HERE, "double", "oai_double_v1.png")      # groupe double généré (jour)
DAY = os.path.join(HERE, "oai_jour_v1.png")                  # décor de jour d'origine
SPRITE_MASK = os.path.join(HERE, "double", "sprite_mask.png")
OLD_MASK = os.path.join(HERE, "double", "double_mask.png")   # silhouette du groupe simple d'origine
RECT = (170, 372, 400, 566)


def extract():
    gen = cv2.imread(GEN)
    m = np.zeros(gen.shape[:2], np.uint8)
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(gen, m, RECT, bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
    fg = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
    fg[:, 566:] = 0
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    fg = np.where(lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])), 255, 0).astype(np.uint8)
    cnts, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(np.vstack(cnts))                   # boîte : enveloppe convexe (jonction et coins comblés)
    full = np.zeros_like(fg); cv2.fillConvexPoly(full, hull, 255)
    full[:, 566:] = 0
    cv2.imwrite(SPRITE_MASK, full)
    ys, xs = np.nonzero(full)
    print("sprite bbox x", xs.min(), xs.max(), "y", ys.min(), ys.max())


def tone_match(sprite, ref_region_day, ref_region_var):
    """Transfert moyenne/écart-type par canal (Lab) mesuré sur l'ancien groupe : jour -> décor cible."""
    s = cv2.cvtColor(sprite, cv2.COLOR_BGR2LAB).astype(np.float32)
    a, b = ref_region_day.reshape(-1, 3), ref_region_var.reshape(-1, 3)
    a = cv2.cvtColor(a[None].astype(np.uint8), cv2.COLOR_BGR2LAB)[0].astype(np.float32)
    b = cv2.cvtColor(b[None].astype(np.uint8), cv2.COLOR_BGR2LAB)[0].astype(np.float32)
    ma, mb = a.mean(0), b.mean(0)
    s[..., 0] *= mb[0] / max(ma[0], 1e-3)          # luminosité : mise à l'échelle (les noirs restent détaillés)
    s[..., 1:] += (mb[1:] - ma[1:])                # couleur : décalage vers la teinte du décor
    return cv2.cvtColor(s.clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def apply(base_path, out_path):
    base, day, gen = cv2.imread(base_path), cv2.imread(DAY), cv2.imread(GEN)
    sm, old = cv2.imread(SPRITE_MASK, 0), cv2.imread(OLD_MASK, 0)
    # étirer légèrement le groupe double pour recouvrir toute l'emprise de l'ancien groupe (rien à effacer)
    sy_, sx_ = np.nonzero(sm); oy_, ox_ = np.nonzero(old)
    x0s, x1s, y0s, y1s = sx_.min(), sx_.max(), sy_.min(), sy_.max()
    x0n = min(x0s, ox_.min()); y1n = max(y1s, oy_.max())
    kx, ky = (x1s - x0n) / (x1s - x0s), (y1n - y0s) / (y1s - y0s)
    A = np.float32([[kx, 0, x0n - x0s * kx], [0, ky, y0s - y0s * ky]])
    gen = cv2.warpAffine(gen, A, (gen.shape[1], gen.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    sm = cv2.warpAffine(sm, A, (sm.shape[1], sm.shape[0]), flags=cv2.INTER_LINEAR)
    # 1) effacer ce qui dépasse du groupe d'origine (bande à gauche) : retouche depuis le fond voisin
    leftover = cv2.bitwise_and(old, cv2.bitwise_not(cv2.erode(sm, np.ones((3, 3), np.uint8))))
    leftover = cv2.dilate(leftover, np.ones((5, 5), np.uint8))
    leftover[:, 553:] = 0                                          # ne pas toucher aux raccords / tuyaux
    work = base  # ce qui dépasse de l'ancien groupe est recouvert par les pixels générés (gravier, ombre), pas retouché
    # 2) groupe double, teinte adaptée au décor (mesurée sur l'ancien groupe, hors grille sombre)
    core = (old > 0) & (cv2.cvtColor(day, cv2.COLOR_BGR2GRAY) > 140)
    sprite = gen if base_path == DAY else tone_match(gen, day[core], base[core])
    sm = cv2.max(sm, leftover)                                     # + zone de l'ancien groupe non recouverte
    a = cv2.GaussianBlur(sm, (3, 3), 0).astype(np.float32)[..., None] / 255.0
    out = sprite.astype(np.float32) * a + work.astype(np.float32) * (1 - a)
    cv2.imwrite(out_path, out.clip(0, 255).astype(np.uint8))


if __name__ == "__main__":
    if sys.argv[1] == "extract":
        extract()
    else:
        apply(sys.argv[2], sys.argv[3])
