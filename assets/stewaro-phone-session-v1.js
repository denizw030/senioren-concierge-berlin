(() => {
  "use strict";
  const KEY="scb_web_session";
  const read=(storage)=>{
    try {
      const value=JSON.parse(storage.getItem(KEY)||"null");
      return value&&typeof value==="object"&&!Array.isArray(value)?value:null;
    } catch (_) { return null; }
  };
  const usable=(session)=>{
    if(typeof session?.session_token!=="string"||session.session_token.length<32||session.session_token.length>512)return false;
    for(const name of ["expires_at","idle_expires_at"]){
      if(!session[name])continue;
      const ms=Date.parse(session[name]);
      if(!Number.isFinite(ms)||ms<=Date.now())return false;
    }
    return true;
  };
  const session=()=>{
    const active=read(sessionStorage);
    if(usable(active))return active;
    const remembered=read(localStorage);
    if(remembered?.remember_me!==true||!usable(remembered))return null;
    try {sessionStorage.setItem(KEY,JSON.stringify(remembered));}
    catch (_) {return null;}
    return remembered;
  };
  window.STEWAROPhoneSession=Object.freeze({
    token:()=>session()?.session_token||"",
    loginHref:()=>"/anmelden"
  });
})();
