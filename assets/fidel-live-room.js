// FIDEL LIVE ROOM V1 · dependency-free WebGL spatial stage
// The room is production-safe progressive enhancement. The geometric FIDEL is a
// placeholder until the approved rigged fidel.glb asset exists; WebRTC/Core stay untouched.

const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number(value)||0));
const mix=(a,b,t)=>a+(b-a)*t;

function mat4(){
  return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
}
function multiply(a,b){
  const out=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){
    out[c*4+r]=
      a[0*4+r]*b[c*4+0]+
      a[1*4+r]*b[c*4+1]+
      a[2*4+r]*b[c*4+2]+
      a[3*4+r]*b[c*4+3];
  }
  return out;
}
function translation(x,y,z){
  const m=mat4();m[12]=x;m[13]=y;m[14]=z;return m;
}
function scaling(x,y,z){
  const m=mat4();m[0]=x;m[5]=y;m[10]=z;return m;
}
function rotationY(rad){
  const m=mat4(),c=Math.cos(rad),s=Math.sin(rad);
  m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;
}
function rotationZ(rad){
  const m=mat4(),c=Math.cos(rad),s=Math.sin(rad);
  m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;
}
function perspective(fov,aspect,near,far){
  const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);
  m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;
  return m;
}
function normalize(v){
  const n=Math.hypot(v[0],v[1],v[2])||1;
  return [v[0]/n,v[1]/n,v[2]/n];
}
function cross(a,b){
  return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
}
function lookAt(eye,target,up=[0,1,0]){
  const z=normalize([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]);
  const x=normalize(cross(up,z));
  const y=cross(z,x);
  const m=mat4();
  m[0]=x[0];m[1]=y[0];m[2]=z[0];
  m[4]=x[1];m[5]=y[1];m[6]=z[1];
  m[8]=x[2];m[9]=y[2];m[10]=z[2];
  m[12]=-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]);
  m[13]=-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]);
  m[14]=-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]);
  return m;
}
function modelMatrix(position,scale,ry=0,rz=0){
  let m=translation(position[0],position[1],position[2]);
  if(ry)m=multiply(m,rotationY(ry));
  if(rz)m=multiply(m,rotationZ(rz));
  return multiply(m,scaling(scale[0],scale[1],scale[2]));
}

function compile(gl,type,source){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const message=gl.getShaderInfoLog(shader)||"shader compile failed";
    gl.deleteShader(shader);throw new Error(message);
  }
  return shader;
}
function program(gl){
  const vs=compile(gl,gl.VERTEX_SHADER,`
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uMvp;
    uniform mat4 uModel;
    varying float vLight;
    varying float vHeight;
    void main(){
      vec3 n=normalize(mat3(uModel)*aNormal);
      vec3 lightDir=normalize(vec3(-0.35,0.85,0.42));
      float diffuse=max(dot(n,lightDir),0.0);
      vLight=0.74+diffuse*0.26;
      vHeight=(uModel*vec4(aPosition,1.0)).y;
      gl_Position=uMvp*vec4(aPosition,1.0);
    }
  `);
  const fs=compile(gl,gl.FRAGMENT_SHADER,`
    precision mediump float;
    uniform vec3 uColor;
    uniform float uSoftness;
    varying float vLight;
    varying float vHeight;
    void main(){
      float cream=clamp((vHeight+0.2)*0.035,0.0,0.045);
      vec3 color=uColor*vLight+vec3(cream);
      gl_FragColor=vec4(mix(color,vec3(1.0),uSoftness),1.0);
    }
  `);
  const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||"program link failed");
  return p;
}

function cubeGeometry(){
  const p=[],n=[],i=[];
  const faces=[
    [[-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1],[0,0,1]],
    [[ 1,-1,-1],[-1,-1,-1],[-1, 1,-1],[ 1, 1,-1],[0,0,-1]],
    [[-1, 1, 1],[ 1, 1, 1],[ 1, 1,-1],[-1, 1,-1],[0,1,0]],
    [[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1],[-1,-1, 1],[0,-1,0]],
    [[ 1,-1, 1],[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1],[1,0,0]],
    [[-1,-1,-1],[-1,-1, 1],[-1, 1, 1],[-1, 1,-1],[-1,0,0]]
  ];
  for(const face of faces){
    const base=p.length/3;
    for(let v=0;v<4;v++){p.push(...face[v]);n.push(...face[4]);}
    i.push(base,base+1,base+2,base,base+2,base+3);
  }
  return {positions:p,normals:n,indices:i};
}
function sphereGeometry(lat=18,lon=24){
  const positions=[],normals=[],indices=[];
  for(let y=0;y<=lat;y++){
    const v=y/lat,phi=v*Math.PI;
    for(let x=0;x<=lon;x++){
      const u=x/lon,theta=u*Math.PI*2;
      const sx=Math.sin(phi)*Math.cos(theta),sy=Math.cos(phi),sz=Math.sin(phi)*Math.sin(theta);
      positions.push(sx,sy,sz);normals.push(sx,sy,sz);
    }
  }
  for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
    const a=y*(lon+1)+x,b=a+lon+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  return {positions,normals,indices};
}
function makeMesh(gl,geometry){
  const position=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,position);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.positions),gl.STATIC_DRAW);
  const normal=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normal);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.normals),gl.STATIC_DRAW);
  const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(geometry.indices),gl.STATIC_DRAW);
  return {position,normal,index,count:geometry.indices.length};
}

