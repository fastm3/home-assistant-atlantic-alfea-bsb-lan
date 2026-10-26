"use strict";
/* V1.5.23 — noms de circuits configurables + commandes Climate/Select. */
const fs=require("fs"),vm=require("vm"),path=require("path"),assert=require("assert");
const source=fs.readFileSync(path.join(__dirname,"..","custom_components","atlantic_alfea_controller","www","pac-synoptique-card.js"),"utf8");
class E {
  constructor(){this.dataset={};this.shadowRoot={innerHTML:"",querySelector:()=>null,addEventListener:()=>{}};}
  attachShadow(){return this.shadowRoot;}
}
const custom={};
const calls=[];
const states={
  "select.atlantic_alfea_bsb_lan_mode_global":{state:"Chauffage",attributes:{friendly_name:"Atlantic Alfea BSB-LAN Mode global"}},
  "climate.atlantic_alfea_bsb_lan_c1_circuit_1":{state:"heat",attributes:{friendly_name:"Atlantic Alfea BSB-LAN C1 - Circuit 1",temperature:21.5,current_temperature:20.1,hvac_action:"heating"}},
  "climate.atlantic_alfea_bsb_lan_c2_circuit_2":{state:"off",attributes:{friendly_name:"Atlantic Alfea BSB-LAN C2 - Circuit 2",temperature:19.5,current_temperature:19.0,hvac_action:"off"}},
  "number.esp_bsblan_temp_consigne_ecs":{state:"49.0",attributes:{friendly_name:"esp-bsblan Temp consigne ECS confort"}},
  "number.esp_bsblan_temp_consigne_ecs_reduit":{state:"46.0",attributes:{friendly_name:"esp-bsblan Temp consigne ECS reduit"}},
  "number.atlantic_alfea_bsb_lan_c1_chauffage_t_conf":{state:"20.0",attributes:{friendly_name:"Atlantic Alfea BSB-LAN C1 - Chauffage T. Conf"}},
  "number.atlantic_alfea_bsb_lan_c2_chauffage_t_conf":{state:"20.0",attributes:{friendly_name:"Atlantic Alfea BSB-LAN C2 - Chauffage T. Conf"}},
  "binary_sensor.comp_etat":{state:"on",attributes:{friendly_name:"COMP - État"}},
  "sensor.comp_modulation":{state:"50",attributes:{friendly_name:"COMP - Modulation"}}
};
const context={HTMLElement:E,customElements:{get:k=>custom[k],define:(k,v)=>custom[k]=v},
  window:{customCards:[],matchMedia:()=>({matches:false})},Date,JSON,Object,Intl,Number,String,Array,Math,Set,console,setTimeout};
vm.runInNewContext(source,context);
const Card=custom["pac-synoptique-card"];
assert(Card,"carte non enregistrée");

const card=new Card();
card.setConfig({circuit_1_name:"Étage",circuit_2_name:"RDC"});
card.hass={states,themes:{darkMode:false,theme:"Jour"},callService:async(...args)=>{calls.push(args);}};
let html=card.shadowRoot.innerHTML;
assert(html.includes("Étage") && html.includes("RDC"),"noms de circuits absents");
assert(html.includes('data-pac-action="global"'),"commande mode PAC absente");
assert(html.includes('data-pac-action="hvac"'),"commande Off/Auto absente");
assert(html.includes('data-pac-action="temp"'),"commande consigne absente");
assert(html.includes('data-value="Chauffage"'),"option Chauffage absente");
assert(html.includes('data-value="Refroidissement"'),"option Refroidissement absente");
assert(html.includes("ECS · Ballon"),"commande ECS absente");
assert(html.includes("fan-shell running"),"ventilateur non animé à 50 %");
assert(html.includes("--fan-duration:1.2s"),"vitesse ventilateur non proportionnelle");

const click=dataset=>card._onClick({composedPath:()=>[{dataset}],stopPropagation(){}});
(async()=>{
  await click({pacAction:"global",value:"Off"});
  assert.equal(calls[0][0],"select");
  assert.equal(calls[0][1],"select_option");
  assert.equal(calls[0][2].option,"Off");

  await click({pacAction:"hvac",circuit:"1",value:"auto"});
  assert.equal(calls[1][1],"set_hvac_mode");
  assert.equal(calls[1][2].hvac_mode,"heat");

  await click({pacAction:"temp",circuit:"1",delta:"0.5"});
  assert.equal(calls[2][0],"number");
  assert.equal(calls[2][2].value,20.5);

  await click({pacAction:"temp",circuit:"1",delta:"0.5"});
  assert.equal(calls[3][2].value,21);

  await click({pacAction:"ecs",delta:"1"});
  assert.equal(calls[4][0],"number");
  assert.equal(calls[4][2].value,50);
  assert.equal(calls[5][2].value,47);

  card.setConfig({show_controls:false});
  assert(!card.shadowRoot.innerHTML.includes('data-pac-action="global"'),"show_controls=false ignoré");
  assert(card.shadowRoot.innerHTML.includes("Alarmes et surveillance"),"alarmes perdues");

  states["sensor.comp_modulation"]={state:"0",attributes:{friendly_name:"COMP - Modulation"}};
  card.hass={states,themes:{darkMode:false,theme:"Jour"},callService:async(...args)=>{calls.push(args);}};
  assert(!card.shadowRoot.innerHTML.includes("fan-shell running"),"ventilateur doit s'arrêter à 0 %");
  assert(card.shadowRoot.innerHTML.includes("--fan-duration:0s"),"durée ventilateur à 0 % incorrecte");

  console.log("PASS: noms de circuits + commandes Climate/Select + option show_controls");
})().catch(err=>{console.error(err);process.exit(1);});
