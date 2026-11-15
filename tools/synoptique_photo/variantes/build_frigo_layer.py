"""Calque lumineux du circuit frigo pour la variante sans ECS (tuyaux redessinés par l'IA).

Le calque d'origine éclaire le tuyau violet qui longeait le ballon (x ≈ 870) et le tuyau
cyan qui entrait dans le bas du ballon. Sans ballon, les deux tuyaux montent côte à côte
jusqu'au module : on efface la partie intérieure du calque et on redessine les deux lueurs.
usage : python build_frigo_layer.py <dossier www/pac_synoptique>
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

WWW = Path(sys.argv[1])
# (x violet, x cyan, haut des montées, y coude violet, y coude cyan) mesurés sur les éditions IA
GEOM = {"jour": (892.5, 916.0, 528, 783, 803), "nuit": (889.0, 913.5, 524, 783, 803)}
WALL_X = 846


def glow(shape, segs, color, peak, width=3, sigma=2.6):
    c = np.zeros(shape, np.float32)
    for (x0, y0), (x1, y1) in segs:
        cv2.line(c, (int(round(x0)), int(round(y0))), (int(round(x1)), int(round(y1))), 1.0, width, cv2.LINE_AA)
    c = cv2.GaussianBlur(c, (0, 0), sigma)
    c /= max(c.max(), 1e-6)
    return c[..., None] * np.array(color, np.float32)[None, None, :] * (peak / max(color))


for tod, (xp, xt, top, yp, yt) in GEOM.items():
    src = np.asarray(Image.open(WWW / tod / "calque_frigo.webp").convert("RGB")).astype(np.float32)
    purple = src[650, 860:880].max(0)        # couleur de la lueur verticale d'origine
    teal = src[800:808, 852:866].reshape(-1, 3).max(0)
    out = src.copy()
    out[500:880, 850:1080] = 0               # partie intérieure (ballon) effacée
    h, w = out.shape[:2]
    out += glow((h, w), [((WALL_X, yp), (xp, yp)), ((xp, yp), (xp, top))], purple, purple.max())
    out += glow((h, w), [((WALL_X, yt), (xt, yt)), ((xt, yt), (xt, top))], teal, teal.max())
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(WWW / tod / "calque_frigo_sans_ecs.webp", "WEBP", quality=90, method=6)
    print(tod, "violet", purple.astype(int).tolist(), "cyan", teal.astype(int).tolist())
