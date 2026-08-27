const state = { data: null, selected: null, sourceLoaded: false };
const $ = id => document.getElementById(id);

const PUBLISH_URL_KEY = "toramame_publish_worker_url";
const ADMIN_KEY_SESSION = "toramame_admin_key";
const ADMIN_AUTH_TIME_SESSION = "toramame_admin_auth_time";
const ADMIN_AUTH_TTL = 30 * 60 * 1000;



function clearAdminSession(){
  sessionStorage.removeItem(ADMIN_KEY_SESSION);
  sessionStorage.removeItem(ADMIN_AUTH_TIME_SESSION);
}

function adminSessionFresh(){
  const t=Number(sessionStorage.getItem(ADMIN_AUTH_TIME_SESSION)||0);
  return !!t && (Date.now()-t)<ADMIN_AUTH_TTL;
}

async function requireAdminLogin(){
  document.body.style.visibility="hidden";
  const publishUrl=getPublishUrl();

  if(!publishUrl){
    document.body.style.visibility="visible";
    alert("公開設定がありません。右上の「公開設定」にCloudflare Worker URLを入力してください。");
    return;
  }

  let key=adminSessionFresh() ? (sessionStorage.getItem(ADMIN_KEY_SESSION)||"") : "";
  if(!adminSessionFresh()) clearAdminSession();

  while(true){
    if(!key){
      key=prompt("管理画面のパスワードを入力してください。")||"";
      if(!key){
        location.href="/toramame-mond-archive/";
        return false;
      }
    }

    try{
      const res=await fetch(publishUrl+"/auth",{
        method:"POST",
        headers:{"Content-Type":"application/json","X-Admin-Key":key},
        body:"{}"
      });

      if(res.ok){
        sessionStorage.setItem(ADMIN_KEY_SESSION,key);
        sessionStorage.setItem(ADMIN_AUTH_TIME_SESSION,String(Date.now()));
        document.body.style.visibility="visible";
        return true;
      }

      clearAdminSession();
      key="";
      alert("パスワードが違います。");
    }catch(err){
      document.body.style.visibility="visible";
      alert("認証サーバーに接続できません。");
      return false;
    }
  }
}


function nowIso(){
  return new Date().toISOString();
}

function touchTopic(topic, kind="updated"){
  if(!topic) return;
  topic.updatedAt = nowIso();
  topic.lastUpdateKind = kind;
}


function uid(prefix="id"){
  return prefix + "-" + Math.random().toString(36).slice(2,9);
}

