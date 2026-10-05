(function(){
var d=document;
function $(s,r){return (r||d).querySelector(s)}
function $$(s,r){return [].slice.call((r||d).querySelectorAll(s))}
function el(tag,cls,txt){var e=d.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
var params=new URLSearchParams(location.search);
var dataEl=d.getElementById('page-data'),DATA=dataEl?JSON.parse(dataEl.textContent):null;
var BY={};if(DATA)DATA.items.forEach(function(x){BY[x.slug]=x});

// Highlight the current section in the table of contents
var links=$$('.toc ol a');
if(links.length&&'IntersectionObserver' in window){
var map={};links.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.remove('on')});var a=map[e.target.id];if(a)a.classList.add('on')}})},{rootMargin:'-10% 0px -75% 0px'});
$$('article section[id]').forEach(function(s){io.observe(s)});
}

// Per-drug interaction chips
$$('.chk').forEach(function(c){
var rows=JSON.parse(c.dataset.rows),out=$('.chk-out',c),lbl=c.dataset.label||'Guidance';c.hidden=false;
c.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;
$$('.chip',c).forEach(function(x){x.setAttribute('aria-pressed',x===b)});
var r=rows[b.dataset.i];out.innerHTML='';
out.appendChild(el('strong',null,r[1]+'. '));
out.appendChild(d.createTextNode(lbl+': '+r[2].charAt(0).toLowerCase()+r[2].slice(1)+'.'));
out.classList.add('show');out.classList.toggle('hi',/avoid|do not|boxed|contraindicated|very high|dangerous|fatal/i.test(r[2]));});
});

// Mobile menu
var menu=$('.menu'),nav=d.getElementById('nav-main');
if(menu&&nav)menu.addEventListener('click',function(){var o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',o)});

// Contact dialog
var dlg=d.getElementById('contact'),open=d.getElementById('contact-open');
var openers=$$('[data-contact]');if(open)openers.push(open);
if(dlg&&dlg.showModal){
openers.forEach(function(b){b.addEventListener('click',function(){$('[name=page]',dlg).value=location.pathname;dlg.showModal()})});
d.getElementById('contact-close').addEventListener('click',function(){dlg.close()});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
}else{var to=$('.foot a[href*="contact/"]');openers.forEach(function(b){b.addEventListener('click',function(){if(to)location.href=to.href})})}

// Drugs A to Z filters
var fr=$('[data-filter-root]');
if(fr){
var q=$('[data-q]',fr),state={cluster:'',sched:''},cards=$$('[data-filter-list] .card'),count=$('[data-count]',fr),empty=$('[data-empty]');
function apply(){var v=q.value.trim().toLowerCase(),n=0;
cards.forEach(function(c){var ok=(!state.cluster||c.dataset.cluster===state.cluster)&&(!state.sched||c.dataset.sched===state.sched)&&(!v||c.dataset.text.indexOf(v)>-1||c.dataset.cluster.indexOf(v)>-1);c.hidden=!ok;if(ok)n++});
$$('.letter').forEach(function(s){s.hidden=!$$('.card',s).some(function(c){return !c.hidden})});
count.textContent=n;empty.hidden=n>0}
fr.addEventListener('click',function(e){var b=e.target.closest('.chip[data-f]');if(!b)return;state[b.dataset.f]=b.dataset.v;
$$('.chip[data-f="'+b.dataset.f+'"]',fr).forEach(function(x){x.setAttribute('aria-pressed',x===b)});apply()});
q.addEventListener('input',apply);
if(params.get('q')){q.value=params.get('q');apply()}
}

// Legal-status table filter
var tf=$('[data-table-filter]');
if(tf){var trs=$$('[data-rows] tr');tf.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;
$$('.chip',tf).forEach(function(x){x.setAttribute('aria-pressed',x===b)});trs.forEach(function(r){r.hidden=!!b.dataset.v&&r.dataset.sched!==b.dataset.v})})}

// Withdrawal picker
var pk=$('[data-picker] select');
if(pk){function showP(){$$('[data-panel]').forEach(function(p){p.hidden=p.dataset.panel!==pk.value})}
if(params.get('d')&&$('[data-panel="'+params.get('d')+'"]'))pk.value=params.get('d');
pk.addEventListener('change',function(){showP();history.replaceState(null,'','?d='+pk.value)});showP()}

