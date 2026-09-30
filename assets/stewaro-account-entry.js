(() => {
  "use strict";
  const root=document.querySelector("[data-stewaro-access]");
  if(!root)return;
  const PARENT="https://myparentguard.com/?source=stewaro-account";
  const screens=[...root.querySelectorAll("[data-access-screen]")];
  const show=name=>{
    screens.forEach(s=>s.hidden=s.dataset.accessScreen!==name);
    history.replaceState(null,"",name==="audience"?"#":("#"+name));
    setTimeout(()=>root.querySelector("[data-access-screen='"+name+"'] input, [data-access-screen='"+name+"'] button")?.focus(),0);
  };
  root.querySelector("[data-access-self]")?.addEventListener("click",()=>show("email"));
  root.querySelector("[data-access-other]")?.addEventListener("click",()=>{location.href=PARENT;});
  root.querySelectorAll("[data-access-back]").forEach(b=>b.addEventListener("click",()=>show("audience")));
  const form=root.querySelector("#stewaroEntryEmailForm");
  const email=root.querySelector("#stewaroEntryEmail");
  form?.addEventListener("submit",e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const value=email.value.trim().toLowerCase();
    try{sessionStorage.setItem("stewaro_account_email",value);}catch(_){}
    location.href="/anmelden?source=stewaro_account&email="+encodeURIComponent(value);
  });
  if(location.hash==="#email")show("email"); else show("audience");
})();
