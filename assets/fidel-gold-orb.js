// FIDEL GOLD GLASS ORB RUNTIME V1
// Shared, dependency-free real-time renderer for Web + native app WebView surfaces.

const GOLD = Object.freeze({
  pale:[255,238,190],
  warm:[255,190,72],
  deep:[176,104,24],
  ember:[118,64,12]
});

const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const lerp=(a,b,t)=>a+(b-a)*t;
const seeded=(seed)=>{
  let s=seed>>>0;
  return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
};

function stateProfile(state){
  switch(String(state||"idle")){
    case "listening": return {energy:.27,speed:.60,pulse:.22,focus:.42};
    case "thinking": return {energy:.52,speed:1.18,pulse:.38,focus:.62};
    case "speaking": return {energy:.64,speed:1.04,pulse:.62,focus:.72};
    case "warning": return {energy:.46,speed:.46,pulse:.20,focus:.94};
    case "success": return {energy:.72,speed:.72,pulse:.74,focus:.55};
    case "connecting": return {energy:.34,speed:.82,pulse:.28,focus:.52};
    default: return {energy:.18,speed:.42,pulse:.14,focus:.34};
  }
}

function makeParticles(count=58){
  const rnd=seeded(0xF1DE1);
  return Array.from({length:count},(_,i)=>({
    a:rnd()*Math.PI*2,
    r:.10+rnd()*.72,
    z:.18+rnd()*.82,
    size:.45+rnd()*1.7,
    drift:(rnd()-.5)*.22,
    phase:rnd()*Math.PI*2,
    band:i%3
  }));
}

