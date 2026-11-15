# Extraction des calques lumineux par element (OpenCV) — rejouable sur une autre image en ajustant les zones
# usage: python extract_layers_cv.py base.png out_dir [compo_preview.png]
import sys, os, numpy as np, cv2
S = 2048 / 2000.0  # zones saisies sur l'apercu 2000 px
REGIONS = {
    "c1": [(900, 255, 1560, 292), (1512, 255, 1562, 722), (1555, 575, 1820, 722)],
    "c2_mur": [(1028, 293, 1312, 332), (1268, 293, 1312, 700), (1278, 625, 1425, 800)],
    "frigo": [(500, 470, 880, 865)],
    # serpentin : spires seulement, la tige de la resistance (x 945-958, y > 700) est exclue
    "ecs_serpentin": [(890, 565, 1010, 700), (890, 700, 941, 740), (961, 700, 1010, 740)],
}
FLOOR_BOX = (1340, 855, 2000, 1010)
RADIATOR = (1607, 599, 1852, 734)  # x0,y0,x1,y1 pixels image reels
# segments sans couleur detectable (barres laiton du collecteur) : lueur tracee le long du flux, en pixels image reels
EXTRA_LINES = {"c2": [((1331, 659), (1440, 659), "red"), ((1313, 706), (1446, 706), "blue")]}
SPOTS = {  # (cx, cy, rx, ry, couleur BGR 0-1, intensite, rayon interieur vide)
    "ecs_resistance": [(951, 738, 6, 34, (0.12, 0.55, 1.0), 1.0, 0)],
    "ventilateur": [(303, 778, 104, 104, (1.0, 0.65, 0.30), 0.55, 62)],
    "module": [(905, 382, 26, 58, (0.2, 0.55, 1.0), 0.45, 0)],
}
COL = {  # BGR 0-1
    "red": (0.10, 0.22, 1.0), "blue": (1.0, 0.52, 0.22), "purple": (1.0, 0.35, 0.75),
    "cyan": (1.0, 0.95, 0.25), "copper": (0.18, 0.55, 1.0),
}

def rect_mask(shape, rects):
    m = np.zeros(shape, np.uint8)
    for x0, y0, x1, y1 in rects: m[int(y0 * S):int(y1 * S), int(x0 * S):int(x1 * S)] = 1
    return m

def glow(mask, col, core=1.25, halo=0.8, spill=0.35, s_core=1.1, s_halo=4.5, s_spill=18):
    m = mask.astype(np.float32)
    g = core * cv2.GaussianBlur(m, (0, 0), s_core) + halo * cv2.GaussianBlur(m, (0, 0), s_halo) + spill * cv2.GaussianBlur(m, (0, 0), s_spill)
    return g[..., None] * np.array(col, np.float32)[None, None, :]

def ellipse_mask(shape, cx, cy, rx, ry):
    m = np.zeros(shape, np.float32)
    cv2.ellipse(m, (int(cx * S), int(cy * S)), (int(rx * S), int(ry * S)), 0, 0, 360, 1.0, -1)
    return m

