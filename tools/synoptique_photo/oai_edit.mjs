// usage: OPENAI_API_KEY=... node oai_edit.mjs <out.png> <model> <size> <prompt.txt> <img1> [img2...]
import fs from "node:fs";
import path from "node:path";
const [out, model, size, promptFile, ...imgs] = process.argv.slice(2);
const fd = new FormData();
fd.append("model", model);
fd.append("prompt", fs.readFileSync(promptFile, "utf8"));
fd.append("size", size);
fd.append("quality", "high");
fd.append("n", "1");
for (const p of imgs) {
  const type = p.endsWith(".jpg") ? "image/jpeg" : "image/png";
  fd.append("image[]", new Blob([fs.readFileSync(p)], { type }), path.basename(p));
}
const t = Date.now();
const r = await fetch("https://api.openai.com/v1/images/edits", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: fd,
});
const j = await r.json();
if (!r.ok) { console.log("ERROR", r.status, JSON.stringify(j).slice(0, 800)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(j.data[0].b64_json, "base64"));
console.log("OK", out, Math.round((Date.now() - t) / 1000) + "s", JSON.stringify(j.usage || {}));
