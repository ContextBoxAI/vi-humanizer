#!/usr/bin/env bash
# vi-humanizer local app, macOS and Linux: installs llama.cpp (Homebrew) if missing, then starts llama-server, which
# downloads the model on first run, serves the web app and the API on one port, and opens it in your browser.
# Run again any time to start it. Ctrl+C stops it.
#
#   ./install.sh                     # Q6_K (3.8 GB), first free port from 7860
#   ./install.sh --quant Q4_K_M      # the smallest file (3.4 GB)
#   ./install.sh --port 9000 --gguf ~/models/vi-humanizer-e2b-Q6_K.gguf
#   ./install.sh -- -t 4             # anything after -- goes to llama-server
set -euo pipefail
cd "$(dirname "$0")"

REPO=${VI_HUMANIZER_REPO:-contextboxai/vi-humanizer-gemma-4-e2b}
QUANT=Q6_K PORT="" GGUF="" CTX=8192 EXTRA=()
while [ $# -gt 0 ]; do
  case "$1" in
    --quant) QUANT=$2; shift 2 ;;
    --port) PORT=$2; shift 2 ;;
    --gguf) GGUF=$2; shift 2 ;;
    --ctx) CTX=$2; shift 2 ;;
    --) shift; EXTRA=("$@"); break ;;
    *) echo "unknown option: $1 (see the top of install.sh)"; exit 2 ;;
  esac
done

if ! command -v llama-server >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then brew install llama.cpp
  else echo "Install llama.cpp first: https://github.com/ggml-org/llama.cpp/releases (put llama-server on PATH)"; exit 1; fi
fi

taken() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
if [ -z "$PORT" ]; then
  PORT=7860
  while taken "$PORT"; do PORT=$((PORT + 1)); done
elif taken "$PORT"; then
  echo "Port $PORT is already in use; pick another with --port."; exit 1
fi

if [ -n "$GGUF" ]; then MODEL=(-m "$GGUF"); else MODEL=(-hf "$REPO:$QUANT"); fi
URL="http://127.0.0.1:$PORT"
echo "Starting llama-server on $URL (the first run downloads the model, this can take a while)"
llama-server "${MODEL[@]}" --alias vi-humanizer --host 127.0.0.1 --port "$PORT" -c "$CTX" --jinja -ngl 99 \
  --path web ${EXTRA[@]+"${EXTRA[@]}"} &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT INT TERM

until curl -sf "$URL/health" >/dev/null 2>&1; do
  kill -0 $PID 2>/dev/null || { echo "llama-server exited; its log is above."; exit 1; }
  sleep 1
done
echo "vi-humanizer is ready: $URL"
if command -v open >/dev/null 2>&1; then open "$URL"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true; fi
wait $PID
