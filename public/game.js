import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
const $=id=>document.getElementById(id);
let token=localStorage.getItem('ironToken')||'',profile=null,started=false,locked=false,ammo=8,health=100;
const socket=io();
// Bind PLAY ONLINE before building the 3D scene so a graphics initialization error
// cannot silently leave the main-menu button without a click handler.
$('deploy').onclick=()=>{
 if(!window.ironRenderer){
  $('message').textContent='Game graphics are still loading or WebGL failed. Refresh the page; if it continues, enable hardware acceleration in your browser.';
  return;
 }
 started=true;
 $('menu').classList.add('hidden');
 $('hud').style.display='block';
 $('status').textContent=socket.connected?'ONLINE':'CONNECTING';
 socket.emit('player:join',{token});
 window.ironRenderer.domElement.requestPointerLock?.();
};
window.addEventListener('error',e=>{
 const message='Game error: '+(e.message||'unknown error');
 const target=$('message'); if(target)target.textContent=message;
 console.error(message,e.error||'');
});
window.addEventListener('unhandledrejection',e=>{
 const message='Game loading error: '+(e.reason?.message||String(e.reason||'unknown error'));
 const target=$('message'); if(target)target.textContent=message;
 console.error(message,e.reason||'');
});
socket.on('connect',()=>{$('status').textContent='ONLINE';$('menuServer').textContent='ONLINE';$('menuServer').style.color='#b9d49f'});
socket.on('disconnect',()=>{$('status').textContent='RECONNECTING';$('menuServer').textContent='OFFLINE';$('menuServer').style.color='#d98a75'});
$('login').onclick=()=>auth('/api/login');$('register').onclick=()=>auth('/api/register');
async function auth(url){try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('username').value,password:$('password').value})});const d=await r.json();if(!r.ok)throw Error(d.error);token=d.token;profile=d;localStorage.setItem('ironToken',token);$('message').textContent='Signed in as '+d.username+' · progress will be saved.';refreshProfile(d);}catch(e){$('message').textContent=e.message;}}
function refreshProfile(p){if(!p)return;$('soldierName').textContent=p.username||'UNKNOWN SOLDIER';$('menuXp').textContent=(p.xp||0)+' XP';$('soldierRank').textContent=(p.xp||0)>=1000?'VETERAN':'RECRUIT';}
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87949a);scene.fog=new THREE.FogExp2(0x929b9b,.012);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,300);camera.position.set(0,1.7,8);camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
window.ironRenderer=renderer;
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc8d6df,0x302e27,1.75));
const sun=new THREE.DirectionalLight(0xffd6a1,2.8);sun.position.set(-28,42,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-48;sun.shadow.camera.right=48;sun.shadow.camera.top=48;sun.shadow.camera.bottom=-48;scene.add(sun);
const fill=new THREE.DirectionalLight(0x9bb9d1,.75);fill.position.set(20,12,-25);scene.add(fill);
const mat=(c,rough=1,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
const materials={
 stone:[mat(0x5c5a51),mat(0x716b5e),mat(0x827969),mat(0x474841),mat(0x989080)],
 brick:mat(0x66564a),dark:mat(0x252824),wood:mat(0x493626),metal:mat(0x353934,.55,.55),
 uniform:mat(0x414a3b),uniformLight:mat(0x59604a),skin:mat(0xb28e70),helmet:mat(0x343d31),
 leather:mat(0x30291f),glass:mat(0x242c2c,.25,.3),leaf:mat(0x3a483a),trunk:mat(0x453729)
};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(260,260),mat(0x56584e));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
const colliders=[],targets=new Map(),remote=new Map(),animated=[];
function addMesh(parent,geo,material,pos,rot,cast=true,receive=true){const m=new THREE.Mesh(geo,material);if(pos)m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=cast;m.receiveShadow=receive;parent.add(m);return m}
function box(x,y,z,w,h,d,color,collide=true,rotationY=0){const m=addMesh(scene,new THREE.BoxGeometry(w,h,d),typeof color==='number'?mat(color):color,[x,y,z],[0,rotationY,0]);if(collide)colliders.push(new THREE.Box3().setFromObject(m));return m}
function rubble(x,z,seed=0){for(let i=0;i<7;i++){const a=seed+i*2.399;const size=.18+((i*17+seed*3)%10)/22;const m=addMesh(scene,new THREE.DodecahedronGeometry(size,0),materials.stone[(i+seed)%materials.stone.length],[x+Math.sin(a)*1.8,size*.45,z+Math.cos(a)*1.7],[a*.7,a,a*.3]);m.scale.y=.45+((i+seed)%3)*.25}}
// A broken, bomb-damaged European street: a clear combat lane with ruined buildings.
for(let side of [-1,1]){
 for(let i=0;i<7;i++){
  const z=-8-i*10+(i%2)*1.7,x=side*(11+(i%3)*1.5),w=5.8+(i%3)*1.2,h=5.5+(i%4)*.9,d=6.4+(i%2)*1.2;
  const body=box(x,h/2-.1,z,w,h,d,materials.stone[(i+(side===1?1:0))%materials.stone.length],true,side*.035);
  // battered roofline and broken parapets
  box(x,h+.12,z,w+.25,.32,d+.25,0x393a34,true,side*.035);
  for(let k=0;k<5;k++){const wx=x-w/2+.45+k*(w-.8)/4;const wy=.95+(k%2)*.15;box(wx,wy,z-d/2-.06,.72,1.45,.15,k%2?0x292d2b:0x353632,false)}
  for(let row=0;row<2;row++)for(let k=0;k<4;k++){if((k+i+row)%3===0)continue;const wx=x-w/2+.6+k*(w-1.2)/3;box(wx,2.7+row*1.45,z-d/2-.075,.85,1.05,.12,0x272c2b,false)}
  // holes, fractured corners, exposed brick, and timber beams
  for(let j=0;j<4;j++){const px=x+(Math.random()-.5)*w*.75,pz=z+(Math.random()-.5)*d*.7;const shard=addMesh(scene,new THREE.DodecahedronGeometry(.45+Math.random()*.55,0),materials.stone[(j+i)%5],[px,h*.45+Math.random()*2,pz],[Math.random(),Math.random(),Math.random()]);shard.scale.set(1.2,.7,.65)}
  if(i%2===0){const beam=box(x-side*1.5,2.1,z-d/2-.4,.22,4.2,.22,materials.wood,false,side*.2);beam.rotation.z=.22;const beam2=box(x-side*1.6,2.6,z-d/2-.4,2.7,.18,.2,materials.wood,false,-.14);beam2.rotation.z=-.28}
  rubble(x-side*(w*.65),z,i+side*2);
 }
}
// Road, broken paving, muddy craters and scattered debris.
box(0,-.015,-42,13,.12,115,0x3b3d39,false);
for(let i=0;i<170;i++){
 const x=(Math.random()-.5)*27,z=5-Math.random()*100;
 if(Math.abs(x)<5.8)continue;
 const size=.12+Math.random()*.45;
 const m=addMesh(scene,new THREE.DodecahedronGeometry(size,0),materials.stone[Math.floor(Math.random()*5)],[x,size*.28,z],[Math.random()*3,Math.random()*3,Math.random()*3]);m.scale.y=.35+Math.random()*.6;
}
for(let i=0;i<12;i++){const x=(Math.random()-.5)*12,z=-8-i*7;const crater=addMesh(scene,new THREE.CircleGeometry(.65+Math.random()*.6,12),mat(0x282c29),[x,-.005,z],[-Math.PI/2,0,Math.random()]);crater.scale.y=.65}
// Barbed wire, broken fence stakes and a burnt-out truck wreck.
for(let side of [-1,1]){
 for(let i=0;i<9;i++){const x=side*(7.5+(i%2)*.45),z=-9-i*3.3;const post=box(x,.42,z,.09,.85,.09,0x44392d,false,side*.18);post.rotation.z=(i%2?.18:-.16);if(i<8){const wire=addMesh(scene,new THREE.CylinderGeometry(.018,.018,3.4,5),materials.metal,[side*7.7,.56,z-1.6],[Math.PI/2,0,0],false,false);wire.scale.y=1;}}
}
const wreck=new THREE.Group();wreck.position.set(4.8,.25,-29);wreck.rotation.y=-.22;scene.add(wreck);
addMesh(wreck,new THREE.BoxGeometry(2.5,.75,4.2),mat(0x343a35,.85,.45),[0,.55,0],[.08,0,.04]);
addMesh(wreck,new THREE.BoxGeometry(2.05,.7,1.75),mat(0x292f2d,.9,.35),[0,1.15,-.25],[.05,0,-.08]);
for(let side of [-1,1])for(let i=0;i<3;i++){addMesh(wreck,new THREE.CylinderGeometry(.36,.36,.18,12),mat(0x1b1d1b,.8,.3),[side*1.24,.34,-1.35+i*1.2],[0,0,Math.PI/2]);}
const wreckSmoke=[];
for(let i=0;i<22;i++){const p=addMesh(scene,new THREE.SphereGeometry(.3+Math.random()*.6,7,6),new THREE.MeshBasicMaterial({color:i%3?0x454744:0x786f5f,transparent:true,opacity:.1+Math.random()*.12,depthWrite:false}),[4.8+(Math.random()-.5)*1.2,1.7+Math.random()*5,-29+(Math.random()-.5)*1.3],null,false,false);p.userData={baseY:p.position.y,phase:Math.random()*8,scale:.6+Math.random()*1.8};wreckSmoke.push(p)}
// Sparse blackened trees beyond the ruins.
for(let i=0;i<38;i++){const side=i%2?1:-1,x=side*(19+Math.random()*28),z=-Math.random()*105;const height=3+Math.random()*3;const trunk=addMesh(scene,new THREE.CylinderGeometry(.09,.2,height,5),materials.trunk,[x,height/2,z],[Math.random()*.1,0,Math.random()*.18]);for(let j=0;j<3;j++){const branch=addMesh(scene,new THREE.CylinderGeometry(.035,.09,1.4,4),materials.trunk,[x+(Math.random()-.5)*.7,height*.55+j*.45,z],[Math.random()*.5,0,(Math.random()-.5)*1.1]);}for(let j=0;j<2;j++){const foliage=addMesh(scene,new THREE.ConeGeometry(1.2,2.7,5),materials.leaf,[x,height*.75+j*.7,z],[0,Math.random(),Math.PI+(Math.random()-.5)*.2]);foliage.scale.set(.8,1.2,.8)}}
// Distant smoke plumes, using translucent layered billows.
const distantSmoke=[];
for(let i=0;i<8;i++){const x=(Math.random()-.5)*50,z=-42-Math.random()*45;for(let j=0;j<5;j++){const s=.8+j*.35;const p=addMesh(scene,new THREE.SphereGeometry(s,8,7),new THREE.MeshBasicMaterial({color:j%2?0x535754:0x6e6b63,transparent:true,opacity:.09,depthWrite:false}),[x+j*.12,3+j*1.7,z],null,false,false);distantSmoke.push({mesh:p,base:p.position.clone(),phase:Math.random()*5})}}
// Small distant aircraft silhouette, moving slowly across the overcast sky.
const plane=new THREE.Group();scene.add(plane);plane.position.set(-24,23,-53);
addMesh(plane,new THREE.ConeGeometry(.18,3.5,5),mat(0x252a2b),[0,0,0],[Math.PI/2,0,0],false,false);
addMesh(plane,new THREE.BoxGeometry(5.5,.09,.55),mat(0x252a2b),[0,.05,0],null,false,false);
addMesh(plane,new THREE.BoxGeometry(2.1,.07,.38),mat(0x252a2b),[0,.18,1.05],null,false,false);
const collidableGround=colliders;
function buildRifle(){const group=new THREE.Group();const iron=mat(0x202522,.35,.65),wood=mat(0x68472c,.75),dark=mat(0x171b19,.5,.5);
 addMesh(group,new THREE.BoxGeometry(.12,.12,1.08),iron,[.32,-.25,-.72]);addMesh(group,new THREE.CylinderGeometry(.045,.045,.9,8),dark,[.32,-.25,-1.2],[Math.PI/2,0,0]);
 addMesh(group,new THREE.BoxGeometry(.19,.17,.7),wood,[.32,-.34,-.22]);addMesh(group,new THREE.BoxGeometry(.16,.22,.3),wood,[.32,-.43,.13],[.1,0,0]);addMesh(group,new THREE.BoxGeometry(.15,.12,.24),iron,[.32,-.29,-.58]);
 addMesh(group,new THREE.BoxGeometry(.035,.04,.13),iron,[.32,-.17,-1.28]);addMesh(group,new THREE.BoxGeometry(.04,.09,.05),iron,[.32,-.15,-.24]);addMesh(group,new THREE.BoxGeometry(.06,.11,.13),dark,[.32,-.39,-.65]);
 const handMat=mat(0x8e7056);const hand=addMesh(group,new THREE.BoxGeometry(.12,.1,.18),handMat,[.19,-.34,-.61]);hand.rotation.z=-.25;
 group.position.set(.06,-.01,0);return group}
const gun=buildRifle();camera.add(gun);scene.add(camera);
const ray=new THREE.Raycaster();let bots=[];
function limb(parent,material,a,b,r1,r2){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);const m=addMesh(parent,new THREE.CylinderGeometry(r2,r1,delta.length(),7),material,va.clone().add(vb).multiplyScalar(.5).toArray(),null,true,true);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m}
function makeSoldier(id,remotePlayer=false){
 const root=new THREE.Group();root.userData.id=id;const uniform=remotePlayer?mat(0x454f56):materials.uniform,uniform2=remotePlayer?mat(0x59616a):materials.uniformLight;
 const torso=addMesh(root,new THREE.BoxGeometry(.58,.7,.34),uniform,[0,1.22,0]);torso.rotation.x=-.04;
 addMesh(root,new THREE.BoxGeometry(.62,.22,.37),uniform2,[0,1.48,0]);
 const head=addMesh(root,new THREE.SphereGeometry(.19,12,10),materials.skin,[0,1.78,-.015]);head.scale.set(.9,1.15,.85);
 const helmet=addMesh(root,new THREE.SphereGeometry(.235,12,8),materials.helmet,[0,1.91,0]);helmet.scale.set(1.12,.65,1.02);
 addMesh(root,new THREE.BoxGeometry(.36,.045,.3),materials.helmet,[0,1.84,.02]);
 // Collar, pouches, straps, belt and field pack.
 limb(root,materials.leather,[-.18,1.43,.18],[.17,.99,.18],.035,.035);
 limb(root,materials.leather,[.17,1.43,.18],[-.18,.99,.18],.035,.035);
 addMesh(root,new THREE.BoxGeometry(.64,.08,.38),materials.leather,[0,.98,0]);
 for(let x of [-.22,0,.22])addMesh(root,new THREE.BoxGeometry(.13,.19,.1),materials.leather,[x,1.08,.2]);
 addMesh(root,new THREE.BoxGeometry(.4,.45,.22),uniform,[0,1.24,-.25]);
 const limbs=[];
 for(let side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.36,1.43,0);root.add(shoulder);
  const upper=addMesh(shoulder,new THREE.CylinderGeometry(.105,.13,.39,8),uniform,[0,-.19,0],[0,0,side*.16]);
  const elbow=new THREE.Group();elbow.position.set(0,-.37,.015);shoulder.add(elbow);
  addMesh(elbow,new THREE.CylinderGeometry(.085,.09,.34,8),uniform2,[0,-.16,.015],[0,0,-side*.1]);
  addMesh(elbow,new THREE.SphereGeometry(.085,8,7),materials.skin,[0,-.34,.03]);
  limbs.push({shoulder,elbow,side});
  const legPivot=new THREE.Group();legPivot.position.set(side*.16,.91,0);root.add(legPivot);
  addMesh(legPivot,new THREE.CylinderGeometry(.13,.1,.48,8),uniform,[0,-.24,0]);
  addMesh(legPivot,new THREE.BoxGeometry(.2,.16,.32),materials.leather,[0,-.51,.075]);
  limbs.push({legPivot,side,leg:true});
 }
 // Distinctive long rifle carried diagonally across the front.
 const rifle=new THREE.Group();root.add(rifle);rifle.position.set(.17,1.03,.26);rifle.rotation.x=.08;rifle.rotation.z=-.13;
 addMesh(rifle,new THREE.BoxGeometry(.095,.09,.72),materials.dark,[0,0,.1]);addMesh(rifle,new THREE.BoxGeometry(.12,.12,.36),materials.wood,[0,-.025,-.32]);addMesh(rifle,new THREE.CylinderGeometry(.025,.025,.43,6),materials.metal,[0,.005,.55],[Math.PI/2,0,0]);
 root.userData.limbs=limbs;root.userData.walkPhase=Math.random()*6;root.userData.remote=remotePlayer;
 return root;
}
function createBot(b){if(targets.has(b.id))return targets.get(b.id);const g=makeSoldier(b.id,false);g.position.set(b.x,0,b.z);scene.add(g);targets.set(b.id,g);return g}
function updateWorld(data){if(!data)return;if(data.bots){bots=data.bots;for(const b of bots){const g=createBot(b);g.position.set(b.x,0,b.z);g.visible=b.hp>0}}
 if(data.players){for(const p of data.players){if(p.id===socket.id)continue;let g=remote.get(p.id);if(!g){g=makeSoldier(p.id,true);scene.add(g);remote.set(p.id,g)}g.position.set(p.x,0,p.z);g.rotation.y=p.yaw||0;}for(const [id,g]of remote)if(!data.players.some(p=>p.id===id)){scene.remove(g);remote.delete(id)}}}
