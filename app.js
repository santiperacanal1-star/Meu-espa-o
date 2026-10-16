/* Meu Espaço — app pessoal. Modo local por defeito; Supabase opcional. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const today = new Date();
  const dateISO = (d = today) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const euro = n => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
  const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const initial = {workouts:[],events:[],studies:[],money:[],shopItems:[],budget:300};
  let data = loadLocal();
  let supabaseClient = null, user = null, cloudReady = false, busy = false;
  let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedCalendarDate = dateISO();
  const config = JSON.parse(localStorage.getItem("meu-espaco-supabase-config") || "null");

  function loadLocal() {
    try { return {...initial, ...JSON.parse(localStorage.getItem("meu-espaco-data") || "{}")}; }
    catch { return {...initial}; }
  }
  function saveLocal() { localStorage.setItem("meu-espaco-data", JSON.stringify(data)); }
  function setNotice(message) { const el=$("#notice"); el.textContent=message; el.hidden=false; clearTimeout(setNotice.timer); setNotice.timer=setTimeout(()=>el.hidden=true,6500); }
  function setSync(text, online=false) {
    $("#sync-status").innerHTML = `<span class="status-dot ${online?"online":""}"></span><span>${safe(text)}</span>`;
    $("#user-label").textContent = user ? user.email : "Guardado neste navegador";
  }
  function pageName(page) { return ({inicio:"O teu espaço",treinos:"Os meus treinos",calendario:"Calendário e tarefas",estudos:"Os meus estudos",dinheiro:"O meu dinheiro",loja:"A minha loja",assistente:"Assistente pessoal"})[page] || "Meu Espaço"; }
  function go(page) {
    $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
    $$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    $("#page-title").textContent=page==="inicio"?"O teu espaço 👋":pageName(page);
    $(".sidebar").classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function removeButton(table,id) { return `<button class="delete-button" data-delete="${table}" data-id="${safe(id)}" aria-label="Eliminar registo">×</button>`; }
  function renderList(el, items, empty, renderer) {
    el.innerHTML = items.length ? items.map(renderer).join("") : `<div class="empty-state">${empty}</div>`;
  }
  function renderCalendar() {
    const grid=$("#calendar-grid"); if(!grid) return;
    const year=calendarCursor.getFullYear(), month=calendarCursor.getMonth();
    $("#calendar-month-title").textContent=new Intl.DateTimeFormat("pt-PT",{month:"long",year:"numeric"}).format(calendarCursor).replace(/^./,c=>c.toLocaleUpperCase("pt-PT"));
    const first=new Date(year,month,1); const offset=(first.getDay()+6)%7; const start=new Date(year,month,1-offset);
    const items=[];
    for(let i=0;i<42;i++) { const d=new Date(start); d.setDate(start.getDate()+i); const iso=dateISO(d); const dayEvents=data.events.filter(e=>e.date===iso).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
      const chips=dayEvents.slice(0,3).map(e=>`<span class="calendar-event cat-${safe(String(e.category||"pessoal").toLocaleLowerCase("pt-PT"))}" title="${safe(e.title)}">${e.time?safe(e.time)+" ":""}${safe(e.title)}</span>`).join("");
      items.push(`<button type="button" class="calendar-day ${d.getMonth()!==month?"outside":""} ${iso===dateISO()?"is-today":""} ${iso===selectedCalendarDate?"selected":""}" data-calendar-date="${iso}" aria-label="${iso}, ${dayEvents.length} eventos"><span class="calendar-day-number">${d.getDate()}</span>${chips}${dayEvents.length>3?`<span class="calendar-more">+${dayEvents.length-3} mais</span>`:""}</button>`);
    }
    grid.innerHTML=items.join("");
  }
  function render() {
    const tasks=data.events.filter(e=>!e.done).length;
    $("#stat-tasks").textContent=tasks;
    $("#stat-events").textContent=data.events.filter(e=>e.date>=dateISO()).length;
    $("#stat-workouts").textContent=data.workouts.length;
    const income=data.money.filter(m=>m.type==="income").reduce((s,m)=>s+m.amount,0);
    const expenses=data.money.filter(m=>m.type==="expense").reduce((s,m)=>s+m.amount,0);
    $("#stat-balance").textContent=euro(income-expenses);
    const upcoming=[...data.events].filter(e=>e.date>=dateISO()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    renderList($("#home-tasks"),data.events.filter(e=>!e.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5),"Ainda não tens tarefas por concluir.",e=>`<div class="item"><input class="item-check" type="checkbox" data-toggle-event="${safe(e.id)}" aria-label="Concluir tarefa"><div class="item-main"><div class="item-title">${safe(e.title)}</div><div class="item-meta">${safe(e.date)} · ${safe(e.category)}</div></div></div>`);
    renderList($("#home-events"),upcoming.slice(0,5),"Os teus próximos eventos aparecem aqui.",e=>`<div class="item"><div class="item-main"><div class="item-title">${safe(e.title)}</div><div class="item-meta">${safe(e.date)}${e.time?" · "+safe(e.time):""} · ${safe(e.category)}</div></div><span class="count-pill">${e.done?"Feito":"Próximo"}</span></div>`);
    $("#workout-count").textContent=data.workouts.length;
    renderList($("#workout-list"),[...data.workouts].sort((a,b)=>b.date.localeCompare(a.date)),"Ainda não tens treinos registados.",w=>`<div class="item"><div class="item-main"><div class="item-title">${safe(w.name)}</div><div class="item-meta">${safe(w.date)}${w.duration?` · ${safe(w.duration)} min`:""}${w.details?`<br>${safe(w.details)}`:""}</div></div>${removeButton("workouts",w.id)}</div>`);
    const ef=$("#event-filter").value;
    const evs=[...data.events].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).filter(e=>ef==="all"||(ef==="open"&&!e.done)||(ef==="done"&&e.done));
    renderList($("#event-list"),evs,"Não há eventos nesta lista.",e=>`<div class="item"><input class="item-check" type="checkbox" data-toggle-event="${safe(e.id)}" ${e.done?"checked":""} aria-label="Marcar como concluído"><div class="item-main"><div class="item-title ${e.done?"done":""}">${safe(e.title)}</div><div class="item-meta">${safe(e.date)}${e.time?" · "+safe(e.time):""} · ${safe(e.category)}${e.notes?`<br>${safe(e.notes)}`:""}</div></div>${removeButton("events",e.id)}</div>`);
    const mins=data.studies.reduce((s,x)=>s+x.minutes,0);
    $("#study-total").textContent=mins>=60?`${Math.floor(mins/60)} h ${mins%60} min`:`${mins} min`;
    $("#study-subjects").textContent=new Set(data.studies.map(s=>s.subject.toLocaleLowerCase("pt-PT"))).size;
    renderList($("#study-list"),[...data.studies].sort((a,b)=>b.date.localeCompare(a.date)),"Ainda não tens sessões registadas.",s=>`<div class="item"><div class="item-main"><div class="item-title">${safe(s.subject)} · ${safe(s.minutes)} min</div><div class="item-meta">${safe(s.date)}${s.notes?`<br>${safe(s.notes)}`:""}</div></div>${removeButton("studies",s.id)}</div>`);
    $("#money-income").textContent=euro(income); $("#money-expenses").textContent=euro(expenses); $("#money-balance").textContent=euro(income-expenses);
    const remaining=Number(data.budget)-expenses;
    $("#money-remaining").textContent=euro(remaining);
    $("#budget-form").elements.budget.value=data.budget;
    const percent=Number(data.budget)>0?Math.min(100,expenses/Number(data.budget)*100):0;
    $("#budget-bar").style.width=`${percent}%`; $("#budget-bar").style.background=remaining<0?"#c64b4b":"";
    $("#budget-caption").textContent=remaining<0?`Ultrapassaste o orçamento em ${euro(-remaining)}.`:`Gastaste ${percent.toFixed(0)}% do orçamento. Restam ${euro(remaining)}.`;
    renderList($("#money-list"),[...data.money].sort((a,b)=>b.date.localeCompare(a.date)),"Ainda não tens movimentos registados.",m=>`<div class="item"><div class="item-main"><div class="item-title">${safe(m.description)}</div><div class="item-meta">${safe(m.date)} · ${m.type==="income"?"Receita":"Despesa"}</div></div><span class="item-amount" style="color:${m.type==="income"?"#327653":"#bd607a"}">${m.type==="income"?"+":"−"}${euro(m.amount)}</span>${removeButton("money",m.id)}</div>`);
    renderList($("#shop-list"),[...(data.shopItems||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),"Ainda não guardaste produtos.",p=>`<div class="item shop-item"><div class="item-main"><div class="item-title">${safe(p.name)}</div><div class="item-meta">${safe(p.category)}${p.notes?" · "+safe(p.notes):""}</div>${p.url?`<a href="${safe(p.url)}" target="_blank" rel="noopener noreferrer">Abrir produto na loja ↗</a>`:`<span class="muted small">Sem link de produto</span>`}</div><strong>${euro(p.price)}</strong><button class="button button-quiet" type="button" data-buy="${safe(p.id)}">Registar compra</button>${removeButton("shopItems",p.id)}</div>`);
    const shopTotal=(data.shopItems||[]).reduce((sum,p)=>sum+(Number(p.price)||0),0);
    $("#shop-budget").textContent=euro(data.budget); $("#shop-total").textContent=euro(shopTotal); $("#shop-count").textContent=`${(data.shopItems||[]).length} produto(s) guardado(s)`; $("#shop-remaining").textContent=euro(Number(data.budget)-expenses-shopTotal);
    renderCalendar();
  }
  async function persist() {
    saveLocal(); render();
    if(cloudReady && user && !busy) {
      busy=true;
      try {
        const payload={user_id:user.id,data,updated_at:new Date().toISOString()};
        const {error}=await supabaseClient.from("user_data").upsert(payload,{onConflict:"user_id"});
        if(error) throw error;
        setSync("Sincronizado na nuvem",true);
      } catch(e) { console.error(e); setSync("Erro de sincronização"); setNotice("Os dados ficaram guardados neste navegador, mas não foi possível sincronizá-los. Verifica a configuração do Supabase."); }
      finally { busy=false; }
    }
  }
  async function connect(url,key) {
    if(!window.supabase || !url || !key) throw new Error("Indica a URL e a chave pública do teu projeto Supabase.");
    supabaseClient=window.supabase.createClient(url,key);
    cloudReady=true;
    const {data:sessionData,error}=await supabaseClient.auth.getSession();
    if(error) throw error;
    user=sessionData.session?.user||null;
    if(user) await loadCloud();
    setSync(user?"Ligado à nuvem":"Nuvem configurada — inicia sessão",!!user);
    supabaseClient.auth.onAuthStateChange((_event,session)=> {
      user=session?.user||null;
      setSync(user?"Ligado à nuvem":"Nuvem configurada — inicia sessão",!!user);
      if(user) setTimeout(()=>loadCloud().catch(console.error),0);
    });
  }
  async function loadCloud() {
    if(!user || !supabaseClient) return;
    const {data:row,error}=await supabaseClient.from("user_data").select("data").eq("user_id",user.id).maybeSingle();
    if(error) throw error;
    if(row?.data && typeof row.data==="object") { data={...initial,...row.data}; saveLocal(); render(); }
    else await persist();
    setSync("Sincronizado na nuvem",true);
  }
  function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
  $("#navigation").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)go(b.dataset.page)});
  document.addEventListener("click",e=>{
    const catalogButton=e.target.closest("[data-catalog-add]");
    if(catalogButton) {
      const name=catalogButton.dataset.catalogAdd;
      const price=Number(catalogButton.dataset.catalogPrice);
      const category=catalogButton.dataset.catalogCategory || "Geral";
      const url=catalogButton.dataset.catalogUrl || "";
      data.shopItems=data.shopItems||[];
      data.shopItems.push({id:crypto.randomUUID(),name,price,category,url,notes:"Produto sugerido; confirma o preço na loja.",createdAt:new Date().toISOString()});
      persist();
      setNotice(`“${name}” foi adicionado à tua lista. Confirma o preço real na loja antes de comprar.`);
    }
    const goButton=e.target.closest("[data-go]"); if(goButton) go(goButton.dataset.go);
    const del=e.target.closest("[data-delete]");
    if(del && confirm("Queres mesmo eliminar este registo?")) {
      const table=del.dataset.delete,id=del.dataset.id;
      if(Array.isArray(data[table])) data[table]=data[table].filter(x=>String(x.id)!==id);
      persist();
    }
  });
  document.addEventListener("change",e=>{
    if(e.target.matches("[data-toggle-event]")) {
      const id=e.target.dataset.toggleEvent;
      const ev=data.events.find(x=>String(x.id)===id);
      if(ev){ev.done=e.target.checked;persist();}
    }
  });
  $("#calendar-prev").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();});
  $("#calendar-next").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();});
  $("#calendar-today").addEventListener("click",()=>{calendarCursor=new Date();selectedCalendarDate=dateISO();renderCalendar();});
  $("#calendar-grid").addEventListener("click",e=>{const day=e.target.closest("[data-calendar-date]");if(!day)return;selectedCalendarDate=day.dataset.calendarDate;calendarCursor=new Date(selectedCalendarDate+"T12:00:00");const form=$("#event-form");form.elements.date.value=selectedCalendarDate;form.elements.title.focus();renderCalendar();setNotice("Dia selecionado. Preenche o título para adicionar um evento.");});
  $("#mobile-menu").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
  $("#event-filter").addEventListener("change",render);
  $("#workout-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    const workoutId=crypto.randomUUID(); data.workouts.push({id:workoutId,name:f.name.trim(),date:f.date,details:f.details.trim(),duration:Number(f.duration)||0});
    data.events.push({id:crypto.randomUUID(),title:f.name.trim(),date:f.date,time:"",category:"Treinos",notes:f.details.trim(),done:false,source:"workout",sourceId:workoutId});
    e.currentTarget.reset(); e.currentTarget.elements.date.value=dateISO(); persist(); setNotice("Treino guardado.");
  });
  $("#event-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    data.events.push({id:crypto.randomUUID(),title:f.title.trim(),date:f.date,time:f.time,category:f.category,notes:f.notes.trim(),done:false});
    e.currentTarget.reset(); e.currentTarget.elements.date.value=dateISO(); persist(); setNotice("Evento adicionado ao calendário.");
  });
  $("#study-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    const studyId=crypto.randomUUID(); data.studies.push({id:studyId,subject:f.subject.trim(),date:f.date,minutes:Number(f.minutes),notes:f.notes.trim()});
    data.events.push({id:crypto.randomUUID(),title:"Estudar: "+f.subject.trim(),date:f.date,time:"",category:"Estudos",notes:(f.minutes?f.minutes+" minutos. ":"")+f.notes.trim(),done:false,source:"study",sourceId:studyId});
    e.currentTarget.reset(); e.currentTarget.elements.date.value=dateISO(); e.currentTarget.elements.minutes.value=30; persist(); setNotice("Sessão de estudo guardada.");
  });
  $("#money-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    data.money.push({id:crypto.randomUUID(),type:f.type,description:f.description.trim(),amount:Number(f.amount),date:f.date});
    e.currentTarget.reset(); e.currentTarget.elements.date.value=dateISO(); persist(); setNotice("Movimento financeiro guardado.");
  });
  $("#budget-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget); data.budget=Number(f.budget)||0; persist(); setNotice("Orçamento guardado.");
  });
  $("#shop-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget); const raw=(f.url||"").trim();
    if(raw && !/^https?:\/\//i.test(raw)){setNotice("O link deve começar por https:// ou http://.");return;}
    data.shopItems=data.shopItems||[]; data.shopItems.push({id:crypto.randomUUID(),name:f.name.trim(),price:Number(f.price),category:f.category,url:raw,notes:(f.notes||"").trim(),createdAt:new Date().toISOString()});
    e.currentTarget.reset(); persist(); setNotice("Produto guardado na lista. Ainda não foi registada nenhuma despesa.");
  });
  $("#shop-search-form").addEventListener("submit",e=>{
    e.preventDefault(); const q=e.currentTarget.elements.query.value.trim(); if(!q)return;
    const encoded=encodeURIComponent(q); window.open(`https://www.google.com/search?tbm=shop&q=${encoded}`,"_blank","noopener,noreferrer");
  });
  document.addEventListener("click",e=>{
    const buy=e.target.closest("[data-buy]"); if(!buy)return;
    const item=(data.shopItems||[]).find(p=>p.id===buy.dataset.buy); if(!item)return;
    if(!confirm(`Confirmas que compraste “${item.name}” por ${euro(item.price)}? Isto vai registar uma despesa e retirar o produto da lista.`))return;
    data.money.push({id:crypto.randomUUID(),type:"expense",description:`Compra: ${item.name}`,amount:Number(item.price),date:dateISO()});
    data.shopItems=data.shopItems.filter(p=>p.id!==item.id); persist(); setNotice("Compra registada nas despesas. Confirma o valor e a data em Dinheiro.");
  });
  $("#account-button").addEventListener("click",()=>$("#account-dialog").showModal());
  $("#config-form").addEventListener("submit",async e=>{
    e.preventDefault();const f=formData(e.currentTarget),msg=$("#account-message");
    try {
      await connect(f.url.trim(),f.key.trim());
      localStorage.setItem("meu-espaco-supabase-config",JSON.stringify({url:f.url.trim(),key:f.key.trim()}));
      msg.textContent=user?"Ligação estabelecida. Os dados serão sincronizados.":"Projeto ligado. Clica em «Entrar / criar conta» para autenticar.";
      setNotice("Configuração da nuvem concluída.");
    } catch(err){msg.textContent=err.message||"Não foi possível ligar ao Supabase.";setSync("Modo local");}
  });
  $("#sign-in").addEventListener("click",async()=>{
    const msg=$("#account-message");
    if(!supabaseClient){msg.textContent="Primeiro, introduz a URL e a chave pública do Supabase e carrega em «Ligar à nuvem».";return;}
    const email=prompt("Introduz o teu endereço de e-mail para entrar ou criar uma conta:");
    if(!email)return;
    const password=prompt("Escolhe ou introduz a palavra-passe da tua conta:");
    if(!password)return;
    try {
      const {data:authData,error}=await supabaseClient.auth.signInWithPassword({email,password});
      if(error && /invalid login credentials/i.test(error.message)) {
        const create=confirm("Não foi possível iniciar sessão. Queres tentar criar uma conta com este e-mail?");
        if(!create)return;
        const result=await supabaseClient.auth.signUp({email,password});
        if(result.error)throw result.error;
        msg.textContent=result.data.session?"Conta criada e sessão iniciada.":"Conta criada. Verifica o teu e-mail para confirmar a conta e depois inicia sessão.";
      } else if(error) throw error;
      else {user=authData.user;await loadCloud();msg.textContent="Sessão iniciada.";}
    } catch(err){msg.textContent=err.message||"Erro de autenticação.";}
  });
  $("#sign-out").addEventListener("click",async()=>{
    if(!supabaseClient){$("#account-message").textContent="A nuvem ainda não está configurada.";return;}
    const {error}=await supabaseClient.auth.signOut();
    $("#account-message").textContent=error?error.message:"Sessão terminada.";
    user=null;setSync("Modo local");
  });
  // Assistente local: regras determinísticas, sem chamadas externas nem custos de API.
  const chat = $("#assistant-chat");
  function chatMessage(text, who="bot") {
    const el=document.createElement("div"); el.className="assistant-message "+(who==="user"?"assistant-user":"assistant-bot"); el.textContent=text; chat.appendChild(el); chat.scrollTop=chat.scrollHeight;
  }
  function dateForRequest(text) {
    const t=text.toLocaleLowerCase("pt-PT"); const d=new Date();
    if(t.includes("amanhã")||t.includes("amanha")) d.setDate(d.getDate()+1);
    else if(t.includes("depois de amanhã")||t.includes("depois de amanha")) d.setDate(d.getDate()+2);
    else {
      const days={domingo:0,segunda:1,"segunda-feira":1,terça:2,"terça-feira":2,quarta:3,"quarta-feira":3,quinta:4,"quinta-feira":4,sexta:5,"sexta-feira":5,sábado:6,sabado:6};
      const key=Object.keys(days).sort((a,b)=>b.length-a.length).find(k=>t.includes(k));
      if(key){let delta=(days[key]-d.getDay()+7)%7;if(delta===0)delta=7;d.setDate(d.getDate()+delta);}
    }
    return dateISO(d);
  }
  function localAssistant(raw) {
    const t=raw.toLocaleLowerCase("pt-PT");
    if(/resumo|os meus dados|como estou|visão geral/.test(t)) {
      const open=data.events.filter(e=>!e.done).length, upcoming=data.events.filter(e=>e.date>=dateISO()).length;
      const income=data.money.filter(m=>m.type==="income").reduce((s,m)=>s+m.amount,0), expenses=data.money.filter(m=>m.type==="expense").reduce((s,m)=>s+m.amount,0);
      return `Aqui está o teu resumo: ${data.workouts.length} treinos registados; ${data.studies.length} sessões de estudo (${data.studies.reduce((s,x)=>s+(Number(x.minutes)||0),0)} minutos); ${open} eventos/tarefas por concluir e ${upcoming} eventos futuros. Saldo registado: ${euro(income-expenses)}.`;
    }
    if(/orçamento|orcamento|despesas|gastei|dinheiro/.test(t)) {
      const expenses=data.money.filter(m=>m.type==="expense").reduce((s,m)=>s+m.amount,0), income=data.money.filter(m=>m.type==="income").reduce((s,m)=>s+m.amount,0);
      return `Nos movimentos registados, tens ${euro(income)} em receitas e ${euro(expenses)} em despesas. O saldo é ${euro(income-expenses)}. O orçamento definido é ${euro(data.budget)}; considerando todas as despesas registadas, restam ${euro(Number(data.budget)-expenses)}.`;
    }
    if(/semana|organizar|planear|planejar/.test(t)) {
      const start=dateISO(), endDate=new Date(); endDate.setDate(endDate.getDate()+7); const end=dateISO(endDate);
      const upcoming=data.events.filter(e=>e.date>=start&&e.date<=end).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")));
      const lines=upcoming.slice(0,8).map(e=>`${e.date}${e.time?" às "+e.time:""}: ${e.title} (${e.category})`);
      return lines.length?`Nos próximos 7 dias já tens:\n• ${lines.join("\n• ")}\n\nSugestão: distribui sessões de estudo curtas entre os compromissos e deixa algum tempo livre para imprevistos.`:"Ainda não tens eventos nos próximos 7 dias. Podes adicionar treinos, estudo ou tarefas no Calendário. Sugiro começar por escolher 2–3 prioridades para a semana.";
    }
    if(/marca|marcar|adiciona|adicionar|agenda|agendar|cria evento|criar evento|mete no calendário|mete no calendario/.test(t)) {
      const match=t.match(/(?:às|as|para as|para às)\s*(\d{1,2})(?::(\d{2}))?\s*h?/); const time=match?String(match[1]).padStart(2,"0")+":"+(match[2]||"00"):"";
      let title=raw.replace(/^(por favor[, ]*)?/i,"").replace(/\b(marca|marcar|adiciona|adicionar|agenda|agendar|cria evento|criar evento|mete no calendário|mete no calendario)\b/i,"").replace(/\b(amanhã|amanha|hoje|segunda(-feira)?|terça(-feira)?|quarta(-feira)?|quinta(-feira)?|sexta(-feira)?|sábado|sabado|domingo)\b/i,"").replace(/\b(?:às|as|para as|para às)\s*\d{1,2}(?::\d{2})?\s*h?\b/i,"").replace(/\b(no|na|para o|para a)\s*(calendário|calendario)\b/i,"").trim();
      title=title.replace(/^[\s:,-]+|[\s:,-]+$/g,"")||"Novo evento";
      let category=/treino|ginásio|ginasio|exercício|exercicio/.test(t)?"Treinos":/estud|teste|exame|matéria|materia/.test(t)?"Estudos":/despesa|pagar|orçamento|orcamento/.test(t)?"Dinheiro":"Tarefas";
      const pending=$("#assistant-pending"); pending.hidden=false; pending.replaceChildren();
      const summary=document.createElement("p"); summary.textContent=`Proposta: “${title}” · ${dateForRequest(t)}${time?" às "+time:""} · ${category}. Confirma para adicionar ao calendário.`; pending.appendChild(summary);
      const btn=document.createElement("button"); btn.type="button";btn.className="button button-primary";btn.textContent="Confirmar e adicionar";
      btn.addEventListener("click",()=>{data.events.push({id:crypto.randomUUID(),title,date:dateForRequest(t),time,category,notes:"Criado pelo assistente local",done:false});persist();pending.hidden=true;chatMessage(`Evento “${title}” adicionado ao calendário para ${dateForRequest(t)}${time?" às "+time:""}.`);}); pending.appendChild(btn);
      return "Preparei uma proposta de evento. Revê os detalhes e confirma antes de guardar.";
    }
    if(/treino|treinos/.test(t)) return `Tens ${data.workouts.length} treinos registados. Podes adicionar um treino na área Treinos; ele também aparece no calendário. Para agendar um novo, escreve por exemplo: “marca treino de pernas amanhã às 18h”.`;
    if(/estud|estudo/.test(t)) return `Tens ${data.studies.length} sessões de estudo registadas, num total de ${data.studies.reduce((s,x)=>s+(Number(x.minutes)||0),0)} minutos. Regista uma sessão na área Estudos e ela será ligada ao calendário.`;
    return "Posso ajudar com um resumo dos teus dados, o orçamento, a organização da semana ou preparar eventos para o calendário. Experimenta: “marca treino amanhã às 18h”. Sou um assistente local baseado em regras, por isso posso não interpretar todos os pedidos. Confirma sempre a data e os detalhes antes de guardar.";
  }
  function sendAssistant(text) { const value=text.trim(); if(!value)return; chatMessage(value,"user"); const reply=localAssistant(value); chatMessage(reply); }
  $("#assistant-form").addEventListener("submit",e=>{e.preventDefault();const input=$("#assistant-input");sendAssistant(input.value);input.value="";});
  document.addEventListener("click",e=>{const b=e.target.closest("[data-assistant-prompt]");if(b)sendAssistant(b.dataset.assistantPrompt);});

  $("#today-label").textContent=today.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}).toLocaleUpperCase("pt-PT");
  ["workout-form","event-form","study-form","money-form"].forEach(id=>{const el=$("#"+id);if(el.elements.date)el.elements.date.value=dateISO();});

  render();
  if(config?.url && config?.key) connect(config.url,config.key).then(()=>{if(user)setSync("Sincronizado na nuvem",true)}).catch(err=>{console.error(err);setSync("Modo local");setNotice("Não foi possível ligar à nuvem. Podes continuar a usar o modo local.");});
  else setSync("Modo local");
})();
