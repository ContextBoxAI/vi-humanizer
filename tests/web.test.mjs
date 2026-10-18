// node --test app/tests
import assert from "node:assert/strict";
import { test } from "node:test";
import { diffWords } from "../web/js/diff.js";
import { markdown } from "../web/js/md.js";
import { checkNumbers, extractNumbers } from "../web/js/numbers.js";

const keys = (t) => extractNumbers(t).map((n) => n.keys);

test("Vietnamese and English thousand separators mean the same amount", () => {
  assert.deepEqual(keys("1.000.000 đ"), [["n:1000000"]]);
  assert.deepEqual(keys("1,000,000"), [["n:1000000"]]);
  assert.deepEqual(keys("1.234,5"), [["n:1234.5"]]);
});

test("decimals and ambiguous groups", () => {
  assert.deepEqual(keys("1,5 tỷ"), [["n:1500000000"]]);
  assert.deepEqual(keys("1.500"), [["n:1500", "n:1.5"]]);
});

test("money words scale the number", () => {
  assert.deepEqual(keys("15 triệu"), [["n:15000000"]]);
  assert.deepEqual(keys("15tr"), [["n:15000000"]]);
  assert.deepEqual(keys("200k"), [["n:200000"]]);
  assert.deepEqual(keys("5km"), [["n:5"]]);
});

test("dates, times and percentages", () => {
  assert.deepEqual(keys("ngày 20/01/2026"), [["d:20/1/2026"]]);
  assert.deepEqual(keys("ngày 20 tháng 1"), [["d:20/1"]]);
  assert.deepEqual(keys("24 tháng 1 năm 2026"), [["d:24/1/2026"]]);
  assert.deepEqual(keys("lúc 9h"), [["t:9:00"]]);
  assert.deepEqual(keys("lúc 9:30"), [["t:9:30"]]);
  assert.deepEqual(keys("10 giờ 15 phút"), [["t:10:15"]]);
  assert.deepEqual(keys("30% hoặc 30 phần trăm"), [["p:30"], ["p:30"]]);
});

test("a rewrite that keeps every number passes", () => {
  const r = checkNumbers("Giá 15.000.000 đ, giảm 10%, giao ngày 20/1.", "Giảm 10% còn 15 triệu, giao 20/1 nhé.");
  assert.equal(r.total, 3);
  assert.equal(r.kept, 3);
  assert.equal(r.added.length, 0);
});

test("a lost number and an invented one are both reported", () => {
  const r = checkNumbers("Gói 25, 50 hoặc 100 người dùng.", "Gói 25 hoặc 120 người dùng.");
  assert.deepEqual(r.missing.map((m) => m.raw), ["50", "100"]);
  assert.deepEqual(r.added.map((m) => m.raw), ["120"]);
});

const join = (runs) => runs.map((r) => r.text).join("");

test("diff rebuilds both texts exactly", () => {
  const a = "Cảm ơn anh đã tham gia buổi demo.\n\nEm gửi báo giá thứ Sáu.";
  const b = "Cảm ơn anh đã dự buổi demo nhé.\n\nThứ Sáu em gửi báo giá.";
  const d = diffWords(a, b);
  assert.equal(join(d.before), a);
  assert.equal(join(d.after), b);
  assert.ok(d.before.some((r) => r.type === "del" && r.text.includes("tham gia")));
  assert.ok(d.after.some((r) => r.type === "ins" && r.text.includes("dự")));
});

test("identical texts have no changes", () => {
  const d = diffWords("Xin chào", "Xin chào");
  assert.equal(d.changedRatio, 0);
  assert.deepEqual(d.after, [{ type: "eq", text: "Xin chào" }]);
});

test("markdown escapes HTML and renders lists, nesting and arithmetic", () => {
  assert.equal(markdown("<b>x</b>"), "<p>&lt;b&gt;x&lt;/b&gt;</p>");
  const html = markdown("1. **Lãi kép:** tính trên gốc\n2. Công thức: $A = P(1 + r)^n$\n  * $A$: tổng tiền\n\n$10.000 \\times 10\\% = 1.000$ đồng");
  assert.match(html, /^<ol><li><strong>Lãi kép:<\/strong> tính trên gốc<\/li>/);
  assert.match(html, /<sup>n<\/sup>.*<ul><li><span class="math">A<\/span>: tổng tiền<\/li><\/ul><\/li><\/ol>/);
  assert.match(html, /10\.000 × 10% = 1\.000/);
  assert.equal(markdown("giá $5 hoặc $10"), "<p>giá $5 hoặc $10</p>");
});

test("every file the page loads carries the same version tag", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const tags = new Set([...html.matchAll(/\?v=([\w.-]+)/g)].map((m) => m[1]));
  assert.equal(tags.size, 1, `mixed version tags: ${[...tags]}`);
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const f of readdirSync(new URL("../web/js/", import.meta.url)).filter((f) => f.endsWith(".js")))
    assert.ok(map[`./js/${f}`], `js/${f} is missing from the import map, so browsers may serve it stale`);
  assert.match(html, /js\/main\.js\?v=/);
  assert.match(html, /style\.css\?v=/);
});
