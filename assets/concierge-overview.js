(()=>{const P=window.NAHWERKCarousel?.profiles||[],G=document.getElementById("conciergeOverviewGrid"),D=document.getElementById("conciergeProfileDialog"),R=document.getElementById("continentOptions"),CS=document.getElementById("countryStep"),CO=document.getElementById("countryOptions"),CL=document.getElementById("countryGridLabel"),CD=document.getElementById("countryDetail"),CC=document.getElementById("countryOutline"),DK=document.getElementById("countryDetailKicker"),DT=document.getElementById("countryDetailTitle"),DX=document.getElementById("countryDetailText"),DC=document.getElementById("countryDetailClose"),CTA=document.getElementById("countryDetailCta"),ALL=document.getElementById("showAllConcierges"),RH=document.getElementById("conciergeResultsHead"),RK=document.getElementById("conciergeResultsKicker"),RT=document.getElementById("conciergeResultsTitle"),RR=document.getElementById("conciergeResultsReset");if(!P.length||!G||!R)return;const O={nilo:["Europa","Spanien"],mira:["Europa","Spanien"],sofia:["Europa","Spanien"],lena:["Europa","Deutschland"],lukas:["Europa","Deutschland"],hartmut:["Europa","Deutschland"],frida:["Europa","Deutschland"],camille:["Europa","Frankreich"],anna:["Europa","Polen"],olena:["Europa","Ukraine"],leyla:["Asien","Türkei"],asha:["Asien","Indien"],arjun:["Asien","Indien"],sari:["Asien","Indonesien"],noor:["Asien","Levant"],mei:["Asien","China"],wei:["Asien","China"],yuki:["Asien","Japan"],ren:["Asien","Japan"],amara:["Afrika","Ghana"],kwame:["Afrika","Ghana"],zuri:["Afrika","Kenia"],jabari:["Afrika","Kenia"]},M={Europa:{c:[50,15],l:["Deutschland","Frankreich","Spanien","Italien","Polen","Großbritannien","Norwegen","Schweden","Ukraine"]},Asien:{c:[30,90],l:["China","Japan","Indien","Südkorea","Thailand","Malaysia","Indonesien","Vietnam","VAE","Saudi-Arabien","Türkei","Levant"]},Afrika:{c:[4,21],l:["Kenia","Ghana","Südafrika","Marokko","Ägypten","Nigeria","Tansania","Senegal"]}},N={"Deutschland":["Germany"],"Frankreich":["France"],"Spanien":["Spain"],"Italien":["Italy"],"Polen":["Poland"],"Großbritannien":["United Kingdom"],"Norwegen":["Norway"],"Schweden":["Sweden"],"Ukraine":["Ukraine"],"China":["China"],"Japan":["Japan"],"Indien":["India"],"Südkorea":["South Korea"],"Thailand":["Thailand"],"Malaysia":["Malaysia"],"Indonesien":["Indonesia"],"Vietnam":["Vietnam"],"VAE":["United Arab Emirates"],"Saudi-Arabien":["Saudi Arabia"],"Türkei":["Turkey"],"Levant":["Lebanon","Israel","Jordan","Syria"],"Kenia":["Kenya"],"Ghana":["Ghana"],"Südafrika":["South Africa"],"Marokko":["Morocco"],"Ägypten":["Egypt"],"Nigeria":["Nigeria"],"Tansania":["United Republic of Tanzania","Tanzania"],"Senegal":["Senegal"]},F={"Deutschland":"🇩🇪","Frankreich":"🇫🇷","Spanien":"🇪🇸","Polen":"🇵🇱","Ukraine":"🇺🇦","China":"🇨🇳","Japan":"🇯🇵","Indien":"🇮🇳","Indonesien":"🇮🇩","Türkei":"🇹🇷","Ghana":"🇬🇭","Kenia":"🇰🇪"},CE={Europa:"Europe",Asien:"Asia",Afrika:"Africa"},CITIES={Europa:[[52.5,13.4],[48.85,2.35],[40.42,-3.7],[41.9,12.5],[52.23,21.01],[51.5,-.13]],Asien:[[39.9,116.4],[35.68,139.65],[28.61,77.21],[1.35,103.82],[13.76,100.5],[25.2,55.27]],Afrika:[[-1.29,36.82],[5.6,-.19],[6.52,3.38],[-26.2,28.05],[30.04,31.24],[33.57,-7.59]]};const GP=P.reduce((a,p)=>{const[r,c]=O[p.key]||["Weitere","Weitere"];a[r]??={};a[r][c]??=[];a[r][c].push(p);return a},{}),RP=r=>Object.values(GP[r]||{}).flat();let W=null,OP=null;fetch("assets/ne_110m_admin_0_countries.geojson?v=1").then(r=>r.json()).then(g=>{W=g;document.querySelectorAll("[data-globe]").forEach(globe)});function pr(lat,lon,lat0,lon0,R,cx,cy){const d=Math.PI/180,p=lat*d,l=(lon-lon0)*d,p0=lat0*d,z=Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);if(z<=0)return null;return[cx+R*Math.cos(p)*Math.sin(l),cy-R*(Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l))]}function pc(c){const q=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(260,q.width||320);c.width=w*d;c.height=w*d;const x=c.getContext("2d");x.setTransform(d,0,0,d,0,0);return[x,w,w*.455,w/2,w/2]}function rings(f){const g=f.geometry;if(!g)return[];return g.type==="Polygon"?g.coordinates:g.type==="MultiPolygon"?g.coordinates.flat():[]}function globe(c){
  if(!W)return;
  const reg=c.dataset.globe,[lat0,lon0]=M[reg].c,[x,w,R,cx,cy]=pc(c);
  x.clearRect(0,0,w,w);

  const shadow=x.createRadialGradient(cx,cy+R*.82,0,cx,cy+R*.82,R*.72);
  shadow.addColorStop(0,"rgba(0,0,0,.34)");
  shadow.addColorStop(.55,"rgba(0,0,0,.14)");
  shadow.addColorStop(1,"rgba(0,0,0,0)");
  x.save();
  x.translate(cx,cy+R*.82);
  x.scale(1,.24);
  x.fillStyle=shadow;
  x.beginPath();
  x.arc(0,0,R*.72,0,Math.PI*2);
  x.fill();
  x.restore();

  let g=x.createRadialGradient(cx-R*.34,cy-R*.38,R*.04,cx,cy,R*1.03);
  g.addColorStop(0,"#285f8f");
  g.addColorStop(.28,"#123b62");
  g.addColorStop(.58,"#081f38");
  g.addColorStop(.82,"#061321");
  g.addColorStop(1,"#02060c");
  x.fillStyle=g;
  x.beginPath();
  x.arc(cx,cy,R,0,Math.PI*2);
  x.fill();

  x.save();
  x.beginPath();
  x.arc(cx,cy,R,0,Math.PI*2);
  x.clip();

  const violet=x.createRadialGradient(cx+R*.34,cy-R*.18,0,cx+R*.34,cy-R*.18,R*.92);
  violet.addColorStop(0,"rgba(112,68,190,.17)");
  violet.addColorStop(.55,"rgba(79,48,148,.055)");
  violet.addColorStop(1,"rgba(79,48,148,0)");
  x.fillStyle=violet;
  x.fillRect(cx-R,cy-R,R*2,R*2);

  const cyan=x.createRadialGradient(cx-R*.42,cy+R*.18,0,cx-R*.42,cy+R*.18,R*.88);
  cyan.addColorStop(0,"rgba(40,151,176,.11)");
  cyan.addColorStop(.58,"rgba(31,119,157,.035)");
  cyan.addColorStop(1,"rgba(31,119,157,0)");
  x.fillStyle=cyan;
  x.fillRect(cx-R,cy-R,R*2,R*2);

  function gridLine(points){
    x.beginPath();
    let started=false;
    for(const [lat,lon] of points){
      const p=pr(lat,lon,lat0,lon0,R,cx,cy);
      if(!p){started=false;continue}
      started?x.lineTo(p[0],p[1]):(x.moveTo(p[0],p[1]),started=true);
    }
    x.stroke();
  }
  x.strokeStyle="rgba(151,198,226,.065)";
  x.lineWidth=.48;
  for(const lat of [-60,-30,0,30,60]){
    const pts=[];
    for(let lon=-180;lon<=180;lon+=5)pts.push([lat,lon]);
    gridLine(pts);
  }
  x.strokeStyle="rgba(151,198,226,.052)";
  for(let lon=-150;lon<=180;lon+=30){
    const pts=[];
    for(let lat=-85;lat<=85;lat+=5)pts.push([lat,lon]);
    gridLine(pts);
  }

  const landHi=x.createLinearGradient(cx-R,cy-R,cx+R,cy+R);
  landHi.addColorStop(0,"rgba(226,239,247,.96)");
  landHi.addColorStop(.46,"rgba(162,198,221,.91)");
  landHi.addColorStop(1,"rgba(77,126,160,.87)");
  const landLo=x.createLinearGradient(cx-R,cy-R,cx+R,cy+R);
  landLo.addColorStop(0,"rgba(101,145,174,.58)");
  landLo.addColorStop(.52,"rgba(61,105,137,.48)");
  landLo.addColorStop(1,"rgba(39,73,101,.38)");

  W.features.forEach(f=>{
    const hi=f.properties?.CONTINENT===CE[reg];
    x.fillStyle=hi?landHi:landLo;
    x.strokeStyle=hi?"rgba(240,248,252,.42)":"rgba(143,187,215,.14)";
    x.lineWidth=hi?.78:.42;
    rings(f).forEach(r=>{
      x.beginPath();
      let started=false,n=0;
      r.forEach(([lon,lat])=>{
        const p=pr(lat,lon,lat0,lon0,R,cx,cy);
        if(!p){started=false;return}
        n++;
        started?x.lineTo(p[0],p[1]):(x.moveTo(p[0],p[1]),started=true);
      });
      if(n>2){x.closePath();x.fill();x.stroke()}
    });
  });

  for(const[lat,lon]of CITIES[reg]){
    const p=pr(lat,lon,lat0,lon0,R,cx,cy);
    if(!p)continue;
    const z=x.createRadialGradient(p[0],p[1],0,p[0],p[1],8.5);
    z.addColorStop(0,"rgba(255,230,158,.98)");
    z.addColorStop(.2,"rgba(239,190,79,.66)");
    z.addColorStop(1,"rgba(224,153,39,0)");
    x.fillStyle=z;
    x.beginPath();
    x.arc(p[0],p[1],8.5,0,Math.PI*2);
    x.fill();
    x.fillStyle="#f2c86b";
    x.beginPath();
    x.arc(p[0],p[1],1.35,0,Math.PI*2);
    x.fill();
  }

  const spec=x.createRadialGradient(cx-R*.42,cy-R*.46,0,cx-R*.42,cy-R*.46,R*.9);
  spec.addColorStop(0,"rgba(255,255,255,.17)");
  spec.addColorStop(.2,"rgba(255,255,255,.065)");
  spec.addColorStop(.52,"rgba(255,255,255,0)");
  x.fillStyle=spec;
  x.fillRect(cx-R,cy-R,R*2,R*2);

  const shade=x.createLinearGradient(cx-R*.65,cy-R*.72,cx+R*.86,cy+R*.82);
  shade.addColorStop(0,"rgba(255,255,255,.035)");
  shade.addColorStop(.5,"rgba(0,0,0,0)");
  shade.addColorStop(.82,"rgba(0,0,0,.31)");
  shade.addColorStop(1,"rgba(0,0,0,.62)");
  x.fillStyle=shade;
  x.fillRect(cx-R,cy-R,R*2,R*2);
  x.restore();

  x.strokeStyle="rgba(126,202,244,.34)";
  x.lineWidth=1.35;
  x.beginPath();
  x.arc(cx,cy,R-.7,0,Math.PI*2);
  x.stroke();
  x.strokeStyle="rgba(162,108,221,.13)";
  x.lineWidth=2.8;
  x.beginPath();
  x.arc(cx,cy,R+1.1,0,Math.PI*2);
  x.stroke();
  x.strokeStyle="rgba(229,190,94,.13)";
  x.lineWidth=.8;
  x.beginPath();
  x.arc(cx,cy,R-3.1,0,Math.PI*2);
  x.stroke();
}function mf(country){if(!W)return null;const a=N[country]||[country];return W.features.find(f=>a.includes(f.properties?.ADMIN)||a.includes(f.properties?.NAME)||a.includes(f.properties?.SOVEREIGNT))}function outline(country){const f=mf(country);if(!f)return;const[x,w]=pc(CC),rr=rings(f),pts=rr.flat();let ax=180,bx=-180,ay=90,by=-90;pts.forEach(([a,b])=>{ax=Math.min(ax,a);bx=Math.max(bx,a);ay=Math.min(ay,b);by=Math.max(by,b)});const p=28,s=Math.min((w-p*2)/(bx-ax||1),(w-p*2)/(by-ay||1)),ox=(w-(bx-ax)*s)/2,oy=(w-(by-ay)*s)/2;x.fillStyle="rgba(212,175,55,.045)";x.strokeStyle="rgba(180,135,45,.8)";x.lineWidth=1.2;rr.forEach(r=>{x.beginPath();r.forEach(([a,b],i)=>{const X=ox+(a-ax)*s,Y=w-(oy+(b-ay)*s);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.closePath();x.fill();x.stroke()})}function card(p,i){const a=document.createElement("article");a.className="concierge-overview-card";const b=document.createElement("button");b.type="button";b.className="concierge-overview-profile";b.innerHTML='<span class="concierge-overview-card-media"><img alt="Portrait von '+p.name+', NAHWERK Concierge" width="480" height="722"></span><span class="concierge-overview-card-copy"><strong>'+p.name+'</strong><small>'+p.description+'</small></span>';const im=b.querySelector("img");im.loading=i<4?"eager":"lazy";im.src=p.cardImage||p.image;b.onclick=()=>open(p,b);a.appendChild(b);const q=document.createElement("div");q.className="concierge-overview-actions";const v=window.NAHWERKVoicePreview?.createControl(p,{className:"concierge-overview-voice"});if(v)q.appendChild(v);const l=document.createElement("a");l.className="concierge-overview-select";l.href="registrieren.html?produkt=prime&concierge="+encodeURIComponent(p.key);l.textContent="Auswählen";q.appendChild(l);a.appendChild(q);return a}function render(a,k,t){G.replaceChildren(...a.map(card));G.hidden=false;RH.hidden=false;RK.textContent=k;RT.textContent=t}function hide(){G.hidden=true;RH.hidden=true}function open(p,b){OP=b;const i=document.getElementById("dialogConciergeImage"),n=document.getElementById("dialogConciergeName"),d=document.getElementById("dialogConciergeDescription");i.src=p.largeImage||p.image;i.alt="Portrait von "+p.name;n.textContent=p.name;d.textContent=p.description;D.showModal()}function region(r,b){[...R.children].forEach(x=>x.classList.toggle("is-active",x===b));ALL.classList.remove("is-active");hide();CD.hidden=true;CO.replaceChildren();CL.textContent="Länder in "+r;M[r].l.filter(c=>(GP[r]?.[c]||[]).length>0).forEach(c=>{const a=GP[r][c],b=document.createElement("button");b.className="co-country-chip";b.type="button";const f=F[c]||"";b.innerHTML="<span class=\"co-country-flag"+(f?"":" is-region")+"\" aria-hidden=\"true\">"+(f||"◎")+"</span><span class=\"co-country-name\">"+c+"</span><small>"+a.length+" "+(a.length===1?"Concierge":"Concierges")+"</small>";b.onclick=()=>country(r,c,b);CO.appendChild(b)});CS.hidden=false;CS.scrollIntoView({behavior:"smooth",block:"nearest"})}function country(r,c,b){[...CO.children].forEach(x=>x.classList.toggle("is-active",x===b));const a=GP[r]?.[c]||[];DK.textContent=r+" · "+c;DT.textContent=c;DX.textContent="Wählen Sie einen NAHWERK Concierge mit Bezug zu "+c+". Sprache und Profil bleiben frei kombinierbar.";CD.hidden=false;outline(c);render(a,r+" · "+c,c+": "+a.length+" "+(a.length===1?"Concierge":"Concierges"))}R.querySelectorAll(".co-region-card").forEach(b=>b.onclick=()=>region(b.dataset.continent,b));ALL.onclick=()=>{CS.hidden=true;CD.hidden=true;ALL.classList.add("is-active");render(P,"Alle Persönlichkeiten","Alle 23 Concierges")};RR.onclick=()=>{hide();CS.hidden=true;CD.hidden=true;ALL.classList.remove("is-active");[...R.children].forEach(x=>x.classList.remove("is-active"))};DC.onclick=()=>CD.hidden=true;CTA.onclick=()=>RH.scrollIntoView({behavior:"smooth"});D?.querySelector(".concierge-dialog-close")?.addEventListener("click",()=>D.close());D?.addEventListener("close",()=>OP?.focus());})();