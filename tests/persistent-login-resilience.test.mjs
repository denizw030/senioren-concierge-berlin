import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const auth=fs.readFileSync("assets/auth-nav.js","utf8");

test("remembered login survives temporary session validation outages",()=>{
  assert.match(auth,/let validationUnavailable = false/);
  assert.match(auth,/if \(response\.status === 401 \|\| response\.status === 403\) \{[\s\S]*?clearLocalAuth\(\)/);
  assert.match(auth,/validationUnavailable = true;\s*return false;\s*\} catch \(_\) \{[\s\S]*?validationUnavailable = true;\s*return false;/);
  assert.doesNotMatch(
    auth,
    /if \(response\.status === 401 \|\| response\.status === 403\)[\s\S]*?\}\s*catch \(_\)[\s\S]*?\}\s*clearLocalAuth\(\);/
  );
});

test("protected account does not force login while a remembered unexpired session can be retried",()=>{
  assert.match(auth,/if \(PROTECTED\.has\(current\) && !hasRenderableSession\(\)\) \{\s*location\.replace\("\/anmelden"\)/);
  assert.match(auth,/if \(validationUnavailable && hasRenderableSession\(\)\) \{[\s\S]*?validateSession\(true\)/);
  assert.match(auth,/window\.setTimeout\(async \(\) => \{[\s\S]*?\}, 1500\)/);
});

test("explicit logout and definitive invalidation still clear local remembered auth",()=>{
  assert.match(auth,/function clearLocalAuth\(\) \{[\s\S]*?localStorage\.removeItem\(SESSION_KEY\)/);
  assert.match(auth,/validationUnavailable = false;[\s\S]*?clearLocalAuth\(\);\s*return false;/);
});
