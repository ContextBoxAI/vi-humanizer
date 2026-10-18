import { serverInfo, streamChat } from "./api.js";
import { diffWords } from "./diff.js";
import { EXAMPLES, SAMPLE_DRAFT, TONES, t as tr } from "./i18n.js";
import { markdown } from "./md.js";
import { checkNumbers } from "./numbers.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("vh." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("vh." + k, JSON.stringify(v)); } catch {} },
};
const params = new URLSearchParams(location.search);

const state = {
  lang: store.get("lang", "vi"),
  tab: store.get("tab", "rewrite"),
  tone: store.get("tone", "natural"),
  settings: { api: "", model: "", temperature: 1.0, system: "", ...store.get("settings", {}) },
  server: null,
  busy: null, // AbortController of the running request
  last: null, // { draft, out, stats }
  history: [],
};
if (params.get("api")) state.settings.api = params.get("api");
if (params.get("model")) state.settings.model = params.get("model");

const t = (k) => tr(state.lang, k);
const base = () => (state.settings.api || (location.protocol.startsWith("http") ? location.origin + "/v1" : "http://127.0.0.1:8080/v1")).replace(/\/$/, "");
const model = () => state.settings.model || state.server?.id || "vi-humanizer";
const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------- language, theme, tabs ----------
function applyLang() {
  document.documentElement.lang = state.lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = el.ariaLabel = t(el.dataset.i18nTitle);
  for (const b of $("lang").children) b.setAttribute("aria-pressed", b.dataset.lang === state.lang);
  renderTones();
  renderExamples();
  renderStatus();
  updateCounts();
  if (state.last) renderResult();
  renderChat();
}
$("lang").addEventListener("click", (e) => {
  const l = e.target.closest("button")?.dataset.lang;
  if (l) { state.lang = l; store.set("lang", l); applyLang(); }
});

$("theme").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const next = dark ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("vh.theme", next); } catch {}
});

