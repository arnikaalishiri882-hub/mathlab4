/* app logic */
let mode = 'short';
let sets = {};
if(localStorage.getItem('sets')){ sets = JSON.parse(localStorage.getItem('sets')); }

/* build uppercase letters into keyboard */
(function fillLetters(){
  const lettersRow = document.querySelector('#keyboard .letters');
  if(!lettersRow) return;
  let html = '';
  for(let i=65;i<=90;i++){ html += `<button data-ch="${String.fromCharCode(i)}">${String.fromCharCode(i)}</button>`; }
  lettersRow.innerHTML = html;
})();

/* UI bindings */
document.getElementById('shortBtn').addEventListener('click', ()=> setMode('short'));
document.getElementById('longBtn').addEventListener('click', ()=> setMode('long'));
document.getElementById('verbalBtn').addEventListener('click', ()=> verbalPrompt());
document.getElementById('themeSelector').addEventListener('change', changeTheme);
document.getElementById('keyboardBtn').addEventListener('click', toggleKeyboard);
document.getElementById('kbdClose')?.addEventListener('click', toggleKeyboard);

/* keyboard delegation */
document.getElementById('keyboard').addEventListener('click', function(e){
  const btn = e.target.closest('button');
  if(!btn) return;
  if(btn.id === 'kbdBack'){ // backspace
    const el = document.activeElement;
    if(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')){
      const s = el.selectionStart || 0, epos = el.selectionEnd || 0;
      if(s === epos && s>0){
        el.value = el.value.slice(0,s-1) + el.value.slice(epos);
        el.selectionStart = el.selectionEnd = s-1;
      } else {
        el.value = el.value.slice(0,s) + el.value.slice(epos);
        el.selectionStart = el.selectionEnd = s;
      }
      el.focus();
    }
    return;
  }
  const ch = btn.dataset && btn.dataset.ch;
  if(ch !== undefined){
    const el = document.activeElement;
    if(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')){
      const s = el.selectionStart || el.value.length;
      const before = el.value.slice(0,s), after = el.value.slice(s);
      el.value = before + ch + after;
      el.selectionStart = el.selectionEnd = s + ch.length;
      el.focus();
    }
    return;
  }
});

/* setMode and set creation */
function setMode(t){
  mode = t;
  const step = document.getElementById('step');
  step.innerHTML = `
    <p>تعداد مجموعه‌ها را وارد کنید:</p>
    <input id="countInput" type="number" min="1" style="width:80px">
    <button id="countOk">ثبت</button>
    <button id="debug" style="margin-right:8px">نمایش مجموعه‌ها</button>
  `;
  document.getElementById('countOk').addEventListener('click', getSetCount);
  document.getElementById('debug').addEventListener('click', debugListSets);
  window.scrollTo({top:0,behavior:'smooth'});
}

function getSetCount(){
  const n = Math.max(0, parseInt(document.getElementById('countInput').value||0));
  if(n<=0) return;
  let html = '';
  for(let i=1;i<=n;i++){
    html += `
      <p class="important">نام مجموعه ${i}:</p>
      <input id="name${i}" placeholder="مثال: A">
      <p>عناصر (با ویرگول جدا):</p>
      <input id="items${i}" placeholder="مثال: 1, 2, a">
      <hr>`;
  }
  html += `<button id="saveSetsBtn">ثبت مجموعه‌ها</button>`;
  document.getElementById('step').innerHTML = html;
  document.getElementById('saveSetsBtn').addEventListener('click', ()=> saveSets(n));
  setTimeout(()=> document.getElementById('name1')?.focus(),120);
}

function saveSets(n){
  sets = {};
  for(let i=1;i<=n;i++){
    const name = (document.getElementById('name'+i).value || `S${i}`).trim();
    const items = (document.getElementById('items'+i).value || '').split(',').map(x=>x.trim()).filter(x=>x!=='');
    sets[name] = items;
  }
  localStorage.setItem('sets', JSON.stringify(sets));
  showOperations();
}

/* main menu */
function showOperations(){
  document.getElementById('step').innerHTML = `
    <p class="bold">عملیات مورد نظر را انتخاب کنید:</p>
    <button onclick="askTwoSets('اجتماع','union')">اجتماع</button>
    <button onclick="askTwoSets('اشتراک','inter')">اشتراک</button>
    <button onclick="askTwoSets('تفاضل','diff')">تفاضل</button>
    <button onclick="subsetPrompt()">زیرمجموعه‌ها</button>
    <button onclick="vennPrompt()">نمودار وِن</button>
    <button onclick="verbalPrompt()">تولید از عبارت کلامی</button>
  `;
}

