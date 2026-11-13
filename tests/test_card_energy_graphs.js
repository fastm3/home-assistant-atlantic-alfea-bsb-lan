"use strict";
/* V1.5.43 — graphes énergie C1+C2 / ECS : 7 jours empilés + aujourd'hui par heure. */
const fs=require("fs"),vm=require("vm"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","custom_components","atlantic_alfea_controller","www","pac-synoptique-card.js"),"utf8");
class E {
  constructor(){this.dataset={};this.shadowRoot={innerHTML:"",querySelector:()=>null,addEventListener:()=>{}};}
  attachShadow(){return this.shadowRoot;}
}
const custom={};
const context={HTMLElement:E,customElements:{get:k=>custom[k],define:(k,v)=>custom[k]=v},
  window:{customCards:[],matchMedia:()=>({matches:false})},Date,JSON,Object,Intl,Number,String,Array,Math,Set,Map,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(source,context);
const Card=custom["pac-synoptique-card"];

assert(!source.includes("Aucune donnée sur 10 jours") && !source.includes("10 jours · "),"l'ancien graphe compteur global est toujours présent");

const CIRC="sensor.chaufferie_atlantic_alfea_bsb_lan_c1_c2_energie_consommee";
const ECS="sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_energie_consommee";
const states={
  [CIRC]:{state:"3.2",attributes:{friendly_name:"C1+C2 - Énergie consommée",unit_of_measurement:"kWh"}},
  [ECS]:{state:"1.1",attributes:{friendly_name:"ECS - Énergie consommée",unit_of_measurement:"kWh"}}
};
const requests=[];
const today=new Date(); today.setHours(0,0,0,0);
const day=n=>{const d=new Date(today); d.setDate(d.getDate()-n); return d.toISOString();};
const hour=h=>{const d=new Date(today); d.setHours(h); return d.toISOString();};
const callWS=async msg=>{
  requests.push(msg);
  if(msg.period==="day") return {[CIRC]:[{start:day(1),change:4.5},{start:day(0),change:2.25}],[ECS]:[{start:day(1),change:1.5}]};
  return {[CIRC]:[{start:hour(0),change:0.4}],[ECS]:[{start:hour(0),change:0.6}]};
};

(async()=>{
  const card=new Card();
  card.setConfig({show_graphs:true});
  card.hass={states,themes:{darkMode:false},callService:async()=>{},callWS};
  await new Promise(resolve=>setTimeout(resolve,0)); // automatic load on hass assignment
  requests.length=0;
  const ids=card._energySplitIds();
  assert.strictEqual(ids.circuits,CIRC,"capteur C1+C2 non détecté");
  assert.strictEqual(ids.ecs,ECS,"capteur ECS non détecté");
  await card._loadGraphs(ids);
  assert.strictEqual(requests.length,2,"une requête jour + une requête heure attendues");
  assert(requests.every(r=>r.statistic_ids.includes(CIRC)&&r.statistic_ids.includes(ECS)),"les deux capteurs doivent être demandés");
  assert.deepStrictEqual(requests.map(r=>r.period).sort(),["day","hour"]);
  const g=card._graphs;
  assert.strictEqual(g.days.length,7,"7 jours attendus");
  assert.strictEqual(g.hours.length,24,"24 heures attendues");
  assert.strictEqual(g.days[5].circuits,4.5); assert.strictEqual(g.days[5].ecs,1.5);
  assert.strictEqual(g.hours[0].ecs,0.6);
  const out=card._graphsHtml();
  assert(out.includes("Consommation quotidienne") && out.includes("7 derniers jours"),"graphe 7 jours absent");
  assert(out.includes("heure par heure"),"graphe horaire absent");
  assert((out.match(/class="eg-col/g)||[]).length===31,"31 barres attendues (7 + 24)");
  assert(out.includes("eg-seg eg-circ") && out.includes("eg-seg eg-ecs"),"barres empilées absentes");
  assert(/8,3/.test(out),"total 7 jours (8,25 kWh) absent");
  console.log("energy graphs OK");
})().catch(err=>{console.error(err);process.exit(1);});
