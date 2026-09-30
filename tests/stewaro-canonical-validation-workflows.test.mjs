import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contracts = {
  'overview-lifestyle.yml': ['overview-lifestyle', 'i18n-media-audit', 'i18n-design-parity', 'seo-indexing'],
  'i18n-runtime-hardening.yml': ['i18n-runtime-hardening', 'i18n-media-audit', 'i18n-completeness', 'i18n-design-parity', 'i18n-link-flow', 'seo-indexing'],
  'localization-bootstrap.yml': ['seo-indexing', 'i18n-design-parity', 'i18n-link-flow', 'i18n-completeness'],
};

for (const [file, guards] of Object.entries(contracts)) {
  test(`${file}: validate canonical STEWARO before merge without writing main`, () => {
    const source = fs.readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.match(source, /pull_request:/);
    assert.match(source, /push:\s*\n\s*branches: \[main\]/);
    assert.match(source, /contents: read/);
    assert.doesNotMatch(source, /contents: write|git push|git commit|git add|python scripts\//);
    for (const guard of [...guards, 'stewaro-public-terminology']) {
      assert.ok(source.includes(`tests/${guard}.test.mjs`), `missing existing guard ${guard}`);
    }
    assert.match(source, /git diff --check/);
  });
}