function showTab(tab) {
  state.tab = tab;
  store.set("tab", tab);
  for (const b of document.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", b.dataset.tab === tab);
  $("view-rewrite").hidden = tab !== "rewrite";
  $("view-chat").hidden = tab !== "chat";
  (tab === "rewrite" ? $("draft") : $("ask")).focus();
}
for (const b of document.querySelectorAll("[data-tab]")) b.addEventListener("click", () => showTab(b.dataset.tab));

// ---------- server status ----------
async function checkServer() {
  try {
    state.server = await serverInfo(base());
  } catch {
    state.server = null;
  }
  renderStatus();
  setTimeout(checkServer, state.server ? 30000 : 5000);
}
function renderStatus() {
  const el = $("status"), s = state.server;
  el.className = "status mono " + (s ? "ok" : s === null ? "off" : "");
  el.lastElementChild.textContent = s ? [t("statusReady"), s.quant, s.runtime].filter(Boolean).join(" · ") : t("statusOff");
  el.title = s ? `${model()} @ ${base()}` : `${t("errConnect")} ${base()}`;
}

// ---------- rewrite ----------
function renderTones() {
  const box = $("tones");
  box.replaceChildren();
  const label = document.createElement("span");
  label.className = "label mono";
  label.textContent = t("tone");
  box.append(label);
  for (const tone of TONES) {
    const b = document.createElement("button");
    b.className = "chip";
    b.role = "radio";
    b.textContent = tone[state.lang];
    b.setAttribute("aria-checked", tone.id === state.tone);
    b.addEventListener("click", () => { state.tone = tone.id; store.set("tone", tone.id); renderTones(); });
    box.append(b);
  }
}

function updateCounts() {
  const d = $("draft").value;
  $("draft-count").textContent = `${countWords(d)} ${t("words")} · ${d.length} ${t("chars")}`;
  if (!state.last) { $("rewrite-count").textContent = ""; return; }
  const { out } = state.last;
  const pct = Math.round(diffWords(state.last.draft, out).changedRatio * 100);
  $("rewrite-count").textContent = `${countWords(out)} ${t("words")} · ${pct}% ${t("changed")}`;
}

// Renders diff runs into el; ranges (draft offsets) get a <mark class="lost"> for numbers the rewrite dropped.
function paintRuns(el, runs, ranges = []) {
  el.replaceChildren();
  let pos = 0;
  for (const run of runs) {
    const end = pos + run.text.length;
    const tag = run.type === "del" ? "del" : run.type === "ins" ? "ins" : null;
    // Keep the trailing whitespace outside the highlight so marks hug the words.
    const body = tag ? run.text.replace(/\s+$/, "") : run.text;
    const tail = run.text.slice(body.length);
    const wrap = tag ? document.createElement(tag) : document.createDocumentFragment();
    let i = 0;
    for (const r of ranges) {
      const a = Math.max(r.index - pos, i), b = Math.min(r.end - pos, body.length);
      if (b <= a) continue;
      wrap.append(body.slice(i, a));
      const m = document.createElement("mark");
      m.className = "lost";
      m.textContent = body.slice(a, b);
      wrap.append(m);
      i = b;
    }
    wrap.append(body.slice(i));
    el.append(wrap, tail);
    pos = end;
  }
}

function renderResult() {
  const { draft, out, stats, streaming } = state.last;
  const right = $("rewrite"), show = $("show-changes").checked;
  right.classList.toggle("streaming", !!streaming);
  if (streaming || !show) {
    right.textContent = out;
  } else {
    const d = diffWords(draft, out), nums = checkNumbers(draft, out);
    paintRuns(right, d.after);
    paintRuns($("draft-diff"), d.before, nums.missing);
    renderNumbers(nums);
  }
  const review = !streaming && show;
  $("draft").hidden = review;
  $("draft-diff").hidden = !review;
  $("edit").hidden = !review;
  $("legend-cut").hidden = !review;
  for (const id of ["paste", "clear", "sample"]) $(id).hidden = review;
  $("copy").disabled = $("regen").disabled = !!streaming || !out;
  $("stats").textContent = stats ? `${stats.tokens} tok · ${stats.tps.toFixed(1)} tok/s · ${stats.seconds.toFixed(1)}s` : "";
  if (!streaming) updateCounts();
}

function renderNumbers(n) {
  const el = $("numbers");
  el.hidden = false;
  if (!n.total && !n.added.length) {
    el.className = "badge mono";
    el.textContent = t("numbersNone");
    el.title = "";
    return;
  }
  const ok = n.kept === n.total && !n.added.length;
  el.className = "badge mono " + (ok ? "ok" : "warn");
  const parts = [`${ok ? "✓" : "!"} ${t("numbers")} ${n.kept}/${n.total}`];
  if (n.missing.length) parts.push(`${n.missing.length} ${t("numbersLost")}`);
  if (n.added.length) parts.push(`${n.added.length} ${t("numbersNew")}`);
  el.textContent = parts.join(" · ");
  el.title = [
    n.missing.length ? `${t("numbersLost")}: ${n.missing.map((m) => m.raw).join(", ")}` : "",
    n.added.length ? `${t("numbersNew")}: ${n.added.map((m) => m.raw).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

function setBusy(ctrl) {
  state.busy = ctrl;
  $("go").classList.toggle("busy", !!ctrl);
  $("go").title = $("go").ariaLabel = t(ctrl ? "stop" : "go");
  $("go-label").textContent = t(ctrl ? "stop" : "go");
  $("send").firstElementChild.textContent = t(ctrl ? "stop" : "send");
}

async function rewrite() {
  if (state.busy) { state.busy.abort(); return; }
  const draft = $("draft").value.trim();
  if (!draft) { toast(t("errNoText")); $("draft").focus(); return; }
  const tone = TONES.find((x) => x.id === state.tone) || TONES[0];
  const ctrl = new AbortController();
  setBusy(ctrl);
  $("numbers").hidden = true;
  state.last = { draft, out: "", stats: null, streaming: true };
  renderResult();
  try {
    const { text, stats } = await streamChat({
      base: base(), model: model(), temperature: state.settings.temperature, signal: ctrl.signal,
      messages: [{ role: "user", content: tone.prompt.replace("{t}", draft) }],
      onText: (s) => { state.last.out = s; $("rewrite").textContent = s; },
    });
    state.last = { draft, out: text.trim(), stats, streaming: false };
    if (!text) toast(t("errEmpty"));
  } catch (e) {
    state.last.streaming = false;
    if (e.name !== "AbortError") toast(`${t("errConnect")} ${base()}: ${e.message}`);
  } finally {
    setBusy(null);
    if (state.last.out) renderResult();
    else { state.last = null; resetRewrite(); }
  }
}

function resetRewrite() {
  state.last = null;
  const r = $("rewrite");
  r.classList.remove("streaming");
  r.innerHTML = "";
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = t("rewriteEmpty");
  r.append(p);
  $("numbers").hidden = true;
  $("stats").textContent = "";
  $("copy").disabled = $("regen").disabled = true;
  backToEdit();
  updateCounts();
}

function backToEdit() {
  $("draft").hidden = false;
  $("draft-diff").hidden = $("edit").hidden = $("legend-cut").hidden = true;
  for (const id of ["paste", "clear", "sample"]) $(id).hidden = false;
  $("draft").focus();
}

async function copyText(s) {
  try { await navigator.clipboard.writeText(s); }
  catch {
    const ta = Object.assign(document.createElement("textarea"), { value: s });
    document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  toast(t("copied"));
}

$("go").addEventListener("click", rewrite);
$("regen").addEventListener("click", rewrite);
$("draft").addEventListener("input", updateCounts);
$("draft-diff").addEventListener("click", backToEdit);
$("edit").addEventListener("click", backToEdit);
$("show-changes").addEventListener("change", () => state.last && renderResult());
$("copy").addEventListener("click", () => state.last && copyText(state.last.out));
$("clear").addEventListener("click", () => { $("draft").value = ""; resetRewrite(); });
$("sample").addEventListener("click", () => { $("draft").value = SAMPLE_DRAFT; resetRewrite(); });
$("paste").addEventListener("click", async () => {
  try { $("draft").value = await navigator.clipboard.readText(); updateCounts(); $("draft").focus(); }
  catch { $("draft").focus(); toast("⌘V / Ctrl+V"); }
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && state.tab === "rewrite") { e.preventDefault(); rewrite(); }
  if (e.key === "Escape" && state.busy) state.busy.abort();
});

// ---------- chat ----------
function renderExamples() {
  $("examples").replaceChildren(...EXAMPLES.map((q) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = q;
    b.addEventListener("click", () => { $("ask").value = q; ask(); });
    return b;
  }));
}

function renderChat() {
  const box = $("msgs");
  for (const el of box.querySelectorAll(".msg")) el.remove();
  $("chat-empty").hidden = state.history.length > 0;
  for (const m of state.history) box.append(messageEl(m));
  box.scrollTop = box.scrollHeight;
}

function messageEl(m) {
  const el = document.createElement("div");
  el.className = `msg ${m.role}${m.error ? " err" : ""}`;
  if (m.role === "user" || m.error) el.textContent = m.content;
  else {
    el.innerHTML = markdown(m.content);
    if (!m.streaming && m.content) {
      const bar = document.createElement("div");
      bar.className = "msg-actions";
      const c = document.createElement("button");
      c.className = "ghost";
      c.type = "button";
      c.textContent = t("copy");
      c.addEventListener("click", () => copyText(m.content));
      bar.append(c);
      el.append(bar);
    }
  }
  return el;
}

async function ask() {
  if (state.busy) { state.busy.abort(); return; }
  const q = $("ask").value.trim();
  if (!q) return;
  $("ask").value = "";
  growAsk();
  state.history.push({ role: "user", content: q });
  const reply = { role: "assistant", content: "", streaming: true };
  state.history.push(reply);
  renderChat();
  const ctrl = new AbortController();
  setBusy(ctrl);
  const sys = state.settings.system.trim();
  const messages = [
    ...(sys ? [{ role: "system", content: sys }] : []),
    ...state.history.filter((m) => !m.error && m !== reply).map(({ role, content }) => ({ role, content })),
  ];
  const live = $("msgs").lastElementChild;
  try {
    await streamChat({
      base: base(), model: model(), temperature: state.settings.temperature, signal: ctrl.signal, messages,
      onText: (s) => { reply.content = s; live.innerHTML = markdown(s); $("msgs").scrollTop = $("msgs").scrollHeight; },
    });
    if (!reply.content) Object.assign(reply, { content: t("errEmpty"), error: true });
  } catch (e) {
    if (e.name !== "AbortError") Object.assign(reply, { content: `${t("errConnect")} ${base()}: ${e.message}`, error: true });
  } finally {
    reply.streaming = false;
    if (!reply.content) state.history.pop();
    setBusy(null);
    renderChat();
    $("ask").focus();
  }
}

function growAsk() {
  const a = $("ask");
  a.style.height = "auto";
  a.style.height = Math.min(a.scrollHeight, 220) + "px";
}
$("composer").addEventListener("submit", (e) => { e.preventDefault(); ask(); });
$("ask").addEventListener("input", growAsk);
$("ask").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(); }
});
$("new-chat").addEventListener("click", () => { state.busy?.abort(); state.history = []; renderChat(); $("ask").focus(); });

// ---------- settings ----------
$("open-settings").addEventListener("click", () => {
  const s = state.settings;
  $("set-api").value = s.api;
  $("set-model").value = s.model;
  $("set-model").placeholder = state.server?.id || "vi-humanizer";
  $("set-temp").value = s.temperature;
  $("set-temp-out").textContent = Number(s.temperature).toFixed(2);
  $("set-system").value = s.system;
  $("settings").showModal();
});
$("set-temp").addEventListener("input", (e) => ($("set-temp-out").textContent = Number(e.target.value).toFixed(2)));
$("settings").addEventListener("close", () => {
  if ($("settings").returnValue !== "save") return;
  state.settings = {
    api: $("set-api").value.trim(), model: $("set-model").value.trim(),
    temperature: Number($("set-temp").value), system: $("set-system").value,
  };
  store.set("settings", state.settings);
  state.server = undefined;
  renderStatus();
  serverInfo(base()).then((s) => (state.server = s), () => (state.server = null)).finally(renderStatus);
});

// ---------- start ----------
applyLang();
showTab(state.tab);
checkServer();
