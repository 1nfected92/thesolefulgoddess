(function(){
'use strict';
const cfg=window.SOLEFUL_SUPABASE||{url:'https://aqxuzjnlfjfcvjdlrheu.supabase.co',publishableKey:'sb_publishable_-n4F3QGvUELj94RKcEzVVg__eho0yX5'};
const ownerEmail='mcastro@thesolefulgoddess.com';
var appointments=[],services=[],gallery=[],hours=[];
const q=function(id){return document.getElementById(id)};
function restClient(base,key){
  var token=localStorage.getItem('soleful-owner-access')||key;
  function req(path,opt){
    opt=opt||{};
    var h=Object.assign({apikey:key,Authorization:'Bearer '+token},opt.headers||{});
    if(opt.body && !(opt.body instanceof File)) h['Content-Type']='application/json';
    return fetch(base+path,Object.assign({},opt,{headers:h})).then(async function(r){
      var text=await r.text(),data=text?JSON.parse(text):null;
      if(!r.ok) throw new Error((data&&data.message)||(data&&data.error_description)||text||('HTTP '+r.status));
      return data;
    });
  }
  function chain(table){
    var method='GET',body=null,params=[],headers={Prefer:'return=representation'};
    var x={
      select:function(v){params.push('select='+encodeURIComponent(v));return x},
      order:function(col,o){params.push('order='+encodeURIComponent(col)+'.'+(o&&o.ascending===false?'desc':'asc'));return x},
      eq:function(col,v){params.push(encodeURIComponent(col)+'=eq.'+encodeURIComponent(v));return x},
      single:function(){params.push('limit=1');x._single=true;return x},
      maybeSingle:function(){params.push('limit=1');x._maybe=true;return x},
      insert:function(v){method='POST';body=v;return x},
      update:function(v){method='PATCH';body=v;return x},
      delete:function(){method='DELETE';return x},
      then:function(resolve,reject){
        var p=req('/rest/v1/'+table+'?'+params.join('&'),{method:method,body:body?JSON.stringify(body):undefined,headers:headers})
          .then(function(data){
            if(x._single && !data.length)return {data:null,error:new Error('No row found')};
            return {data:x._single?data[0]:(x._maybe?(data[0]||null):data),error:null};
          })
          .catch(function(error){return {data:null,error:error}});
        return p.then(resolve,reject);
      }
    };
    return x;
  }
  var client={
    from:chain,
    auth:{
      getSession:function(){
        var raw=localStorage.getItem('soleful-owner-session');
        return Promise.resolve({data:{session:raw?JSON.parse(raw):null},error:null});
      },
      signInWithPassword:function(v){
        return req('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify(v)})
          .then(function(s){
            token=s.access_token;
            localStorage.setItem('soleful-owner-access',s.access_token);
            localStorage.setItem('soleful-owner-session',JSON.stringify(s));
            return {data:{session:s,user:s.user},error:null};
          })
          .catch(function(error){return {data:{},error:error}});
      },
      signOut:function(){
        localStorage.removeItem('soleful-owner-access');
        localStorage.removeItem('soleful-owner-session');
        return Promise.resolve({error:null});
      }
    },
    storage:{
      from:function(bucket){
        return {
          upload:function(path,file){
            return req('/storage/v1/object/'+bucket+'/'+path,{method:'POST',body:file,headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'}})
              .then(function(data){return {data:data,error:null}})
              .catch(function(error){return {data:null,error:error}});
          },
          remove:function(paths){
            return req('/storage/v1/object/remove/'+bucket,{method:'POST',body:JSON.stringify({prefixes:paths})})
              .then(function(data){return {data:data,error:null}})
              .catch(function(error){return {data:null,error:error}});
          },
          getPublicUrl:function(path){
            return {data:{publicUrl:base+'/storage/v1/object/public/'+bucket+'/'+path}};
          }
        };
      }
    }
  };
  return client;
}
const sb=restClient(cfg.url,cfg.publishableKey);
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function dateLabel(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
function timeLabel(t){var p=String(t).slice(0,5).split(':').map(Number);return (p[0]%12||12)+':'+String(p[1]).padStart(2,'0')+' '+(p[0]>=12?'PM':'AM')}
function money(c){return c==null?'On request':'$'+(Number(c)/100).toFixed(0)}
function status(id,text,ok){var e=q(id);if(e){e.textContent=text;e.className=ok?'success':'error'}}
function showTab(n){document.querySelectorAll('.owner-tabs button').forEach(function(b){b.classList.toggle('active',b.dataset.tab===n)});document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.toggle('active',p.dataset.panel===n)});if(n==='bookings')renderBookings();if(n==='clients')renderClients();if(n==='services')renderServices();if(n==='gallery')renderGallery();if(n==='hours')renderHours()}
function loadAll(){return Promise.all([sb.from('owner_profiles').select('display_name,username').single(),sb.from('services').select('*').order('name'),sb.from('gallery_items').select('*').order('sort_order').order('created_at'),sb.from('appointments').select('*').order('appointment_date',{ascending:false}).order('appointment_time',{ascending:false}),sb.from('business_hours').select('*').order('weekday'),sb.from('site_settings').select('*').eq('id',1).single()]).then(function(a){if(a[0].error)throw a[0].error;services=a[1].data||[];gallery=a[2].data||[];appointments=a[3].data||[];hours=a[4].data||[];q('ownerEmail').textContent=a[0].data.display_name+' · @'+a[0].data.username;q('homeHeadline').value=a[5].data&&a[5].data.headline||'';q('homeSubtitle').value=a[5].data&&a[5].data.subtitle||'';q('homeCta').value=a[5].data&&a[5].data.cta_label||'';q('statBookings').textContent=appointments.filter(function(x){return ['cancelled','completed','no_show'].indexOf(x.status)<0}).length;q('statClients').textContent=new Set(appointments.map(function(x){return (x.guest_email||'').toLowerCase()}).filter(Boolean)).size;q('statServices').textContent=services.filter(function(x){return x.active}).length;renderBookings();renderClients();renderServices();renderGallery();renderHours()})}
function renderBookings(){var body=q('bookingsTable');if(!body)return;body.replaceChildren();var q=(q('bookingSearch').value||'').toLowerCase(),st=q('bookingStatus').value,rows=appointments.filter(function(a){return(!st||a.status===st)&&[a.guest_name,a.guest_email,a.guest_phone].join(' ').toLowerCase().indexOf(q)>=0});if(!rows.length){body.innerHTML='<tr><td colspan="5"><div class="empty-state">No matching bookings.</div></td></tr>';return}rows.forEach(function(a){var s=services.find(function(x){return x.id===a.service_id}),tr=document.createElement('tr');tr.innerHTML='<td><strong>'+dateLabel(a.appointment_date)+'</strong><br>'+timeLabel(a.appointment_time)+'</td><td><strong>'+esc(a.guest_name)+'</strong><br><span class="muted">'+esc(a.guest_email)+'<br>'+esc(a.guest_phone||'—')+'</span></td><td>'+esc(s&&s.name||'Unknown')+'<br><span class="muted">'+money(s&&s.price_cents)+'</span></td><td><select class="status-select" data-id="'+a.id+'">'+['requested','confirmed','completed','cancelled','no_show'].map(function(x){return '<option '+(x===a.status?'selected':'')+'>'+x+'</option>'}).join('')+'</select></td><td>'+esc(a.notes||'—')+'</td>';body.append(tr)});document.querySelectorAll('.status-select').forEach(function(x){x.onchange=function(){return sb.from('appointments').update({status:x.value,updated_at:new Date().toISOString()}).eq('id',x.dataset.id).then(function(r){if(r.error)alert(r.error.message);else{var a=appointments.find(function(v){return v.id===x.dataset.id});if(a)a.status=x.value}})}})}
function renderClients(){var el=q('clientsList');if(!el)return;var q=(q('clientSearch').value||'').toLowerCase(),map={};appointments.forEach(function(a){var e=(a.guest_email||'').toLowerCase();if(!e)return;if(!map[e])map[e]={email:e,name:a.guest_name,phone:a.guest_phone,visits:[]};map[e].visits.push(a)});var rows=Object.keys(map).map(function(k){return map[k]}).filter(function(c){return(c.name+' '+c.email+' '+(c.phone||'')).toLowerCase().indexOf(q)>=0}).sort(function(a,b){return a.name.localeCompare(b.name)});el.replaceChildren();if(!rows.length){el.innerHTML='<div class="empty-state">No clients match that search.</div>';return}rows.forEach(function(c){var d=document.createElement('article');d.className='client-card';d.innerHTML='<h3>'+esc(c.name)+'</h3><div class="client-meta"><span>'+esc(c.email)+'</span><span>'+esc(c.phone||'No phone')+'</span><span>'+c.visits.length+' visit'+(c.visits.length===1?'':'s')+'</span></div><div class="client-visits">'+c.visits.map(function(a){return '<span class="status-pill">'+dateLabel(a.appointment_date)+' · '+esc((services.find(function(s){return s.id===a.service_id})||{}).name||'Service')+' · '+a.status+'</span>'}).join('')+'</div>';el.append(d)})}
function renderServices(){var el=q('servicesList');el.replaceChildren();services.forEach(function(s){var d=document.createElement('article');d.className='manage-row';d.innerHTML='<div><h3>'+esc(s.name)+'</h3><p>'+esc(s.description||'No description')+' · '+money(s.price_cents)+' · '+(s.duration_minutes||'—')+' min · '+(s.active?'Active':'Hidden')+' · '+(s.bookable?'Bookable':'Not bookable')+'</p></div><div class="row-actions"><button class="small-button edit-service" data-id="'+s.id+'">Edit</button><button class="small-button danger delete-service" data-id="'+s.id+'">Delete</button></div>';el.append(d)});document.querySelectorAll('.edit-service').forEach(function(b){b.onclick=function(){var s=services.find(function(x){return x.id===b.dataset.id});q('serviceForm').hidden=false;q('serviceId').value=s.id;q('serviceName').value=s.name;q('serviceDescription').value=s.description||'';q('servicePrice').value=(s.price_cents||0)/100;q('serviceDuration').value=s.duration_minutes||60;q('serviceActive').checked=s.active;q('serviceBookable').checked=s.bookable}});document.querySelectorAll('.delete-service').forEach(function(b){b.onclick=function(){if(!confirm('Delete this service?'))return;sb.from('services').delete().eq('id',b.dataset.id).then(function(r){if(r.error)alert(r.error.message);else{services=services.filter(function(s){return s.id!==b.dataset.id});renderServices()}})}})}
function renderGallery(){var el=q('galleryList');el.replaceChildren();if(!gallery.length){el.innerHTML='<div class="empty-state">No gallery uploads yet.</div>';return}gallery.forEach(function(g){var d=document.createElement('article');d.className='media-card';d.innerHTML='<img src="'+esc(g.public_url)+'" alt="'+esc(g.alt_text)+'"><div class="media-foot"><p>'+esc(g.caption||g.alt_text)+'</p><button class="small-button danger delete-gallery" data-id="'+g.id+'">Delete</button></div>';el.append(d)});document.querySelectorAll('.delete-gallery').forEach(function(b){b.onclick=function(){var g=gallery.find(function(x){return x.id===b.dataset.id});if(!g||!confirm('Delete this image?'))return;sb.storage.from('site-media').remove([g.storage_path]).then(function(r){if(r.error)throw r.error;return sb.from('gallery_items').delete().eq('id',g.id)}).then(function(r){if(r.error)alert(r.error.message);else{gallery=gallery.filter(function(x){return x.id!==g.id});renderGallery()}}).catch(function(e){alert(e.message)})}})}
function renderHours(){var el=q('hoursList');el.replaceChildren();hours.forEach(function(h){var d=document.createElement('div');d.className='hours-row';d.dataset.weekday=h.weekday;d.innerHTML='<strong>'+esc(h.day_name)+'</strong><label class="check"><input type="checkbox" data-key="is_open" '+(h.is_open?'checked':'')+'> Open</label><input data-key="open_time" type="time" value="'+(h.open_time||'')+'" '+(h.is_open?'':'disabled')+'><input data-key="close_time" type="time" value="'+(h.close_time||'')+'" '+(h.is_open?'':'disabled')+'><select data-key="slot_interval_minutes"><option '+(h.slot_interval_minutes===60?'selected':'')+'>60</option><option '+(h.slot_interval_minutes===90?'selected':'')+'>90</option><option '+(h.slot_interval_minutes===120?'selected':'')+'>120</option></select>';el.append(d);d.querySelector('input[type=checkbox]').onchange=function(e){d.querySelectorAll('input[type=time]').forEach(function(x){x.disabled=!e.target.checked})}})}
function boot(){return sb.auth.getSession().then(function(x){if(!x.data.session)return;return sb.from('owner_profiles').select('id').eq('id',x.data.session.user.id).maybeSingle().then(function(o){if(o.error||!o.data){sb.auth.signOut();status('authStatus','Authenticated account is not an authorized owner. Add it to owner_profiles first.');return}q('authCard').hidden=true;q('dashboard').hidden=false;return loadAll().catch(function(e){q('dashboard').innerHTML='<div class="owner-card"><h2>Dashboard could not load</h2><p class="error">'+esc(e.message)+'</p></div>'})})})}
q('loginForm').onsubmit=function(e){e.preventDefault();status('authStatus','Signing in…',true);var id=q('loginId').value.trim(),email=id.toLowerCase()==='mcastro'?ownerEmail:id;sb.auth.signInWithPassword({email:email,password:q('loginPassword').value}).then(function(r){if(r.error)status('authStatus','Sign-in failed. Check the owner Auth user and password.');else boot()})};
q('showSetup').onclick=function(){q('setupBox').hidden=!q('setupBox').hidden};q('logout').onclick=function(){sb.auth.signOut().then(function(){location.reload()})};
document.querySelectorAll('.owner-tabs button').forEach(function(b){b.onclick=function(){showTab(b.dataset.tab)}});document.querySelectorAll('[data-jump]').forEach(function(b){b.onclick=function(){showTab(b.dataset.jump)}});q('bookingSearch').oninput=renderBookings;q('bookingStatus').onchange=renderBookings;q('clientSearch').oninput=renderClients;
q('newService').onclick=function(){q('serviceForm').hidden=false;q('serviceForm').reset();q('serviceId').value='';q('serviceActive').checked=true;q('serviceBookable').checked=true};q('cancelService').onclick=function(){q('serviceForm').hidden=true};
q('serviceForm').onsubmit=function(e){e.preventDefault();var id=q('serviceId').value,p={name:q('serviceName').value.trim(),description:q('serviceDescription').value.trim(),price_cents:Math.round(Number(q('servicePrice').value)*100),duration_minutes:Number(q('serviceDuration').value),active:q('serviceActive').checked,bookable:q('serviceBookable').checked};var q=id?sb.from('services').update(p).eq('id',id):sb.from('services').insert(p);q.then(function(r){if(r.error)status('serviceStatus',r.error.message);else{q('serviceForm').hidden=true;return sb.from('services').select('*').order('name').then(function(x){services=x.data||[];renderServices();q('statServices').textContent=services.filter(function(s){return s.active}).length})}})};
q('galleryUpload').onchange=function(e){var f=e.target.files[0];if(!f)return;status('galleryStatus','Uploading…',true);var path='gallery/'+crypto.randomUUID()+'-'+f.name.replace(/[^a-z0-9._-]/gi,'-');sb.storage.from('site-media').upload(path,f,{contentType:f.type}).then(function(r){if(r.error)throw r.error;var u=sb.storage.from('site-media').getPublicUrl(path).data.publicUrl;return sb.from('gallery_items').insert({storage_path:path,public_url:u,alt_text:'The Soleful Goddess wellness spa'})}).then(function(r){if(r.error)throw r;status('galleryStatus','Image uploaded.',true);return sb.from('gallery_items').select('*').order('sort_order').order('created_at')}).then(function(r){gallery=r.data||[];renderGallery()}).catch(function(e){status('galleryStatus',e.message)})};
q('homeForm').onsubmit=function(e){e.preventDefault();var f=q('heroUpload').files[0],p={id:1,headline:q('homeHeadline').value.trim(),subtitle:q('homeSubtitle').value.trim(),cta_label:q('homeCta').value.trim(),updated_at:new Date().toISOString()};var work=Promise.resolve();if(f){var path='homepage/'+crypto.randomUUID()+'-'+f.name.replace(/[^a-z0-9._-]/gi,'-');work=sb.storage.from('site-media').upload(path,f,{contentType:f.type}).then(function(r){if(r.error)throw r.error;p.hero_image_path=path;p.hero_image_url=sb.storage.from('site-media').getPublicUrl(path).data.publicUrl})}work.then(function(){return sb.from('site_settings').upsert(p)}).then(function(r){if(r.error)status('homeStatus',r.error.message);else status('homeStatus','Homepage settings saved.',true)}).catch(function(e){status('homeStatus',e.message)})};
q('saveHours').onclick=function(){var rows=[...document.querySelectorAll('.hours-row')];var chain=Promise.resolve();rows.forEach(function(row){chain=chain.then(function(){var get=function(k){return row.querySelector('[data-key="'+k+'"]')},open=get('is_open').checked;return sb.from('business_hours').update({is_open:open,open_time:open?get('open_time').value:null,close_time:open?get('close_time').value:null,slot_interval_minutes:Number(get('slot_interval_minutes').value),updated_at:new Date().toISOString()}).eq('weekday',row.dataset.weekday).then(function(r){if(r.error)throw r.error})})});chain.then(function(){status('hoursStatus','Business hours saved. Live booking availability is updated.',true)}).catch(function(e){status('hoursStatus',e.message)})};
boot();
})();
