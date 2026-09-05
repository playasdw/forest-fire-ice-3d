'use strict';
// Dependency-free WebGL: true 3D meshes, depth testing and a fixed orthographic camera.
const canvas=document.getElementById('world'), gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){document.getElementById('panelTitle').textContent='需要开启 3D 图形支持';document.getElementById('panelText').textContent='请使用支持 WebGL 的浏览器，并开启硬件加速后刷新。';document.getElementById('play').disabled=true;throw new Error('WebGL unavailable');}
const vs='attribute vec3 p;attribute vec3 n;uniform mat4 vp;uniform vec3 pos;uniform vec3 scale;uniform float rot;varying float light;varying float depth;void main(){float c=cos(rot),s=sin(rot);vec3 q=p*scale;vec3 w=vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z)+pos;vec3 nn=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);light=.48+.52*max(dot(nn,normalize(vec3(-.5,1.,.6))),0.);depth=length(w.xz)/32.;gl_Position=vp*vec4(w,1.);}';
const fs='precision mediump float;uniform vec3 color;uniform float glow;varying float light;varying float depth;void main(){vec3 col=color*mix(light,1.15,glow);col=mix(col,vec3(.037,.094,.099),clamp(depth*.28,0.,.3));gl_FragColor=vec4(col,1.);}';
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc={};for(const k of ['vp','pos','scale','rot','color','glow'])loc[k]=gl.getUniformLocation(program,k);loc.p=gl.getAttribLocation(program,'p');loc.n=gl.getAttribLocation(program,'n');gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.n);gl.enable(gl.DEPTH_TEST);
function mesh(triangles){const data=[];for(const t of triangles){let a=t[0],b=t[1],c=t[2],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];let len=Math.hypot(...n)||1;n=n.map(x=>x/len);for(const p of t)data.push(...p,...n);}const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return{buf,count:data.length/6};}
const pts=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
const cube=mesh([[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]].flatMap(f=>[[pts[f[0]],pts[f[1]],pts[f[2]]],[pts[f[0]],pts[f[2]],pts[f[3]]]]));
function radial(sides,top,bottom){const out=[];for(let i=0;i<sides;i++){let a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;let p=[Math.cos(a)*bottom,-.5,Math.sin(a)*bottom],q=[Math.cos(b)*bottom,-.5,Math.sin(b)*bottom],r=[Math.cos(b)*top,.5,Math.sin(b)*top],s=[Math.cos(a)*top,.5,Math.sin(a)*top];out.push([p,s,r],[p,r,q],[[0,.5,0],r,s],[[0,-.5,0],p,q]);}return mesh(out);}
const cylinder=radial(12,.5,.5),cone=radial(7,0,.5);
const diamond=mesh(Array.from({length:4},(_,i)=>{const a=i*Math.PI/2,b=(i+1)*Math.PI/2;const p=[Math.cos(a)*.5,0,Math.sin(a)*.5],q=[Math.cos(b)*.5,0,Math.sin(b)*.5];return[[[0,.75,0],q,p],[[0,-.65,0],p,q]];}).flat());
const C={stone:[.31,.39,.34],lightStone:[.44,.51,.4],dark:[.12,.22,.21],edge:[.19,.28,.25],moss:[.32,.4,.22],gold:[.77,.73,.43],fire:[1,.32,.12],ice:[.25,.76,.9],poison:[.51,.77,.18],trunk:[.20,.25,.18],leaf:[.13,.29,.23],white:[.96,.95,.8]};
const staticObjects=[];function add(m,x,y,z,sx,sy,sz,color,rot=0,glow=0){staticObjects.push({m,x,y,z,sx,sy,sz,color,rot,glow});}
function draw(m,x,y,z,sx,sy,sz,color,rot=0,glow=0){gl.bindBuffer(gl.ARRAY_BUFFER,m.buf);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,24,12);gl.uniform3f(loc.pos,x,y,z);gl.uniform3f(loc.scale,sx,sy,sz);gl.uniform3fv(loc.color,color);gl.uniform1f(loc.rot,rot);gl.uniform1f(loc.glow,glow);gl.drawArrays(gl.TRIANGLES,0,m.count);}
function mult(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let i=0;i<4;i++)for(let j=0;j<4;j++)r[c*4+i]+=a[j*4+i]*b[c*4+j];return r;}
function norm(v){let l=Math.hypot(...v);return v.map(x=>x/l);}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function dot(a,b){return a.reduce((s,x,i)=>s+x*b[i],0);}
function camera(){const w=canvas.clientWidth,h=canvas.clientHeight,ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);gl.viewport(0,0,canvas.width,canvas.height);const aspect=w/h,half=Math.max(11.8,14/aspect),eye=[13,24,29],target=[0,0,0],z=norm(eye.map((x,i)=>x-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);const projection=new Float32Array([1/(half*aspect),0,0,0,0,1/half,0,0,0,0,-2/100,0,0,0,-1,1]);gl.uniformMatrix4fv(loc.vp,false,mult(projection,view));}
window.addEventListener('resize',camera);camera();
let seed=11;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const keys=new Set();const names=['苏醒的神殿','翡翠回廊','双生的试炼'];let level=0,mode='intro',time=0,last=performance.now(),sound=false,audioCtx,selected=0,toastEnd=0,deaths=0;
let players=[],gems=[],pools=[],sigils=[],doors=[],gateOpen=false,gateAnim=0,particles=[];
const $=id=>document.getElementById(id);
function ping(freq=600){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.5,audioCtx.currentTime+.12);g.gain.setValueAtTime(.08,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.25);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.25);}catch{}}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');toastEnd=performance.now()+2800;}
function burst(x,y,z,color){for(let i=0;i<15;i++)particles.push({x,y,z,vx:(rand()-.5)*3,vy:rand()*4,vz:(rand()-.5)*3,life:.7+rand()*.5,color});}
function tree(x,z,h){add(cylinder,x,h*.28-1,z,.55,h*.7,.55,C.trunk);for(let k=0;k<3;k++)add(cone,x,h*.4+k*h*.18-1,z,3.4-k*.7,h*.6,3.4-k*.7,[.09+k*.025,.23+k*.025,.19+k*.016],k*.4);}
function init(l){level=l;time=0;deaths=0;gateOpen=false;gateAnim=0;particles=[];keys.clear();staticObjects.length=0;seed=11;
 players=[{x:-8,y:0,z:-3,v:0,color:C.fire,type:0,count:0,angle:0,walk:0,inv:0},{x:-8,y:0,z:3,v:0,color:C.ice,type:1,count:0,angle:0,walk:0,inv:0}];
 gems=[];for(let t=0;t<2;t++)for(let i=0;i<3;i++)gems.push({x:[-6,-2,6][i],z:(t===0?-1:1)*[3,4.7,3][i],type:t,taken:false});
 sigils=[{x:-.8,z:-4,type:0,on:false},{x:-.8,z:4,type:1,on:false}];doors=[{x:8.4,z:-3,type:0},{x:8.4,z:3,type:1}];
 pools=[{x:-4,z:-3,w:1.4,d:4,type:0},{x:-4,z:3,w:1.4,d:4,type:1},{x:3.7,z:0,w:1.2,d:8,type:2}];
 if(l>=1)pools.push({x:-6.6,z:0,w:3,d:1.2,type:2},{x:6,z:-5,w:2.5,d:1,type:1},{x:6,z:5,w:2.5,d:1,type:0});
 if(l>=2){pools.push({x:-1.7,z:0,w:2.3,d:1.1,type:2},{x:6.3,z:0,w:1,d:4,type:2});gems[2].z=-4;gems[5].z=4;}
 add(cube,0,-1.2,0,20.6,2.2,14.6,C.edge);add(cube,0,-2.2,0,18.7,.5,12.8,C.dark);
 for(let x=-9.5;x<10;x++)for(let z=-6.5;z<7;z++){const n=rand()*.06;add(cube,x,-.08,z,.98,.22,.98,[.32+n,.4+n,.34+n]);if(rand()<.045)add(cube,x,.037,z,.55,.014,.6,C.moss);}
 for(let x=-10;x<=10;x+=2){add(cube,x,.25,-7.15,1.85,.55,.5,C.lightStone);add(cube,x,.25,7.15,1.85,.55,.5,C.stone);}for(let z=-6;z<=6;z+=2){add(cube,-10.15,.25,z,.5,.55,1.85,C.lightStone);add(cube,10.15,.25,z,.5,.55,1.85,C.stone);}
 for(const x of [-9,9])for(const z of [-6,6]){add(cube,x,.25,z,1.1,.5,1.1,C.dark);add(cylinder,x,1.35,z,.65,2.1,.65,C.lightStone);add(cube,x,2.5,z,1,.3,1,C.gold);add(cone,x,3,z,.7,.8,.7,C.moss);}
 for(let i=0;i<35;i++){let x=(rand()-.5)*40,z=(rand()-.5)*32;if(Math.abs(x)<12&&Math.abs(z)<9){if(i%2)x=(x<0?-1:1)*(12+rand()*5);else z=(z<0?-1:1)*(10+rand()*5);}tree(x,z,3+rand()*4);}
 add(cube,0,-3.6,0,120,.5,120,[.055,.13,.12]);
 for(const p of pools){const col=[C.fire,C.ice,C.poison][p.type];add(cube,p.x,.015,p.z,p.w+.18,.08,p.d+.18,C.dark);add(cube,p.x,.066,p.z,p.w,.055,p.d,col,0,.4);}
 for(const s of sigils){add(cylinder,s.x,.12,s.z,1.1,.22,1.1,C.dark);add(cylinder,s.x,.25,s.z,.78,.08,.78,s.type?C.ice:C.fire,0,.2);}
 for(const d of doors){const c=d.type?C.ice:C.fire;add(cube,d.x,.12,d.z,1.8,.24,1.9,C.dark);for(const side of [-1,1])add(cube,d.x+side*.8,1.4,d.z,.3,2.8,.45,C.lightStone);add(cube,d.x,2.85,d.z,1.9,.35,.6,C.gold);add(diamond,d.x,3.38,d.z,.55,.55,.55,c,0,.8);add(cube,d.x,.29,d.z,1.2,.05,1.3,c,0,.7);}
 for(const z of [-6.5,6.5]){add(cube,1,1.4,z,1,2.8,1,C.dark);add(cube,1,2.9,z,1.2,.3,1.2,C.gold);}
 $('level').textContent=`0${l+1} / 03`;$('levelName').textContent=names[l];updateHud();
}
function updateHud(){$('redCount').textContent=players[0].count+' / 3';$('blueCount').textContent=players[1].count+' / 3';$('sigils').textContent=sigils.map(s=>s.on?'◆':'◇').join('　');$('objective').textContent=gateOpen?'石门已开启 · 收齐宝石后，两人分别站进同色出口':'收集宝石 · 点亮两座元素祭坛 · 一起抵达出口';}
function showPanel(title,text,label,showRules=false){$('panelTitle').textContent=title;$('panelText').innerHTML=text;$('play').innerHTML=label+' <span>→</span>';$('rules').style.display=showRules?'block':'none';$('overlay').classList.remove('hidden');keys.clear();}
function run(){mode='playing';$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';keys.clear();last=performance.now();}
$('play').onclick=()=>{if(mode==='won'){if(level<2)init(level+1);else init(0);}run();};
function pause(){if(mode==='playing'){mode='paused';$('pause').textContent='▶';showPanel('在林间歇一会儿','旅程已暂停，守护者正在等待你。','继续冒险');}else if(mode==='paused')run();}
$('pause').onclick=pause;$('help').onclick=()=>{if(mode==='won')return;mode='paused';showPanel('同行指南','火人：WASD 移动，空格跳跃。<br>冰人：方向键移动，Enter 跳跃。', '返回冒险',true);};
$('restart').onclick=()=>{init(level);run();toast('本关已重新开始');};$('sound').onclick=()=>{sound=!sound;$('sound').textContent='音效 '+(sound?'开':'关');$('sound').setAttribute('aria-label',sound?'关闭音效':'开启音效');ping();};
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){pause();return;}if(e.code==='KeyR'&&mode!=='intro'){init(level);run();return;}if(e.code==='Enter'&&mode!=='playing'){if(mode==='intro'||mode==='paused')run();return;}if(mode==='playing')keys.add(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
$('switch').onclick=()=>{selected=1-selected;keys.clear();$('switch').textContent='切换：'+(selected?'冰人':'火人');$('switch').style.color=selected?'#79d9f0':'#ff9b62';};
for(const b of document.querySelectorAll('[data-key],#jump')){let held;const release=()=>{if(held)keys.delete(held);held=null;};b.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing')return;const map=selected?{up:'ArrowUp',left:'ArrowLeft',down:'ArrowDown',right:'ArrowRight'}:{up:'KeyW',left:'KeyA',down:'KeyS',right:'KeyD'};held=b.id==='jump'?(selected?'Enter':'Space'):map[b.dataset.key];keys.add(held);b.setPointerCapture(e.pointerId);});b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);}
function die(p){deaths++;burst(p.x,.7,p.z,p.color);p.x=-8;p.z=p.type?3:-3;p.y=0;p.v=0;p.inv=1;ping(120);toast((p.type?'冰人':'火人')+'回到了起点 · 已收集的宝石保留');}
function update(dt){time+=dt;$('timer').textContent=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;
 for(const p of players){const codes=p.type?['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter']:['KeyA','KeyD','KeyW','KeyS','Space'];let dx=(keys.has(codes[1])?1:0)-(keys.has(codes[0])?1:0),dz=(keys.has(codes[3])?1:0)-(keys.has(codes[2])?1:0);if(dx||dz){const len=Math.hypot(dx,dz);dx/=len;dz/=len;p.angle=Math.atan2(dx,dz);p.walk+=dt*12;}else p.walk=0;
 if(keys.has(codes[4])&&p.y===0){p.v=6.2;ping(260);keys.delete(codes[4]);}p.v-=17*dt;p.y=Math.max(0,p.y+p.v*dt);if(p.y===0)p.v=0;
 let nx=Math.max(-9.55,Math.min(9.55,p.x+dx*3.7*dt)),nz=Math.max(-6.5,Math.min(6.5,p.z+dz*3.7*dt));if(!gateOpen&&Math.abs(nx-1)<.62){nx=p.x<1?.38:1.62;}p.x=nx;p.z=nz;p.inv=Math.max(0,p.inv-dt);
 for(const pool of pools)if(!p.inv&&p.y<.28&&pool.type!==p.type&&Math.abs(p.x-pool.x)<pool.w/2+.16&&Math.abs(p.z-pool.z)<pool.d/2+.16){die(p);break;}
 for(const g of gems)if(!g.taken&&g.type===p.type&&Math.hypot(p.x-g.x,p.z-g.z)<.72&&p.y<1.7){g.taken=true;p.count++;burst(g.x,.9,g.z,p.color);ping(650+p.count*130);updateHud();}
 for(const s of sigils)if(!s.on&&s.type===p.type&&Math.hypot(p.x-s.x,p.z-s.z)<.65&&p.y<.3){s.on=true;burst(s.x,.4,s.z,p.color);ping(480);toast((p.type?'寒冰':'火焰')+'祭坛已点亮');updateHud();}
 }
 if(!gateOpen&&sigils.every(s=>s.on)){gateOpen=true;ping(950);toast('双元素共鸣 · 石门开启！');updateHud();}
 if(gateOpen&&players.every((p,i)=>p.count===3&&Math.hypot(p.x-doors[i].x,p.z-doors[i].z)<.85&&p.y<.3)){mode='won';ping(1200);showPanel(level===2?'森林重获生机。':'默契，让石门敞开。',`${names[level]} · 挑战完成<br>用时 ${$('timer').textContent}　/　宝石 6 / 6　/　重生 ${deaths} 次`,level<2?'进入下一关':'再启冒险');}
}
function character(p,t){const bob=p.y+(p.walk?Math.abs(Math.sin(p.walk))*.06:Math.sin(t*2+p.type)*.03);const x=p.x,z=p.z,c=p.color;if(p.inv>0&&Math.sin(t*30)<0)return;
 draw(cylinder,x,.045,z,.85,.014,.65,[.14,.22,.2]);
 const swing=Math.sin(p.walk)*.18;
 draw(cube,x-.18,.2+bob+swing,z,.23,.38,.28,c);draw(cube,x+.18,.2+bob-swing,z,.23,.38,.28,c);
 draw(cylinder,x,.68+bob,z,.64,.76,.52,c,p.angle,.12);draw(cube,x-.41,.69+bob-swing,z,.18,.5,.22,c);draw(cube,x+.41,.69+bob+swing,z,.18,.5,.22,c);
 draw(diamond,x,1.27+bob,z,.85,.73,.65,c,p.angle,.22);
 if(p.type){draw(cone,x,1.65+bob,z,.42,.5,.42,[.69,.94,1],.7,.4);}else{draw(cone,x-.12,1.64+bob,z,.32,.65,.32,[1,.73,.24],-.3,.7);draw(cone,x+.14,1.54+bob,z,.3,.45,.3,C.fire,.3,.7);}
 for(const s of [-1,1]){draw(cube,x+s*.17,1.29+bob,z+.285,.135,.15,.065,C.white);draw(cube,x+s*.17,1.27+bob,z+.325,.052,.075,.025,C.dark);}
 draw(cube,x,.99+bob,z+.28,.16,.06,.04,C.dark);
}
function render(t,dt){gl.clearColor(.035,.092,.097,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);for(const o of staticObjects)draw(o.m,o.x,o.y,o.z,o.sx,o.sy,o.sz,o.color,o.rot,o.glow);
 for(const p of pools){const c=[C.fire,C.ice,C.poison][p.type];for(let i=0;i<5;i++){const z=p.z+(i/4-.5)*p.d*.8;draw(cube,p.x+Math.sin(t*1.4+i)*p.w*.2,.102,z,p.w*.45,.01,.025,c.map(v=>Math.min(1,v*1.3)),0,.8);}}
 for(const g of gems)if(!g.taken){draw(diamond,g.x,.85+Math.sin(t*2+g.x)*.14,g.z,.56,.56,.56,g.type?C.ice:C.fire,t,.7);draw(cylinder,g.x,.041,g.z,.42,.01,.42,g.type?[.22,.42,.42]:[.44,.29,.15]);}
 for(const s of sigils)if(s.on){draw(diamond,s.x,.8+Math.sin(t*2)*.1,s.z,.35,.35,.35,s.type?C.ice:C.fire,t,.8);for(let i=0;i<4;i++)draw(cube,s.x+Math.cos(t+i*Math.PI/2)*.5,.35,s.z+Math.sin(t+i*Math.PI/2)*.5,.1,.06,.1,C.gold,0,1);}
 gateAnim+=((gateOpen?1:0)-gateAnim)*Math.min(1,dt*3);for(let z=-5.7;z<6;z+=.95)draw(cube,1,1.03-gateAnim*2.4,z,.35,2.1,.75,C.dark);draw(cube,1,2.15-gateAnim*2.4,0,.5,.25,12,C.gold);
 for(const d of doors){const ready=players[d.type].count===3&&gateOpen;if(ready){for(let i=0;i<6;i++)draw(diamond,d.x+Math.sin(t+i)*.5,.5+((t*.6+i*.3)%1.8),d.z,.1,.18,.1,d.type?C.ice:C.fire,t,.8);}draw(cube,d.x,1.4,d.z-.1,1.1,2.3,.045,ready?(d.type?[.15,.53,.58]:[.56,.25,.12]):[.12,.23,.22],0,ready?.5:0);}
 for(const p of players)character(p,t);
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(mode==='playing'){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=5*dt;}if(p.life<=0){particles.splice(i,1);continue;}draw(diamond,p.x,p.y,p.z,.09,.09,.09,p.color,t,1);}
 for(let i=0;i<22;i++){let x=Math.sin(i*43.3)*12,z=Math.cos(i*17)*10;draw(diamond,x+Math.sin(t*.3+i)*.3,1.4+Math.sin(t*.7+i)*.9,z,.025,.045,.025,[.67,.77,.39],0,1);}
}
function loop(now){let dt=Math.min((now-last)/1000,.033);last=now;if(mode==='playing')update(dt);if(now>toastEnd)$('toast').classList.remove('show');render(now/1000,dt);requestAnimationFrame(loop);}init(0);requestAnimationFrame(loop);