// Combination checker
function has(x,g){return x.groups.indexOf(g)>-1}
function either(a,b,g1,g2){return (has(a,g1)&&has(b,g2))||(has(a,g2)&&has(b,g1))}
function combo(a,b){
if(a.slug===b.slug)return ['high','Same substance','Taking more of the same substance is not a combination but a larger dose. Higher doses raise the risk of every side effect and of overdose.'];
if(either(a,b,'partial-opioid','opioid')&&!(has(a,'partial-opioid')&&has(b,'partial-opioid')))return ['danger','Blocked effect, then overdose risk','Buprenorphine binds tightly to opioid receptors. Started too soon after another opioid it causes sudden withdrawal; taking more opioids to override it can lead to overdose when it wears off.'];
if(either(a,b,'opioid','depressant'))return ['danger','Slowed or stopped breathing','Both slow the brain and breathing. Opioids combined with benzodiazepines, alcohol, or other sedatives cause a large share of overdose deaths, and the FDA requires a boxed warning on opioid-benzodiazepine combinations.'];
if(has(a,'opioid')&&has(b,'opioid'))return ['danger','Stacked opioid effects','Two opioids add together. Breathing suppression multiplies, and long-acting opioids can cause overdose hours later.'];
if(has(a,'depressant')&&has(b,'depressant'))return ['danger','Deep sedation','Both are central nervous system depressants. Together they cause much deeper sedation and can stop breathing, especially with alcohol, GHB, barbiturates, or high doses.'];
if(either(a,b,'maoi','serotonergic')||either(a,b,'maoi','stimulant'))return ['danger','Serotonin syndrome or blood pressure crisis','MAO inhibitors stop the breakdown of serotonin and norepinephrine. Combined with serotonergic drugs or stimulants they can cause serotonin syndrome or a dangerous spike in blood pressure. Potentially fatal.'];
if(either(a,b,'lithium','psychedelic'))return ['danger','Seizures','Seizures and other dangerous reactions have been reported when psychedelics are taken by people on lithium.'];
if(either(a,b,'dissociative','depressant')||either(a,b,'dissociative','opioid'))return ['danger','Unconsciousness and choking','Dissociatives with sedatives or opioids raise the risk of losing consciousness, vomiting while unconscious, and slowed breathing.'];
if(either(a,b,'opioid','stimulant'))return ['high','Overdose when the stimulant wears off','Stimulants can mask opioid sedation. When the stimulant wears off first, breathing can slow dangerously. Street stimulants are often contaminated with fentanyl.'];
if(has(a,'stimulant')&&has(b,'stimulant'))return ['high','Heart strain and overheating','Two stimulants add up: higher heart rate and blood pressure, irregular heartbeat, overheating, and seizures.'];
if((a.slug==='dmt'||b.slug==='dmt')&&(has(a,'ssri')||has(b,'ssri')||has(a,'stimulant')||has(b,'stimulant')))return ['high','Dangerous with ayahuasca','Smoked DMT mainly intensifies effects, but ayahuasca contains MAO inhibitors. With antidepressants or stimulants it can cause serotonin syndrome or a blood pressure crisis.'];
if(has(a,'psychedelic')&&has(b,'psychedelic'))return ['caution','Intense, unpredictable effects','Combining psychedelics makes the experience longer and harder to predict, which raises the chance of panic and risky behavior.'];
if(either(a,b,'ssri','psychedelic'))return ['caution','Blunted effects','SSRIs and SNRIs usually weaken psychedelic effects. Do not stop an antidepressant without your prescriber.'];
if(either(a,b,'ssri','stimulant')&&!(has(a,'serotonergic')&&has(b,'serotonergic')))return ['caution','Usually prescribed with monitoring','Stimulants and antidepressants are often prescribed together under supervision. Rarely the combination causes serotonin syndrome, and it can raise heart rate and blood pressure.'];
if(has(a,'serotonergic')&&has(b,'serotonergic'))return ['high','Serotonin syndrome','Both raise serotonin activity. Watch for agitation, sweating, fever, muscle twitching, and a fast heartbeat, which need emergency care.'];
if(either(a,b,'alcohol','stimulant'))return ['high','Masked drunkenness','Stimulants hide how drunk a person is, which leads to heavier drinking and alcohol poisoning, and adds strain on the heart. Cocaine and alcohol form cocaethylene, which is more toxic to the heart.'];
if(either(a,b,'cannabinoid','depressant')||either(a,b,'cannabinoid','opioid'))return ['caution','More sedation and impairment','Cannabinoids add to drowsiness and impair coordination and judgment.'];
if(either(a,b,'psychedelic','cannabinoid')||either(a,b,'psychedelic','dissociative')||either(a,b,'dissociative','cannabinoid'))return ['caution','Overwhelming experiences','Mixing these can intensify confusion, anxiety, and paranoia.'];
if(either(a,b,'stimulant','psychedelic')||either(a,b,'stimulant','dissociative')||either(a,b,'stimulant','cannabinoid')||either(a,b,'stimulant','steroid'))return ['caution','Strain on the heart and mind','Expect a higher heart rate and blood pressure, and more anxiety. Take extra care with heart conditions.'];
return ['low','No major interaction expected','Based on how these substances work, no major interaction is expected. Specific interactions, such as through liver enzymes, can still happen. Check each profile and ask a pharmacist.'];
}
var cb=$('[data-combo]');
if(cb&&DATA){
var sa=$('[data-a]',cb),sb=$('[data-b]',cb),out=$('[data-out]',cb);
function render(){out.innerHTML='';var A=BY[sa.value],B=BY[sb.value];
if(!A||!B){out.appendChild(el('p','combo-empty','Choose two substances to see the result.'));return}
var r=combo(A,B),box=el('div','res lv-'+r[0]);
box.appendChild(el('span','lv lv-'+r[0],{danger:'Dangerous',high:'High risk',caution:'Caution',low:'Low known risk'}[r[0]]));
box.appendChild(el('h3',null,A.name+' + '+B.name+': '+r[1]));box.appendChild(el('p',null,r[2]));
var more=el('p','res-links');[A,B].forEach(function(x){if(x.url){var a=el('a',null,'See '+x.name+' interactions');a.href=x.url+'#interactions';more.appendChild(a)}});
if(more.childNodes.length)box.appendChild(more);
if(r[0]==='danger'){var w=el('p','res-911');w.innerHTML='<strong>If someone has taken this combination and is hard to wake or breathing slowly, call 911.</strong>';box.appendChild(w)}
out.appendChild(box);history.replaceState(null,'','?a='+sa.value+'&b='+sb.value)}
sa.addEventListener('change',render);sb.addEventListener('change',render);
$('[data-swap]',cb).addEventListener('click',function(){var t=sa.value;sa.value=sb.value;sb.value=t;render()});
if(params.get('a'))sa.value=params.get('a');if(params.get('b'))sb.value=params.get('b');render();
}

