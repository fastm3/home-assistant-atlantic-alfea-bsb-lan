# Construit flows.json (traces SVG des flux + ancrages) pour base_nuit.png (2048x1152) et un apercu de calage
import json, sys, cv2, numpy as np
W, H = 2048, 1152
# chaque flux : liste de polylignes (pixels image), dans le sens de circulation en chauffage
FLOWS = {
  "frigo_gaz":     {"layer": "frigo", "color": "#c06bff", "paths": [[(560,822),(727,822)], [(850,779),(870,779),(870,525),(888,522)]]},
  "frigo_liquide": {"layer": "frigo", "color": "#3ff2ff", "paths": [[(882,805),(847,805)], [(728,855),(560,855)]]},
  "c1_depart":     {"layer": "c1", "color": "#ff5a2a", "paths": [[(950,286),(950,270),(1579,270),(1579,613),(1604,613)]]},
  "c1_retour":     {"layer": "c1", "color": "#3aa0ff", "paths": [[(1604,716),(1564,716),(1564,289),(1061,289)]]},
  "c2_depart":     {"layer": "c2", "color": "#ff5a2a", "paths": [[(1062,306),(1331,306),(1331,659),(1440,659)], [(1387,659),(1387,809)], [(1433,659),(1433,809)]]},
  "c2_retour":     {"layer": "c2", "color": "#3aa0ff", "paths": [[(1374,809),(1374,706)], [(1419,809),(1419,706),(1313,706),(1313,324),(1070,324)]]},
}
PULSES = {}  # remplace par la respiration des calques (CSS)
ANCHORS = {  # points d'accroche des valeurs (pixels image)
  "ext_temp":      (370, 625),
  "pac_depart":    (1210, 248),
  "pac_retour":    (1210, 345),
  "ecs_ballon":    (966, 560),
  "c1_ambiance":   (1735, 560),
  "c2_ambiance":   (1700, 840),
  "compresseur":   (305, 905),
}
def to_d(paths):
    return " ".join("M" + " L".join(f"{x},{y}" for x, y in p) for p in paths)
out = {"width": W, "height": H, "flows": {}, "pulses": PULSES, "anchors": ANCHORS}
for k, f in FLOWS.items():
    out["flows"][k] = {"layer": f["layer"], "color": f["color"], "d": to_d(f["paths"])}
json.dump(out, open(sys.argv[2], "w"), indent=1)
# apercu
img = cv2.imread(sys.argv[1])
for k, f in FLOWS.items():
    c = f["color"].lstrip("#"); bgr = (int(c[4:6],16), int(c[2:4],16), int(c[0:2],16))
    for p in f["paths"]:
        pts = np.array(p, np.int32)
        cv2.polylines(img, [pts], False, (255,255,255), 5, cv2.LINE_AA)
        cv2.polylines(img, [pts], False, bgr, 2, cv2.LINE_AA)
        cv2.arrowedLine(img, tuple(p[-2]), tuple(p[-1]), (255,255,255), 2, cv2.LINE_AA, tipLength=0.5)
for k, e in PULSES.items():
    for cx,cy,rx,ry in e["ellipses"]: cv2.ellipse(img, (cx,cy), (rx,ry), 0, 0, 360, (0,255,255), 2)
for k, (x, y) in ANCHORS.items():
    cv2.circle(img, (x, y), 9, (0,255,0), -1); cv2.putText(img, k, (x+12, y+6), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
cv2.imwrite(sys.argv[3], img)
print("ok")
