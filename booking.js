'use strict';
(async () => {
  const cfg = window.SOLEFUL_SUPABASE;
  const $ = id => document.getElementById(id);
  const headers = { apikey: cfg.publishableKey, Authorization: `Bearer ${cfg.publishableKey}`, 'Content-Type': 'application/json' };
  let services = [], slots = [], month, selected = '', time = '';
  const fallbackServices = [
    {id:'702525d0-bc94-4dfe-9a01-5eb91d2683dd',name:'The Soleful Signature',description:'Customized full-body blend with complimentary hot towels and optional enhancements.',price_cents:10000,duration_minutes:60,bookable:true,active:true},
    {id:'3fb48b73-7a23-4614-931a-53a2714e62b4',name:'The Soleful Focus',description:'Grounding reflexology centered on the feet.',price_cents:10000,duration_minutes:60,bookable:true,active:true},
    {id:'8d742eee-2027-4416-a668-1087c0f244f9',name:'The Soleful Restore',description:'Focused deep tissue work for chronic tension and restriction.',price_cents:10000,duration_minutes:60,bookable:true,active:true},
    {id:'4c3d3977-a8a8-4cb4-9b27-f4aace30582c',name:'The Soulful Flow',description:'Licensed barefoot massage therapy with shiatsu-based bodywork and assisted stretching.',price_cents:10000,duration_minutes:60,bookable:true,active:true}
  ];
  const today = () => { const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const v={}; parts.forEach(p=>{if(p.type!=='literal')v[p.type]=p.value}); return `${v.year}-${v.month}-${v.day}`; };
  const labelDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const labelTime = t => { const [h,m] = t.slice(0,5).split(':'); return `${(+h%12)||12}:${m} ${+h>=12?'PM':'AM'}`; };
  const get = async path => { const r=await fetch(`${cfg.url}${path}`,{headers}); if(!r.ok) throw Error(await r.text()); return r.json(); };
  const post = async (path,body) => { const r=await fetch(`${cfg.url}${path}`,{method:'POST',headers,body:JSON.stringify(body)}); if(!r.ok) throw Error(await r.text()); return r.json(); };
  const node = (tag,text,cls) => { const n=document.createElement(tag); if(text)n.textContent=text; if(cls)n.className=cls; return n; };
  function fillServices(){ const select=$('service'); select.replaceChildren(); services.filter(s=>s.active!==false).forEach(s=>{ const o=node('option');o.value=s.id;o.textContent=s.name;o.dataset.name=s.name;select.append(o); }); const wanted=new URLSearchParams(location.search).get('service'); const match=services.find(s=>s.name===wanted); if(match)select.value=match.id; }
  function available(d){ return slots.filter(s=>s.appointment_date===d); }
  function draw(){
    $('calendarMonth').textContent=month.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
    const grid=$('calendarGrid');grid.replaceChildren();['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(x=>grid.append(node('span',x,'weekday')));
    for(let i=0;i<month.getUTCDay();i++)grid.append(node('span'));
    const days=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
    for(let i=1;i<=days;i++){
      const d=month.toISOString().slice(0,7)+'-'+String(i).padStart(2,'0'), past=d<today(), count=available(d).length;
      const b=node('button',null,`calendar-day availability-${count}${selected===d?' selected':''}`);b.type='button';b.disabled=past||!count;b.setAttribute('aria-label',`${labelDate(d)}, ${past?'past date':count+' open slots'}`);b.setAttribute('aria-pressed',String(selected===d));
      b.append(node('span',String(i)),node('small',past?'Past':`${count} open`));b.onclick=()=>{selected=d;time='';draw();drawSlots();};grid.append(b);
    }
  }
  function drawSlots(){
    $('selectedDate').textContent=selected?labelDate(selected):'2. Choose a date'; const area=$('availableSlots');area.replaceChildren();
    const day=available(selected); if(!selected)area.append(node('p','Select a colored date on the calendar.')); else if(!day.length)area.append(node('p','No open times on this date. Please choose another day.'));
    day.forEach(s=>{const b=node('button',labelTime(s.appointment_time),'slot'+(time===s.appointment_time?' selected':''));b.type='button';b.onclick=()=>{time=s.appointment_time;drawSlots();};area.append(b);});
    const service=services.find(s=>s.id===$('service').value), duration=$('duration')?.value||'60', price=duration==='60'?'$100':duration==='90'?'$150':'$200', durationLabel=duration==='120'?'2 hours':`${duration} minutes`;$('bookingSummary').textContent=selected&&time?`${service?.name||'Treatment'} · ${durationLabel} · ${price} · ${labelDate(selected)} · ${labelTime(time)} Dallas time`:'Choose a date and an open time to continue.';$('reserveButton').disabled=!(selected&&time);
  }
  function loadMonth(){ draw(); }
  try {
    try { services=await get('/rest/v1/services?active=eq.true&select=id,name,description,price_cents,duration_minutes,bookable,active&order=name'); } catch { services=[]; }
    if(!Array.isArray(services)||!services.length)services=fallbackServices;
    fillServices();
    const start=today(), end=new Date(`${start}T12:00:00Z`); end.setUTCDate(end.getUTCDate()+90);
    slots=await post('/rest/v1/rpc/available_slots',{p_start:start,p_end:end.toISOString().slice(0,10)});
    month=new Date(`${start.slice(0,7)}-01T12:00:00Z`); draw();drawSlots();
    $('service').onchange=drawSlots; if($('duration')) $('duration').onchange=drawSlots;
    $('previousMonth').onclick=()=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1,12));loadMonth();};
    $('nextMonth').onclick=()=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1,12));loadMonth();};
    $('reservationForm').onsubmit=async e=>{e.preventDefault();if(!e.target.reportValidity()||!selected||!time)return;const service=services.find(s=>s.id===$('service').value);try{const result=await post('/rest/v1/rpc/create_appointment',{p_service_id:service.id,p_guest_name:$('guestName').value,p_guest_email:$('guestEmail').value,p_guest_phone:$('guestPhone').value,p_appointment_date:selected,p_appointment_time:time,p_notes:`Session length: ${$('duration')?.value==='120'?'2 hours':($('duration')?.value||'60')+' minutes'} · Price: ${$('duration')?.value==='90'?'$150':$('duration')?.value==='120'?'$200':'$100'}${$('guestNotes').value?' · '+$('guestNotes').value:''}`});$('reservationStatus').textContent=`Request received. Confirmation ID: ${result.id||result[0]?.id||'provided by the spa'}. The spa will contact you to confirm.`;slots=slots.filter(s=>!(s.appointment_date===selected&&s.appointment_time===time));time='';draw();drawSlots();e.target.reset();}catch(err){$('reservationStatus').textContent=err.message.includes('taken')?'That slot was just taken. Choose another time.':'The request could not be saved. Please call (214) 277-4853.';}};
  } catch(err) { $('calendarError').textContent='The live booking calendar could not connect. Please call (214) 277-4853.'; $('calendarMonth').textContent='Calendar unavailable'; }
})();
