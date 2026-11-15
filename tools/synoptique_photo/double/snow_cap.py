"""Neige sur le couvercle du bloc du haut (décors neige du groupe double).

La neige du couvercle d'origine (différence décor neige / décor jour sur la bande du couvercle)
est reprise, mise à la largeur du nouveau couvercle et posée sur le bloc du haut.
usage : python snow_cap.py neige_orig.png jour_orig.png double_in.png double_out.png
"""
import sys
import cv2
import numpy as np

OLD = (186, 556, 628, 676)      # x0, x1, y0, y1 : couvercle d'origine (avec la neige au-dessus)
OLD_LID_TOP = 660
NEW_X0, NEW_X1, NEW_LID_TOP = 189, 564, 449   # couvercle du bloc du haut (groupe double)

snow, day, dbl = (cv2.imread(p) for p in sys.argv[1:4])
x0, x1, y0, y1 = OLD
band, dband = snow[y0:y1, x0:x1].astype(np.float32), day[y0:y1, x0:x1].astype(np.float32)
lum = lambda a: a.mean(2)
# neige = nettement plus claire que le décor de jour au même endroit, ou blanche au-dessus du couvercle
m = ((lum(band) - lum(dband)) > 10) | ((lum(band) > 200) & (np.arange(y1 - y0)[:, None] < OLD_LID_TOP - y0))
m = cv2.morphologyEx(m.astype(np.uint8) * 255, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
m[OLD_LID_TOP - y0 + 14:] = 0                       # ne garder que le dessus (pas la façade)
w = NEW_X1 - NEW_X0
band = cv2.resize(band, (w, y1 - y0), interpolation=cv2.INTER_CUBIC)
m = cv2.resize(m, (w, y1 - y0), interpolation=cv2.INTER_LINEAR)
ny0 = NEW_LID_TOP - (OLD_LID_TOP - y0)
a = cv2.GaussianBlur(m, (5, 5), 0).astype(np.float32)[..., None] / 255.0
zone = dbl[ny0:ny0 + (y1 - y0), NEW_X0:NEW_X1].astype(np.float32)
dbl[ny0:ny0 + (y1 - y0), NEW_X0:NEW_X1] = (band * a + zone * (1 - a)).clip(0, 255).astype(np.uint8)
cv2.imwrite(sys.argv[4], dbl)
print("neige posée, pixels :", int((m > 127).sum()))
