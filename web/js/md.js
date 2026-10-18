// Small, safe Markdown renderer for chat answers. Input is escaped before any tag is added.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const TEX = { "\\times": "×", "\\cdot": "·", "\\div": "÷", "\\%": "%", "\\approx": "≈", "\\le": "≤", "\\ge": "≥", "\\,": " " };
const math = (s) => s.replace(/\\[a-z]+|\\[%,]/gi, (c) => TEX[c] ?? c).replace(/\^(\w+|\{[^}]*\})/g, (_, p) => `<sup>${p.replace(/[{}]/g, "")}</sup>`);
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\$\$?([^$\n]+)\$\$?/g, (all, m) => (/[\\^=]|^[a-z]$/i.test(m) ? `<span class="math">${math(m)}</span>` : all))
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");

// Enough Markdown for chat answers: paragraphs, headings, ordered and bulleted lists one level deep, bold, italic,
// code and simple inline TeX, which the model likes to use for arithmetic.
export function markdown(src) {
  let html = "", para = [], list = null, nested = null;
  const flushPara = () => { if (para.length) html += `<p>${para.join("<br>")}</p>`; para = []; };
  const closeNested = () => { if (nested) { list.items[list.items.length - 1] += `<ul>${nested.map((i) => `<li>${i}</li>`).join("")}</ul>`; nested = null; } };
  const closeList = () => {
    closeNested();
    if (list) html += `<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.tag}>`;
    list = null;
  };
  for (const line of src.trim().split("\n")) {
    const item = line.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
    const head = line.match(/^#{1,6}\s+(.*)$/);
    if (!line.trim()) { flushPara(); continue; }
    if (head) { flushPara(); closeList(); html += `<h4>${inline(head[1])}</h4>`; continue; }
    if (item) {
      flushPara();
      const tag = /\d/.test(item[2]) ? "ol" : "ul";
      if (list && item[1].length >= 2 && tag === "ul") { (nested ||= []).push(inline(item[3])); continue; }
      closeNested();
      if (list && list.tag !== tag) closeList();
      (list ||= { tag, items: [] }).items.push(inline(item[3]));
      continue;
    }
    if (list && /^\s{2,}/.test(line)) { list.items[list.items.length - 1] += "<br>" + inline(line.trim()); continue; }
    closeList();
    para.push(inline(line));
  }
  flushPara();
  closeList();
  return html;
}
