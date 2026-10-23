import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pages = [
  ["konto.html", fs.readFileSync("konto.html", "utf8")],
  ["konto/index.html", fs.readFileSync("konto/index.html", "utf8")],
];

test("private account routes preserve clean-route parity", () => {
  assert.equal(pages[1][1].replace('<head><base href="/">', "<head>"), pages[0][1]);
});

for (const [path, html] of pages) {
  test(`${path} is explicitly excluded from search results`, () => {
    const tags = [...html.matchAll(/<meta\s+name="robots"\s+content="([^"]+)"\s*\/>/gi)];
    assert.equal(tags.length, 1, "one unambiguous robots directive");
    const directives = tags[0][1].split(",").map(value => value.trim().toLowerCase());
    for (const directive of ["noindex", "nofollow", "noarchive"]) {
      assert.ok(directives.includes(directive), `missing ${directive}`);
    }
  });

  test(`${path} blocks referrer disclosure before external resources load`, () => {
    const tags = [...html.matchAll(/<meta\s+name="referrer"\s+content="([^"]+)"\s*\/>/gi)];
    assert.equal(tags.length, 1, "one unambiguous referrer directive");
    assert.equal(tags[0][1].toLowerCase(), "no-referrer");
    const policyPosition = html.indexOf(tags[0][0]);
    const firstResourcePosition = Math.min(
      ...["<script", '<link rel="stylesheet"'].map(needle => {
        const pos = html.indexOf(needle);
        return pos < 0 ? Number.POSITIVE_INFINITY : pos;
      })
    );
    assert.ok(policyPosition < firstResourcePosition, "policy must precede resource loads");
  });
}
