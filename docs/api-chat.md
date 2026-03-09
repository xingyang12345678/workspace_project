# 聊天 / JSONL 数据相关 API 说明

本文档描述数据阅读与聊天统计相关接口，便于人工阅读与插件对接。完整 OpenAPI 见后端 `/docs`。

所有路径均以 `/api/datasets` 为前缀；涉及 `path`/`file` 的均为相对 `datas/` 的路径。

---

## 1. 列表与单条

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/list?path=` | 列出 path 下 JSONL 文件，返回 `{ files: [{ name, path }] }` |
| GET | `/records?path=&file=&offset=&limit=` | 分页获取记录，返回 `{ records, total, offset, limit }` |
| GET | `/record?path=&file=&index=` | 获取第 index 条记录（0-based），返回 `{ index, data }` |

---

## 2. Token 统计

使用 Hugging Face `AutoTokenizer`，模型名由前端传入（如 `mistralai/Mistral-Nemo-Instruct-2407`）。

### 2.1 单条 Token 数

- **POST** `/token-count`
- **Body** `{ "path", "file", "index", "model" }`
- **返回**  
  - `messages_count`, `chosen_count`, `rejected_count`：各段 token 数  
  - `messages_plus_chosen`, `messages_plus_rejected`  
  - `per_message_tokens`: `[ messages_tokens[], chosen_tokens[], rejected_tokens[] ]`，与前端气泡顺序一致

### 2.2 全文件 Token 分布

- **POST** `/token-stats`
- **Body** `{ "path", "file", "model", "scope" }`  
  - `scope`: `chosen_wise` | `rejected_wise` | `both`
- **返回**  
  - 当 `scope` 为 `chosen_wise` 或 `rejected_wise`：`{ mean, min, max, n, histogram: { bucket_edges, counts } }`  
  - 当 `scope` 为 `both`：`{ chosen_wise: { ... }, rejected_wise: { ... } }`  
  - 仅对含有对应字段的 record 计入（无 `chosen` 的 record 不参与 chosen_wise）

---

## 3. N-gram 筛查

- **POST** `/ngram`
- **Body** `{ "path", "file", "n", "min_count", "min_length", "scope" }`  
  - `n`:  gram 长度  
  - `min_count`: 最少出现次数  
  - `min_length`: 最少字符长度（0 表示不限制）  
  - `scope`: `messages` | `chosen` | `rejected` | `all`
- **返回** `{ items: [ { gram, count }, ... ] }`，按 count 降序

---

## 4. 字符串查找

- **POST** `/string-search`
- **Body** `{ "path", "file", "query", "scope" }`  
  - `scope`: `chosen_wise` | `rejected_wise` | `whole`
- **返回**  
  - `total_occurrences`: 总出现次数  
  - `records_with_match`: 命中条数  
  - `per_record`: `[ { index, count }, ... ]`，便于前端按条高亮

---

## 5. 字段映射（SFT/DPO 自定义结构）

以下接口的 Body 均支持可选 `field_mapping`，用于自定义 JSONL 中对话结构的键名（默认不变）：

- `field_mapping`: `{ messages_key?, chosen_key?, rejected_key?, content_key?, role_key? }`  
  默认依次为 `"messages"`, `"chosen"`, `"rejected"`, `"content"`, `"role"`。

涉及接口：`/token-count`, `/token-stats`, `/ngram`, `/string-search`, `/run-script`。

---

## 6. 代码运行与脚本库

- **POST** `/run-script`  
  - **Body** `{ "path", "file", "script", "field_mapping?" }`  
  - 在服务端执行用户 Python 脚本，注入 `workspace` 与 `run_saved`。  
  - **workspace**：`get_record(i)` 取第 i 条；`get_all_records()` 取全部；`get_field_as_list(field)` 按字段聚合为列表；`get_text_list(field)` 对 messages/chosen/rejected 取 content 列表。  
  - **run_saved(name)**：执行已保存脚本并返回 `{ stdout, stderr, error? }`。  
  - **返回** `{ stdout, stderr, error? }`

- **GET** `/scripts` → `{ scripts: [{ id, name, description }] }`
- **GET** `/script/{id}` → `{ id, body }`
- **POST** `/script/save` Body `{ id, body }`：保存到 `.ai-workspace/dataset_scripts/{id}.py`
- **DELETE** `/script/{id}` → `{ deleted }`

---

## 7. 鲁棒性

- 不假定 record 必有 `chosen` 或 `rejected`；缺失字段按空列表处理，对应统计中不参与或为 0。
- `chosen`/`rejected` 可为单条消息对象或消息数组。
- 所有 path 均在 workspace 内解析，禁止 `..` 等越界。
