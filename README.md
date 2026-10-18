# vi-humanizer local app

A web app for the vi-humanizer model. **Viết lại** (Rewrite) takes a draft an AI wrote and rewrites it so it reads
like a Vietnamese person wrote it. It shows what was cut and what was added, and checks that every number, date,
time and percentage made it through. **Trò chuyện** (Chat) is a plain assistant that answers in natural Vietnamese.
Everything runs on your machine, offline once the model is downloaded.

## Start

macOS or Linux (installs llama.cpp with Homebrew if it is missing):

```bash
./install.sh                    # first run downloads the Q6_K model (3.8 GB); opens the first free port from 7860
./install.sh --quant Q4_K_M     # the smallest file (3.4 GB)
./install.sh --port 9000 --gguf ~/models/vi-humanizer-e2b-Q6_K.gguf
./install.sh -- -t 4            # anything after -- goes to llama-server, e.g. CPU threads on a busy machine
```

Windows (installs llama.cpp with winget if it is missing):

```powershell
.\install.ps1
.\install.ps1 -Quant Q4_K_M
```

There is no Python and no Node. `llama-server` downloads the model (`-hf`), serves the API, and serves `web/` as
static files, all on one port. The GGUF carries its own chat template (thinking off) and sampling defaults.

## Other runtimes

`web/` is a static site that talks to any OpenAI-compatible server. Serve it however you like
(`python3 -m http.server -d web 7860`) and point it at the server in Settings (⋯), or in the URL:

- **Ollama:** put `vi-humanizer-e2b-Q6_K.gguf` next to `Modelfile`, run `ollama create vi-humanizer -f Modelfile`, then
  open `?api=http://127.0.0.1:11434/v1&model=vi-humanizer`.
- **LM Studio:** load the GGUF, start its server with CORS on, then open `?api=http://127.0.0.1:1234/v1&model=<id>`.

The browser calls these servers directly, so they must allow cross-origin requests from the page's address.

## Numbers check

`web/js/numbers.js` reads 1.000.000 and 1,000,000 as the same amount, 15 triệu / 15tr / 15.000.000 as the same money,
20/1 and 20/01 as the same date, 9h / 9:00 / 9 giờ as the same time. Where a number could mean two things (1.500 is
1500 in Vietnamese and 1.5 in English), either reading counts as a match. Numbers written in words ("hai mươi") are not
checked. Lost numbers are underlined in the draft.

## Files

| Path | What it is |
|---|---|
| `web/index.html`, `web/style.css` | the page, in ContextBox colours, light and dark |
| `web/js/main.js` | rewrite and chat views, settings |
| `web/js/api.js` | streaming client for `/v1/chat/completions` |
| `web/js/diff.js` | word-level diff between draft and rewrite |
| `web/js/numbers.js` | the numbers check |
| `web/js/md.js` | small Markdown renderer for chat answers |
| `web/js/i18n.js` | Vietnamese and English interface strings, tone prompts, sample draft |
| `tests/web.test.mjs` | `node --test tests/web.test.mjs` |
| `install.sh`, `install.ps1` | one-command setup |
| `Modelfile` | Ollama import with the exact Gemma 4 chat format |
| `chat_template_nothink.jinja` | the chat template written into the released GGUF and weights: Gemma 4's, with thinking always off |
