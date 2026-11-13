"use strict";
const assert=require("assert");
const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"..","custom_components","atlantic_alfea_controller","www","pac-synoptique-card.js"),"utf8");
assert(src.includes("Demande circulation par régulation"),
  "Missing regulation circulation state");
assert(src.includes("flowBelowTarget"),
  "Missing flow-versus-target comparison");
assert(src.includes("c2Flow=c2.active||(c2.pump===true&&!c2.off&&!c2.dhwPriority)"),
  "C2 pipes must animate with its pump outside ECS priority");
assert(src.includes("c1Flow=c1.active||(c1.pump===true&&!c1.off&&!c1.dhwPriority)"),
  "C1 pipes must animate with its pump outside ECS priority");
console.log("PASS: regulation circulation state and pump-driven pipe animation");