/* set operations */
function union(a,b){ return Array.from(new Set([...(sets[a]||[]), ...(sets[b]||[])])); }
function inter(a,b){ return (sets[a]||[]).filter(x=> (sets[b]||[]).includes(x)); }
function diff(a,b){ return (sets[a]||[]).filter(x=> ! (sets[b]||[]).includes(x)); }

/* ask two sets */
function askTwoSets(title,op){
  const names = Object.keys(sets);
  if(names.length < 2){ document.getElementById('step').innerHTML = '<p>ابتدا حداقل دو مجموعه تعریف کنید.</p>'; return; }
  document.getElementById('step').innerHTML = `
    <p class="bold">${title}</p>
    <p>مجموعه اول:</p><select id="s1">${names.map(n=>`<option>${n}</option>`).join('')}</select>
    <p>مجموعه دوم:</p><select id="s2">${names.map(n=>`<option>${n}</option>`).join('')}</select>
    <button id="runOp">اجرا</button>
  `;
  document.getElementById('runOp').addEventListener('click', ()=> runTwoSetOp(op));
}

function runTwoSetOp(op){
  const a = document.getElementById('s1').value, b = document.getElementById('s2').value;
  if(op === 'venn'){ showVenn(a,b); return; }
  let res = [];
  if(op==='union') res = union(a,b);
  if(op==='inter') res = inter(a,b);
  if(op==='diff') res = diff(a,b);
  const explanation = mode==='long' ? explainOp(op,a,b,res) : '';
  showResult(res, explanation);
}

/* show result (symbolic: with braces) */
function showResult(res, explanation=''){
  const sym = `{${res.join(', ')}}`;
  let html = `<div class="resultBox"><p class="bold">نتیجه:</p><p>${sym}</p>`;
  if(mode==='long' && explanation) html += `<hr/><p class="important">توضیح:</p><p>${explanation}</p>`;
  html += `<p><button onclick="showOperations()">بازگشت</button></p></div>`;
  document.getElementById('step').innerHTML = html;
  document.getElementById('vennContainer').style.display = 'none';
}

function explainOp(op,a,b,res){
  if(op==='union') return `گام‌ها: عناصر ${a} = {${(sets[a]||[]).join(', ')}}, عناصر ${b} = {${(sets[b]||[]).join(', ')}}, اجتماع ترکیب بدون تکرار است. نتیجه: {${res.join(', ')}}`;
  if(op==='inter') return `گام‌ها: بررسی عناصر مشترک بین ${a} و ${b}. نتیجه: {${res.join(', ')}}`;
  if(op==='diff') return `گام‌ها: از عناصر ${a} مواردی که در ${b} نیستند جدا شدند. نتیجه: {${res.join(', ')}}`;
  return '';
}

/* subsets */
function subsetPrompt(){
  const names = Object.keys(sets);
  if(names.length < 1){ document.getElementById('step').innerHTML = '<p>ابتدا یک مجموعه تعریف کنید.</p>'; return; }
  document.getElementById('step').innerHTML = `
    <p class="bold">انتخاب مجموعه برای زیرمجموعه‌ها</p>
    <select id="subSetSel">${names.map(n=>`<option>${n}</option>`).join('')}</select>
    <button id="showSubs">نمایش زیرمجموعه‌ها</button>
  `;
  document.getElementById('showSubs').addEventListener('click', showSubsets);
}

function showSubsets(){
  const name = document.getElementById('subSetSel').value;
  const arr = sets[name] || [];
  let result = [[]];
  for(const el of arr){
    const len = result.length;
    for(let i=0;i<len;i++) result.push([...result[i], el]);
  }
  const mapped = result.map(s=>`{${s.join(', ')}}`);
  showResult(mapped, `تعداد زیرمجموعه‌ها: ${mapped.length}`);
}

