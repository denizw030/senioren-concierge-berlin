import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ui=fs.readFileSync("assets/site-ui.js","utf8");

test("compact header controls share one vertical center axis",()=>{
  assert.match(ui,/\.top \.nav-toggle\{top:50%!important;right:0!important;transform:translateY\(-50%\)!important\}/);
  assert.match(ui,/\.top \.nav>\.nw-language[^\{]*\{top:50%!important;right:58px!important;transform:translateY\(-50%\)!important/);
  assert.match(ui,/\.nw-account-cluster-mobile\{top:50%!important;right:144px!important;transform:translateY\(-50%\)!important;height:48px!important\}/);
});

test("right header controls use the nav content edge as the symmetry edge",()=>{
  assert.doesNotMatch(ui,/\.top \.nav-toggle\{top:16px!important/);
  assert.doesNotMatch(ui,/right:calc\(clamp\(10px,3vw,28px\) \+ 58px\)/);
  assert.doesNotMatch(ui,/right:calc\(clamp\(10px,3vw,28px\) \+ 144px\)/);
});
