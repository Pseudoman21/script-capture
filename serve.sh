#!/bin/sh
# Camera access needs a secure context, so serve over localhost (file:// won't work in most browsers).
PORT="${1:-8000}"
echo "Script Capture → http://localhost:$PORT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
