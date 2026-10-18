// Word-level diff between the draft and the rewrite. Words are compared on their text; the whitespace after each
// word rides along, so the rendered output keeps the original spacing and line breaks.

const TOKEN = /([\p{L}\p{M}\p{N}]+(?:[.,:/'’\-][\p{L}\p{M}\p{N}]+)*|[^\s\p{L}\p{M}\p{N}])(\s*)/gu;
const MAX_CELLS = 16_000_000;

export function tokenize(text) {
  const lead = text.match(/^\s*/)[0];
  const out = [];
  for (const m of text.slice(lead.length).matchAll(TOKEN)) out.push({ word: m[1], space: m[2] });
  if (lead && out.length) out[0].lead = lead;
  return out;
}

const key = (t) => t.word.normalize("NFC").toLowerCase();

// Returns runs of { type: "eq" | "del" | "ins", text }. "del" runs come from the draft, "ins" runs from the rewrite.
export function diffWords(before, after) {
  const a = tokenize(before), b = tokenize(after);
  let start = 0;
  while (start < a.length && start < b.length && key(a[start]) === key(b[start])) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && key(a[endA - 1]) === key(b[endB - 1])) { endA--; endB--; }

  const ops = [];
  for (let i = 0; i < start; i++) ops.push(["eq", a[i], b[i]]);
  const midA = a.slice(start, endA), midB = b.slice(start, endB);
  const n = midA.length, m = midB.length;
  if ((n + 1) * (m + 1) > MAX_CELLS) {
    midA.forEach((t) => ops.push(["del", t]));
    midB.forEach((t) => ops.push(["ins", null, t]));
  } else {
    // Longest common subsequence, filled from the end so the walk below goes forward.
    const w = m + 1, dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i * w + j] = key(midA[i]) === key(midB[j]) ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && key(midA[i]) === key(midB[j])) ops.push(["eq", midA[i++], midB[j++]]);
      else if (j < m && (i === n || dp[i * w + j + 1] >= dp[(i + 1) * w + j])) ops.push(["ins", null, midB[j++]]);
      else ops.push(["del", midA[i++]]);
    }
  }
  for (let i = endA, j = endB; i < a.length; i++, j++) ops.push(["eq", a[i], b[j]]);

  const side = (pick) => {
    const runs = [];
    for (const [type, ta, tb] of ops) {
      const t = pick === "before" ? (type === "ins" ? null : ta) : (type === "del" ? null : tb);
      if (!t) continue;
      const text = (t.lead || "") + t.word + t.space;
      const last = runs[runs.length - 1];
      if (last && last.type === type) last.text += text;
      else runs.push({ type, text });
    }
    return runs;
  };
  const before_ = side("before"), after_ = side("after");
  const words = b.length;
  const changed = ops.filter(([t]) => t === "ins").length;
  return { before: before_, after: after_, changedRatio: words ? changed / words : 0 };
}
