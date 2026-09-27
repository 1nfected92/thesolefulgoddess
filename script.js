'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
try{if(localStorage.getItem('solefulTheme')==='dark')document.body.classList.add('dark');}catch{}
const theme=$('.theme');const setTheme=()=>theme?.setAttribute('aria-pressed',String(document.body.classList.contains('dark')));setTheme();theme?.addEventListener('click',()=>{document.body.classList.toggle('dark');setTheme();try{localStorage.setItem('solefulTheme',document.body.classList.contains('dark')?'dark':'light')}catch{}});
$('.menu')?.addEventListener('click',()=>{const open=$('.nav-links').classList.toggle('open');$('.menu').setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.nav-links')?.classList.remove('open');$('.menu')?.setAttribute('aria-expanded','false');}});
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
let galleryTrigger;function closeLightbox(){$('.lightbox')?.classList.remove('open');galleryTrigger?.focus()};$$('.gallery button').forEach(b=>b.addEventListener('click',()=>{galleryTrigger=b;$('.lightbox img').src=b.dataset.image;$('.lightbox img').alt=b.querySelector('img').alt;$('.lightbox').classList.add('open');$('.lightbox-close').focus()}));$('.lightbox-close')?.addEventListener('click',closeLightbox);
if('IntersectionObserver'in window){const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}}),{threshold:.08});$$('.card,.split,.review-card,.band-grid,.contact-grid').forEach(e=>{e.classList.add('reveal');o.observe(e)})}

document.addEventListener('click',e=>{
  const target=e.target.closest('button,.button,.nav-links a,.slot,.calendar-day');
  if(!target||target.disabled||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=target.getBoundingClientRect(),r=document.createElement('span');
  r.className='ripple';
  r.style.left=(e.clientX-rect.left)+'px';
  r.style.top=(e.clientY-rect.top)+'px';
  target.append(r);
  setTimeout(()=>r.remove(),650);
});
