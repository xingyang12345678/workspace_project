#!/usr/bin/env bash
# 一键启动：后端 (8000) + 前端 (5173)。无需分别开两个终端。
set -e
cd "$(dirname "$0")"
echo "启动后端 (http://127.0.0.1:8000) ..."
(cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!
echo "启动前端 (http://127.0.0.1:5173) ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!
echo "后端 PID: $BACKEND_PID  前端 PID: $FRONTEND_PID"
echo "按 Ctrl+C 将同时结束两个进程。"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
