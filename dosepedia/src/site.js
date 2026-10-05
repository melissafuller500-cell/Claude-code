(function(){
var d=document;
// Highlight the current section in the table of contents
var links=[].slice.call(d.querySelectorAll('.toc ol a'));
if(links.length&&'IntersectionObserver' in window){
var map={};links.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.remove('on')});var a=map[e.target.id];if(a)a.classList.add('on')}})},{rootMargin:'-10% 0px -75% 0px'});
d.querySelectorAll('article section[id]').forEach(function(s){io.observe(s)});
}
// Interaction checker
d.querySelectorAll('.chk').forEach(function(c){
var rows=JSON.parse(c.dataset.rows),out=c.querySelector('.chk-out');c.hidden=false;
c.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;
c.querySelectorAll('.chip').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
var r=rows[b.dataset.i];out.innerHTML='';
var s=d.createElement('strong');s.textContent=r[1]+'. ';out.appendChild(s);
out.appendChild(d.createTextNode('Label guidance: '+r[2].charAt(0).toLowerCase()+r[2].slice(1)+'.'));
out.classList.add('show');out.classList.toggle('hi',/avoid|do not|boxed/i.test(r[2]));});
});
// Medicine tabs on the interactions page
d.querySelectorAll('[role=tablist]').forEach(function(tl){
tl.addEventListener('click',function(e){var t=e.target.closest('[role=tab]');if(!t)return;
tl.querySelectorAll('[role=tab]').forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);d.getElementById(x.getAttribute('aria-controls')).hidden=!on});});
});
// Mobile menu
var menu=d.querySelector('.menu'),nav=d.getElementById('nav-main');
if(menu&&nav)menu.addEventListener('click',function(){var o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',o)});
// Contact dialog
var dlg=d.getElementById('contact'),open=d.getElementById('contact-open');
var openers=[].slice.call(d.querySelectorAll('[data-contact]'));if(open)openers.push(open);
if(dlg&&dlg.showModal){
openers.forEach(function(b){b.addEventListener('click',function(){dlg.querySelector('[name=page]').value=location.pathname;dlg.showModal()})});
d.getElementById('contact-close').addEventListener('click',function(){dlg.close()});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
}else{var to=d.querySelector('.foot a[href*="contact/"]');openers.forEach(function(b){b.addEventListener('click',function(){if(to)location.href=to.href})})}
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
function show(){var v=q.value.trim().toLowerCase();list.innerHTML='';sel=-1;
if(!v){hide();return}
var hits=idx.filter(function(x){return (x.t+' '+x.k).toLowerCase().indexOf(v)>-1}).slice(0,8);
if(!hits.length){var li=d.createElement('li');li.className='none';li.textContent='No match yet. More drugs are being added.';list.appendChild(li)}
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
