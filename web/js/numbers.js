// Numbers check: every number, date, time and percentage in the draft must survive the rewrite.
// Vietnamese writes 1.000.000 and 1,5 where English writes 1,000,000 and 1.5, and money often comes as "15 triệu" or
// "15tr". Each match therefore carries every value it could mean, and two matches agree when those sets overlap.
// Numbers written out in words ("hai mươi") are not recognised.

const UNIT = "(nghìn|ngàn|k|triệu|tr|tỷ|tỉ|%|phần\\s+trăm)";
const PATTERN = new RegExp(
  [
    "(?<date>\\b\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?\\b|\\b\\d{1,2}\\s+tháng\\s+\\d{1,2}(?:(?:\\s+năm|,)\\s+\\d{4})?(?![\\d]))",
    "(?<time>\\b\\d{1,2}(?::\\d{2}|h\\d{2}|h(?![\\p{L}\\d])|\\s+giờ(?:\\s+\\d{1,2}(?:\\s+phút)?)?))",
    `(?<num>\\d+(?:[.,]\\d+)*)(?:\\s*${UNIT}(?![\\p{L}\\d]))?`,
  ].join("|"),
  "giu",
);
const SCALE = { nghìn: 1e3, ngàn: 1e3, k: 1e3, triệu: 1e6, tr: 1e6, tỷ: 1e9, tỉ: 1e9 };

const fmt = (v) => String(Math.round(v * 1e6) / 1e6);

function readings(s) {
  if (/^\d+$/.test(s)) return [Number(s)];
  if (/^\d{1,3}(\.\d{3}){2,}$/.test(s)) return [Number(s.replaceAll(".", ""))];
  if (/^\d{1,3}(,\d{3}){2,}$/.test(s)) return [Number(s.replaceAll(",", ""))];
  if (/^\d{1,3}[.,]\d{3}$/.test(s)) return [Number(s.replace(/[.,]/, "")), Number(s.replace(",", "."))];
  if (/^\d+[.,]\d+$/.test(s)) return [Number(s.replace(",", "."))];
  // Mixed separators such as 1.234,5 (Vietnamese) or 1,234.5 (English): the last separator is the decimal point.
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  return [Number(s.slice(0, last).replace(/[.,]/g, "") + "." + s.slice(last + 1))];
}

export function extractNumbers(text) {
  const found = [];
  for (const m of text.normalize("NFC").matchAll(PATTERN)) {
    const g = m.groups;
    let keys;
    if (g.date) {
      keys = ["d:" + g.date.match(/\d+/g).map(Number).join("/")];
    } else if (g.time) {
      const [h, min = 0] = g.time.match(/\d+/g).map(Number);
      keys = [`t:${h}:${String(min).padStart(2, "0")}`];
    } else {
      const unit = (m[0].slice(g.num.length).trim().toLowerCase().replace(/\s+/g, " ")) || "";
      const pct = unit === "%" || unit === "phần trăm";
      const scale = SCALE[unit] || 1;
      keys = readings(g.num).map((v) => (pct ? "p:" : "n:") + fmt(v * scale));
    }
    found.push({ raw: m[0], index: m.index, end: m.index + m[0].length, keys });
  }
  return found;
}

// missing: numbers in the draft the rewrite lost; added: numbers in the rewrite that the draft never had.
export function checkNumbers(draft, rewrite) {
  const src = extractNumbers(draft), out = extractNumbers(rewrite);
  const used = new Set();
  const missing = [];
  for (const s of src) {
    const hit = out.findIndex((o, i) => !used.has(i) && o.keys.some((k) => s.keys.includes(k)));
    if (hit === -1) missing.push(s);
    else used.add(hit);
  }
  const added = out.filter((o, i) => !used.has(i) && !src.some((s) => s.keys.some((k) => o.keys.includes(k))));
  return { total: src.length, kept: src.length - missing.length, missing, added };
}
