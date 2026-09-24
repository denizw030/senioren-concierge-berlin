import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync("assets/nahwerk-logo-v2.css","utf8");

test("topbar logo uses one compact global size",()=>{
  const top=css.slice(0,css.indexOf(".top .brand .mark"));
  assert.match(top,/width:46px!important/);
  assert.match(top,/height:46px!important/);
  assert.match(css,/@media\(max-width:620px\)[\s\S]*?width:42px!important[\s\S]*?height:42px!important/);
});

test("global topbar is compact without changing page content layout",()=>{
  const marker=css.indexOf("GLOBAL_COMPACT_HEADER_V1_20260924");
  assert.ok(marker>=0);
  const block=css.slice(marker);
  assert.match(block,/min-height:62px!important/);
  assert.match(block,/min-height:58px!important/);
  assert.match(block,/min-height:56px!important/);
  assert.match(block,/padding-top:4px!important/);
  assert.match(block,/padding-bottom:4px!important/);
  assert.doesNotMatch(block,/main\s*\{|footer\s*\{|\.hero\s*\{|\.section\s*\{/);
});