// Compare tool
var co=$('[data-cmp]');
if(co&&DATA){
var sels=$$('[data-c]');
var ROWS=[['Cluster','cluster'],['US status','sched'],['Type','kind'],['Also known as','aka'],['Medical use','medical'],['Onset','onset'],['Duration','duration'],['Half-life','half_life'],['Dependence risk','dependence'],['Naloxone reverses overdose?','naloxone']];
function draw(){var xs=sels.map(function(s){return BY[s.value]}).filter(Boolean);co.innerHTML='';
if(xs.length<2){co.appendChild(el('p','combo-empty','Choose at least two substances.'));return}
var wrap=el('div','tbl'),t=el('table','cmp'),th=el('thead'),tr=el('tr');tr.appendChild(el('th'));
xs.forEach(function(x){var h=el('th');h.setAttribute('scope','col');var a=el('a',null,x.name);a.href=x.url;h.appendChild(a);tr.appendChild(h)});th.appendChild(tr);t.appendChild(th);
var tb=el('tbody');ROWS.forEach(function(r){var row=el('tr'),h=el('th',null,r[0]);h.setAttribute('scope','row');row.appendChild(h);
var vals=xs.map(function(x){return x[r[1]]||'–'});var same=vals.every(function(v){return v===vals[0]});
vals.forEach(function(v){row.appendChild(el('td',same?'same':null,v))});tb.appendChild(row)});
var row=el('tr'),h=el('th',null,'Combined');h.setAttribute('scope','row');row.appendChild(h);var td=el('td');td.colSpan=xs.length;
var r=combo(xs[0],xs[1]);var s=el('span','lv lv-'+r[0],{danger:'Dangerous',high:'High risk',caution:'Caution',low:'Low known risk'}[r[0]]);td.appendChild(s);td.appendChild(d.createTextNode(' '+xs[0].name+' + '+xs[1].name+': '+r[1]+'. '));
var a=el('a',null,'Details');a.href='../interactions/?a='+xs[0].slug+'&b='+xs[1].slug;td.appendChild(a);row.appendChild(td);tb.appendChild(row);
t.appendChild(tb);wrap.appendChild(t);co.appendChild(wrap);
history.replaceState(null,'','?'+sels.map(function(s,i){return s.value?'abc'[i]+'='+s.value:''}).filter(Boolean).join('&'))}
sels.forEach(function(s,i){var v=params.get('abc'[i]);if(v&&BY[v])s.value=v;s.addEventListener('change',draw)});draw();
}

