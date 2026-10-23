import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routes = [
  ["passwort-zuruecksetzen.html", fs.readFileSync("passwort-zuruecksetzen.html", "utf8")],
  ["passwort-zuruecksetzen/index.html", fs.readFileSync("passwort-zuruecksetzen/index.html", "utf8")],
];

test("password reset clean-route mirror remains byte-equivalent", () => {
  assert.equal(routes[1][1].replace('<head><base href="/">', "<head>"), routes[0][1]);
});

for (const [path, html] of routes) {
  test(`${path} excludes reset links from search results`, () => {
    const robots = [...html.matchAll(/<meta\s+name="robots"\s+content="([^"]+)"\s*\/?\s*>/gi)];
    assert.equal(robots.length, 1);
    const directives = robots[0][1].split(",").map(s => s.trim().toLowerCase());
    for (const directive of ["noindex", "nofollow", "noarchive"]) {
      assert.ok(directives.includes(directive), `missing ${directive}`);
    }
  });

  test(`${path} suppresses referrer before styles and scripts`, () => {
    const refs = [...html.matchAll(/<meta\s+name="referrer"\s+content="([^"]+)"\s*\/?\s*>/gi)];
    assert.equal(refs.length, 1);
    assert.equal(refs[0][1].toLowerCase(), "no-referrer");
    const firstResource = Math.min(
      ...["<script", "<link rel=\"stylesheet\""].map(needle => {
        const pos = html.indexOf(needle);
        return pos < 0 ? Infinity : pos;
      })
    );
    assert.ok(html.indexOf(refs[0][0]) < firstResource);
  });
}
