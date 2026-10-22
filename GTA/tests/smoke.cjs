const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},appendChild(v){this.children.push(v);},addEventListener(){},getContext(){return gl;}});
  return elements.get(id);
}
const uniforms = new Map();
const gl = new Proxy({}, {get(_,key){if (key === 'getUniformLocation') return (_,name) => name; if (key === 'uniform3fv') return (name,value) => uniforms.set(name,Array.from(value)); if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true; if(key==='getAttribLocation') return () => 0;return () => ({});}});
const context = vm.createContext({console,Float32Array,Math,parseInt,performance:{now:()=>0},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>({})},window:{addEventListener(){}},addEventListener(){},requestAnimationFrame(){},innerWidth:1280,innerHeight:720,devicePixelRatio:1,setInterval,clearInterval});
vm.runInContext(fs.readFileSync(new URL('../dist/game.js', 'file://' + __filename), 'utf8'), context);
const run = code => vm.runInContext(code, context);
run('start();keys={w:true};for(let i=0;i<120;i++)update(1/60);');
assert(run('player.z < 210'), 'accelerating must move the car forward');
assert(run('player.speed > 35'), 'car must accelerate');
run('keys={w:true,a:true};for(let i=0;i<20;i++)update(1/60);');
assert(run('player.a < 0'), 'left steering must turn left');
run('keys={w:true,Shift:true};for(let i=0;i<30;i++)update(1/60);');
assert(run('player.nitro < 100'), 'boost must consume nitro');
run('reset();player.x=-436;player.z=200;player.a=-Math.PI/2;player.speed=40;player.vx=-40;player.vz=0;keys={};update(.1);');
assert(run('player.x >= -437 && player.health < 100'), 'barrier collision must block the car and cause damage');
run('reset(); keys={}; for(let i=0;i<4;i++){player.x=missions[i].x;player.z=missions[i].z;player.speed=0;player.vx=0;player.vz=0;update(.01);}');
assert.equal(run('money'),7200, 'four missions must pay the advertised total');
assert.equal(run('completion'),true, 'all missions must unlock free driving');
assert.equal(run('player.health'),100, 'mission rewards must repair the car');
run('heat=2;heatTimer=.01;update(.02);');
assert.equal(run('heat'),1, 'wanted level must decrease after evasion');
run('player.health=1;hitCooldown=0;damage(20);');
assert.equal(run('player.health'),100, 'destroyed car must recover instead of trapping the player');
assert(run('Number.isFinite(player.x) && Number.isFinite(player.z)'), 'recovery must retain valid coordinates');
run('reset();');
assert.equal(run('money'),0, 'restart must reset mission money');
assert.equal(run('missionIndex'),0, 'restart must reset mission progress');
console.log('PASS: acceleration, steering, nitro, collision, four missions, rewards, evasion, recovery, restart');
// Street interactions preserve the actual vehicle and allow repeated swaps.
run('keys={};interact();');
assert.equal(run('inCar'),false,'E must leave the car');
assert.equal(run('traffic.filter(c=>c.owned).length'),1,'exiting must leave the original car in the world');
run('const footStart=player.z;keys={w:true};for(let i=0;i<30;i++)update(1/60);');
assert(run('player.z < footStart-3'),'walking must move the character');
run('keys={};const stolen=traffic.find(c=>c.name==="BANSHEE");player.x=stolen.x+3;player.z=stolen.z;interact();');
assert.equal(run('inCar'),true,'E near another vehicle must enter it');
assert.equal(run('activeMesh===trafficMeshes[0]'),true,'hijack must transfer the selected car mesh');
assert.equal(run('traffic.includes(stolen)'),false,'hijack must remove the duplicate AI vehicle');
assert(run('heat>0'),'hijacking an unowned vehicle must attract police');
run('interact();');
assert.equal(run('inCar'),false,'must be able to leave a stolen car');
run('const theftHeat=heat;interact();');
assert.equal(run('activeMesh===trafficMeshes[0] && inCar'),true,'must be able to re-enter the stolen car');
assert.equal(run('heat===theftHeat'),true,'re-entering your own car must not create another theft');
// Test actual swept projectile hits, destruction rewards, and recharge.
run('reset();interact();keys={};flyers.forEach(f=>f.respawn=99);const victim=flyers[0];Object.assign(victim,{x:player.x,y:3.5,z:player.z-24,hp:40,respawn:0});aimPitch=0;player.a=0;firePlasma();updateSky(.01);');
assert.equal(run('plasma < 100'),true,'plasma shot must use energy');
run('const shot=bullets.find(b=>b.owner==="player");shot.x=victim.x;shot.y=victim.y;shot.z=victim.z;updateSky(.001);');
assert.equal(run('skyKills'),1,'plasma hit must destroy a weakened UFO');
assert.equal(run('money'),750,'destroying an aerial target must pay a reward');
run('reset();keys={};let sawUfo=false,sawDragon=false;for(let i=0;i<360;i++){updateSky(1/60);sawUfo ||= bullets.some(b=>b.owner==="ufo");sawDragon ||= bullets.some(b=>b.owner==="dragon");}');
assert(run('sawUfo'),'UFOs must fire in battle');
assert(run('sawDragon'),'dragons must fire in battle');
assert(run('flyers.some(f=>f.hp<(f.kind==="ufo"?100:140)) || bullets.length>0'),'sky battle must be active');
run('reset();interact();keys={f:true};for(let i=0;i<600;i++)update(1/60);');
assert(run('plasma>=0&&plasma<=100'),'held fire must respect the energy range');
assert(run('bullets.length<=160&&effects.length<=240'),'combat effects must remain bounded');
console.log('PASS: exit, walking, hijack, stolen vehicle re-entry, plasma energy, aerial hit, bounty, UFO fire, dragon fire, bounded effects');

