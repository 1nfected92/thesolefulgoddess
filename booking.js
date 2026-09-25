'use strict';
(async () => {
  const el = id => document.getElementById(id);
  const key = 'solefulBookingsV1';
  let database, month, selected = '', time = '', editing = '';
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const clock = () => new Intl.DateTimeFormat('en-GB',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const parseDate = d => new Date(d+'T12:00:00Z');
  const labelDate = d => parseDate(d).toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const labelTime = t => {const [h,m]=t.split(':');return `${(+h%12)||12}:${m} ${+h>=12?'PM':'AM'}`;};
  function read(){const raw=localStorage.getItem(key);if(!raw)return [];const v=JSON.parse(raw);if(!Array.isArray(v))throw Error('Invalid saved database');return v;}
  function available(d){const records=read();return (database.dates[d]||[]).filter(t=>d>=today() && (d!==today()||t>clock()) && !records.some(b=>b.status==='reserved' && b.date===d && b.time===t && b.id!==editing));}
  function node(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
  function draw(){
    el('calendarMonth').textContent=month.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
    el('previousMonth').disabled=month.toISOString().slice(0,7)<=today().slice(0,7);
    const last=Object.keys(database.dates).sort().at(-1).slice(0,7);
    el('nextMonth').disabled=month.toISOString().slice(0,7)>=last;
    const grid=el('calendarGrid');grid.replaceChildren();
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(x=>grid.append(node('span',x,'weekday')));
    for(let i=0;i<month.getUTCDay();i++){const s=node('span');s.setAttribute('aria-hidden','true');grid.append(s);}
    const days=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
    for(let i=1;i<=days;i++){
      const d=month.toISOString().slice(0,7)+'-'+String(i).padStart(2,'0'), past=d<today(), count=available(d).length;
      const b=node('button',null,`calendar-day availability-${count}${selected===d?' selected':''}`);b.type='button';b.disabled=past||!(d in database.dates);
      b.setAttribute('aria-label',`${labelDate(d)}, ${past?'past date':count+' open slots'}`);b.setAttribute('aria-pressed',String(selected===d));
      b.append(node('span',String(i)),node('small',past?'Past':`${count} open`));b.onclick=()=>{selected=d;time='';draw();drawSlots();};grid.append(b);
    }
  }
  function drawSlots(){
    el('selectedDate').textContent=selected?labelDate(selected):'2. Choose a date';
    const area=el('availableSlots');area.replaceChildren();
    if(selected){const slots=available(selected);if(!slots.includes(time))time='';
      if(!slots.length)area.append(node('p','No open times on this date. Please choose another day.'));
      slots.forEach(t=>{const b=node('button',labelTime(t),'slot'+(time===t?' selected':''));b.type='button';b.setAttribute('aria-pressed',String(time===t));b.onclick=()=>{time=t;drawSlots();};area.append(b);});
    }else area.append(node('p','Select a colored date on the calendar.'));
    el('bookingSummary').textContent=selected&&time?`${el('service').value} · ${labelDate(selected)} · ${labelTime(time)} Dallas time`:'Choose a date and an open time to continue.';
    el('reserveButton').disabled=!(selected&&time);el('reserveButton').textContent=editing?'Save changed demo reservation ↗':'Save demo reservation ↗';
  }
  function drawSaved(){
    const area=el('savedBookings');area.replaceChildren();const records=read().filter(b=>b.status==='reserved');
    if(!records.length)area.append(node('p','No demo reservations saved yet. Choose a date above to try the booking flow.'));
    records.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).forEach(b=>{
      const card=node('article',null,'saved-booking');card.append(node('strong',b.service),node('p',`${labelDate(b.date)} · ${labelTime(b.time)} Dallas time`),node('p',`${b.name} · DEMO · ${b.id}`));
      const change=node('button','Reschedule','button ghost');change.type='button';change.onclick=()=>{editing=b.id;selected=b.date;time=b.time;month=new Date(b.date.slice(0,7)+'-01T12:00:00Z');el('service').value=b.service;el('guestName').value=b.name;el('demoConsent').checked=false;draw();drawSlots();el('reservationStatus').textContent='Editing this demo reservation. Choose a new date or time, then save.';el('calendarMonth').scrollIntoView({behavior:'smooth',block:'center'});};
      const cancel=node('button','Cancel demo reservation','button ghost');cancel.type='button';cancel.onclick=()=>{try{const all=read();const record=all.find(r=>r.id===b.id);if(record)record.status='cancelled';localStorage.setItem(key,JSON.stringify(all));if(editing===b.id)editing='';time='';draw();drawSlots();drawSaved();el('reservationStatus').textContent='Demo reservation cancelled. The slot is available again on this device.';}catch{el('reservationStatus').textContent='Could not save the cancellation. Please enable browser storage.';}};
      card.append(change,cancel);area.append(card);
    });
  }
  try {
    const response=await fetch('database/availability.json?v=7');if(!response.ok)throw Error('Unavailable');database=await response.json();
    read();month=new Date(today().slice(0,7)+'-01T12:00:00Z');
    const service=new URLSearchParams(location.search).get('service');if([...el('service').options].some(o=>o.value===service))el('service').value=service;
    draw();drawSlots();drawSaved();
    for(const [id,delta] of [['previousMonth',-1],['nextMonth',1]])el(id).onclick=()=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+delta,1,12));draw();};
    el('service').onchange=drawSlots;
    el('reservationForm').onsubmit=async e=>{
      e.preventDefault();if(!el('reservationForm').reportValidity())return;
      const save=()=>{
        if(!selected||!time||!available(selected).includes(time)){el('reservationStatus').textContent='That time is no longer available. Please choose another.';draw();drawSlots();return;}
        const all=read(),old=all.find(b=>b.id===editing),id=editing||'DEMO-'+crypto.randomUUID().slice(0,8).toUpperCase();
        const record={id,name:el('guestName').value.trim(),service:el('service').value,date:selected,time,timezone:'America/Chicago',status:'reserved',mode:'demo',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
        if(!record.name){el('reservationStatus').textContent='Please enter a sample display name.';return;}
        localStorage.setItem(key,JSON.stringify([...all.filter(b=>b.id!==editing),record]));editing='';time='';el('demoConsent').checked=false;
        draw();drawSlots();drawSaved();el('reservationStatus').textContent=`${id} saved on this device. This is a demo only; no spa appointment was booked.`;
      };
      try{if(navigator.locks)await navigator.locks.request('soleful-bookings',save);else save();}catch{el('reservationStatus').textContent='Could not save. Browser storage may be disabled or full. No reservation was created.';}
    };
    el('exportBookings').onclick=()=>{const data={version:1,mode:'demo',exportedAt:new Date().toISOString(),bookings:read()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='soleful-demo-bookings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    window.addEventListener('storage',e=>{if(e.key===key){try{draw();drawSlots();drawSaved();}catch{el('calendarError').textContent='Saved demo data could not be read.';}}});
  }catch{el('calendarError').textContent='The demo calendar could not load. Please refresh or allow browser storage. For a real appointment, call (214) 277-4853.';el('calendarMonth').textContent='Calendar unavailable';}
})();
