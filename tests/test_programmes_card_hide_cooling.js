"use strict";
/* Programmes card: hide cooling tabs when their sensor is in error. */
const fs=require("fs"),vm=require("vm"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","custom_components","atlantic_alfea_controller","www","pac-programmes-card.js"),"utf8");
class E {
  constructor(){this.shadowRoot={innerHTML:"",querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}};}
  attachShadow(){return this.shadowRoot;}
}
const custom={};
const states={
  "sensor.p_chauffage_c1":{state:"Chargé",attributes:{friendly_name:"Chauffage RDC",jours:{lundi:[{debut:"06:00",fin:"22:00"}]}}},
  "sensor.p_chauffage_c2":{state:"Chargé",attributes:{friendly_name:"Chauffage étage",jours:{lundi:[{debut:"06:00",fin:"22:00"}]}}},
  "sensor.p_ecs":{state:"Chargé",attributes:{friendly_name:"ECS",jours:{lundi:[{debut:"10:00",fin:"17:30"}]}}},
  "sensor.p_cool_c1":{state:"Erreur",attributes:{friendly_name:"Rafraîchissement RDC"}},
  "sensor.p_cool_c2":{state:"Erreur",attributes:{friendly_name:"Rafraîchissement étage"}}
};
const context={HTMLElement:E,customElements:{get:k=>custom[k],define:(k,v)=>custom[k]=v},
  window:{customCards:[]},Date,JSON,Object,Intl,Number,String,Array,Math,Set,console};
Object.entries(states).forEach(([id,state])=>{state.entity_id=id;});
vm.runInNewContext(source,context);
const Card=custom["pac-programmes-card"];
assert(Card,"carte programmes non enregistrée");
const card=new Card();
card.setConfig({title:"Programmes PAC",chauffage_c1:"sensor.p_chauffage_c1",chauffage_c2:"sensor.p_chauffage_c2",
  ecs:"sensor.p_ecs",rafraichissement_c1:"sensor.p_cool_c1",rafraichissement_c2:"sensor.p_cool_c2"});
card.hass={states};
const html=card.shadowRoot.innerHTML;
assert(html.includes("Chauffage RDC"),"onglet chauffage absent");
assert(html.includes("Eau chaude sanitaire"),"onglet ECS absent");
assert(!html.includes('data-tab="rafraichissement_c1"'),"onglet rafraîchissement RDC non masqué");
assert(!html.includes('data-tab="rafraichissement_c2"'),"onglet rafraîchissement étage non masqué");
assert(html.includes("Onglets masqués"),"mention des onglets masqués absente");
console.log("PASS: onglets rafraîchissement masqués si capteur en erreur");
