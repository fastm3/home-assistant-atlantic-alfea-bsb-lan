"""Assemble la carte pac-synoptique-photo-card.

    python tools/synoptique_photo/build_card.py                 # JS seul
    python tools/synoptique_photo/build_card.py --images DIR    # + conversion WebP d'un jeu d'images

Le JS final = moteur des onglets (tabs_engine.js) + card_template.js avec flows.json injecté,
écrit dans custom_components/atlantic_alfea_controller/www/.

--images DIR : DIR contient base.png (fond) et éventuellement calque_*.png (calques additifs) ;
--set NOM (défaut : jour) choisit le dossier www/pac_synoptique/NOM/.
"""
import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
WWW = HERE.parents[1] / "custom_components" / "atlantic_alfea_controller" / "www"

ap = argparse.ArgumentParser()
ap.add_argument("--images", type=Path)
ap.add_argument("--set", default="jour")
args = ap.parse_args()

flows = json.loads((HERE / "flows.json").read_text(encoding="utf-8"))
js = (HERE / "card_template.js").read_text(encoding="utf-8").replace("__FLOWS__", json.dumps(flows))
js = (HERE / "tabs_engine.js").read_text(encoding="utf-8") + "\n" + js
out = WWW / "pac-synoptique-photo-card.js"
out.write_text(js, encoding="utf-8", newline="\n")
print(f"{out.relative_to(HERE.parents[1])}  {out.stat().st_size / 1024:.0f} Ko")

if args.images:
    from PIL import Image  # pip install pillow

    dest = WWW / "pac_synoptique" / args.set
    dest.mkdir(parents=True, exist_ok=True)
    for src in sorted(args.images.glob("*.png")):
        if src.stem == "base" or src.stem.startswith("calque_"):
            q = 88 if src.stem == "base" else 85
            Image.open(src).convert("RGB").save(dest / f"{src.stem}.webp", "WEBP", quality=q, method=6)
            print(f"  {args.set}/{src.stem}.webp")
