# AI 数据工作台 (AI Data Workspace)

本地运行的 AI 数据工作台：管理数据集、可视化 JSONL、执行 Python 工具、Pipeline、知识记录。

## 结构

- `backend/` — FastAPI 后端（文件、数据集、工具、Pipeline、Knowledge、插件预留）
- `frontend/` — React + Vite 前端
- `workspace_project/` — 默认 workspace（datas、tools、pipelines、backup、knowledge、plugins）

## 运行

### 一键启动（推荐）

无需分别开后端和前端，任选其一即可：

**方式一：npm（需在项目根目录先执行 `npm install`）**
```bash
npm start
```

**方式二：脚本**
```bash
chmod +x start.sh
./start.sh
```

将同时启动后端 (http://127.0.0.1:8000) 与前端 (http://localhost:5173)。首次运行前请先安装依赖：`cd backend && pip install -r requirements.txt`，`cd frontend && npm install`。

### 分别启动

**后端**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

可通过环境变量 `WORKSPACE_ROOT` 指定 workspace 目录（绝对路径），默认使用项目下的 `workspace_project`。

**前端**
```bash
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 。API 通过 Vite 代理到 http://127.0.0.1:8000 。

## MVP 功能

- 左侧文件树：workspace 目录（datas/tools/pipelines/backup/knowledge），一键备份 datas
- JSONL 可视化：聊天结构（messages/chosen/rejected）、上一条/下一条/跳转
- 工具执行：扫描 tools 下 .py，在 UI 中执行并显示 stdout/stderr
- 终端面板：工具与 pipeline 输出
- Pipeline：创建多步 pipeline，每步执行后需确认再执行下一步
- Knowledge：常驻输入框快速记录
- AI Hub：外部 AI 链接入口