def color_masks(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
    h = hsv[..., 0] * 360 / 256; s = hsv[..., 1] / 255; v = hsv[..., 2] / 255
    return h, s, v, {
        "red": ((h < 12) | (h > 348)) & (s > 0.55) & (v > 0.35),
        "blue": (h > 196) & (h < 230) & (s > 0.5) & (v > 0.3),
        "purple": (h > 255) & (h < 300) & (s > 0.35) & (v > 0.25),
        "cyan": (h > 165) & (h < 196) & (s > 0.4) & (v > 0.25),
        "copper": (h > 12) & (h < 38) & (s > 0.5) & (v > 0.45),
    }

def floor_pipes(img, h, s, v):
    """Tuyaux du plancher : rouges par couleur, bleus par contraste sombre sur l'isolant bleu clair."""
    sh = h.shape; box = rect_mask(sh, [FLOOR_BOX]).astype(bool)
    board = (h > 195) & (h < 228) & (s > 0.18) & (s < 0.6) & (v > 0.5) & box
    board = cv2.morphologyEx(board.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    cnts, _ = cv2.findContours(board, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    area = np.zeros(sh, np.uint8)
    cnts = [c for c in cnts if cv2.contourArea(c) > 5000]
    cv2.drawContours(area, cnts, -1, 1, -1)
    area = cv2.erode(area, np.ones((5, 5), np.uint8)).astype(bool)
    L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    bg = cv2.medianBlur(L.astype(np.uint8), 31).astype(np.float32)
    red = ((h < 25) | (h > 340)) & (s > 0.35) & (v > 0.2) & area
    blue = ((bg - L) > 18) & ~red & area
    k = np.ones((2, 2), np.uint8)  # supprime les joints de 1 px de la grille
    blue = cv2.morphologyEx(blue.astype(np.uint8), cv2.MORPH_OPEN, k)
    red = cv2.dilate(red.astype(np.uint8), np.ones((2, 2), np.uint8))
    return red, blue

def extract(base_path, outdir):
    img = cv2.imread(base_path); sh = img.shape[:2]
    h, s, v, cm = color_masks(img)
    layers = {}
    L = np.zeros(sh + (3,), np.float32)
    R = rect_mask(sh, REGIONS["c1"])
    L += glow(cm["red"] & R.astype(bool), COL["red"]) + glow(cm["blue"] & R.astype(bool), COL["blue"])
    layers["c1"] = L
    R = rect_mask(sh, REGIONS["c2_mur"]).astype(bool)
    fr, fb = floor_pipes(img, h, s, v)
    layers["c2"] = (glow(cm["red"] & R, COL["red"]) + glow(cm["blue"] & R, COL["blue"]) +
                    glow(fr, COL["red"], 1.1, 0.6, 0.18, 1.0, 3.0, 10) + glow(fb, COL["blue"], 1.0, 0.55, 0.15, 1.0, 3.0, 10))
    for name, lines in EXTRA_LINES.items():
        for a, b, c in lines:
            m = np.zeros(sh, np.uint8); cv2.line(m, a, b, 1, 7, cv2.LINE_AA)
            layers[name] = layers[name] + glow(m, COL[c], 0.55, 0.7, 0.3)
    R = rect_mask(sh, REGIONS["frigo"]).astype(bool)
    layers["frigo"] = glow(cm["purple"] & R, COL["purple"]) + glow((cm["cyan"] | cm["blue"]) & R, COL["cyan"])
    R = rect_mask(sh, REGIONS["ecs_serpentin"]).astype(bool)
    layers["ecs_serpentin"] = glow(cm["copper"] & R, COL["copper"], 1.2, 0.45, 0.12, 0.9, 2.5, 9)
    for name, spots in SPOTS.items():
        L = np.zeros(sh + (3,), np.float32)
        for cx, cy, rx, ry, col, k, inner in spots:
            e = ellipse_mask(sh, cx, cy, rx, ry)
            if inner: e = e - 0.75 * ellipse_mask(sh, cx, cy, inner, inner)
            e *= k
            L += (0.9 * cv2.GaussianBlur(e, (0, 0), 3) + 0.6 * cv2.GaussianBlur(e, (0, 0), 14) + 0.25 * cv2.GaussianBlur(e, (0, 0), 35))[..., None] * np.array(col, np.float32)
        layers[name] = L
    # chaleur du radiateur C1 : teinte chaude sur le corps + lueur montante sur le mur (pixels image reels)
    RX0, RY0, RX1, RY1 = RADIATOR
    body = np.zeros(sh, np.float32); body[RY0 + 4:RY1 - 4, RX0 + 4:RX1 - 4] = 1
    rise = np.zeros(sh, np.float32)
    hgt = 190
    grad = np.linspace(0, 1, hgt, dtype=np.float32) ** 1.6
    rise[RY0 - hgt:RY0, RX0 + 10:RX1 - 10] = grad[:, None]
    warm = (0.10, 0.42, 1.0)
    layers["c1_radiateur"] = (0.09 * cv2.GaussianBlur(body, (0, 0), 2) + 0.22 * cv2.GaussianBlur(body, (0, 0), 18)
                              + 0.30 * cv2.GaussianBlur(rise, (0, 0), 22))[..., None] * np.array(warm, np.float32)
    os.makedirs(outdir, exist_ok=True)
    for name, L in layers.items():
        cv2.imwrite(os.path.join(outdir, f"calque_{name}.png"), np.clip(L * 255, 0, 255).astype(np.uint8))
    return img, layers

if __name__ == "__main__":
    img, layers = extract(sys.argv[1], sys.argv[2])
    if len(sys.argv) > 3:
        comp = img.astype(np.float32) / 255
        for n in ("c1", "c2", "frigo", "ventilateur", "module", "ecs_serpentin"): comp += layers[n]
        cv2.imwrite(sys.argv[3], np.clip(comp * 255, 0, 255).astype(np.uint8))
        x0, y0, x1, y1 = [int(v * S) for v in (860, 520, 2000, 1020)]
        cv2.imwrite(sys.argv[3].replace(".png", "_zoom.png"), np.clip(comp * 255, 0, 255).astype(np.uint8)[y0:y1, x0:x1])
    print("ok", sorted(layers))
