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
  "sensor.comp_modulation":{state:"50",attributes:{friendly_name:"COMP - Modulation"}},
  "sensor.pac_power":{state:"1234.0",attributes:{friendly_name:"PAC puissance",unit_of_measurement:"W"}},
  "sensor.atlantic_alfea_bsb_lan_ecs_cop_session":{state:"1.7",attributes:{friendly_name:"Atlantic Alfea BSB-LAN ECS - COP session",duree_session_min:17,t_depart_reel:49.0,t_fin:53.2,conso_session_kwh:0.546,debut_session:"2026-11-07T13:50:39+00:00",session_valide:true}},
  "water_heater.bsb_lan":{state:"performance",attributes:{friendly_name:"Water heater",operation_list:["off","performance","eco"],current_temperature:53.8,temperature:60.0}}
};
const context={HTMLElement:E,customElements:{get:k=>custom[k],define:(k,v)=>custom[k]=v},
  window:{customCards:[],matchMedia:()=>({matches:false})},Date,JSON,Object,Intl,Number,String,Array,Math,Set,console,setTimeout,clearTimeout};
vm.runInNewContext(source,context);
const Card=custom["pac-synoptique-card"];
assert(Card,"carte non enregistrée");

const card=new Card();
card.setConfig({circuit_1_name:"Étage",circuit_2_name:"RDC",power_entity:"sensor.pac_power"});
card.hass={states,themes:{darkMode:false,theme:"Jour"},callService:async(...args)=>{calls.push(args);}};
let html=card.shadowRoot.innerHTML;
assert(html.includes("Puissance PAC"),"puissance PAC absente des commandes");
assert(/1[\s\u00a0\u202f]234/.test(html),"valeur de puissance non formatée");
assert(html.includes("Étage") && html.includes("RDC"),"noms de circuits absents");
assert(html.includes('data-pac-action="global"'),"commande mode PAC absente");
assert(html.includes('data-pac-action="hvac"'),"commande Off/Auto absente");
assert(html.includes('data-pac-action="temp"'),"commande consigne absente");
assert(html.includes('data-value="Chauffage"'),"option Chauffage absente");
assert(html.includes('data-value="Refroidissement"'),"option Refroidissement absente");
assert(html.includes("ECS · Ballon"),"commande ECS absente");
assert(html.includes("📊 COP"),"bilan COP ECS absent");
assert(html.includes("17 min"),"durée session ECS absente");
assert(html.includes('data-pac-action="ecs-mode"'),"mode ECS On/Off absent");
assert(html.includes('data-pac-action="edit"'),"consigne cliquable absente");
assert(html.includes("fan-shell running"),"ventilateur non animé à 50 %");
assert(html.includes("--fan-duration:1.2s"),"vitesse ventilateur non proportionnelle");

const click=dataset=>card._onClick({composedPath:()=>[{dataset}],stopPropagation(){}});
(async()=>{
  await click({pacAction:"edit",target:"circuit",circuit:"1"});
  assert(card.shadowRoot.innerHTML.includes('class="ctl-modal"'),"modal consigne absent");
  assert(card.shadowRoot.innerHTML.includes('type="range"'),"slider modal absent");
  await click({pacAction:"close-editor"});
  assert(!card.shadowRoot.innerHTML.includes('class="ctl-modal"'),"modal non fermé");

  await click({pacAction:"global",value:"Off"});
  assert.equal(calls[0][0],"select");
  assert.equal(calls[0][1],"select_option");
  assert.equal(calls[0][2].option,"Off");

  await click({pacAction:"hvac",circuit:"1",value:"auto"});
  assert.equal(calls[1][1],"set_hvac_mode");
  assert.equal(calls[1][2].hvac_mode,"heat");

  await click({pacAction:"temp",circuit:"1",delta:"0.5"});
  await click({pacAction:"temp",circuit:"1",delta:"0.5"});
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.equal(calls.length,3,"les clics rapprochés doivent être coalescés en un seul appel");
  assert.equal(calls[2][2].value,21);

  await click({pacAction:"ecs",delta:"1"});
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.equal(calls[3][0],"number");
  assert.equal(calls[3][2].value,50);
  assert.equal(calls[4][2].value,47);

  await click({pacAction:"ecs-mode",value:"off"});
  assert.equal(calls[5][0],"water_heater");
  assert.equal(calls[5][1],"set_operation_mode");
  assert.equal(calls[5][2].operation_mode,"off");

  card._hass.callApi=async()=>[[
    {state:"19.8",last_changed:new Date(Date.now()-2*3600e3).toISOString()},
    {state:"21.2",last_changed:new Date(Date.now()-1*3600e3).toISOString()},
    {state:"20.5",last_changed:new Date().toISOString()}
  ]];
  await click({pacAction:"history",entity:"sensor.test_temp",label:"Température test"});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert(card.shadowRoot.innerHTML.includes("hist-svg"),"graphique 3 h absent");
  assert(card.shadowRoot.innerHTML.includes("Température test"),"titre graphique absent");
  card._handleKeyDown({key:"Escape",stopPropagation(){}});
  assert(!card.shadowRoot.innerHTML.includes('class="ctl-modal"'),"Échap ne ferme pas le graphique");

  card.setConfig({show_controls:false});
  assert(!card.shadowRoot.innerHTML.includes('data-pac-action="global"'),"show_controls=false ignoré");
  assert(card.shadowRoot.innerHTML.includes("Alarmes et surveillance"),"alarmes perdues");

  states["sensor.comp_modulation"]={state:"0",attributes:{friendly_name:"COMP - Modulation"}};
  card.hass={states,themes:{darkMode:false,theme:"Jour"},callService:async(...args)=>{calls.push(args);}};
  assert(!card.shadowRoot.innerHTML.includes("fan-shell running"),"ventilateur doit s'arrêter à 0 %");
  assert(card.shadowRoot.innerHTML.includes("--fan-duration:0s"),"durée ventilateur à 0 % incorrecte");

  console.log("PASS: noms de circuits + commandes Climate/Select + option show_controls");
})().catch(err=>{console.error(err);process.exit(1);});