// Overdose picker
var od=$('.od-pick');
if(od){od.addEventListener('click',function(e){var b=e.target.closest('.od-btn');if(!b)return;
$$('.od-btn',od).forEach(function(x){x.setAttribute('aria-pressed',x===b)});$$('.od-pane').forEach(function(p){p.hidden=p.dataset.pane!==b.dataset.od})})}

// Glossary filter
var gq=$('[data-gq]');
if(gq){var terms=$$('.term'),ge=$('[data-gempty]');gq.addEventListener('input',function(){var v=gq.value.trim().toLowerCase(),n=0;
terms.forEach(function(t){var ok=!v||t.dataset.term.indexOf(v)>-1;t.hidden=!ok;if(ok)n++});ge.hidden=n>0})}
})();
(function(){
var d=document;
// Reading progress bar
var bar=d.querySelector('.prog i');
if(bar){var up=function(){var h=d.documentElement,m=h.scrollHeight-h.clientHeight;bar.style.width=(m>0?h.scrollTop/m*100:0)+'%'};addEventListener('scroll',up,{passive:true});up()}
// Search boxes (header, home page hero, 404)
var src=d.getElementById('search-index');if(!src)return;
var idx=JSON.parse(src.textContent);
d.querySelectorAll('.find').forEach(function(box){
var q=box.querySelector('input'),list=box.querySelector('ul'),sel=-1;
function hide(){list.hidden=true;q.setAttribute('aria-expanded','false')}
function score(x,v){var t=x.t.toLowerCase();if(t.indexOf(v)===0)return 0;if((' '+x.k.toLowerCase()).indexOf(' '+v)>-1)return 1;return t.indexOf(v)>-1?2:3}
function show(){var v=q.value.trim().toLowerCase();list.innerHTML='';sel=-1;
if(!v){hide();return}
var hits=idx.filter(function(x){return (x.t+' '+x.k).toLowerCase().indexOf(v)>-1}).sort(function(a,b){return score(a,v)-score(b,v)}).slice(0,8);
if(!hits.length){var li=d.createElement('li');li.className='none';li.textContent='No match. Try a generic name, brand, or street name.';list.appendChild(li)}
hits.forEach(function(x){var li=d.createElement('li'),a=d.createElement('a'),s=d.createElement('span');li.setAttribute('role','option');a.href=x.u;a.textContent=x.t;s.textContent=x.s;a.appendChild(s);li.appendChild(a);list.appendChild(li)});
list.hidden=false;q.setAttribute('aria-expanded','true')}
q.addEventListener('input',show);q.addEventListener('focus',show);
q.addEventListener('keydown',function(e){var as=list.querySelectorAll('a');
if(e.key==='Escape'){hide();return}
if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!as.length)return;sel=(sel+(e.key==='ArrowDown'?1:-1)+as.length)%as.length;as.forEach(function(a,i){a.classList.toggle('on',i===sel)})}
if(e.key==='Enter'&&as.length){e.preventDefault();location.href=as[Math.max(sel,0)].href}});
d.addEventListener('click',function(e){if(!box.contains(e.target))hide()});
});
})();
