// Client for an OpenAI-compatible server. Under install.sh, llama-server serves this page and the API on one origin.

export async function serverInfo(base) {
  const models = await getJSON(`${base}/models`);
  const id = models.data?.[0]?.id || models.models?.[0]?.name || "";
  const props = await getJSON(`${base.replace(/\/v1$/, "")}/props`).catch(() => null);
  const path = props?.model_path || id;
  const quant = path.match(/(Q\d_K(?:_[SML])?|Q8_0|bf16|f16)/i)?.[1] || "";
  return { id, quant, runtime: props ? "llama.cpp" : "" };
}

async function getJSON(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Streams the reply. onText gets the whole text so far; resolves to { text, stats }.
export async function streamChat({ base, model, messages, temperature, signal, onText }) {
  const started = performance.now();
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model, messages, stream: true, temperature,
      stream_options: { include_usage: true },
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);

  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", text = "", timings = null, usage = null, chunks = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      const msg = JSON.parse(data);
      if (msg.timings) timings = msg.timings;
      if (msg.usage) usage = msg.usage;
      const delta = msg.choices?.[0]?.delta?.content;
      if (delta) { text += delta; chunks++; onText(text); }
    }
  }
  const seconds = (performance.now() - started) / 1000;
  const tokens = timings?.predicted_n ?? usage?.completion_tokens ?? chunks;
  const tps = timings?.predicted_per_second ?? (seconds ? tokens / seconds : 0);
  return { text, stats: { tokens, tps, seconds } };
}