/* venn */
function vennPrompt(){ askTwoSets('نمودار ون','venn'); }
function showVenn(a,b){
  const svg = document.getElementById('venn');
  svg.innerHTML = '';
  document.getElementById('vennContainer').style.display = 'block';
  const NS='http://www.w3.org/2000/svg';
  const cA = document.createElementNS(NS,'circle'); cA.setAttribute('cx',120); cA.setAttribute('cy',100); cA.setAttribute('r',70); cA.setAttribute('fill','rgba(255,0,0,0.2)');
  const cB = document.createElementNS(NS,'circle'); cB.setAttribute('cx',220); cB.setAttribute('cy',100); cB.setAttribute('r',70); cB.setAttribute('fill','rgba(0,0,255,0.2)');
  svg.appendChild(cA); svg.appendChild(cB);
  const A = sets[a]||[]; const B = sets[b]||[];
  const inters = A.filter(x=>B.includes(x)); const onlyA = A.filter(x=>!B.includes(x)); const onlyB = B.filter(x=>!A.includes(x));
  function addText(x,y,arr){
    const gap = 14;
    const start = y - ((arr.length-1)*gap)/2;
    arr.forEach((t,i)=>{
      const el = document.createElementNS(NS,'text');
      el.setAttribute('x',x); el.setAttribute('y',start + i*gap); el.setAttribute('font-size',12); el.setAttribute('text-anchor','middle');
      el.textContent = t;
      svg.appendChild(el);
    });
  }
  addText(80,100,onlyA); addText(165,100,inters); addText(270,100,onlyB);
  document.getElementById('step').innerHTML = `<p class="bold">نمودار ون مجموعه‌های ${a} و ${b}</p>
    <p>نمایش نمادین: {${onlyA.join(', ')}} ∪ {${inters.join(', ')}} ∪ {${onlyB.join(', ')}}</p>
    <button onclick="hideVenn()">بستن نمودار</button>`;
}
function hideVenn(){ document.getElementById('vennContainer').style.display = 'none'; showOperations(); }

/* theme */
function changeTheme(){ const t=document.getElementById('themeSelector').value; document.body.className = t; }

/* keyboard controls */
function toggleKeyboard(){
  const kb = document.getElementById('keyboard');
  if(kb.style.display === 'block'){ kb.style.display = 'none'; kb.setAttribute('aria-hidden','true'); return; }
  kb.style.display = 'block'; kb.setAttribute('aria-hidden','false');
  setTimeout(()=>{ const act = document.querySelector('input, textarea'); if(act) act.scrollIntoView({behavior:'smooth', block:'center'}); },120);
}

/* verbal generator */
function verbalPrompt(){
  document.getElementById('step').innerHTML = `
    <p class="bold">تولید مجموعه از عبارت کلامی</p>
    <p>نوع:</p>
    <select id="vType">
      <option value="even">اعداد زوج بین</option>
      <option value="odd">اعداد فرد بین</option>
      <option value="mult">مضاعف n بین</option>
    </select>
    <p>از:</p><input id="vFrom" type="number" value="1">
    <p>تا:</p><input id="vTo" type="number" value="10">
    <div id="vNrow" style="display:none">n: <input id="vN" type="number" value="3"></div>
    <p>نام مجموعه:</p><input id="vName" placeholder="مثال: Even1">
    <p><button id="genVerbal">تولید و ذخیره</button> <button onclick="showOperations()">انصراف</button></p>
  `;
  document.getElementById('vType').addEventListener('change', function(){ document.getElementById('vNrow').style.display = this.value==='mult' ? 'block' : 'none'; });
  document.getElementById('genVerbal').addEventListener('click', generateVerbal);
}

function generateVerbal(){
  const type = document.getElementById('vType').value;
  const from = parseInt(document.getElementById('vFrom').value)||0;
  const to = parseInt(document.getElementById('vTo').value)||0;
  const n = parseInt(document.getElementById('vN')?.value)||1;
  const name = (document.getElementById('vName').value || `V${Object.keys(sets).length+1}`).trim();
  const arr = [];
  for(let i=Math.min(from,to); i<=Math.max(from,to); i++){
    if(type==='even' && i%2===0) arr.push(String(i));
    if(type==='odd' && i%2!==0) arr.push(String(i));
    if(type==='mult' && i%n===0) arr.push(String(i));
  }
  sets[name] = arr; localStorage.setItem('sets', JSON.stringify(sets)); showOperations();
}

/* debug list */
function debugListSets(){
  const keys = Object.keys(sets);
  if(!keys.length){ document.getElementById('step').innerHTML = '<p>هیچ مجموعه‌ای ثبت نشده.</p>'; return; }
  document.getElementById('step').innerHTML = `<p class="bold">مجموعه‌های ثبت شده:</p><pre>${keys.map(k=>k+': {'+(sets[k]||[]).join(', ')+'}').join('\\n')}</pre><button onclick="showOperations()">بازگشت</button>`;
}

/* init on load */
window.addEventListener('load', ()=>{ document.body.className = 'light'; document.getElementById('keyboard').style.display = 'none'; if(Object.keys(sets).length) showOperations(); });
