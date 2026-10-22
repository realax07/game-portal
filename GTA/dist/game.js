const $ = id => document.getElementById(id);
const canvas = $('game');
const gl = canvas.getContext('webgl', {antialias:true,alpha:false});
if (!gl) { $('fatal').classList.remove('hidden'); throw new Error('WebGL unavailable'); }
const PI = Math.PI, TAU = PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
let seed=1986;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rand()*a.length)];
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
const sceneProgram=program(`attribute vec3 aPos;attribute vec3 aNormal;attribute vec4 aColor;uniform mat4 uVP;uniform mat4 uModel;uniform vec3 uCamera;varying vec4 vColor;varying float vFog;void main(){vec4 world=uModel*vec4(aPos,1.);vec3 n=normalize(mat3(uModel)*aNormal);float light=.59+.41*max(dot(n,normalize(vec3(-.7,1.,.35))),0.);vColor=vec4(aColor.rgb*mix(light,1.25,aColor.a),1.);vFog=clamp(length(world.xyz-uCamera)/850.,0.,.93);gl_Position=uVP*world;}`,`precision mediump float;varying vec4 vColor;varying float vFog;void main(){gl_FragColor=vec4(mix(vColor.rgb,vec3(.38,.29,.43),vFog*vFog),1.);}`);
const SUN_DIRECTION = Object.freeze([.10,.12,-1].map((v,_,a)=>v/Math.hypot(...a)));
const skyProgram=program(`attribute vec2 aPos;varying vec2 vUV;void main(){vUV=aPos*.5+.5;gl_Position=vec4(aPos,.999,1.);}`,`precision mediump float;varying vec2 vUV;uniform float uAspect;uniform vec3 uForward;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uSun;void main(){vec2 ndc=vUV*2.-1.;vec3 ray=normalize(uForward+uRight*ndc.x*uAspect*.5914+uUp*ndc.y*.5914);vec3 low=vec3(.81,.47,.48);vec3 high=vec3(.13,.12,.28);vec3 c=mix(low,high,smoothstep(-.12,.85,ray.y));float facing=step(0.,dot(ray,uSun));float d=length(cross(ray,uSun));c+=vec3(.3,.12,.05)*exp(-d*7.)*facing;float disc=(1.-smoothstep(.078,.081,d))*facing;float stripes=step(.19,fract(ray.y*170.));c=mix(c,vec3(1.,.75,.49),disc*mix(stripes,1.,smoothstep(.12,.16,ray.y)));gl_FragColor=vec4(c,1.);}`);
const loc={};for(const n of ['aPos','aNormal','aColor'])loc[n]=gl.getAttribLocation(sceneProgram,n);for(const n of ['uVP','uModel','uCamera'])loc[n]=gl.getUniformLocation(sceneProgram,n);
const skyLoc={p:gl.getAttribLocation(skyProgram,'aPos')};for(const n of ['uAspect','uForward','uRight','uUp','uSun'])skyLoc[n]=gl.getUniformLocation(skyProgram,n);
const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const hex=(s,e=0)=>{const v=parseInt(s.replace('#',''),16);return [(v>>16)/255,((v>>8)&255)/255,(v&255)/255,e];};
let verts=[];
function tri(a,b,c,color,n){if(!n){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(x=>x/l);}for(const p of [a,b,c])verts.push(...p,...n,...color);}
function quad(a,b,c,d,col,n){tri(a,b,c,col,n);tri(a,c,d,col,n);}
function box(x,y,z,w,h,d,col){const X=x+w/2,x0=x-w/2,Y=y+h/2,y0=y-h/2,Z=z+d/2,z0=z-d/2;
quad([x0,Y,z0],[x0,Y,Z],[X,Y,Z],[X,Y,z0],col,[0,1,0]);
quad([x0,y0,Z],[x0,Y,Z],[x0,Y,z0],[x0,y0,z0],col,[-1,0,0]);
quad([X,y0,z0],[X,Y,z0],[X,Y,Z],[X,y0,Z],col,[1,0,0]);
quad([x0,y0,z0],[x0,Y,z0],[X,Y,z0],[X,y0,z0],col,[0,0,-1]);
quad([X,y0,Z],[X,Y,Z],[x0,Y,Z],[x0,y0,Z],col,[0,0,1]);}
function cylinder(x,y,z,r,h,col,sides=8,r2=r){for(let i=0;i<sides;i++){const a=i*TAU/sides,b=(i+1)*TAU/sides;const A=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],B=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],C=[x+Math.cos(b)*r2,y+h,z+Math.sin(b)*r2],D=[x+Math.cos(a)*r2,y+h,z+Math.sin(a)*r2];quad(A,D,C,B,col);tri([x,y+h,z],C,D,col,[0,1,0]);}}
function upload(){const data=new Float32Array(verts),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);const mesh={buffer,count:verts.length/10};verts=[];return mesh;}
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function model(x,y,z,a=0,s=1){const c=Math.cos(a)*s,n=Math.sin(a)*s;return new Float32Array([c,0,n,0,0,s,0,0,-n,0,c,0,x,y,z,1]);}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function perspective(f,aspect,near,far){const q=1/Math.tan(f/2),nf=1/(near-far);return new Float32Array([q/aspect,0,0,0,0,q,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target){let z=eye.map((v,i)=>v-target[i]),l=Math.hypot(...z);z=z.map(v=>v/l);let x=[z[2],0,-z[0]];l=Math.hypot(...x);x=x.map(v=>v/l);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}
function cameraBasis(eye,at){const d=at.map((v,i)=>v-eye[i]),len=Math.hypot(...d)||1,forward=d.map(v=>v/len);const r=[-forward[2],0,forward[0]],rl=Math.hypot(...r)||1,right=r.map(v=>v/rl);const up=[-right[2]*forward[1],right[2]*forward[0]-right[0]*forward[2],right[0]*forward[1]];return {forward,right,up};}
function draw(mesh,m=identity()){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.vertexAttribPointer(loc.aPos,3,gl.FLOAT,false,40,0);gl.vertexAttribPointer(loc.aNormal,3,gl.FLOAT,false,40,12);gl.vertexAttribPointer(loc.aColor,4,gl.FLOAT,false,40,24);gl.uniformMatrix4fv(loc.uModel,false,m);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
const roadsX=[-390,-260,-130,0,130,260,390], roadsZ=[-520,-390,-260,-130,0,130,260,390,520];
const buildings=[], palms=[];
const asphalt=hex('39384d'), sidewalk=hex('a29ca9'), yellow=hex('e1be89'), neon=hex('ff79ba',1), aqua=hex('79e5db',1);
box(0,-2,0,6000,3,6000,hex('335d70'));
// Warm beach and the elevated city island.
box(-505,-.3,0,150,1,1450,hex('d8b8a6'));box(0,0,0,890,1.6,1310,hex('78908c'));
box(-447,.5,0,14,1.2,1300,hex('b0a6b7'));box(-457,.6,0,3,1.5,1300,hex('dbbbca'));
for(let z=-660;z<650;z+=26){box(-478,.35,z,17,.15,1,hex('e5c2b4'));box(-552,-.22,z,1,.1,17,hex('e4c4b9'));}
for(const x of roadsX){box(x,.86,0,28,.15,1220,asphalt);for(let z=-595;z<600;z+=13){if(roadsZ.some(r=>Math.abs(r-z)<18))continue;box(x,.96,z,.25,.03,6,yellow);}box(x-15,1,0,2,.4,1220,sidewalk);box(x+15,1,0,2,.4,1220,sidewalk);}
for(const z of roadsZ){box(0,.88,z,810,.15,28,asphalt);for(let x=-400;x<410;x+=13){if(roadsX.some(r=>Math.abs(r-x)<18))continue;box(x,.99,z,6,.03,.25,yellow);}box(0,1,z-15,810,.4,2,sidewalk);box(0,1,z+15,810,.4,2,sidewalk);}
// Crosswalks and traffic lights.
for(const x of roadsX)for(const z of roadsZ){for(let i=-10;i<=10;i+=3.2){box(x+i,1.01,z-20,1.6,.04,6,hex('c7bec8'));box(x-20,1.02,z+i,6,.04,1.6,hex('c7bec8'));}if(rand()>.6){cylinder(x+18,1,z+18,.3,8,hex('4b4a62'));box(x+17,8,z+18,3,1.1,.8,hex('25283f'));box(x+16.1,8,z+17.55,.5,.5,.1,aqua);}}
const colors=['b8a2b4','aebcca','e1b1bb','a8c5c3','d8bba5','a9a0b7','cac2c5'];
for(let ix=0;ix<roadsX.length-1;ix++)for(let iz=0;iz<roadsZ.length-1;iz++){
const cx=(roadsX[ix]+roadsX[ix+1])/2,cz=(roadsZ[iz]+roadsZ[iz+1])/2;
box(cx,1,cz,97,.8,97,sidewalk);
if((ix===0&&iz===4)||(ix===3&&iz===2)||(ix===4&&iz===5)){
box(cx,1.5,cz,84,.5,84,hex('668b81'));box(cx,1.85,cz,7,.1,85,hex('d7bead'));box(cx,1.85,cz,85,.1,7,hex('d7bead'));
for(let p=0;p<12;p++)palms.push([cx+(rand()-.5)*72,cz+(rand()-.5)*72]);
cylinder(cx,1.9,cz,13,1.4,hex('d0c1cb'),20);cylinder(cx,3.31,cz,10,.1,hex('69c3cb',.4),20);cylinder(cx,3.4,cz,2,4,hex('e4cbd2'),10);continue;
}
const count=rand()>.58?2:4;
for(let n=0;n<count;n++){
const x=cx+(n%2===0?-24:24),z=cz+(count===2?0:n<2?-25:25),w=35+rand()*8,d=count===2?76:34+rand()*8,h=ix===0?12+rand()*20:16+rand()*75;
const col=hex(pick(colors));box(x,1+h/2,z,w,h,d,col);buildings.push({x,z,w,d,h});
box(x,h+1.3,z,w+1,.8,d+1,hex('e3c8d4'));box(x,h+2.4,z,w*.65,1.8,d*.65,hex('81808e'));box(x,h+4,z,6,2,9,hex('78778a'));
const win=rand()>.5?hex('f6d8aa',.65):hex('8ac5d3',.4);
for(let y=5;y<h-2;y+=5){for(let xx=x-w/2+3;xx<x+w/2-1;xx+=5){const c=rand()>.24?win:hex('6e738b');box(xx,y,z+d/2+.05,2.1,2,.15,c);box(xx,y,z-d/2-.05,2.1,2,.15,c);}for(let zz=z-d/2+3;zz<z+d/2-1;zz+=5){const c=rand()>.24?win:hex('6e738b');box(x-w/2-.06,y,zz,.15,2,2.2,c);box(x+w/2+.06,y,zz,.15,2,2.2,c);}}
if(ix===0||rand()>.6){const light=rand()>.5?neon:aqua;box(x,4,z+d/2+.25,w+1,.25,.35,light);box(x-w/2-.2,4,z,.35,.25,d,light);box(x-w/2-.2,h-1,z,.35,.4,d,light);box(x-w/2-.3,h/2,z-d/2,.4,h,.4,light);}
}
}
// Promenade palms, lamps, benches and beach umbrellas.
for(let z=-590;z<=590;z+=25){palms.push([-425,z]);if(z%50===10)palms.push([-479,z+8]);cylinder(-411,1,z,.18,7,hex('50526c'));box(-411,8,z,2.2,.22,2.2,hex('ffe0b2',1));box(-438,1.8,z+9,2,1,4,hex('c195ac'));}
function palm(x,z,h=12){const trunk=hex('8b8580');cylinder(x,1,z,.65,h,trunk,7,.35);const y=1+h;for(let i=0;i<7;i++){const a=i*TAU/7,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;const root=[x,y,z],mid=[x+dx*4.8,y+1,z+dz*4.8],tip=[x+dx*8.2,y-2.6,z+dz*8.2];const color=hex(i%2?'427c73':'579284');tri(root,[mid[0]+tx*1.4,mid[1],mid[2]+tz*1.4],tip,color,[0,1,0]);tri(root,tip,[mid[0]-tx*1.4,mid[1],mid[2]-tz*1.4],color,[0,1,0]);}}
for(const [x,z] of palms)palm(x,z,10+rand()*5);
for(let z=-560;z<560;z+=58){cylinder(-512,0,z,.15,3,hex('eee0d1'));const c=pick([hex('e7aac7'),hex('83c5c2'),hex('e9d0b0')]);for(let j=0;j<8;j++){const a=j*TAU/8,b=(j+1)*TAU/8;tri([-512,4,z],[-512+Math.cos(a)*4,3,z+Math.sin(a)*4],[-512+Math.cos(b)*4,3,z+Math.sin(b)*4],c);}box(-507,.5,z+2,2,.2,5,hex('efcfcb'));}
// Edge barriers.
for(const x of [-440,437])box(x,1.5,0,1,2,1250,hex('b6a0b6'));
for(const z of [-615,615])box(0,1.5,z,880,2,1,hex('b6a0b6'));
const worldMesh=upload();
// Detailed low-poly sports car, with open roof and chrome trim.
function makeCar(color,police=false){
box(0,.17,0,4.5,.1,8.2,hex('252a3d'));
box(0,1.15,0,3.5,.8,6.9,hex(color));box(0,1.7,-1.95,3.3,.45,2.7,hex(color));box(0,1.55,2.4,3.3,.35,1.8,hex(color));
box(0,1.65,.5,2.7,.4,2.2,hex('282d45'));box(-.65,1.94,.6,.8,.55,.8,hex('564a60'));box(.65,1.94,.6,.8,.55,.8,hex('564a60'));
box(0,2.2,-.8,2.8,1,.15,hex('719eac'));box(0,2.75,-.8,3,.12,.2,hex('e9bcd6'));box(-1.45,2.2,-.8,.12,1,.2,hex(color));box(1.45,2.2,-.8,.12,1,.2,hex(color));
if(police){box(0,2.5,.3,2.9,.3,2.4,hex('dee1e6'));box(-.65,2.83,.1,.7,.28,.65,hex('fa6d9b',1));box(.65,2.83,.1,.7,.28,.65,hex('70ceff',1));}
for(const x of [-1.72,1.72])for(const z of [-2.1,2.15]){box(x,.85,z,.55,1.3,1.5,hex('23273b'));box(x*1.05,.85,z,.1,.7,.8,hex('a4adc2'));}
box(0,1.1,-3.52,3.3,.22,.2,hex('cfcede'));box(0,1,3.52,3.3,.2,.2,hex('cfcede'));
for(const x of [-1.1,1.1]){box(x,1.6,-3.37,.8,.3,.12,hex('fff0c4',1));box(x,1.4,3.42,.75,.22,.12,hex('ff5c93',1));box(x*1.6,2,-.7,.4,.15,.6,hex(color));}
return upload();}
const carMesh=makeCar('ef80b7');const trafficMeshes=['8fdbcf','dfc396','b5bbdf','f0e3dc','c47494'].map(c=>makeCar(c));const policeMesh=makeCar('455775',true);

// Four rideable silhouettes, each with its own proportions and gait.
function ellipsoid(x,y,z,rx,ry,rz,color,rings=8,sides=12){const point=(a,b)=>[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*PI/rings,b=(i+1)*PI/rings,c=j*TAU/sides,d=(j+1)*TAU/sides;quad(point(a,c),point(a,d),point(b,d),point(b,c),color);}}
// AT-ST: armoured cabin, viewport, twin cannons, hip chassis and jointed legs.
const metal=hex('a6b3ba'),darkMetal=hex('596675');
box(0,9.5,0,6,4.7,5.5,metal);box(0,12,0,6.5,.55,5.9,hex('c6ccd0'));box(0,8,-1,4.7,1.2,5.6,darkMetal);box(0,10,-2.8,4.9,.65,.18,hex('1f2e3b'));box(0,10.5,-2.94,5.4,.3,.4,hex('7a8a97'));
for(const side of [-1,1]){box(side*1,8.5,-4,.5,.5,3,hex('374251'));box(side*1,8.5,-5.5,.7,.7,.25,hex('ff938c',.8));box(side*3.4,9,0,.8,1.3,2,darkMetal);box(side*3.4,9,-2,.35,.35,2.7,metal);}
box(0,9.6,2.82,4.3,2.5,.18,darkMetal);for(let i=0;i<5;i++)box(0,8.8+i*.4,2.95,3.8,.13,.2,hex('b7c3c8'));box(0,11.3,2.9,1.5,.5,.2,hex('768a99'));box(0,7,1,3,1.8,3,darkMetal);box(0,7,1,6,.7,1.5,metal);box(0,12.8,1,.2,1.2,.2,hex('9bd7d7'));
const atstMesh=upload();
box(0,-1.6,0,.9,3.2,1.1,metal);box(0,-3.3,.45,1.3,1.3,1.7,darkMetal);box(0,-4.9,.75,.7,2.7,.8,metal);box(0,-6.5,-.3,2.4,.65,3.8,hex('798a97'));box(0,-5.2,1.3,.3,2.5,.25,hex('d4d8d7'));
const atstLeg=upload();
// Elephant: curved ears, segmented trunk, tusks and a gold-trimmed saddle.
const elephantGrey=hex('a9a2bc');
ellipsoid(0,4,0,2.8,2.6,4.4,elephantGrey);ellipsoid(0,5,-3.6,2.2,2.4,2.1,hex('b6abc1'));
for(const side of [-1,1]){ellipsoid(side*2.3,5,-3.1,1.45,2.1,.48,hex('c4a8bd'));ellipsoid(side*2.35,5,-3.65,.9,1.45,.12,hex('d8b3c4'));box(side*1.35,5.5,-5.28,.35,.38,.18,hex('292b43'));tri([side*.9,3.9,-5],[side*1.5,3.4,-7],[side*1.1,4.5,-5],hex('fff0cc'));}
for(let i=0;i<5;i++)ellipsoid(0,4.2-i*.6,-5.3-i*.16,.65-i*.055,.6,.7,elephantGrey,5,8);
ellipsoid(0,1.6,-6.5,.4,.4,.7,elephantGrey,5,8);box(0,6,0,4.7,.25,4.3,hex('dc718f'));box(0,6.3,.3,2.4,.4,2.2,hex('f2c979'));box(0,6.9,1.4,2.4,1.3,.3,hex('be5b82'));box(0,4,4.6,.22,2,.25,hex('7b718f'));
const elephantMesh=upload();
ellipsoid(0,-1.3,0,.72,1.5,.8,elephantGrey,6,8);box(0,-2.6,-.15,1.4,.25,1.7,hex('d4c7d1'));const elephantLeg=upload();
// Cloud: a floating cluster of soft, faceted white billows and a star saddle.
for(const [x,y,z,r] of [[0,2,0,2.9],[-2.4,1.5,0,2],[2.5,1.7,.2,2.2],[0,1.5,-2.5,2.4],[0,1.4,2.4,2.3],[-2,1.4,2,1.8],[2,1.5,-2,1.8]])ellipsoid(x,y,z,r,r*.62,r,hex('e5e4fb'));
box(0,3.5,.2,2,.2,2,hex('99e6e9',.4));const cloudMesh=upload();
// Giant chicken: yellow beak and feet, red comb, wings and a fanned tail.
ellipsoid(0,3,0,2.1,2.3,2.7,hex('f5e9d0'));ellipsoid(0,5.2,-1.7,1.3,1.5,1.25,hex('fff0d5'));ellipsoid(0,5.4,-3,.8,.5,.9,hex('ffc86b'));
for(const x of [-1.1,1.1])box(x,5.7,-2.3,.2,.38,.4,hex('342c3d'));
for(let i=0;i<3;i++)ellipsoid(0,6.5,-2.4+i*.65,.3,.65,.4,hex('ef6986'),5,8);
ellipsoid(0,4.6,-2.9,.4,.7,.3,hex('dd5879'),6,8);
for(const side of [-1,1])ellipsoid(side*1.8,3.5,0,.6,1.2,2,hex('dbc8c4'));
for(let i=-1;i<=1;i++)ellipsoid(i*.5,4,2.6,.45,1.65,.7,hex(i?'e9c4b5':'f4dfbd'));
box(0,5,.3,1.6,.2,1.5,hex('71c9ca'));const chickenMesh=upload();
box(0,-.75,0,.24,1.5,.26,hex('f1b65e'));for(const x of [-.35,0,.35])box(x,-1.5,-.45,.23,.18,1.5,hex('ffc76b'));const chickenLeg=upload();
const vehicleTypes={
 car:{name:'STALLION',mesh:carMesh,max:64,boost:91,accel:24,turn:1.3,camera:0,focus:2.5,exit:4.5},
 atst:{name:'AT-ST',mesh:atstMesh,max:29,boost:43,accel:13,turn:.9,camera:7,focus:7,exit:6},
 elephant:{name:'СЛОН',mesh:elephantMesh,max:24,boost:36,accel:11,turn:1,camera:4,focus:4.5,exit:6},
 cloud:{name:'ОБЛАКО',mesh:cloudMesh,max:48,boost:78,accel:21,turn:1.7,camera:3,focus:4,exit:6},
 chicken:{name:'КУРИЦА',mesh:chickenMesh,max:38,boost:60,accel:19,turn:2.1,camera:2,focus:3.5,exit:5}
};
function pitchMatrix(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);}
function drawVehicle(mesh,type,x,z,a,speed=0,phase=0,occupied=false){const t=type||'car',moving=clamp(Math.abs(speed)/10,0,1),wave=Math.sin(gameTime*(t==='chicken'?11:5)+phase)*moving;const hover=t==='cloud'?1.6+Math.sin(gameTime*1.8+phase)*.45:0;const base=model(x,1+hover+(t==='chicken'?Math.abs(wave)*.25:0),z,a);draw(mesh,base);
const limb=(leg,dx,dy,dz,swing)=>draw(leg,multiply(multiply(base,model(dx,dy,dz)),pitchMatrix(swing)));
if(t==='atst')for(const side of [-1,1])limb(atstLeg,side*2.4,7,1,wave*.3*side);
if(t==='elephant')for(const side of [-1,1])for(const front of [-1,1])limb(elephantLeg,side*1.8,2.8,front*2.6,wave*.35*side*front);
if(t==='chicken')for(const side of [-1,1])limb(chickenLeg,side*.75,1.55,0,wave*.65*side);
if(occupied&&t!=='car'&&t!=='atst'){const height=t==='elephant'?6.25:t==='cloud'?3.5:5;const rider=multiply(base,model(0,height,.3,0,.8));draw(personMesh,rider);draw(legMesh,multiply(multiply(rider,model(-.45,1,0)),pitchMatrix(-PI/2)));draw(legMesh,multiply(multiply(rider,model(.45,1,0)),pitchMatrix(-PI/2)));}}

// Road marker ring.
for(let i=0;i<64;i++){const a=i*TAU/64,b=(i+1)*TAU/64;quad([Math.cos(a)*9,.12,Math.sin(a)*9],[Math.cos(b)*9,.12,Math.sin(b)*9],[Math.cos(b)*10,.12,Math.sin(b)*10],[Math.cos(a)*10,.12,Math.sin(a)*10],neon,[0,1,0]);}
const ringMesh=upload();
// Faceted floating mission diamond.
for(let i=0;i<4;i++){const a=i*TAU/4,b=(i+1)*TAU/4;tri([0,3,0],[Math.cos(a)*1.7,0,Math.sin(a)*1.7],[Math.cos(b)*1.7,0,Math.sin(b)*1.7],neon);tri([0,-3,0],[Math.cos(b)*1.7,0,Math.sin(b)*1.7],[Math.cos(a)*1.7,0,Math.sin(a)*1.7],aqua);}
const gemMesh=upload();

// Street character and a luminous, shoulder-mounted plasma rifle.
box(0,1.7,0,1.15,1.5,.65,hex('68d6d0'));box(0,2.8,0,.65,.7,.65,hex('e5b3a1'));
box(0,3.18,.06,.74,.18,.72,hex('3b334b'));box(-.76,1.7,-.2,.35,1.1,.4,hex('e5b3a1'));box(.76,1.85,-.4,.35,.6,.8,hex('e5b3a1'));
const personMesh=upload();
box(0,0,-.75,.5,.48,1.8,hex('4b5276'));box(0,.08,-1.2,.28,.2,1.1,aqua);box(0,0,-1.7,.7,.7,.3,aqua);
const gunMesh=upload();
box(0,.55,0,.42,1.1,.45,hex('ece6d8'));box(0,.12,-.14,.48,.23,.8,hex('42354f'));
const legMesh=upload();
// Flying saucer, with a faceted dome and a ring of running lights.
cylinder(0,-1,0,4,1,hex('647fa2'),24,11);cylinder(0,0,0,11,1.4,hex('a0b5cf'),24,6);
cylinder(0,1.4,0,5,3.7,hex('98f2e1',.6),16,1.5);cylinder(0,-1.2,0,3,.25,hex('f38af5',1),16);
for(let i=0;i<12;i++){const a=i*TAU/12;box(Math.cos(a)*9,.5,Math.sin(a)*9,1,.6,1,i%2?aqua:neon);}
const ufoMesh=upload();
// Angular, horned dragon. Wings are separate meshes so they can flap.
box(0,0,0,3.8,4,11,hex('c66580'));box(0,1,-7,2.8,2.7,4,hex('ee9b81'));box(0,.5,-10,2.2,1.3,3,hex('d78678'));
for(const side of [-1,1]){cylinder(side*1.1,2,-6.3,.65,3,hex('f9d9af'),5,.03);box(side*1.45,1.7,-8.1,.2,.65,1,hex('fff49a',1));box(side*2,-2,1,1,3,1,hex('a35b7c'));tri([side*1.4,-3.5,0],[side*3,-3.5,-2],[side*1.4,-2.7,2],hex('efd2b5'));}
for(let z=-3;z<7;z+=2)tri([-.5,2,z],[0,4,z+1],[.5,2,z],hex('ffd59c'));
tri([-1.8,0,5],[1.8,0,5],[0,1,17],hex('b4678c'));tri([0,1,17],[0,-1,7],[-1.8,0,5],hex('ce8498'));
const dragonMesh=upload();
const wingMeshes=[];
for(const side of [-1,1]){const c=hex('db8bb2');quad([side*1.5,0,-2],[side*11,2,-8],[side*23,0,3],[side*9,-1,8],c);tri([side*1.5,0,-2],[side*9,-1,8],[side*2,0,4],hex('c36c9d'));tri([side*1.5,.15,-2],[side*11,2.2,-8],[side*10,2.2,-7.2],hex('ffcaac'));tri([side*11,2.2,-8],[side*23,.2,3],[side*22,.2,3],hex('ffcaac'));wingMeshes.push(upload());}
function orbMesh(c){const top=[0,1,0],bottom=[0,-1,0];for(let i=0;i<4;i++){const a=i*TAU/4,b=(i+1)*TAU/4,A=[Math.cos(a),0,Math.sin(a)],B=[Math.cos(b),0,Math.sin(b)];tri(top,A,B,c);tri(bottom,B,A,c);}return upload();}
const plasmaMesh=orbMesh(aqua),fireMesh=orbMesh(hex('ffbc69',1)),alienMesh=orbMesh(hex('f487ff',1));
box(0,0,0,.25,.25,1,aqua);const plasmaTrail=upload();
box(0,0,0,.3,.3,1,hex('ff9b64',1));const fireTrail=upload();
box(0,0,0,.25,.25,1,hex('e781ff',1));const alienTrail=upload();
let inCar=true,activeMesh=carMesh,activeName='STALLION',activeType='car',aimPitch=.22,plasma=100,shotCooldown=0,bullets=[],effects=[],flyers=[],skyKills=0,mouseFire=false;
function blocked(x,z,r=1){return x<-437+r||x>433-r||z<-610+r||z>610-r||buildings.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
function nearestCar(){let best=null,dist=10;for(const c of traffic){const d=Math.hypot(player.x-c.x,player.z-c.z);if(!c.destroyed&&d<dist){best=c;dist=d;}}return best;}
function interact(){if(!started||paused)return;
if(inCar){
 if(Math.abs(player.speed)>18){toast('Сначала притормози: выход — на скорости до 40 км/ч.');return;}
 let exit=null;for(const side of [-1,1]){const x=player.x+Math.cos(player.a)*vehicleTypes[activeType].exit*side,z=player.z+Math.sin(player.a)*vehicleTypes[activeType].exit*side;if(!blocked(x,z)){exit={x,z};break;}}
 if(!exit){toast('Двери заблокированы. Отъедь от стены.');return;}
 traffic.push({x:player.x,z:player.z,a:player.a,mesh:activeMesh,type:activeType,name:activeName,parked:true,owned:true,speed:0,hp:100});inCar=false;Object.assign(player,exit,{speed:0,vx:0,vz:0});aimPitch=.22;mouseFire=false;
 toast('Плазма-ган готов. E — сесть / угнать · ЛКМ или F — огонь.');
}else{
 const c=nearestCar();if(!c){toast('Подойди к машине поближе — в пределах 10 метров.');return;}
 activeMesh=c.mesh;activeType=c.type||'car';activeName=c.name||'OCEAN COUPE';Object.assign(player,{x:c.x,z:c.z,a:c.a,speed:0,vx:0,vz:0});traffic.splice(traffic.indexOf(c),1);inCar=true;mouseFire=false;document.exitPointerLock?.();if(!c.owned){heat=clamp(heat+1,0,5);heatTimer=24;toast('Новая тачка — твоя. Полиция объявила розыск.');}else toast('Снова за рулём.');
}keys={};updateHUD();}
function chooseVehicle(type){if(!started||paused||!vehicleTypes[type])return;const v=vehicleTypes[type];if(!inCar){if(blocked(player.x,player.z,3)){toast('Для смены транспорта выйди на открытую дорогу.');return;}inCar=true;document.exitPointerLock?.();}activeType=type;activeMesh=v.mesh;activeName=v.name;player.speed=0;player.vx=0;player.vz=0;keys={};mouseFire=false;$('vehiclePicker').classList.add('hidden');updateHUD();toast(v.name+' готов. WASD — управление · E — выйти.');}
$('closeGarage').addEventListener('click',()=>$('vehiclePicker').classList.add('hidden'));
$('garage').addEventListener('click',()=>{if(started&&!paused)$('vehiclePicker').classList.toggle('hidden');});
for(const b of document.querySelectorAll('[data-vehicle]'))b.addEventListener('click',()=>chooseVehicle(b.dataset.vehicle));
function setupSky(){flyers=[];for(let i=0;i<7;i++){const kind=i<4?'ufo':'dragon',phase=i*TAU/7;flyers.push({kind,phase,x:-330+Math.cos(phase)*140,z:30+Math.sin(phase)*140,y:70+(i%3)*20,a:phase,hp:kind==='ufo'?100:140,cooldown:.6+i*.35,respawn:0,radius:kind==='ufo'?11:14});}}
function burst(x,y,z,kind='plasma',size=1){for(let i=0;i<12;i++){const a=rand()*TAU,u=rand()*2-1,v=Math.sqrt(1-u*u);effects.push({x,y,z,vx:Math.cos(a)*v*(8+rand()*12)*size,vy:u*20*size,vz:Math.sin(a)*v*(8+rand()*12)*size,life:.7+rand()*.5,max:1.2,kind,size});}if(effects.length>240)effects.splice(0,effects.length-240);}
function hitFlyer(f,amount,owner){if(f.respawn>0)return;f.hp-=amount;burst(f.x,f.y,f.z,f.kind==='dragon'?'fire':'alien',.5);if(f.hp<=0){burst(f.x,f.y,f.z,f.kind==='dragon'?'fire':'alien',2);f.respawn=7;if(owner==='player'){skyKills++;money+=750;toast((f.kind==='ufo'?'НЛО сбит!':'Дракон повержен!')+' +$750');}}}
function firePlasma(){if(!started||paused||inCar||shotCooldown>0||plasma<8)return false;shotCooldown=.18;plasma-=8;
const dx=Math.sin(player.a)*Math.cos(aimPitch),dy=Math.sin(aimPitch),dz=-Math.cos(player.a)*Math.cos(aimPitch);const b={x:player.x+Math.sin(player.a)*2,y:3.5,z:player.z-Math.cos(player.a)*2,vx:dx*210,vy:dy*210,vz:dz*210,life:3,kind:'plasma',owner:'player',target:null};
// A small aim assist makes distant airborne targets practical to hit.
let best=.975;for(const f of flyers){if(f.respawn>0)continue;const x=f.x-b.x,y=f.y-b.y,z=f.z-b.z,l=Math.hypot(x,y,z),dot=(x*dx+y*dy+z*dz)/l;if(dot>best){best=dot;b.target=f;}}
bullets.push(b);if(soundOn&&audioCtx){tone(740,audioCtx.currentTime,.15,'sawtooth',.025);tone(140,audioCtx.currentTime,.2,'sine',.04);}return true;}
function segmentDistance(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz||1),0,1);return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y,a.z+dz*t-p.z);}
function updateSky(dt){shotCooldown=Math.max(0,shotCooldown-dt);plasma=clamp(plasma+dt*13,0,100);if((keys.f||mouseFire)&&!inCar)firePlasma();
for(const f of flyers){if(f.respawn>0){f.respawn-=dt;if(f.respawn<=0)f.hp=f.kind==='ufo'?100:140;continue;}const oldX=f.x,oldZ=f.z;
f.phase+=dt*(f.kind==='ufo'?.15:-.12);f.x=-330+Math.cos(f.phase)*(f.kind==='ufo'?145:115);f.z=30+Math.sin(f.phase)*175;f.y=77+(f.kind==='ufo'?Math.sin(f.phase*2)*17:18+Math.sin(f.phase*3)*14);f.a=Math.atan2(f.x-oldX,-(f.z-oldZ));f.cooldown-=dt;
if(f.cooldown<=0){const enemies=flyers.filter(e=>e.kind!==f.kind&&e.respawn<=0).sort((a,b)=>Math.hypot(a.x-f.x,a.z-f.z)-Math.hypot(b.x-f.x,b.z-f.z));if(enemies.length){const t=enemies[0],dx=t.x-f.x,dy=t.y-f.y,dz=t.z-f.z,len=Math.hypot(dx,dy,dz),speed=f.kind==='ufo'?105:75;bullets.push({x:f.x,y:f.y,z:f.z,vx:dx/len*speed,vy:dy/len*speed,vz:dz/len*speed,life:5,kind:f.kind==='ufo'?'alien':'fire',owner:f.kind,target:t});}f.cooldown=1.2+rand()*1.4;}}
for(const b of bullets){b.life-=dt;const prev={x:b.x,y:b.y,z:b.z};if(b.target&&b.target.respawn<=0){const t=b.target,dx=t.x-b.x,dy=t.y-b.y,dz=t.z-b.z,l=Math.hypot(dx,dy,dz)||1,speed=Math.hypot(b.vx,b.vy,b.vz),blend=1-Math.exp(-dt*(b.owner==='player'?5:1.6));b.vx=mix(b.vx,dx/l*speed,blend);b.vy=mix(b.vy,dy/l*speed,blend);b.vz=mix(b.vz,dz/l*speed,blend);}
b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
for(const f of flyers){if(f.respawn>0||b.owner===f.kind)continue;if(segmentDistance(prev,b,f)<f.radius){hitFlyer(f,b.owner==='player'?45:24,b.owner);b.life=0;break;}}
if(b.life>0&&b.owner==='player')for(const c of [...traffic,...police]){if(c.destroyed)continue;if(segmentDistance(prev,b,{x:c.x,y:2,z:c.z})<3.4){c.hp=(c.hp??100)-40;c.parked=true;c.speed=0;burst(b.x,b.y,b.z,'plasma');b.life=0;heat=Math.max(heat,1);heatTimer=18;if(c.hp<=0){c.destroyed=true;burst(c.x,3,c.z,'fire',1.5);toast('Машина уничтожена плазмой.');}break;}}
if(b.life>0&&b.y<70&&b.y>1&&buildings.some(c=>b.y<c.h+1&&Math.abs(b.x-c.x)<c.w/2&&Math.abs(b.z-c.z)<c.d/2)){burst(b.x,b.y,b.z,b.kind,.4);b.life=0;}if(b.y<1){burst(b.x,1,b.z,b.kind,.5);b.life=0;}}
bullets=bullets.filter(b=>b.life>0).slice(-160);
for(const e of effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;e.vy-=8*dt;}effects=effects.filter(e=>e.life>0);
}
function drawPerson(){const base=model(player.x,1,player.z,player.a),swing=Math.sin(gameTime*12)*Math.min(Math.abs(player.speed)/10,1)*.45;draw(personMesh,multiply(base,model(0,Math.abs(swing)*.12,0)));const c=Math.cos(aimPitch),n=Math.sin(aimPitch),pitch=new Float32Array([1,0,0,0,0,c,n,0,0,-n,c,0,0,0,0,1]);draw(gunMesh,multiply(multiply(base,model(.8,1.9,-.4)),pitch));draw(legMesh,multiply(base,model(-.3,0,swing)));draw(legMesh,multiply(base,model(.3,0,-swing)));}
function roll(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);}
function trailMatrix(b){const speed=Math.hypot(b.vx,b.vy,b.vz)||1,z=[b.vx/speed,b.vy/speed,b.vz/speed];let x=[z[2],0,-z[0]],l=Math.hypot(...x)||1;x=x.map(v=>v/l);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]],len=b.kind==='fire'?9:13;return new Float32Array([...x,0,...y,0,...z.map(v=>v*len),0,b.x-z[0]*len/2,b.y-z[1]*len/2,b.z-z[2]*len/2,1]);}
function drawSky(){for(const f of flyers){if(f.respawn>0)continue;const base=model(f.x,f.y,f.z,f.a);if(f.kind==='ufo')draw(ufoMesh,base);else{draw(dragonMesh,base);const flap=Math.sin(gameTime*4+f.phase)*.45;draw(wingMeshes[0],multiply(base,roll(flap)));draw(wingMeshes[1],multiply(base,roll(-flap)));}}
for(const b of bullets){const mesh=b.kind==='plasma'?plasmaMesh:b.kind==='fire'?fireMesh:alienMesh,trail=b.kind==='plasma'?plasmaTrail:b.kind==='fire'?fireTrail:alienTrail;draw(trail,trailMatrix(b));draw(mesh,model(b.x,b.y,b.z,gameTime*5,b.kind==='fire'?1.4:.8));}
for(const e of effects)draw(e.kind==='fire'?fireMesh:e.kind==='alien'?alienMesh:plasmaMesh,model(e.x,e.y,e.z,gameTime,Math.max(.05,e.life*.9*e.size)));}
canvas.addEventListener('mousedown',e=>{if(e.button!==0||inCar||!started||paused)return;mouseFire=true;firePlasma();canvas.requestPointerLock?.();});
window.addEventListener('mouseup',()=>mouseFire=false);
window.addEventListener('mousemove',e=>{if(inCar||!started||paused||document.pointerLockElement!==canvas)return;player.a+=e.movementX*.003;aimPitch=clamp(aimPitch-e.movementY*.0025,-.45,1.3);});
window.addEventListener('blur',()=>mouseFire=false);
$('interact').addEventListener('click',interact);
$('fireTouch').addEventListener('pointerdown',e=>{e.preventDefault();$('fireTouch').setPointerCapture?.(e.pointerId);mouseFire=true;firePlasma();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('fireTouch').addEventListener(event,()=>mouseFire=false);

const missions=[
{x:-390,z:0,title:'Добро пожаловать в Vice',text:'Доберись до розового маркера у отеля Ocean View.',reward:500,district:'Ocean Beach'},
{x:130,z:-260,title:'Пакет для «Малибу»',text:'Забери посылку у клуба. Хозяин ждёт у восточного входа.',reward:1200,district:'Neon District'},
{x:260,z:390,title:'Через весь город',text:'Доставь посылку в Downtown. Устрой красивый заезд.',reward:2000,district:'Downtown'},
{x:-390,z:-390,title:'Последний закат',text:'Возвращайся на побережье. Твоё вознаграждение уже ждёт.',reward:3500,district:'Ocean Beach'}
];
let player,traffic,missionIndex,money,heat,heatTimer,police,keys={},running=false,paused=false,started=false,gameTime=0,toastTimer=0,cameraMode=0,hitCooldown=0,completion=false;
let camera=[-368,18,294],target=[-390,2,250],camAngle=0,clockTime=18*60+42;
let distanceDriven=0,lastMap=0,lastHUD=0;
function reset(){player={x:-390,z:250,a:0,speed:0,health:100,nitro:100,vx:0,vz:0};$('vehiclePicker').classList.add('hidden');inCar=true;activeMesh=carMesh;activeName='STALLION';activeType='car';aimPitch=.22;plasma=100;shotCooldown=0;bullets=[];effects=[];skyKills=0;mouseFire=false;setupSky();missionIndex=0;money=0;heat=0;heatTimer=0;completion=false;police=[];distanceDriven=0;hitCooldown=0;clockTime=18*60+42;
traffic=[];for(let i=0;i<32;i++){const vertical=i%2===0,dir=rand()>.5?1:-1;traffic.push({vertical,dir,x:vertical?pick(roadsX)+dir*6:(rand()-.5)*780,z:vertical?(rand()-.5)*1100:pick(roadsZ)-dir*6,a:vertical?(dir>0?PI:0):(dir>0?PI/2:-PI/2),speed:13+rand()*10,mesh:pick(trafficMeshes)});}traffic.push({x:-400,z:232,a:0,mesh:trafficMeshes[0],name:'BANSHEE',parked:true,speed:0,hp:100});traffic.push({x:-400,z:270,a:0,mesh:trafficMeshes[2],name:'COMET',parked:true,speed:0,hp:100});for(const [i,type] of ['atst','elephant','cloud','chicken'].entries())traffic.push({x:-411,z:205-i*22,a:0,type,mesh:vehicleTypes[type].mesh,name:vehicleTypes[type].name,parked:true,speed:0,hp:100});camera=[-368,18,294];camAngle=0;setMission();updateHUD();}
function setMission(){const m=missions[missionIndex];$('missionLabel').textContent=completion?'ГОРОД ТВОЙ':'ЗАДАНИЕ / '+String(missionIndex+1).padStart(2,'0');$('missionCount').textContent=completion?'04 / 04':`${String(missionIndex+1).padStart(2,'0')} / 04`;$('missionTitle').textContent=completion?'Король побережья':m.title;$('missionText').textContent=completion?'Все дела сделаны. Наслаждайся городом, радио и свободной ездой.':m.text;$('reward').innerHTML=completion?'СВОБОДНАЯ ЕЗДА':`НАГРАДА <b>$${m.reward.toLocaleString('en-US')}</b>`;}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');toastTimer=4;}
function togglePause(){if(!started)return;paused=!paused;keys={};mouseFire=false;if(paused){document.exitPointerLock?.();$('vehiclePicker').classList.add('hidden');}$('pauseOverlay').classList.toggle('hidden',!paused);$('pause').textContent=paused?'▶':'Ⅱ';if(audioCtx){audioCtx.resume();if(paused)engineGain.gain.setTargetAtTime(0,audioCtx.currentTime,.1);}}
function recover(silent=false){const x=roadsX.reduce((a,b)=>Math.abs(b-player.x)<Math.abs(a-player.x)?b:a),z=roadsZ.reduce((a,b)=>Math.abs(b-player.z)<Math.abs(a-player.z)?b:a);if(Math.abs(x-player.x)<Math.abs(z-player.z)){player.x=x;player.a=player.speed<0?PI:0;}else{player.z=z;player.a=PI/2;}player.x=clamp(player.x,-390,390);player.z=clamp(player.z,-550,550);player.speed=0;player.vx=0;player.vz=0;player.health=Math.max(60,player.health);heat=Math.max(0,heat-1);hitCooldown=2;if(!silent)toast('Снова на дороге. Погнали!');}
function start(){$('start').blur?.();document.body?.classList.add('playing');started=true;running=true;paused=false;$('intro').classList.add('hidden');$('hud').classList.add('visible');$('touch').classList.add('visible');toast('Добро пожаловать в 1986-й. Розовый маркер — твоя цель.');}
$('start').addEventListener('click',start);$('pause').addEventListener('click',togglePause);$('resume').addEventListener('click',togglePause);$('restart').addEventListener('click',()=>{reset();paused=false;$('pauseOverlay').classList.add('hidden');$('pause').textContent='Ⅱ';toast('Новая ночь. Новые возможности.');});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const k=e.key.length===1?e.key.toLowerCase():e.key;if(!e.repeat){if(k==='Escape'||k==='p')togglePause();if(k==='Enter'&&!started)start();if(k==='r'&&started&&!paused)recover();if(k==='c')cameraMode=(cameraMode+1)%3;if(k==='m')toggleSound();if(k==='e')interact();if(k==='g'&&started&&!paused)$('vehiclePicker').classList.toggle('hidden');if('12345'.includes(k)&&k.length===1)chooseVehicle(['car','atst','elephant','cloud','chicken'][Number(k)-1]);}keys[k]=true;});
window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});window.addEventListener('blur',()=>{keys={};if(started&&!paused)togglePause();});
// Physical key codes also support the Russian keyboard layout.
const codeKeys={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyR:'r',KeyC:'c',KeyM:'m',KeyE:'e',KeyF:'f',KeyI:'i',KeyK:'k',KeyG:'g'};
window.addEventListener('keydown',e=>{const k=codeKeys[e.code];if(!k)return;if(e.key.toLowerCase()!==k&&!e.repeat){if(k==='r'&&started&&!paused)recover();if(k==='c')cameraMode=(cameraMode+1)%3;if(k==='m')toggleSound();if(k==='e')interact();if(k==='g'&&started&&!paused)$('vehiclePicker').classList.toggle('hidden');if('12345'.includes(k)&&k.length===1)chooseVehicle(['car','atst','elephant','cloud','chicken'][Number(k)-1]);}keys[k]=true;});window.addEventListener('keyup',e=>{if(codeKeys[e.code])keys[codeKeys[e.code]]=false;});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;});const up=()=>keys[b.dataset.key]=false;b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
function damage(n){if(hitCooldown>0)return;player.health=Math.max(0,player.health-n);hitCooldown=.65;if(player.health<=0){money=Math.max(0,money-250);recover(true);player.health=100;heat=0;police=[];toast(inCar?'Машина восстановлена · ремонт $250':'Снова в деле · восстановление $250');}}
function update(dt){gameTime+=dt;clockTime+=dt*.16;hitCooldown=Math.max(0,hitCooldown-dt);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
const up=keys.w||keys.ArrowUp,down=keys.s||keys.ArrowDown,left=keys.a||keys.ArrowLeft,right=keys.d||keys.ArrowRight,drift=keys[' '],boost=keys.Shift&&up&&player.nitro>1;
if(inCar){
const spec=vehicleTypes[activeType];const max=boost?spec.boost:spec.max;
if(up)player.speed+=dt*(boost?spec.accel*1.55:spec.accel);else if(down)player.speed-=dt*(player.speed>1?45:17);else player.speed*=Math.pow(.975,dt*60);
player.speed=clamp(player.speed,-21,max);if(drift)player.speed*=Math.pow(.979,dt*60);
if(Math.abs(player.speed)>.4){const steer=(left?1:0)-(right?1:0);player.a-=steer*dt*(drift?spec.turn*1.75:spec.turn)*clamp(Math.abs(player.speed)/14,0,1)*(player.speed<0?-1:1);}
const grip=1-Math.exp(-(drift?2.1:10)*dt);player.vx=mix(player.vx,Math.sin(player.a)*player.speed,grip);player.vz=mix(player.vz,-Math.cos(player.a)*player.speed,grip);
}else{
player.a+=((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*1.8;aimPitch=clamp(aimPitch+((keys.i?1:0)-(keys.k?1:0))*dt*.8,-.45,1.3);
const f=(up?1:0)-(down?1:0),side=(keys.d?1:0)-(keys.a?1:0),normal=Math.hypot(f,side)||1,walk=keys.Shift?17:10;player.vx=(Math.sin(player.a)*f+Math.cos(player.a)*side)*walk/normal;player.vz=(-Math.cos(player.a)*f+Math.sin(player.a)*side)*walk/normal;player.speed=Math.hypot(player.vx,player.vz);
}
const oldX=player.x,oldZ=player.z;player.x+=player.vx*dt;player.z+=player.vz*dt;distanceDriven+=Math.hypot(player.vx,player.vz)*dt;
player.nitro=clamp(player.nitro+dt*(boost&&inCar?-24:8),0,100);
if(!inCar&&traffic.some(c=>!c.destroyed&&Math.hypot(c.x-player.x,c.z-player.z)<2.5)){player.x=oldX;player.z=oldZ;}
let collision=player.x<-437||player.x>433||player.z<-610||player.z>610;
for(const b of buildings){if(Math.abs(player.x-b.x)<b.w/2+(inCar?2:.7)&&Math.abs(player.z-b.z)<b.d/2+(inCar?3:.7)){collision=true;break;}}
if(collision){player.x=oldX;player.z=oldZ;const impact=Math.abs(player.speed);player.speed*=-.28;player.vx*=-.2;player.vz*=-.2;if(inCar&&impact>7)damage(Math.ceil(impact*.28));}
for(const car of traffic){if(car.destroyed)continue;if(!car.parked){if(!inCar&&Math.hypot(car.x-player.x,car.z-player.z)<16)continue;if(car.vertical){car.z+=car.dir*car.speed*dt;if(car.z>590)car.z=-590;if(car.z<-590)car.z=590;}else{car.x+=car.dir*car.speed*dt;if(car.x>420)car.x=-420;if(car.x<-420)car.x=420;}
}
if(inCar&&Math.hypot(car.x-player.x,car.z-player.z)<5.4&&hitCooldown<=0){const impact=Math.abs(player.speed);damage(5+Math.ceil(impact*.16));player.speed*=-.2;player.vx*=-.3;player.vz*=-.3;heat=clamp(heat+1,0,5);heatTimer=19;toast('Полиция заметила столкновение. Оторвись от патруля.');if(police.length<3)police.push({x:player.x+5,z:clamp(player.z+65,-595,595),a:player.a,speed:28});}}
if(heat>0){heatTimer-=dt;if(heatTimer<=0){heat--;heatTimer=heat>0?12:0;if(!heat){police=[];toast('Чисто. Патруль потерял твой след.');}}}
for(const p of police){if(p.destroyed)continue;const dx=player.x-p.x,dz=player.z-p.z,len=Math.hypot(dx,dz);const desired=Math.atan2(dx,-dz);let diff=Math.atan2(Math.sin(desired-p.a),Math.cos(desired-p.a));p.a+=clamp(diff,-dt*1.1,dt*1.1);p.x+=Math.sin(p.a)*p.speed*dt;p.z-=Math.cos(p.a)*p.speed*dt;const bx=roadsX.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a),bz=roadsZ.reduce((a,b)=>Math.abs(b-p.z)<Math.abs(a-p.z)?b:a);if(Math.abs(bx-p.x)>13&&Math.abs(bz-p.z)>13){if(Math.abs(bx-p.x)<Math.abs(bz-p.z))p.x=mix(p.x,bx,.15);else p.z=mix(p.z,bz,.15);}if(len<5){damage(7);player.speed*=.96;}if(len>270)heatTimer-=dt*2;}
const m=missions[missionIndex],dist=Math.hypot(m.x-player.x,m.z-player.z);
if(!completion&&dist<15){money+=m.reward;player.health=100;player.nitro=100;if(missionIndex<missions.length-1){toast(`Дело сделано! +$${m.reward} · Машина восстановлена`);missionIndex++;setMission();}else{completion=true;setMission();toast('Все задания выполнены! +$3500 · Город твой.');}playReward();}
updateSky(dt);police=police.filter(p=>!p.destroyed);
if(audioCtx&&engine){engine.frequency.setTargetAtTime(38+Math.abs(player.speed)*1.8,audioCtx.currentTime,.15);engineGain.gain.setTargetAtTime(soundOn&&inCar?.017:0,audioCtx.currentTime,.1);}
}
const mapCtx=$('map').getContext('2d');
function drawMap(){const ctx=mapCtx,w=420,h=420,s=.56;ctx.clearRect(0,0,w,h);ctx.fillStyle='#172b3a';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w/2,h*.59);ctx.scale(s,s);ctx.translate(-player.x,-player.z);ctx.fillStyle='#706875';ctx.fillRect(-560,-660,120,1320);ctx.fillStyle='#2c3446';ctx.fillRect(-440,-640,880,1280);ctx.strokeStyle='#52566d';ctx.lineWidth=22;for(const x of roadsX){ctx.beginPath();ctx.moveTo(x,-610);ctx.lineTo(x,610);ctx.stroke();}for(const z of roadsZ){ctx.beginPath();ctx.moveTo(-430,z);ctx.lineTo(430,z);ctx.stroke();}ctx.fillStyle='#3e455b';for(const b of buildings)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d);if(!completion){const m=missions[missionIndex];ctx.strokeStyle='#ff82b8';ctx.lineWidth=3;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(player.x,player.z);const nearZ=roadsZ.reduce((a,b)=>Math.abs(b-player.z)<Math.abs(a-player.z)?b:a);ctx.lineTo(player.x,nearZ);ctx.lineTo(m.x,nearZ);ctx.lineTo(m.x,m.z);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ff79b5';ctx.beginPath();ctx.arc(m.x,m.z,10+Math.sin(gameTime*3)*2,0,TAU);ctx.fill();ctx.strokeStyle='#ffd6e8';ctx.lineWidth=2;ctx.stroke();}
for(const p of police){ctx.fillStyle='#7ecbff';ctx.beginPath();ctx.arc(p.x,p.z,5,0,TAU);ctx.fill();}ctx.translate(player.x,player.z);ctx.rotate(player.a);ctx.shadowColor='#b9ffff';ctx.shadowBlur=12;ctx.fillStyle='#eafff7';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(8,10);ctx.lineTo(0,6);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.restore();
// Off-map objective direction indicator.
if(!completion){const m=missions[missionIndex],dx=(m.x-player.x)*s,dy=(m.z-player.z)*s;if(Math.abs(dx)>190||Math.abs(dy)>150){const angle=Math.atan2(dy,dx),r=155;ctx.save();ctx.translate(210+Math.cos(angle)*r,225+Math.sin(angle)*r);ctx.rotate(angle);ctx.fillStyle='#ff83b9';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();}}}
for(let i=0;i<24;i++)$('speedBars').appendChild(document.createElement('i'));
function updateHUD(){
$('rideClass').textContent=inCar&&activeType!=='car'?'SPECIAL RIDE':'SPORT CLASS';$('modeLabel').textContent=inCar?'ЗА РУЛЁМ':'ПЕШКОМ';$('vehicleName').textContent=inCar?activeName:'PLASMA GUN';$('weaponHUD').classList.toggle('hidden',inCar);$('crosshair').classList.toggle('hidden',inCar);$('speedPanel').classList.toggle('on-foot',!inCar);$('plasmaBar').style.width=plasma+'%';$('plasmaValue').textContent=Math.floor(plasma)+'%';$('skyScore').textContent=skyKills;
const nearby=!inCar?nearestCar():null;$('interactHint').textContent=inCar?'E — ВЫЙТИ ИЗ МАШИНЫ':nearby?'E — '+(nearby.owned?'СЕСТЬ В МАШИНУ':'УГНАТЬ '+(nearby.name||'МАШИНУ')):'WASD — ИДТИ · SHIFT — БЕГ · ЛКМ / F — ОГОНЬ';$('fireTouch').classList.toggle('hidden',inCar);
const speed=Math.round(Math.abs(player.speed)*2.2);$('speed').textContent=String(speed).padStart(3,'0');$('gear').textContent=player.speed<-.5?'R':speed<2?'N':Math.min(5,1+Math.floor(speed/35));$('money').textContent='$'+String(money).padStart(6,'0');$('health').textContent=Math.ceil(player.health);$('healthBar').style.width=player.health+'%';$('nitroBar').style.width=player.nitro+'%';$('wanted').textContent=Array.from({length:5},(_,i)=>i<heat?'★':'☆').join(' ');$('wanted').classList.toggle('active',heat>0);const m=missions[missionIndex],dist=Math.round(Math.hypot(m.x-player.x,m.z-player.z));$('distance').textContent=completion?'✓ Все дела сделаны':`↗ ${dist} м`;$('mapDistance').textContent=completion?'FREE':dist+' M';const district=player.x<-280?'Ocean Beach':player.z>200?'Downtown':'Neon District';$('district').textContent=district;$('mapLabel').textContent=district.toUpperCase();const mins=Math.floor(clockTime)%1440;$('clock').textContent=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');[...$('speedBars').children].forEach((b,i)=>{b.className=(i<speed/8?'on ':'')+(i>18?'hot':'');});}
function resize(){const ratio=Math.min(devicePixelRatio,1.65);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);gl.viewport(0,0,canvas.width,canvas.height);}
addEventListener('resize',resize);resize();
let last=performance.now(),fpsSamples=0,frameCount=0;
function render(now){requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.04);last=now;if(started&&!paused)update(dt);
if(!started){gameTime+=dt;player.a=0;}
let angle=player.a;if(!started)angle=-.3;let da=Math.atan2(Math.sin(angle-camAngle),Math.cos(angle-camAngle));camAngle+=da*(1-Math.exp(-dt*4));
const vehicleHeight=inCar?vehicleTypes[activeType].camera:0;const settings=!inCar?[14,5]:cameraMode===1?[36,27]:cameraMode===2?[12,6.5]:[22,11];const dist=settings[0]+Math.abs(player.speed)*.065;const eye=[player.x-Math.sin(camAngle)*dist,settings[1]+vehicleHeight+(keys.Shift&&keys.w?1:0),player.z+Math.cos(camAngle)*dist];
if(!paused){const smoothing=1-Math.exp(-dt*6);camera=camera.map((v,i)=>mix(v,eye[i],smoothing));target=inCar?[player.x+Math.sin(camAngle)*12,vehicleTypes[activeType].focus,player.z-Math.cos(camAngle)*12]:[player.x+Math.sin(camAngle)*30,5+Math.tan(aimPitch)*44,player.z-Math.cos(camAngle)*30];}
gl.clearColor(.2,.2,.3,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.useProgram(skyProgram);for(const l of Object.values(loc))if(typeof l==='number')gl.disableVertexAttribArray(l);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.enableVertexAttribArray(skyLoc.p);gl.vertexAttribPointer(skyLoc.p,2,gl.FLOAT,false,0,0);const basis=cameraBasis(camera,target);gl.uniform1f(skyLoc.uAspect,canvas.width/canvas.height);gl.uniform3fv(skyLoc.uForward,basis.forward);gl.uniform3fv(skyLoc.uRight,basis.right);gl.uniform3fv(skyLoc.uUp,basis.up);gl.uniform3fv(skyLoc.uSun,SUN_DIRECTION);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(skyLoc.p);
gl.enable(gl.DEPTH_TEST);gl.useProgram(sceneProgram);gl.enableVertexAttribArray(loc.aPos);gl.enableVertexAttribArray(loc.aNormal);gl.enableVertexAttribArray(loc.aColor);
const vp=multiply(perspective(PI*.34,canvas.width/canvas.height,.4,1800),lookAt(camera,target));gl.uniformMatrix4fv(loc.uVP,false,vp);gl.uniform3fv(loc.uCamera,camera);draw(worldMesh);drawSky();for(const c of traffic){if(!c.destroyed&&Math.hypot(c.x-player.x,c.z-player.z)<600)drawVehicle(c.mesh,c.type,c.x,c.z,c.a,c.parked?0:c.speed,c.x*.1);}for(const p of police)if(!p.destroyed)draw(policeMesh,model(p.x,1,p.z,p.a));if(inCar)drawVehicle(activeMesh,activeType,player.x,player.z,player.a,player.speed,0,true);else drawPerson();if(!completion){const m=missions[missionIndex];draw(ringMesh,model(m.x,1,m.z,0,1+Math.sin(gameTime*2)*.04));draw(gemMesh,model(m.x,8+Math.sin(gameTime*2),m.z,gameTime));}
if(now-lastMap>70){drawMap();lastMap=now;}if(now-lastHUD>90){updateHUD();lastHUD=now;}frameCount++;if(frameCount===120){fpsSamples=120000/(now-(window.__frameStart||now-2000));window.__frameStart=now;frameCount=0;}
}
// An original, gently looping synth soundtrack, generated in the browser.
let audioCtx,engine,engineGain,musicTimer,soundOn=false,musicStep=0;
function tone(freq,time,length,type,gain){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(gain,time+.02);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g);g.connect(audioCtx.destination);o.start(time);o.stop(time+length+.05);}
function musicTick(){if(!soundOn||paused)return;const t=audioCtx.currentTime+.03;const roots=[110,87.307,130.813,97.999];const root=roots[Math.floor(musicStep/16)%4];tone(root*(musicStep%4===2?2:1),t,.25,'triangle',.05);if(musicStep%2===0){const notes=[0,7,12,15,12,7,19,15];tone(root*2*Math.pow(2,notes[Math.floor(musicStep/2)%8]/12),t,.35,'sine',.035);}if(musicStep%4===0){tone(65,t,.13,'sine',.1);if(musicStep%16===0)for(const interval of [0,3,7])tone(root*2*Math.pow(2,interval/12),t,1.6,'triangle',.012);}musicStep++;}
function toggleSound(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();engine=audioCtx.createOscillator();engineGain=audioCtx.createGain();engine.type='sawtooth';engine.frequency.value=40;engineGain.gain.value=0;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=250;engine.connect(filter);filter.connect(engineGain);engineGain.connect(audioCtx.destination);engine.start();}audioCtx.resume();soundOn=!soundOn;$('soundLabel').textContent=soundOn?'NEON FM · 103.6':'РАДИО ВЫКЛ.';$('soundIcon').style.color=soundOn?'#7be6db':'#ff70b4';clearInterval(musicTimer);if(soundOn){musicTick();musicTimer=setInterval(musicTick,160);}else engineGain.gain.setTargetAtTime(0,audioCtx.currentTime,.1);}
function playReward(){if(!audioCtx||!soundOn)return;[440,554.37,659.25,880].forEach((f,i)=>tone(f,audioCtx.currentTime+i*.1,.4,'sine',.055));}
$('sound').addEventListener('click',toggleSound);
reset();requestAnimationFrame(render);
// Read-only diagnostics for local verification.
window.viceDrive={get state(){return {started,paused,player:{...player},missionIndex,money,heat,completion,traffic:traffic.length,inCar,activeType,plasma,skyKills,flyers:flyers.map(f=>({kind:f.kind,hp:f.hp})),staticVertices:worldMesh.count,fps:Math.round(fpsSamples)};}};