function text(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function loadData(data){
  if(!data || !Array.isArray(data.topics)) throw new Error("data.jsonの形式が違います。");
  state.data = data;
  state.sourceLoaded = true;
  state.selected = data.topics[0]?.id || null;
  renderSiteSettings();
  renderTopics();
  renderEditor();
}


function ensureSite(){
  state.data.site ||= {};
  return state.data.site;
}

function renderSiteSettings(){
  if(!state.data)return;
  const s=ensureSite();
  $("siteTitle").value=s.title||"とらまめMondまとめ";
  $("siteSubtitle").value=s.subtitle||"";
  $("siteNotice").value=s.notice||"";
}

$("saveSiteBtn").onclick=()=>{
  if(!state.sourceLoaded){alert("現在のdata.jsonを読み込めていません。");return;}
  const s=ensureSite();
  s.title=$("siteTitle").value.trim();
  s.subtitle=$("siteSubtitle").value.trim();
  s.notice=$("siteNotice").value.trim();
  alert("サイト基本情報を保存しました。右上の「公開する」で公開サイトへ反映できます。");
};



function moveTopic(id,delta){
  if(!state.data?.topics)return;
  const index=state.data.topics.findIndex(t=>t.id===id);
  if(index<0)return;
  const next=index+delta;
  if(next<0 || next>=state.data.topics.length)return;

  const [topic]=state.data.topics.splice(index,1);
  state.data.topics.splice(next,0,topic);

  renderTopics();
  renderEditor();
}

function renderTopics(){
  const box=$("topicList"); box.innerHTML="";
  for(const t of (state.data?.topics||[])){
    const b=document.createElement("button");
    b.className="topic-item"+(t.id===state.selected?" active":"");
    const row=document.createElement("div");
    row.className="topic-row";

    b.innerHTML=`<strong>${text(t.title)}</strong><span>${text(t.category||"カテゴリ未設定")}</span>`;
    b.onclick=()=>{state.selected=t.id;renderTopics();renderEditor();};

    const controls=document.createElement("div");
    controls.className="topic-order-controls";

    const up=document.createElement("button");
    up.type="button";
    up.className="topic-order-btn";
    up.textContent="↑";
    up.title="上へ";
    up.disabled=(state.data.topics[0]===t);
    up.onclick=e=>{e.stopPropagation();moveTopic(t.id,-1);};

    const down=document.createElement("button");
    down.type="button";
    down.className="topic-order-btn";
    down.textContent="↓";
    down.title="下へ";
    down.disabled=(state.data.topics[state.data.topics.length-1]===t);
    down.onclick=e=>{e.stopPropagation();moveTopic(t.id,1);};

    controls.append(up,down);
    row.append(b,controls);
    box.appendChild(row);
  }
}

function renderEditor(){
  const t=(state.data?.topics||[]).find(x=>x.id===state.selected);
  $("emptyState").hidden=!!t; $("topicEditor").hidden=!t;
  if(!t)return;
  $("editorTitle").textContent=t.title;
  $("topicTitle").value=t.title||"";
  $("topicCategory").value=t.category||"";
  $("topicDescription").value=t.description||"";
  $("topicFeatured").checked=!!t.featured;
  renderTree(t);
}

function renderTree(t){
  const box=$("treeEditor");box.innerHTML="";
  const roots=(t.nodes||[]).filter(n=>n.type==="root");
  if(!roots.length){box.innerHTML='<p class="empty-children">まだ質問がありません。</p>';return;}
  roots.forEach(n=>drawNode(box,t,n,"root"));
}

function drawNode(parent,t,node,kind){
  const el=document.createElement("div");
  el.className=`node-editor ${kind}`;
  el.innerHTML=$("nodeTemplate").innerHTML;
  el.querySelector(".node-kind").textContent=kind==="root"?"ROOT QUESTION":"RELATED QUESTION";
  el.querySelector(".node-question").value=node.question||"";
  el.querySelector(".node-answer").value=node.answer||"";
  el.querySelector(".node-mond").value=node.mond||"";
  el.querySelector(".node-x").value=node.x||"";

  const save=()=>{
    node.question=el.querySelector(".node-question").value;
    node.answer=el.querySelector(".node-answer").value;
    node.mond=el.querySelector(".node-mond").value;
    node.x=el.querySelector(".node-x").value;
  };
  el.querySelectorAll("input,textarea").forEach(x=>x.addEventListener("input",save));

  el.querySelector(".delete-node").onclick=()=>{
    if(!confirm("この質問と、その下の関連質問を削除しますか？"))return;
    removeNode(t,node.id);touchTopic(t,"updated");renderTree(t);
  };
  el.querySelector(".add-child").onclick=()=>{
    save();
    const child={id:uid("q"),type:"child",question:"",answer:"",mond:"",x:"",children:[]};
    (node.children ||= []).push(child.id);
    t.nodes.push(child);
    touchTopic(t,"related");
    renderTree(t);
  };

  parent.appendChild(el);
  const children=el.querySelector(".children-editor");
  const ids=node.children||[];
  if(!ids.length) children.innerHTML='<div class="empty-children">関連質問なし</div>';
  for(const id of ids){
    const child=t.nodes.find(n=>n.id===id);
    if(child)drawNode(children,t,child,"child");
  }
}

function removeNode(t,id){
  const target=t.nodes.find(n=>n.id===id); if(!target)return;
  const removeIds=new Set([id]);
  function collect(n){for(const cid of (n.children||[])){removeIds.add(cid);const c=t.nodes.find(x=>x.id===cid);if(c)collect(c);}}
  collect(target);
  t.nodes=t.nodes.filter(n=>!removeIds.has(n.id));
  for(const n of t.nodes)n.children=(n.children||[]).filter(cid=>!removeIds.has(cid));
}

$("saveTopicBtn").onclick=()=>{
  const t=state.data.topics.find(x=>x.id===state.selected); if(!t)return;
  t.title=$("topicTitle").value.trim();
  t.category=$("topicCategory").value.trim();
  t.description=$("topicDescription").value.trim();
  t.featured=$("topicFeatured").checked;
  touchTopic(t,"updated");
  renderTopics(); renderEditor();
  alert("保存しました。");
};

$("addRootBtn").onclick=()=>{
  const t=state.data.topics.find(x=>x.id===state.selected); if(!t)return;
  const n={id:uid("q"),type:"root",question:"",answer:"",mond:"",x:"",children:[]};
  (t.nodes ||= []).push(n); touchTopic(t,"question"); renderTree(t);
};

$("newTopicBtn").onclick=()=>{
  if(!state.sourceLoaded){alert("現在のdata.jsonを読み込めていません。");return;}
  const t={id:uid("topic"),category:"",title:"新しい話題",description:"",featured:false,createdAt:nowIso(),updatedAt:nowIso(),lastUpdateKind:"created",nodes:[]};
  state.data.topics.push(t);state.selected=t.id;renderTopics();renderEditor();$("topicTitle").focus();
};

$("deleteTopicBtn").onclick=()=>{
  if(!state.selected)return;
  const t=state.data.topics.find(x=>x.id===state.selected);
  if(!confirm(`「${t.title}」を削除しますか？`))return;
  state.data.topics=state.data.topics.filter(x=>x.id!==state.selected);
  state.selected=state.data.topics[0]?.id||null;renderTopics();renderEditor();
};

$("downloadBtn").onclick=()=>{
  if(!state.sourceLoaded){alert("現在のdata.jsonを読み込めていません。");return;}
  const blob=new Blob([JSON.stringify(state.data,null,2)+"\n"],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="data.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
};

function getPublishUrl(){return (localStorage.getItem(PUBLISH_URL_KEY)||"").trim().replace(/\/+$/,"");}
function updatePublishStatus(message=""){
  const el=$("publishStatus"); if(!el)return;
  el.textContent=message || (getPublishUrl()?"公開先：設定済み":"公開先：未設定");
}
$("publishSettingsBtn").onclick=()=>{
  const value=prompt("Cloudflare Worker のURLを入力してください。",getPublishUrl());
  if(value===null)return;
  const cleaned=value.trim().replace(/\/+$/,"");
  if(!/^https:\/\/.+/.test(cleaned)){alert("https:// から始まるURLを入力してください。");return;}
  localStorage.setItem(PUBLISH_URL_KEY,cleaned);updatePublishStatus();alert("公開先URLを保存しました。");
};
$("publishBtn").onclick=async()=>{
  if(!state.sourceLoaded){alert("現在のdata.jsonを読み込めていません。");return;}
  const publishUrl=getPublishUrl(); if(!publishUrl){$("publishSettingsBtn").click();return;}
  let adminKey=sessionStorage.getItem(ADMIN_KEY_SESSION)||"";
  if(!adminKey){adminKey=prompt("公開用パスワードを入力してください。")||"";if(!adminKey)return;sessionStorage.setItem(ADMIN_KEY_SESSION,adminKey);}
  if(!confirm("現在の内容を公開しますか？"))return;
  const btn=$("publishBtn"), old=btn.textContent;btn.disabled=true;btn.textContent="公開中…";updatePublishStatus("公開中…");
  try{
    const res=await fetch(publishUrl+"/publish",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Key":adminKey},body:JSON.stringify({data:state.data})});
    const result=await res.json().catch(()=>({}));
    if(res.status===401||res.status===403){clearAdminSession();throw new Error("公開用パスワードが違います。");}
    if(!res.ok)throw new Error(result.error||`公開に失敗しました (${res.status})`);
    sessionStorage.setItem(ADMIN_AUTH_TIME_SESSION,String(Date.now()));updatePublishStatus("公開完了");alert("公開しました。");
  }catch(err){updatePublishStatus("公開失敗");alert(err.message);}
  finally{btn.disabled=false;btn.textContent=old;}
};

updatePublishStatus();

(async()=>{
  const ok=await requireAdminLogin();
  if(!ok)return;

  fetch("/toramame-mond-archive/data.json?v="+Date.now(), {cache:"no-store"})
    .then(r=>{if(!r.ok)throw new Error("data.json "+r.status);return r.json();})
    .then(loadData)
    .catch(err=>{
      console.error(err);
      state.data={site:{title:"とらまめMondまとめ",subtitle:"",notice:""},topics:[]};
      state.selected=null;state.sourceLoaded=false;renderTopics();renderEditor();
      alert("現在のdata.jsonを読み込めませんでした。");
    });
})();
