const state = { data: null, selected: null, sourceLoaded: false, sourceName: "" };
const $ = id => document.getElementById(id);
const clone = x => JSON.parse(JSON.stringify(x));

function uid(prefix="id"){
  return prefix + "-" + Math.random().toString(36).slice(2,9);
}

function escFileName(s){
  return String(s || "data").replace(/[\\/:*?"<>|]/g,"_");
}

function loadData(data, sourceName=""){
  if(!data || !Array.isArray(data.topics)) throw new Error("data.jsonの形式が違います。");
  state.data = data;
  state.selected = data.topics[0]?.id || null;
  state.sourceLoaded = true;
  state.sourceName = sourceName;
  renderTopics();
  renderEditor();
}

function renderTopics(){
  const box=$("topicList"); box.innerHTML="";
  for(const t of state.data.topics){
    const b=document.createElement("button");
    b.className="topic-item"+(t.id===state.selected?" active":"");
    b.innerHTML=`<strong>${text(t.title)}</strong><span>${text(t.category||"カテゴリ未設定")}</span>`;
    b.onclick=()=>{state.selected=t.id;renderTopics();renderEditor()};
    box.appendChild(b);
  }
}

function renderEditor(){
  const t=state.data.topics.find(x=>x.id===state.selected);
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
  if(!roots.length){
    box.innerHTML='<p class="empty-children">まだ質問がありません。</p>';
    return;
  }
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

  el.querySelector(".delete-node").onclick=()=>{
    if(!confirm("この質問と、その下の関連質問を削除しますか？"))return;
    removeNode(t,node.id);renderTree(t);
  };
  el.querySelector(".add-child").onclick=()=>{
    const child={id:uid("q"),type:"child",question:"",answer:"",mond:"",x:"",children:[]};
    (node.children ||= []).push(child.id);
    t.nodes.push(child);
    renderTree(t);
    requestAnimationFrame(()=>el.querySelector(".children-editor")?.lastElementChild?.scrollIntoView({block:"center"}));
  };

  const save=()=>{
    node.question=el.querySelector(".node-question").value;
    node.answer=el.querySelector(".node-answer").value;
    node.mond=el.querySelector(".node-mond").value;
    node.x=el.querySelector(".node-x").value;
  };
  ["change","input"].forEach(ev=>{
    el.querySelectorAll("input,textarea").forEach(x=>x.addEventListener(ev,save));
  });

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
  const target=t.nodes.find(n=>n.id===id);
  if(!target)return;
  const removeIds=new Set([id]);
  function collect(n){
    for(const cid of (n.children||[])){removeIds.add(cid);const c=t.nodes.find(x=>x.id===cid);if(c)collect(c);}
  }
  collect(target);
  t.nodes=t.nodes.filter(n=>!removeIds.has(n.id));
  for(const n of t.nodes)n.children=(n.children||[]).filter(cid=>!removeIds.has(cid));
}

function text(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

$("saveTopicBtn").onclick=()=>{
  const t=state.data.topics.find(x=>x.id===state.selected);
  if(!t)return;
  t.title=$("topicTitle").value.trim();
  t.category=$("topicCategory").value.trim();
  t.description=$("topicDescription").value.trim();
  t.featured=$("topicFeatured").checked;
  renderTopics();renderEditor();
  alert("画面上のデータを保存しました。最後に「data.jsonを書き出す」を押してください。");
};

$("addRootBtn").onclick=()=>{
  const t=state.data.topics.find(x=>x.id===state.selected);
  if(!t)return;
  const n={id:uid("q"),type:"root",question:"",answer:"",mond:"",x:"",children:[]};
  (t.nodes ||= []).push(n);
  renderTree(t);
};

$("newTopicBtn").onclick=()=>{
  if(!state.sourceLoaded){
    alert("先に現在のdata.jsonを読み込んでください。\\n\\n「data.jsonを読み込む」から、現在使っているdata.jsonを選択してください。\\n読み込まずに書き出すと、既存の話題を上書きする危険があります。");
    return;
  }
  const t={id:uid("topic"),category:"",title:"新しい話題",description:"",featured:false,nodes:[]};
  state.data.topics.push(t);state.selected=t.id;renderTopics();renderEditor();
  $("topicTitle").focus();
};

$("deleteTopicBtn").onclick=()=>{
  if(!state.selected)return;
  const t=state.data.topics.find(x=>x.id===state.selected);
  if(!confirm(`「${t.title}」を削除しますか？`))return;
  state.data.topics=state.data.topics.filter(x=>x.id!==state.selected);
  state.selected=state.data.topics[0]?.id||null;renderTopics();renderEditor();
};

$("downloadBtn").onclick=()=>{
  if(!state.sourceLoaded){
    alert("data.jsonをまだ読み込んでいません。\\n\\n既存データを消さないため、先に「data.jsonを読み込む」で現在のdata.jsonを読み込んでください。");
    return;
  }
  const blob=new Blob([JSON.stringify(state.data,null,2)+"\n"],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="data.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
};

$("importBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{loadData(JSON.parse(await f.text()), f.name);}
  catch(err){alert("読み込みに失敗しました："+err.message)}
  e.target.value="";
};

fetch("../data.json").then(r=>{
  if(!r.ok) throw new Error("data.jsonを取得できませんでした。");
  return r.json();
}).then(data=>loadData(data,"../data.json")).catch(()=>{
  // ローカルでadmin/index.htmlを直接開いた場合などはfetchできない。
  // この状態では新規追加・書き出しを許可せず、既存data.jsonの読み込みを促す。
  state.data={site:{title:"とらまめMondまとめ",subtitle:"",notice:""},topics:[]};
  state.selected=null;
  state.sourceLoaded=false;
  state.sourceName="";
  renderTopics();
  renderEditor();
  alert("現在のdata.jsonを自動で読み込めませんでした。\\n\\n「data.jsonを読み込む」から、現在使っているdata.jsonを選択してください。");
});
