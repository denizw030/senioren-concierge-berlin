import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const pages=fs.readdirSync(".").filter(p=>p.endsWith(".html"));
const clean=fs.readdirSync(".",{withFileTypes:true}).filter(p=>p.isDirectory()&&!["de","en","tr","stewaro-site","orfidel-preview","tests"].includes(p.name)).map(p=>path.join(p.name,"index.html")).filter(p=>fs.existsSync(p));
test("public static Klienten wording never regresses to Kunden",()=>{
 for(const file of [...pages,...clean]){
  const html=fs.readFileSync(file,"utf8").replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>|<!--[\\s\\S]*?-->/gi,"");
  const text=html.replace(/<[^>]+>/g," ");
  assert.doesNotMatch(text,/\\b(?:Kunde|Kunden\\w*|Kundin\\w*)\\b/i,file);
 }
});
test("canonical email and concierge clean routes preserve current brand and runtime contracts",()=>{
 for(const page of ["email-concierge","prime-concierge"]){
  assert.equal(fs.readFileSync(page+"/index.html","utf8").replace('<head><base href="/">','<head>'),fs.readFileSync(page+".html","utf8"));
 }
});
