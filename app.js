const KEY="contaMaisPro.v1";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const monthDays=()=>new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
const dayNow=()=>new Date().getDate();
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const num=(id)=>Number($(id).value);
const dateBR=()=>new Date().toLocaleDateString("pt-BR");
const load=()=>JSON.parse(localStorage.getItem(KEY)||'{"settings":{},"water":null,"energy":null,"history":[]}');
let db=load();
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const toast=(m)=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)};

function page(name){
  $$(".page").forEach(x=>x.classList.remove("active"));
  const p=$("#"+name); if(p)p.classList.add("active");
  $$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
  const titles={dashboard:"Dashboard",agua:"Água",energia:"Energia",historico:"Histórico",config:"Configurações"};
  $("#title").textContent=titles[name]||"Dashboard";
  if(name==="historico")renderHistory();
}
$$(".nav").forEach(b=>b.onclick=()=>{page(b.dataset.page);$("#sidebar").classList.remove("open")});
$$("[data-page]").forEach(b=>{if(!b.classList.contains("nav"))b.onclick=()=>page(b.dataset.page)});
$("#menu").onclick=()=>$("#sidebar").classList.toggle("open");
$("#bell").onclick=()=>toast("Tudo certo. Você não tem alertas novos.");

function openModal(){ $("#modal").classList.add("show") }
function closeModal(){ $("#modal").classList.remove("show") }
$$('[data-action="new"]').forEach(b=>b.onclick=openModal);
$("#closeModal").onclick=closeModal;
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
$$("[data-go]").forEach(b=>b.onclick=()=>{closeModal();page(b.dataset.go);setTimeout(()=>$(b.dataset.go==="agua"?"#waCurr":"#enCurr").focus(),100)});

function validate(prev,curr,days,rate){
  if([prev,curr,days,rate].some(v=>!Number.isFinite(v))||prev<0||curr<prev||days<1||days>31||rate<0)return false;
  return true;
}

$("#calcWater").onclick=()=>{
  const prev=num("#waPrev"),curr=num("#waCurr"),days=num("#waDays"),rate=num("#waRate");
  const fixed=num("#waFixed")||0,sewer=(num("#waSewer")||0)/100;
  if(!validate(prev,curr,days,rate)){toast("Confira as leituras, dias e tarifa.");return}
  const cons=curr-prev, variable=cons*rate, sewerValue=variable*sewer, current=fixed+variable+sewerValue;
  const projectedCons=cons/days*monthDays(), projected=fixed+(projectedCons*rate)+(projectedCons*rate*sewer);
  db.water={prev,curr,days,rate,fixed,sewer,cons,current,projectedCons,projected,date:dateBR()};
  db.history.unshift({date:dateBR(),type:"Água",cons:`${cons.toFixed(2)} m³`,projected});
  save();showResult("#waterResult",`💧 Consumo: <b>${cons.toFixed(2)} m³</b><br>Acumulado estimado: <b>${money(current)}</b><br>Projeção do mês: <b>${money(projected)}</b><br>Projeção de consumo: <b>${projectedCons.toFixed(2)} m³</b>`);refresh();toast("Medição de água salva.");
};
$("#clearWater").onclick=()=>["#waPrev","#waCurr","#waDays","#waRate","#waFixed","#waSewer"].forEach(x=>$(x).value="");

$("#calcEnergy").onclick=()=>{
  const prev=num("#enPrev"),curr=num("#enCurr"),days=num("#enDays"),rate=num("#enRate");
  const extra=num("#enExtra")||0, publicFee=num("#enPublic")||0;
  if(!validate(prev,curr,days,rate)){toast("Confira as leituras, dias e tarifa.");return}
  const cons=curr-prev, base=cons*rate, current=base+extra+publicFee;
  const projectedCons=cons/days*monthDays(), projected=projectedCons*rate+extra+publicFee;
  db.energy={prev,curr,days,rate,extra,publicFee,cons,current,projectedCons,projected,date:dateBR()};
  db.history.unshift({date:dateBR(),type:"Energia",cons:`${cons.toFixed(2)} kWh`,projected});
  save();showResult("#energyResult",`⚡ Consumo: <b>${cons.toFixed(2)} kWh</b><br>Acumulado estimado: <b>${money(current)}</b><br>Projeção do mês: <b>${money(projected)}</b><br>Projeção de consumo: <b>${projectedCons.toFixed(2)} kWh</b>`);refresh();toast("Medição de energia salva.");
};
$("#clearEnergy").onclick=()=>["#enPrev","#enCurr","#enDays","#enRate","#enExtra","#enPublic"].forEach(x=>$(x).value="");

function showResult(id,html){$(id).innerHTML=html;$(id).classList.remove("hidden")}

