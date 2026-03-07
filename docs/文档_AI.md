# AI 数据工作台（Workspace）项目文档（AI 读版）

面向：自动化阅读、代码修改、插件扩展。尽量结构化、少叙述、多“约定/接口/数据结构/扩展点”。

## A. 快速事实（Facts）

- 项目根：`/home/xxy/ai-data-workspace/`
- 默认 workspace：`/home/xxy/ai-data-workspace/workspace_project/`
- workspace 可由环境变量覆盖：`WORKSPACE_ROOT=/abs/path`
- 后端：FastAPI（`backend/`），入口 `backend/main.py`
- 前端：React+Vite（`frontend/`），入口 `frontend/src/App.tsx`

## B. Workspace 目录约定（Contract）

Workspace 根目录下必须存在（后端会自动创建）：

- `datas/`：数据集（JSONL 为主；可有子目录）
- `tools/`：Python 工具脚本（扫描 `*.py`）
- `pipelines/`：pipeline 定义（`*.json`）
- `backup/`：备份输出（hash 去重；只增不减）
- `knowledge/`：知识库（jsonl）
- `plugins/`：插件预留目录（MVP 不实现加载）

## C. 后端模块结构（Backend）

路径：`backend/`

- `api/*`：HTTP 路由层（薄，转调 services）
- `services/*`：领域服务（文件/数据集/工具/pipeline/知识库/插件预留）
- `models/*`：Pydantic 模型
- `plugins/*`：预留（loader/registry）

## D. 数据结构（Schemas）

### D1. Knowledge Entry（存储：`knowledge/entries.jsonl`）

每行一个 JSON object（字段可能随版本增加）：

```json
{
  "id": "uuidhex",
  "timestamp": "ISO-8601 UTC",
  "day": "YYYY-MM-DD",
  "text": "string",
  "tags": ["string"],
  "archived": false,
  "archived_at": null,
  "updated_at": null
}
```

### D2. Pipeline（存储：`pipelines/<id>.json`）

```json
{
  "name": "string",
  "params": { "key": "value" },
  "steps": [
    { "tool_id": "string", "args": ["--in", "{{input}}", "--n", "${n}"] }
  ]
}
```

宏替换：
- 支持 `{{key}}` 和 `${key}`。
- 执行时用 `merged_params = pipeline.params + params_override`（override 覆盖同名 key）。

## E. API（HTTP）

OpenAPI：`GET /openapi.json`  
Swagger：`GET /docs`

下面列举关键业务 API（路径稳定，字段可能扩展）：

### E1. Files / Backup
- `GET /api/files/tree`
- `GET /api/files/children?path=<rel>`
- `GET /api/files/read?path=<rel>`
- `POST /api/backup/datas`

### E2. Datasets（JSONL）
- `GET /api/datasets/list?path=<rel>`
- `GET /api/datasets/records?path=<rel>&file=<name>&offset=<int>&limit=<int>`
- `GET /api/datasets/record?path=<rel>&file=<name>&index=<int>`

### E3. Tools
- `GET /api/tools/list`
- `POST /api/tools/run` body:

```json
{ "tool_id": "echo_sample", "args": ["a", "b"], "env": { "K": "V" } }
```

### E4. Pipelines
- `GET /api/pipelines/list`
- `GET /api/pipelines/{id}`
- `POST /api/pipelines` body:

```json
{ "name": "p1", "params": { "input": "datas/x.jsonl" }, "steps": [ { "tool_id": "t", "args": [] } ] }
```

- `PATCH /api/pipelines/{id}` body（任意子集）：

```json
{ "params": { "k": "v" } }
```

- `POST /api/pipelines/{id}/execute/step` body（可选）：

```json
{ "params_override": { "k": "override" } }
```

- `POST /api/pipelines/{id}/confirm`
- `POST /api/pipelines/{id}/reset`

### E5. Knowledge
- `GET /api/knowledge?offset&limit&day&tag&q&include_archived`
- `GET /api/knowledge/days`
- `POST /api/knowledge` body:

```json
{ "text": "note", "tags": ["tag1"] }
```

- `PATCH /api/knowledge/{entry_id}` body（任意子集）：

```json
{ "text": "new", "tags": ["a"], "archived": true }
```

- `POST /api/knowledge/archive` body:

```json
{ "day": "YYYY-MM-DD" }
```

### E6. Docs
- `GET /api/docs/human` -> `{ format: "markdown", content: "..." }`
- `GET /api/docs/ai` -> `{ format: "markdown", content: "..." }`

## F. 前端模块（Frontend）

路径：`frontend/`

路由（当前）：
- `/` Home（后续会模块化入口）
- `/datasets` DatasetViewer（依赖 query: path/file）
- `/tools` ToolRunner
- `/pipelines` PipelineEditor（含 params 表）
- `/knowledge` KnowledgeManager

扩展建议（插件/模块系统）：
- 将模块入口抽象为“可注册模块列表”，未来由插件注入路由与菜单项。