socket.on('world:init',updateWorld);socket.on('world:update',updateWorld);socket.on('players:update',ps=>updateWorld({players:ps}));
// PLAY ONLINE handler is registered before scene construction above.
socket.on('player:me',p=>{profile=p;$('score').textContent='XP '+p.xp+' · KILLS '+p.kills;refreshProfile(p)});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;$('hint').style.display=locked?'none':'block'});
renderer.domElement.addEventListener('click',()=>{if(started&&!locked)renderer.domElement.requestPointerLock()});
document.addEventListener('mousemove',e=>{if(!locked)return;camera.rotation.order='YXZ';camera.rotation.y-=e.movementX*.002;camera.rotation.x-=e.movementY*.002;camera.rotation.x=Math.max(-1.5,Math.min(1.5,camera.rotation.x))});
const keys={};document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR'){ammo=8;$('ammo').textContent=ammo}});document.addEventListener('keyup',e=>keys[e.code]=false);
document.addEventListener('mousedown',e=>{if(!started||!locked||e.button!==0)return;if(ammo<=0)return;ammo--;$('ammo').textContent=ammo;gun.position.z=.06;setTimeout(()=>gun.position.z=0,65);ray.setFromCamera(new THREE.Vector2(0,0),camera);const hits=ray.intersectObjects([...targets.values()].filter(g=>g.visible),true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.id)o=o.parent;if(o?.userData.id){$('hitMarker').style.display='block';setTimeout(()=>$('hitMarker').style.display='none',120);socket.emit('player:shoot',o.userData.id)}}});
const clock=new THREE.Clock();let elapsed=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
 if(started&&locked){const forward=new THREE.Vector3(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y));const right=new THREE.Vector3(forward.z,0,-forward.x);const move=new THREE.Vector3();if(keys.KeyW)move.addScaledVector(forward,-1);if(keys.KeyS)move.add(forward);if(keys.KeyA)move.addScaledVector(right,-1);if(keys.KeyD)move.addScaledVector(right,1);if(move.lengthSq()){move.normalize().multiplyScalar(5.4*dt);const next=camera.position.clone().add(move);const playerBox=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(next.x,.9,next.z),new THREE.Vector3(.6,1.8,.6));if(!colliders.some(c=>c.intersectsBox(playerBox)))camera.position.copy(next)}socket.emit('player:move',{x:camera.position.x,z:camera.position.z,yaw:camera.rotation.y)}
 }
 // Soldiers subtly shift their arms and legs to avoid the rigid mannequin look.
 for(const [id,g] of targets){const phase=elapsed*3+g.userData.walkPhase;g.rotation.y+=Math.sin(elapsed*.7+g.position.x)*.0006;for(const l of g.userData.limbs||[]){if(l.legPivot)l.legPivot.rotation.x=Math.sin(phase)*.06;if(l.shoulder)l.shoulder.rotation.x=Math.sin(phase+1)*.035;}}
 for(const [id,g] of remote){const phase=elapsed*4;for(const l of g.userData.limbs||[]){if(l.legPivot)l.legPivot.rotation.x=Math.sin(phase+g.position.x)*.04;if(l.shoulder)l.shoulder.rotation.x=Math.sin(phase+1)*.025;}}
 for(const p of wreckSmoke){p.position.y=p.userData.baseY+Math.sin(elapsed*.45+p.userData.phase)*.6+(elapsed*.12%2);p.position.x=4.8+Math.sin(elapsed*.23+p.userData.phase)*.55;p.scale.setScalar(p.userData.scale*(.8+.18*Math.sin(elapsed+p.userData.phase)));}
 for(const s of distantSmoke){s.mesh.position.y=s.base.y+Math.sin(elapsed*.2+s.phase)*.5;s.mesh.position.x=s.base.x+Math.sin(elapsed*.11+s.phase)*.3;}
 plane.position.x=-24+Math.sin(elapsed*.025)*8;plane.position.z=-53+Math.cos(elapsed*.025)*3;
 gun.position.y=-.01+Math.sin(elapsed*7)*.004*(started&&locked?1:0);
 renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const menuDetail=$('menuDetail');
