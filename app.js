/* Meu Espaço — app pessoal. Modo local por defeito; Supabase opcional. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const today = new Date();
  const dateISO = (d = today) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const euro = n => new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
  const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const initial = {workouts:[],events:[],studies:[],money:[],budget:300};
  let data = loadLocal();
  let supabaseClient = null, user = null, cloudReady = false, busy = false;
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
  function pageName(page) { return ({inicio:"O teu espaço",treinos:"Os meus treinos",calendario:"Calendário e tarefas",estudos:"Os meus estudos",dinheiro:"O meu dinheiro"})[page] || "Meu Espaço"; }
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
  $("#mobile-menu").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
  $("#event-filter").addEventListener("change",render);
  $("#workout-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    data.workouts.push({id:crypto.randomUUID(),name:f.name.trim(),date:f.date,details:f.details.trim(),duration:Number(f.duration)||0});
    e.currentTarget.reset(); e.currentTarget.elements.date.value=dateISO(); persist(); setNotice("Treino guardado.");
  });
  $("#event-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    data.events.push({id:crypto.randomUUID(),title:f.title.trim(),date:f.date,time:f.time,category:f.category,notes:f.notes.trim(),done:false});
    e.currentTarget.reset(); e.currentTarget.elements.date.value=dateISO(); persist(); setNotice("Evento adicionado ao calendário.");
  });
  $("#study-form").addEventListener("submit",e=>{
    e.preventDefault(); const f=formData(e.currentTarget);
    data.studies.push({id:crypto.randomUUID(),subject:f.subject.trim(),date:f.date,minutes:Number(f.minutes),notes:f.notes.trim()});
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
  $("#today-label").textContent=today.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}).toLocaleUpperCase("pt-PT");
  ["workout-form","event-form","study-form","money-form"].forEach(id=>{const el=$("#"+id);if(el.elements.date)el.elements.date.value=dateISO();});
  render();
  if(config?.url && config?.key) connect(config.url,config.key).then(()=>{if(user)setSync("Sincronizado na nuvem",true)}).catch(err=>{console.error(err);setSync("Modo local");setNotice("Não foi possível ligar à nuvem. Podes continuar a usar o modo local.");});
  else setSync("Modo local");
})();
