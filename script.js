'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
try{if(localStorage.getItem('solefulTheme')==='dark')document.body.classList.add('dark');}catch{}
const theme=$('.theme');const setTheme=()=>theme?.setAttribute('aria-pressed',String(document.body.classList.contains('dark')));setTheme();theme?.addEventListener('click',()=>{document.body.classList.toggle('dark');setTheme();try{localStorage.setItem('solefulTheme',document.body.classList.contains('dark')?'dark':'light')}catch{}});
$('.menu')?.addEventListener('click',()=>{const open=$('.nav-links').classList.toggle('open');$('.menu').setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.nav-links')?.classList.remove('open');$('.menu')?.setAttribute('aria-expanded','false');$('.chat-box')?.classList.remove('open');}});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');$$('.card').forEach(c=>c.hidden=b.dataset.filter!=='all'&&c.dataset.category!==b.dataset.filter)}));
$('#contactForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);location.href='mailto:info@thesolefulgoddess.com?subject='+encodeURIComponent('Spa website inquiry')+'&body='+encodeURIComponent(`Name: ${f.get('name')}\nEmail: ${f.get('email')}\n\n${f.get('message')}`);$('#contactSuccess').textContent='Your email app will open with this draft. Press Send there to deliver it.'});
function spaFallback(text){
 const q=text.toLowerCase();
 if(q.includes('hour')||q.includes('open')||q.includes('when'))return 'We are open every day from 12 PM to 9 PM.';
 if(q.includes('where')||q.includes('address')||q.includes('location'))return 'The Soleful Goddess is at 4425 Plano Pkwy, Suite 803, Carrollton, TX 75010.';
 if(q.includes('reflex'))return 'Reflexology is $80 for 60 minutes and focuses on pressure-point work for relaxation and whole-body balance.';
 if(q.includes('thai'))return 'Thai Massage is $100 for 60 minutes and combines assisted stretching, rhythmic compression, and mindful movement.';
 if(q.includes('sport'))return 'Sports Massage is available for active bodies. Please call (214) 277-4853 for current pricing and duration.';
 if(q.includes('full body'))return 'Full Body Massage is available for broad relaxation. Please call (214) 277-4853 for current pricing and duration.';
 if(q.includes('book')||q.includes('appoint')||q.includes('reserve')||q.includes('slot'))return 'You can choose a treatment and an open time on the live Booking page: https://1nfected92.github.io/thesolefulgoddess/booking.html';
 return 'I can help with The Soleful Goddess services, prices, hours, location, availability, and appointments. What would you like to know?';
}
function addChat(){
 let wrap=$('.chat');
 if(!wrap){wrap=document.createElement('div');wrap.className='chat';wrap.innerHTML='<button class="chat-toggle" aria-label="Open Soleful Goddess assistant" aria-expanded="false">✦</button><div class="chat-box"><div class="chat-top"><strong>Goddess Guide</strong><button class="chat-close" aria-label="Close assistant">×</button></div><div class="chat-body" aria-live="polite"></div><form class="chat-form"><input aria-label="Message the assistant" placeholder="Ask about treatments or booking" maxlength="800" required><button class="button" type="submit">Send</button></form></div>';document.body.append(wrap)}
 if(wrap.dataset.chatReady==='true')return;wrap.dataset.chatReady='true';
 const toggle=wrap.querySelector('.chat-toggle'),box=wrap.querySelector('.chat-box'),close=wrap.querySelector('.chat-close'),body=wrap.querySelector('.chat-body');
 const oldOptions=wrap.querySelector('.chat-options');if(oldOptions)oldOptions.remove();
 let form=wrap.querySelector('.chat-form');if(!form){form=document.createElement('form');form.className='chat-form';form.innerHTML='<input aria-label="Message the assistant" placeholder="Ask about treatments or booking" maxlength="800" required><button class="button" type="submit">Send</button>';wrap.querySelector('.chat-box').append(form)}
 const input=form.querySelector('input');const first=body.querySelector('p');const welcome=first?.textContent||'Welcome to The Soleful Goddess. Ask about services, prices, hours, location, availability, or request an appointment.';const messages=[{role:'assistant',content:welcome}];
 const paint=(text,role)=>{const p=document.createElement('p');p.className=role;p.textContent=text;body.append(p);body.scrollTop=body.scrollHeight};if(!first)paint(welcome,'assistant');
 toggle.onclick=()=>{const open=!box.classList.contains('open');box.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()};close.onclick=()=>{box.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus()};
 form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value='';messages.push({role:'user',content:text});paint(text,'user');const wait=document.createElement('p');wait.textContent='Checking the spa information…';body.append(wait);try{const r=await fetch(`${window.SOLEFUL_SUPABASE.url}/functions/v1/${window.SOLEFUL_SUPABASE.assistantFunction}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:window.SOLEFUL_SUPABASE.publishableKey},body:JSON.stringify({messages})});const data=await r.json();if(!r.ok||data.error)throw new Error('assistant unavailable');wait.remove();const reply=data.reply||spaFallback(text);messages.push({role:'assistant',content:reply});paint(reply,'assistant')}catch{wait.remove();const reply=spaFallback(text);messages.push({role:'assistant',content:reply});paint(reply,'assistant')}};
}
if(window.SOLEFUL_SUPABASE)addChat();
let galleryTrigger;function closeLightbox(){$('.lightbox')?.classList.remove('open');galleryTrigger?.focus()};$$('.gallery button').forEach(b=>b.addEventListener('click',()=>{galleryTrigger=b;$('.lightbox img').src=b.dataset.image;$('.lightbox img').alt=b.querySelector('img').alt;$('.lightbox').classList.add('open');$('.lightbox-close').focus()}));$('.lightbox-close')?.addEventListener('click',closeLightbox);
if('IntersectionObserver'in window){const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}}),{threshold:.08});$$('.card,.split,.review-card,.band-grid,.contact-grid').forEach(e=>{e.classList.add('reveal');o.observe(e)})}