run('reset();interact();keys={};flyers.forEach(f=>f.respawn=99);traffic=[{x:player.x,z:player.z-18,a:0,parked:true,mesh:carMesh,hp:100}];aimPitch=0;player.a=0;for(let i=0;i<3;i++){firePlasma();updateSky(.1);updateSky(.2);}');
assert.equal(run('traffic[0].destroyed'),true,'three plasma hits must destroy a traffic vehicle');
assert.equal(run('nearestCar()'),null,'destroyed vehicles must not be enterable');
console.log('PASS: plasma vehicle destruction and destroyed vehicle interaction');

// Exercise the actual sky uniforms while turning and pitching the camera.
run('reset();keys={};render(16);');
const originalSun = uniforms.get('uSun');
const originalView = uniforms.get('uForward');
run('player.a=Math.PI;aimPitch=.8;inCar=false;render(1016);');
assert.deepEqual(uniforms.get('uSun'),originalSun,'sun direction must stay fixed when camera yaw and pitch change');
assert.notDeepEqual(uniforms.get('uForward'),originalView,'sky view must track the actual camera');
assert(run('cameraBasis([0,0,0],[0,0,1]).forward.reduce((n,v,i)=>n+v*SUN_DIRECTION[i],0)<0'),'sun must be behind the camera when looking away from sunset');
assert(run('cameraBasis([0,0,0],[0,0,-1]).forward.reduce((n,v,i)=>n+v*SUN_DIRECTION[i],0)>0'),'sun must be in front when looking toward sunset');
for (const type of ['atst','elephant','cloud','chicken']) {
  run(`reset();keys={};chooseVehicle('${type}');`);
  assert.equal(run('activeType'),type,'selector must use the requested type');
  assert(run(`activeMesh===vehicleTypes['${type}'].mesh`),'each ride must use its own model');
  run('keys={w:true};for(let i=0;i<60;i++)update(1/60);keys={};');
  assert(run('player.z<246'),'special ride must move under player control');
  run('player.speed=0;interact();');
  assert.equal(run('inCar'),false,'must be able to leave every special ride');
  assert(run(`traffic.some(c=>c.type==='${type}'&&c.owned)`),'exiting must preserve the selected ride');
  run('interact();');
  assert.equal(run('activeType'),type,'re-entering must preserve the ride type');
  assert.equal(run('inCar'),true,'must be able to re-enter every special ride');
  run('render(2016);');
}
run('reset();');
assert.equal(run('traffic.filter(c=>c.type && c.type!=="car").length'),4,'all four rides must also exist on the promenade');
console.log('PASS: world-fixed sun, camera yaw/pitch, sun visibility, four distinct ride models, movement, exit/re-entry, promenade spawns');