function refresh(){
  const w=db.water,e=db.energy, wc=w?.projected||0,ec=e?.projected||0,total=wc+ec;
  $("#dWater").textContent=money(wc);$("#dEnergy").textContent=money(ec);$("#dTotal").textContent=money(total);
  $("#dWaterK").textContent=w?`${w.cons.toFixed(2)} m³`:"0 m³";$("#dEnergyK").textContent=e?`${e.cons.toFixed(2)} kWh`:"0 kWh";
  $("#dDay").textContent=`Dia ${dayNow()} de ${monthDays()}`;
  $("#pWater").textContent=money(wc);$("#pEnergy").textContent=money(ec);
  $("#pWaterText").textContent=w?`${w.projectedCons.toFixed(1)} m³ projetados`:"Sem dados";
  $("#pEnergyText").textContent=e?`${e.projectedCons.toFixed(1)} kWh projetados`:"Sem dados";
  const wg=Number(db.settings.waterGoal)||20,eg=Number(db.settings.energyGoal)||250;
  $("#barWater").style.width=w?`${Math.min(100,w.projectedCons/wg*100)}%`:"0%";
  $("#barEnergy").style.width=e?`${Math.min(100,e.projectedCons/eg*100)}%`:"0%";
  $("#waterStatus").textContent=w?`${(w.projectedCons/wg*100).toFixed(0)}% da meta de ${wg} m³`:"Sem medição";
  $("#energyStatus").textContent=e?`${(e.projectedCons/eg*100).toFixed(0)}% da meta de ${eg} kWh`:"Sem medição";
  $("#dTotalStatus").textContent=total?`Previsão atual para o mês.`:"Registre as duas leituras para acompanhar o total.";
  const alerts=[];
  if(w&&w.projectedCons>wg)alerts.push(`💧 Água acima da meta: ${w.projectedCons.toFixed(1)} m³.`);
  if(e&&e.projectedCons>eg)alerts.push(`⚡ Energia acima da meta: ${e.projectedCons.toFixed(0)} kWh.`);
  $("#smart").innerHTML=alerts.length?`<strong>⚠️ Atenção</strong><p>${alerts.join("<br>")}</p>`:`<strong>✅ Consumo dentro das metas</strong><p>Continue registrando as leituras para detectar mudanças rapidamente.</p>`;
  renderRecent();
}
function renderRecent(){
  const c=$("#recent"),h=db.history.slice(0,5);
  if(!h.length){c.innerHTML="📊<b>Nenhuma medição</b><small>Registre sua primeira leitura.</small>";return}
  c.innerHTML=h.map(x=>`<div class="tr"><span>${x.date}</span><span>${x.type==="Água"?"💧":"⚡"} ${x.type}</span><span>${x.cons}</span><b>${money(x.projected)}</b></div>`).join("");
}
function renderHistory(){
  const c=$("#history");
  if(!db.history.length){c.innerHTML=`<div class="empty">📊<b>Nenhum registro</b><small>Suas medições aparecerão aqui.</small></div>`;return}
  c.innerHTML=db.history.map(x=>`<div class="tr"><span>${x.date}</span><span>${x.type==="Água"?"💧":"⚡"} ${x.type}</span><span>${x.cons}</span><b>${money(x.projected)}</b></div>`).join("");
}
$("#clearHistory").onclick=()=>{if(confirm("Apagar todo o histórico?")){db.history=[];save();renderHistory();refresh();toast("Histórico apagado.")}};

function loadCfg(){
  const s=db.settings||{};
  $("#cfgName").value=s.name||"";$("#cfgPeople").value=s.people||"";$("#cfgWaterGoal").value=s.waterGoal||"";$("#cfgEnergyGoal").value=s.energyGoal||"";
  $("#cfgWaterCompany").value=s.waterCompany||"";$("#cfgEnergyCompany").value=s.energyCompany||"";
  $("#cfgEnergyClass").value=s.energyClass||"Residencial Normal";$("#cfgFlag").value=s.flag||"verde";
  $("#houseLabel").textContent=s.name||"Minha casa";
}
$("#saveCfg").onclick=()=>{
  db.settings={...db.settings,name:$("#cfgName").value||"Minha casa",people:Number($("#cfgPeople").value)||1,waterGoal:Number($("#cfgWaterGoal").value)||20,energyGoal:Number($("#cfgEnergyGoal").value)||250,waterCompany:$("#cfgWaterCompany").value,energyCompany:$("#cfgEnergyCompany").value,energyClass:$("#cfgEnergyClass").value,flag:$("#cfgFlag").value};
  save();loadCfg();refresh();toast("Configurações salvas.");
};
$("#month").textContent=new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
loadCfg();refresh();