export function mountFidelGoldOrb(target,{state="idle",interactive=true}={}){
  const canvas=target instanceof HTMLCanvasElement?target:target?.querySelector?.("canvas")||null;
  if(!(canvas instanceof HTMLCanvasElement))return null;

  canvas.classList.add("nw-fidel-orb-canvas");
  const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
  if(!ctx)return null;

  const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
  const particles=makeParticles();
  let mode=state;
  let input=0,output=0,smoothIn=0,smoothOut=0,hover=0;
  let raf=0,last=performance.now(),phase=0;
  let cssW=0,cssH=0,dpr=1,destroyed=false;

  const resize=()=>{
    const rect=canvas.getBoundingClientRect();
    cssW=Math.max(2,rect.width||canvas.clientWidth||240);
    cssH=Math.max(2,rect.height||canvas.clientHeight||cssW);
    dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(2,Math.round(cssW*dpr));
    const h=Math.max(2,Math.round(cssH*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  };
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;
  observer?.observe(canvas);
  resize();

  const pointerIn=()=>{hover=1;};
  const pointerOut=()=>{hover=0;};
  if(interactive){
    canvas.addEventListener("pointerenter",pointerIn,{passive:true});
    canvas.addEventListener("pointerleave",pointerOut,{passive:true});
  }

  function drawGlassSphere(cx,cy,R,energy,focus){
    ctx.save();
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();

    const base=ctx.createRadialGradient(cx-R*.30,cy-R*.36,R*.04,cx,cy,R*1.05);
    base.addColorStop(0,"rgba(255,245,218,.26)");
    base.addColorStop(.18,"rgba(107,72,34,.32)");
    base.addColorStop(.50,"rgba(37,24,15,.78)");
    base.addColorStop(.82,"rgba(14,11,9,.94)");
    base.addColorStop(1,"rgba(4,4,4,.99)");
    ctx.fillStyle=base;ctx.fillRect(cx-R,cy-R,R*2,R*2);

    const amber=ctx.createRadialGradient(cx+R*.28,cy+R*.14,0,cx+R*.16,cy+R*.10,R*.92);
    amber.addColorStop(0,`rgba(255,184,58,${.10+energy*.17})`);
    amber.addColorStop(.44,`rgba(178,92,14,${.08+energy*.10})`);
    amber.addColorStop(1,"rgba(20,10,2,0)");
    ctx.fillStyle=amber;ctx.fillRect(cx-R,cy-R,R*2,R*2);

    // Internal golden flowing ribbons.
    ctx.globalCompositeOperation="lighter";
    const ribbonCount=5;
    for(let i=0;i<ribbonCount;i++){
      const yBase=cy+Math.sin(phase*.54+i*1.12)*R*(.08+i*.012);
      const amp=R*(.10+i*.014)*(1+energy*.28);
      const shift=phase*(.72+i*.055)+i*.92;
      const grad=ctx.createLinearGradient(cx-R,cy,cx+R,cy);
      grad.addColorStop(0,"rgba(255,164,40,0)");
      grad.addColorStop(.14,`rgba(255,178,46,${.16+energy*.16})`);
      grad.addColorStop(.48,`rgba(255,235,167,${.34+energy*.28})`);
      grad.addColorStop(.77,`rgba(255,188,60,${.22+energy*.24})`);
      grad.addColorStop(1,"rgba(255,152,28,0)");
      ctx.strokeStyle=grad;
      ctx.lineWidth=Math.max(1.2,R*(.010+i*.0025));
      ctx.shadowColor="rgba(255,175,45,.95)";
      ctx.shadowBlur=R*(.028+energy*.035);
      ctx.beginPath();
      const steps=42;
      for(let k=0;k<=steps;k++){
        const t=k/steps;
        const x=cx-R*.86+t*R*1.72;
        const envelope=Math.sin(Math.PI*t);
        const y=yBase+
          Math.sin(t*Math.PI*2.1+shift)*amp*envelope+
          Math.sin(t*Math.PI*4.6-shift*.72)*amp*.26*envelope;
        if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    // Fine internal particles / sparks.
    ctx.shadowBlur=0;
    for(const p of particles){
      const theta=p.a+phase*(.10+p.drift);
      const wobble=Math.sin(phase*.42+p.phase)*.035;
      const rr=R*(p.r+wobble)*(1-.13*Math.cos(theta));
      const px=cx+Math.cos(theta)*rr;
      const py=cy+Math.sin(theta)*rr*.55 + Math.sin(theta*1.9+p.phase)*R*.045;
      const alpha=(.08+.30*p.z)*(.55+energy*.62)*(1-Math.min(1,Math.abs(px-cx)/(R*1.05))*.28);
      ctx.fillStyle=`rgba(255,210,108,${alpha})`;
      ctx.beginPath();ctx.arc(px,py,Math.max(.45,p.size*dpr*.42),0,Math.PI*2);ctx.fill();
    }

    // Focused inner heart, intentionally subtle.
    const heartR=R*(.16+energy*.025);
    const heart=ctx.createRadialGradient(cx,cy,0,cx,cy,heartR*1.9);
    heart.addColorStop(0,`rgba(255,250,220,${.46+energy*.20})`);
    heart.addColorStop(.20,`rgba(255,215,118,${.30+energy*.22})`);
    heart.addColorStop(.58,`rgba(255,153,34,${.08+energy*.12})`);
    heart.addColorStop(1,"rgba(255,144,20,0)");
    ctx.fillStyle=heart;ctx.beginPath();ctx.arc(cx,cy,heartR*1.9,0,Math.PI*2);ctx.fill();

    ctx.globalCompositeOperation="source-over";

    // Glass reflection.
    const shine=ctx.createRadialGradient(cx-R*.37,cy-R*.45,0,cx-R*.31,cy-R*.39,R*.68);
    shine.addColorStop(0,"rgba(255,255,255,.52)");
    shine.addColorStop(.18,"rgba(255,250,235,.18)");
    shine.addColorStop(.44,"rgba(255,255,255,.035)");
    shine.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=shine;ctx.fillRect(cx-R,cy-R,R*2,R*2);

    const lower=ctx.createRadialGradient(cx,cy+R*.74,0,cx,cy+R*.74,R*.66);
    lower.addColorStop(0,`rgba(255,171,42,${.08+energy*.10})`);
    lower.addColorStop(1,"rgba(255,171,42,0)");
    ctx.fillStyle=lower;ctx.fillRect(cx-R,cy,2*R,R);

    ctx.restore();

    // Exterior rim / refraction.
    const rim=ctx.createRadialGradient(cx-R*.18,cy-R*.24,R*.62,cx,cy,R*1.02);
    rim.addColorStop(0,"rgba(255,255,255,0)");
    rim.addColorStop(.76,"rgba(255,226,160,.03)");
    rim.addColorStop(.90,`rgba(255,188,58,${.18+energy*.16})`);
    rim.addColorStop(.965,"rgba(255,239,190,.68)");
    rim.addColorStop(1,"rgba(255,177,42,.16)");
    ctx.fillStyle=rim;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();

    ctx.lineWidth=Math.max(1,R*.008);
    ctx.strokeStyle=`rgba(255,221,145,${.46+focus*.18})`;
    ctx.shadowColor=`rgba(255,169,38,${.24+energy*.40})`;
    ctx.shadowBlur=R*(.055+energy*.08);
    ctx.beginPath();ctx.arc(cx,cy,R*.985,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;
  }

  function frame(now){
    if(destroyed)return;
    resize();
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    smoothIn=lerp(smoothIn,input,1-Math.pow(.001,dt));
    smoothOut=lerp(smoothOut,output,1-Math.pow(.001,dt));
    const profile=stateProfile(mode);
    const audio=Math.max(smoothIn*.62,smoothOut);
    const vocal=clamp(audio*1.45);
    const energy=clamp(profile.energy+vocal*.46+hover*.07);
    const speed=profile.speed*(1+vocal*.38);
    if(!reduce)phase+=dt*speed;

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);
    const cx=cssW/2,cy=cssH/2;
    const R=Math.min(cssW,cssH)*(.438+vocal*.008);

    const aura=ctx.createRadialGradient(cx,cy,R*.62,cx,cy,R*1.28);
    aura.addColorStop(0,`rgba(255,176,42,${.035+energy*.055})`);
    aura.addColorStop(.64,`rgba(255,157,28,${.018+energy*.035})`);
    aura.addColorStop(1,"rgba(255,145,22,0)");
    ctx.fillStyle=aura;ctx.beginPath();ctx.arc(cx,cy,R*1.28,0,Math.PI*2);ctx.fill();

    const breathe=reduce?1:1+Math.sin(phase*.92)*(.006+profile.pulse*.004)+vocal*.012;
    ctx.save();
    ctx.translate(cx,cy);ctx.scale(breathe,breathe);ctx.translate(-cx,-cy);
    drawGlassSphere(cx,cy,R,energy,profile.focus);
    ctx.restore();

    raf=requestAnimationFrame(frame);
  }

  raf=requestAnimationFrame(frame);

  return Object.freeze({
    setAudio(inLevel=0,outLevel=0){input=clamp(inLevel);output=clamp(outLevel);},
    setState(next="idle"){mode=String(next||"idle");},
    pulse(next="success",ms=650){
      const previous=mode;mode=next;
      window.setTimeout(()=>{if(mode===next)mode=previous;},Math.max(120,Number(ms)||650));
    },
    destroy(){
      destroyed=true;cancelAnimationFrame(raf);observer?.disconnect();
      if(interactive){
        canvas.removeEventListener("pointerenter",pointerIn);
        canvas.removeEventListener("pointerleave",pointerOut);
      }
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  });
}

export function autoMountFidelOrbs(root=document){
  const instances=[];
  root.querySelectorAll?.("canvas[data-fidel-orb]").forEach(canvas=>{
    if(canvas.dataset.fidelOrbMounted==="1")return;
    canvas.dataset.fidelOrbMounted="1";
    const instance=mountFidelGoldOrb(canvas,{state:canvas.dataset.fidelOrbState||"idle"});
    if(instance)instances.push(instance);
  });
  return instances;
}