function makeRenderer(canvas){
  const gl=canvas.getContext("webgl",{alpha:false,antialias:true,powerPreference:"high-performance"});
  if(!gl)return null;
  const shader=program(gl);
  const cube=makeMesh(gl,cubeGeometry());
  const sphere=makeMesh(gl,sphereGeometry());
  const aPosition=gl.getAttribLocation(shader,"aPosition");
  const aNormal=gl.getAttribLocation(shader,"aNormal");
  const uMvp=gl.getUniformLocation(shader,"uMvp");
  const uModel=gl.getUniformLocation(shader,"uModel");
  const uColor=gl.getUniformLocation(shader,"uColor");
  const uSoftness=gl.getUniformLocation(shader,"uSoftness");
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  const bind=(mesh)=>{
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);
    gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);
    gl.enableVertexAttribArray(aNormal);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
  };
  const draw=(mesh,viewProjection,position,scale,color,ry=0,rz=0,softness=0)=>{
    const model=modelMatrix(position,scale,ry,rz);
    const mvp=multiply(viewProjection,model);
    bind(mesh);
    gl.uniformMatrix4fv(uMvp,false,mvp);
    gl.uniformMatrix4fv(uModel,false,model);
    gl.uniform3fv(uColor,color);
    gl.uniform1f(uSoftness,softness);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
  };
  const resize=()=>{
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const width=Math.max(1,Math.floor(canvas.clientWidth*dpr));
    const height=Math.max(1,Math.floor(canvas.clientHeight*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
    return width/height;
  };
  const render=(scene)=>{
    const aspect=resize();
    gl.clearColor(0.965,0.958,0.94,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shader);
    const projection=perspective(Math.PI/5.7,aspect,.1,60);
    const view=lookAt(scene.camera,[0,scene.lookY,scene.lookZ]);
    const vp=multiply(projection,view);

    const room=[.965,.958,.94],room2=[.985,.98,.968],desk=[.955,.95,.938];
    draw(cube,vp,[0,-.12,-.4],[6.8,.12,6.8],room2,0,0,.02);
    draw(cube,vp,[0,2.9,-3.65],[6.8,3.1,.10],room,0,0,.035);
    draw(cube,vp,[-4.25,2.3,-.2],[.10,2.5,4.1],room2,0,0,.04);
    draw(cube,vp,[4.25,2.3,-.2],[.10,2.5,4.1],room2,0,0,.04);

    // Minimal white desk. It intentionally remains quiet and low-contrast.
    draw(cube,vp,[0,1.00,.75],[1.55,.075,.52],desk,0,0,.02);
    draw(cube,vp,[-1.16,.48,.75],[.075,.48,.40],desk,0,0,.02);
    draw(cube,vp,[1.16,.48,.75],[.075,.48,.40],desk,0,0,.02);

    const z=scene.characterZ;
    const stand=scene.stand;
    const breathe=scene.breathe;
    const body=[.34,.43,.49],body2=[.43,.52,.57],cream=[.90,.91,.90],dark=[.10,.12,.13];
    const torsoY=mix(1.28,1.62,stand)+breathe*.02;
    const headY=mix(1.93,2.28,stand)+breathe*.015;
    const hipY=mix(.92,1.10,stand);
    const armY=torsoY+.03;

    // Elegant abstract digital being: intentionally not a literal animal.
    draw(sphere,vp,[0,torsoY,z],[.43,.66,.34],body,scene.turn,0,.005);
    draw(sphere,vp,[0,headY,z+.015],[.41,.46,.39],body2,scene.turn,0,.004);
    draw(sphere,vp,[0,headY-.06,z+.355],[.26,.27,.075],cream,scene.turn,0,.012);
    draw(sphere,vp,[-.125,headY+.035,z+.405],[.035,.043,.026],dark,0,0,0);
    draw(sphere,vp,[.125,headY+.035,z+.405],[.035,.043,.026],dark,0,0,0);
    draw(sphere,vp,[0,torsoY+.04,z+.32],[.22,.38,.055],cream,0,0,.006);

    const gesture=scene.gesture;
    draw(sphere,vp,[-.46,armY,z+.01],[.12,.47,.12],body2,0,-.10-gesture*.16,.004);
    draw(sphere,vp,[.46,armY,z+.01],[.12,.47,.12],body2,0,.10+gesture*.16,.004);
    draw(sphere,vp,[-.22,hipY,z],[.19,.38,.18],body,0,0,.004);
    draw(sphere,vp,[.22,hipY,z],[.19,.38,.18],body,0,0,.004);
  };
  const destroy=()=>{
    for(const mesh of [cube,sphere]){
      gl.deleteBuffer(mesh.position);gl.deleteBuffer(mesh.normal);gl.deleteBuffer(mesh.index);
    }
    gl.deleteProgram(shader);
  };
  return {render,destroy};
}

export function mountFidelLiveRoom(host,{enabled=true}={}){
  if(!(host instanceof HTMLElement)||!enabled)return null;
  const canvas=document.createElement("canvas");
  canvas.className="nw-fidel-room-canvas";
  canvas.setAttribute("aria-hidden","true");
  host.replaceChildren(canvas);
  let renderer=null;
  try{renderer=makeRenderer(canvas);}catch{renderer=null;}
  if(!renderer){
    host.dataset.fidelRoomSupported="false";
    return {supported:false,start(){},stop(){},setState(){},setAudio(){},destroy(){host.replaceChildren();}};
  }

  host.dataset.fidelRoomSupported="true";
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
  let state="idle",inLevel=0,outLevel=0,raf=0,running=false,last=0,approach=0,stand=0;
  let speakingAt=0;

  const normalizedState=(value)=>{
    switch(String(value||"").toLowerCase()){
      case "connected":
      case "listening": return "listening";
      case "speaking": return "speaking";
      case "thinking":
      case "executing":
      case "execution_result_ready":
      case "quoting":
      case "connecting":
      case "pricing_locked": return "thinking";
      case "warning":
      case "error": return "warning";
      case "ended":
      case "closed":
      case "disconnected": return "idle";
      default:return String(value||"idle").toLowerCase();
    }
  };

  const setState=(value)=>{
    const next=normalizedState(value);
    if(next===state)return;
    state=next;
    if(state==="speaking")speakingAt=performance.now();
    host.dataset.fidelRoomState=state;
  };
  const setAudio=(input=0,output=0)=>{
    inLevel=clamp(input);outLevel=clamp(output);
  };
  const frame=(now)=>{
    if(!running)return;
    const dt=Math.min(.05,Math.max(.001,(now-last)/1000||.016));last=now;
    const speakingLong=state==="speaking"&&now-speakingAt>520;
    let targetApproach=speakingLong?.82:0;
    if(state==="thinking")targetApproach=.08;
    if(reduced)targetApproach=Math.min(targetApproach,.18);
    const targetStand=(state==="speaking"||state==="thinking")?.88:0;
    approach+= (targetApproach-approach)*Math.min(1,dt*(reduced?3.5:1.75));
    stand+= (targetStand-stand)*Math.min(1,dt*(reduced?4.5:2.4));

    const t=now*.001;
    const activeSpeech=state==="speaking"?Math.max(.06,outLevel):0;
    const listening=state==="listening"?inLevel:0;
    const scene={
      camera:[0,1.58,5.5-mix(0,.16,approach)],
      lookY:1.46+stand*.08,
      lookZ:.12+approach*.34,
      characterZ:mix(-.06,1.72,approach),
      stand,
      breathe:reduced?0:Math.sin(t*1.65)*.5+.5,
      turn:reduced?0:Math.sin(t*.72)*.025+listening*.025,
      gesture:reduced?0:activeSpeech*(.35+.65*(Math.sin(t*3.2)*.5+.5))
    };
    renderer.render(scene);
    raf=requestAnimationFrame(frame);
  };
  const start=()=>{
    if(running)return;
    running=true;host.hidden=false;last=performance.now();
    raf=requestAnimationFrame(frame);
    window.dispatchEvent(new CustomEvent("stewaro:fidel-room-ready",{detail:{version:1,placeholder_model:true}}));
  };
  const stop=()=>{
    running=false;cancelAnimationFrame(raf);raf=0;setAudio(0,0);setState("idle");
  };
  const destroy=()=>{stop();renderer.destroy();host.replaceChildren();};

  return {supported:true,start,stop,setState,setAudio,destroy};
}