const menuPanels={
 barracks:['BARRACKS','Your soldier profile and combat record. Sign in or create an account to save XP and kills between sessions.'],
 loadout:['FIELD LOADOUT','PRIMARY  M1 GARAND\nSECONDARY  SERVICE PISTOL\nEXPLOSIVE  FRAGMENTATION GRENADE\n\nAdditional weapons and perks will be added in future updates.'],
 settings:['SETTINGS','GRAPHICS  Balanced\nAUDIO  Browser default\nCONTROLS  WASD to move · Mouse to aim · Left click to fire · R to reload · ESC to release mouse'],
 credits:['CREDITS','IRON FRONT WWII is an independent browser-game prototype. Three.js rendering and Socket.IO multiplayer services. Not affiliated with any historical military organization.']
};
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.panel,data=menuPanels[key];if(!data)return;if(!menuDetail.hidden&&menuDetail.dataset.panel===key){menuDetail.hidden=true;menuDetail.innerHTML='';return}menuDetail.dataset.panel=key;menuDetail.innerHTML='<button class="detail-close" aria-label="Close">✕</button><h3>'+data[0]+'</h3><p>'+data[1].replace(/\n/g,'<br>')+'</p>';menuDetail.hidden=false;menuDetail.querySelector('.detail-close').onclick=()=>{menuDetail.hidden=true;menuDetail.innerHTML=''}}));
$('settingsShortcut').onclick=()=>document.querySelector('[data-panel="settings"]').click();
$('profileShortcut').onclick=()=>{$('username').focus();$('message').textContent='Sign in or create an account to save your soldier progress.'};
$('quitShortcut').onclick=()=>{if(started){document.exitPointerLock?.();started=false;$('hud').style.display='none';$('menu').classList.remove('hidden')}else $('message').textContent='You can close this browser tab to leave the game.'};
if(profile)refreshProfile(profile);
window.ironGameReady=true;
