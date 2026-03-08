import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getRecord,
  getRecords,
  ngram as apiNgram,
  stringSearch,
  tokenCount,
  tokenStats,
  TokenCountResult,
  TokenStatsResult,
  StringSearchResult,
} from "../../api/datasets";
import { listFunctions, runFunction, FunctionInfo } from "../../api/functions";

interface Message {
  from?: string;
  role?: string;
  content?: string;
}

type ContentPart = { type: "text"; value: string } | { type: "narrative"; value: string };

function parseNarrative(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let rest = content;
  while (rest.length > 0) {
    const i = rest.indexOf("*");
    if (i === -1) {
      parts.push({ type: "text", value: rest });
      break;
    }
    parts.push({ type: "text", value: rest.slice(0, i) });
    rest = rest.slice(i + 1);
    const j = rest.indexOf("*");
    if (j === -1) {
      parts.push({ type: "text", value: "*" + rest });
      break;
    }
    parts.push({ type: "narrative", value: rest.slice(0, j) });
    rest = rest.slice(j + 1);
  }
  return parts;
}

const HIGHLIGHT_COLORS = ["#f0e040", "#60c060", "#60a0f0", "#e080a0"];

function highlightSplit(text: string, words: string[]): { type: "text" | "highlight"; value: string; colorIndex: number }[] {
  if (!words.length) return [{ type: "text", value: text, colorIndex: 0 }];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts: { type: "text" | "highlight"; value: string; colorIndex: number }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const fullRe = new RegExp(re.source, "gi");
  while ((m = fullRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index), colorIndex: 0 });
    const colorIndex = words.findIndex((w) => w.toLowerCase() === m![0].toLowerCase());
    parts.push({ type: "highlight", value: m[0], colorIndex: colorIndex >= 0 ? colorIndex % HIGHLIGHT_COLORS.length : 0 });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last), colorIndex: 0 });
  return parts;
}

function MessageContent({
  content,
  highlightWords = [],
}: {
  content: string;
  highlightWords?: string[];
}) {
  const parts = parseNarrative(content);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "narrative") {
          return (
            <span key={i} style={{ color: "var(--muted, #6a6a6a)", fontStyle: "italic" }}>
              （{p.value}）
            </span>
          );
        }
        if (!highlightWords.length) return <span key={i}>{p.value}</span>;
        const segments = highlightSplit(p.value, highlightWords);
        return (
          <span key={i}>
            {segments.map((s, j) =>
              s.type === "text" ? (
                <span key={j}>{s.value}</span>
              ) : (
                <mark
                  key={j}
                  style={{
                    backgroundColor: HIGHLIGHT_COLORS[s.colorIndex],
                    color: "#111",
                    padding: "0 2px",
                    borderRadius: 2,
                  }}
                >
                  {s.value}
                </mark>
              )
            )}
          </span>
        );
      })}
    </>
  );
}

type BubbleTheme = "default" | "chosen" | "rejected";

function ChatBlock({
  label,
  messages,
  perMessageTokens,
  highlightWords,
  bubbleTheme = "default",
}: {
  label: string;
  messages: Message[];
  perMessageTokens?: number[];
  highlightWords?: string[];
  bubbleTheme?: BubbleTheme;
}) {
  const assistantBg =
    bubbleTheme === "chosen"
      ? "rgba(72, 160, 88, 0.35)"
      : bubbleTheme === "rejected"
        ? "rgba(200, 100, 140, 0.35)"
        : "var(--bubble-bg, #2a2a2a)";
  const assistantBorder =
    bubbleTheme === "chosen"
      ? "1px solid rgba(72, 160, 88, 0.6)"
      : bubbleTheme === "rejected"
        ? "1px solid rgba(200, 100, 140, 0.6)"
        : "1px solid var(--border-color, #333)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: "var(--accent, #8af)", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => {
          const role = (m.from ?? m.role) ?? "unknown";
          const raw = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
          const isUser = /user|human|人/i.test(role);
          const tokenN = perMessageTokens && perMessageTokens[i] !== undefined ? perMessageTokens[i] : null;
          return (
            <div
              key={i}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: 12,
                background: isUser ? "var(--accent-dim, rgba(136, 170, 255, 0.2))" : assistantBg,
                border: isUser ? "1px solid var(--border-color, #333)" : assistantBorder,
                position: "relative",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted, #888)", marginBottom: 4 }}>{role}</div>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                <MessageContent content={raw} highlightWords={highlightWords} />
              </div>
              {tokenN !== null && (
                <div style={{ fontSize: 11, color: "var(--muted, #666)", textAlign: "right", marginTop: 4 }}>
                  {tokenN} tokens
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KvBlock({ title, items }: { title: string; items: { k: string; v: unknown }[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: "var(--accent, #8af)", marginBottom: 4 }}>{title}</div>
      <div style={{ marginLeft: 8 }}>
        {items.map(({ k, v }, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: "#888" }}>{k}: </span>
            <span>{typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const KNOWN_KEYS = new Set(["messages", "chosen", "rejected"]);

/** Normalize chosen/rejected: may be a single message object or an array of messages. */
function asMessageList(v: unknown): Message[] {
  if (Array.isArray(v)) return v as Message[];
  if (v && typeof v === "object" && ("content" in v || "role" in v)) return [v as Message];
  return [];
}

function OtherFieldsBlock({ record }: { record: Record<string, unknown> }) {
  const rest = Object.entries(record).filter(([k]) => !KNOWN_KEYS.has(k));
  if (rest.length === 0) return null;
  const items = rest.map(([k, v]) => ({ k, v }));
  return <KvBlock title="其它字段" items={items} />;
}

type RightTab = "token" | "stats" | "ngram" | "search";

export function DatasetViewer() {
  const [search] = useSearchParams();
  const path = search.get("path") ?? "";
  const file = search.get("file") ?? "";
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [rendererId, setRendererId] = useState<string>("");
  const [renderResult, setRenderResult] = useState<{
    sections: { title: string; type: string; messages?: Message[]; items?: { k: string; v: unknown }[] }[];
  } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const DEFAULT_MODEL = "mistralai/Mistral-Nemo-Instruct-2407";
  const PRESET_MODELS = [
    { id: DEFAULT_MODEL, label: "Mistral Nemo 2407" },
    { id: "meta-llama/Llama-3.2-3B-Instruct", label: "Llama 3.2 3B" },
    { id: "Qwen/Qwen2.5-1.5B-Instruct", label: "Qwen2.5 1.5B" },
    { id: "custom", label: "自定义" },
  ];
  const [modelSelect, setModelSelect] = useState(DEFAULT_MODEL);
  const [modelCustom, setModelCustom] = useState("");
  const modelName = modelSelect === "custom" ? modelCustom : modelSelect;
  const [tokenCountResult, setTokenCountResult] = useState<TokenCountResult | null>(null);
  const [tokenCountError, setTokenCountError] = useState<string | null>(null);
  const [tokenCountLoading, setTokenCountLoading] = useState(false);
  const [tokenStatsResult, setTokenStatsResult] = useState<TokenStatsResult | null>(null);
  const [tokenStatsLoading, setTokenStatsLoading] = useState(false);
  const [tokenStatsScope, setTokenStatsScope] = useState("both");
  const [rightTab, setRightTab] = useState<RightTab>("token");
  const [ngramN, setNgramN] = useState(2);
  const [ngramMinCount, setNgramMinCount] = useState(1);
  const [ngramScope, setNgramScope] = useState("all");
  const [ngramUnit, setNgramUnit] = useState<"char" | "word">("char");
  const [ngramResult, setNgramResult] = useState<{ gram: string; count: number }[] | null>(null);
  const [ngramLoading, setNgramLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("whole");
  const [searchResult, setSearchResult] = useState<StringSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(false);

  useEffect(() => {
    listFunctions().then((r) => setFunctions(r.functions));
  }, []);

  useEffect(() => {
    if (!file) {
      setTotal(0);
      setRecord(null);
      return;
    }
    getRecords(path, file, 0, 1).then((r) => {
      setTotal(r.total);
      setIndex(0);
      if (r.total > 0) getRecord(path, file, 0).then((r2) => setRecord(r2.data)).catch(() => setRecord(null));
      else setRecord(null);
    }).catch((e) => {
      setError(String(e));
      setTotal(0);
      setRecord(null);
    });
  }, [path, file]);

  useEffect(() => {
    if (!file || total === 0) return;
    getRecord(path, file, index)
      .then((r) => setRecord(r.data))
      .catch(() => setRecord(null));
  }, [path, file, index, total]);

  useEffect(() => {
    setTokenCountResult(null);
    setTokenCountError(null);
  }, [path, file, index, modelName]);

  const applyRenderer = useCallback(() => {
    if (!record || !rendererId) {
      setRenderResult(null);
      setRenderError(null);
      return;
    }
    setRenderError(null);
    runFunction(rendererId, record)
      .then((r) => {
        setRenderResult(
          r.result as {
            sections: { title: string; type: string; messages?: Message[]; items?: { k: string; v: unknown }[] }[];
          }
        );
      })
      .catch((e) => {
        setRenderError(String(e));
        setRenderResult(null);
      });
  }, [record, rendererId]);

  useEffect(() => {
    if (!rendererId) {
      setRenderResult(null);
      setRenderError(null);
      return;
    }
    applyRenderer();
  }, [rendererId, record, applyRenderer]);

  const doTokenCount = useCallback(() => {
    if (!modelName.trim() || !file) return;
    setTokenCountLoading(true);
    setTokenCountError(null);
    tokenCount(path, file, index, modelName.trim())
      .then((r) => {
        setTokenCountResult(r);
        setTokenCountError(null);
      })
      .catch((e: Error & { response?: { data?: { detail?: string } } }) => {
        setTokenCountResult(null);
        let msg = e?.message ?? String(e);
        try {
          const parsed = JSON.parse(msg);
          if (typeof parsed?.detail === "string") msg = parsed.detail;
        } catch (_) {}
        setTokenCountError(msg);
      })
      .finally(() => setTokenCountLoading(false));
  }, [path, file, index, modelName]);

  const doTokenStats = useCallback(() => {
    if (!modelName.trim() || !file) return;
    setTokenStatsLoading(true);
    tokenStats(path, file, modelName.trim(), tokenStatsScope)
      .then(setTokenStatsResult)
      .catch(() => setTokenStatsResult(null))
      .finally(() => setTokenStatsLoading(false));
  }, [path, file, modelName, tokenStatsScope]);

  const doNgram = useCallback(() => {
    if (!file) return;
    setNgramLoading(true);
    apiNgram(path, file, ngramN, ngramMinCount, 0, ngramScope, ngramUnit)
      .then((r) => setNgramResult(r.items))
      .catch(() => setNgramResult(null))
      .finally(() => setNgramLoading(false));
  }, [path, file, ngramN, ngramMinCount, ngramScope, ngramUnit]);

  const doSearch = useCallback(() => {
    if (!file || !searchQuery.trim()) return;
    setSearchLoading(true);
    stringSearch(path, file, searchQuery.trim(), searchScope)
      .then(setSearchResult)
      .catch(() => setSearchResult(null))
      .finally(() => setSearchLoading(false));
  }, [path, file, searchQuery, searchScope]);

  const searchWords = highlightEnabled && searchQuery.trim() ? searchQuery.trim().split(/\s+/).filter(Boolean) : [];
  const currentRecordMatch = searchResult?.per_record?.find((r) => r.index === index);

  if (!file) {
    return (
      <div style={{ padding: 24 }}>
        <p>从左侧选择 datas 下的 JSONL 文件查看。</p>
      </div>
    );
  }

  if (error) return <div style={{ padding: 24, color: "#f88" }}>{error}</div>;

  const messages = (record?.messages as Message[] | undefined) ?? [];
  const chosen = asMessageList(record?.chosen);
  const rejected = asMessageList(record?.rejected);
  const useBuiltin = !rendererId;
  const useCustom = rendererId && renderResult?.sections;

  const flatPerMessageTokens: number[] = [];
  if (tokenCountResult?.per_message_tokens) {
    for (const arr of tokenCountResult.per_message_tokens) flatPerMessageTokens.push(...arr);
  }
  const msgLen = messages.length;
  const chosenLen = chosen.length;
  const tokensForMessages = flatPerMessageTokens.slice(0, msgLen);
  const tokensForChosen = flatPerMessageTokens.slice(msgLen, msgLen + chosenLen);
  const tokensForRejected = flatPerMessageTokens.slice(msgLen + chosenLen);

  const hist = tokenStatsResult?.histogram ?? (tokenStatsResult?.chosen_wise ?? tokenStatsResult?.rejected_wise)?.histogram;
  const histCounts = hist?.counts ?? [];
  const histEdges = hist?.bucket_edges ?? [];
  const maxCount = Math.max(...histCounts, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: "1 1 50%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-color, #333)", paddingRight: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
            <button type="button" disabled={index <= 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              上一条
            </button>
            <button type="button" disabled={index >= total - 1} onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
              下一条
            </button>
            <span>
              第
              <input
                type="number"
                min={0}
                max={Math.max(0, total - 1)}
                value={index}
                onChange={(e) => setIndex(Math.max(0, Math.min(total - 1, parseInt(e.target.value, 10) || 0)))}
                style={{ width: 64, margin: "0 8px" }}
              />
              条 / 共 {total} 条
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              渲染器：
              <select
                value={rendererId}
                onChange={(e) => setRendererId(e.target.value)}
                style={{ padding: "4px 8px", minWidth: 160 }}
              >
                <option value="">内置</option>
                {functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.category}/{f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {renderError && <div style={{ color: "#f88", marginBottom: 8, flexShrink: 0 }}>渲染错误: {renderError}</div>}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--page-bg, #252525)", padding: 16, borderRadius: 8, border: "1px solid var(--border-color, #333)" }}>
            {useBuiltin && (
              <>
                {messages.length > 0 && (
                  <ChatBlock
                    label="Messages"
                    messages={messages}
                    perMessageTokens={tokensForMessages.length ? tokensForMessages : undefined}
                    highlightWords={searchWords.length ? searchWords : undefined}
                  />
                )}
                {chosen.length > 0 && (
                  <ChatBlock
                    label="Assistant (chosen)"
                    messages={chosen}
                    perMessageTokens={tokensForChosen.length ? tokensForChosen : undefined}
                    highlightWords={searchWords.length ? searchWords : undefined}
                    bubbleTheme="chosen"
                  />
                )}
                {rejected.length > 0 && (
                  <ChatBlock
                    label="Assistant (rejected)"
                    messages={rejected}
                    perMessageTokens={tokensForRejected.length ? tokensForRejected : undefined}
                    highlightWords={searchWords.length ? searchWords : undefined}
                    bubbleTheme="rejected"
                  />
                )}
                {record && <OtherFieldsBlock record={record} />}
                {messages.length === 0 && chosen.length === 0 && rejected.length === 0 && Object.keys(record || {}).length === 0 && (
                  <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(record, null, 2)}</pre>
                )}
              </>
            )}
            {useCustom &&
              renderResult!.sections.map((sec, i) =>
                sec.type === "chat" && sec.messages ? (
                  <ChatBlock key={i} label={sec.title} messages={sec.messages} highlightWords={searchWords.length ? searchWords : undefined} />
                ) : sec.type === "kv" && sec.items ? (
                  <KvBlock key={i} title={sec.title} items={sec.items} />
                ) : null
              )}
          </div>
        </div>

        <div style={{ flex: "1 1 50%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexShrink: 0 }}>
            {(["token", "stats", "ngram", "search"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRightTab(t)}
                style={{
                  padding: "6px 12px",
                  background: rightTab === t ? "var(--accent, #8af)" : "transparent",
                  color: rightTab === t ? "#111" : "#e0e0e0",
                  border: "1px solid var(--border-color, #444)",
                  borderRadius: 6,
                }}
              >
                {t === "token" && "当前条 Token"}
                {t === "stats" && "全文件分布"}
                {t === "ngram" && "N-gram"}
                {t === "search" && "字符串查找"}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginBottom: 12, background: "var(--page-bg, #252525)", padding: 12, borderRadius: 8, border: "1px solid var(--border-color, #333)" }}>
            {rightTab === "token" && (
              <>
                {tokenCountError && <div style={{ color: "#f88", marginBottom: 8 }}>Token 统计失败: {tokenCountError}</div>}
                {tokenCountResult && (
                  <div style={{ fontSize: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>各段总量</div>
                    <div>messages: {tokenCountResult.messages_count}</div>
                    <div>chosen: {tokenCountResult.chosen_count}</div>
                    <div>rejected: {tokenCountResult.rejected_count}</div>
                    <div>messages+chosen: {tokenCountResult.messages_plus_chosen}</div>
                    <div>messages+rejected: {tokenCountResult.messages_plus_rejected}</div>
                    {flatPerMessageTokens.length > 0 && (() => {
                      const arr = flatPerMessageTokens;
                      const sum = arr.reduce((a, b) => a + b, 0);
                      const mean = sum / arr.length;
                      const min = Math.min(...arr);
                      const max = Math.max(...arr);
                      const variance = arr.reduce((a, x) => a + (x - mean) ** 2, 0) / arr.length;
                      const std = Math.sqrt(variance);
                      const sorted = [...arr].sort((a, b) => a - b);
                      const p = (q: number) => sorted[Math.min(Math.floor((arr.length - 1) * q / 100), arr.length - 1)] ?? 0;
                      return (
                        <>
                          <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 6 }}>当前条内各句统计</div>
                          <div>条数: {arr.length} · 总和: {sum} · 均值: {mean.toFixed(2)} · 标准差: {std.toFixed(2)}</div>
                          <div>最小: {min} · 最大: {max} · P25: {p(25)} · 中位数: {p(50)} · P75: {p(75)} · P90: {p(90)}</div>
                        </>
                      );
                    })()}
                  </div>
                )}
                {!tokenCountResult && !tokenCountLoading && !tokenCountError && <div style={{ color: "#888" }}>选择模型后点击「统计当前条」</div>}
                {tokenCountLoading && <div>加载中...</div>}
              </>
            )}
            {rightTab === "stats" && (
              <>
                {tokenStatsResult && (
                  <>
                    {tokenStatsScope === "both" && "chosen_wise" in tokenStatsResult && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>chosen_wise</div>
                        <div style={{ marginBottom: 4 }}>n: {tokenStatsResult.chosen_wise?.n} · 均值: {tokenStatsResult.chosen_wise?.mean} · 标准差: {tokenStatsResult.chosen_wise?.std} · 最小: {tokenStatsResult.chosen_wise?.min} · 最大: {tokenStatsResult.chosen_wise?.max}</div>
                        <div style={{ color: "var(--muted, #888)", marginBottom: 6 }}>中位数: {tokenStatsResult.chosen_wise?.median} · P25: {tokenStatsResult.chosen_wise?.p25} · P75: {tokenStatsResult.chosen_wise?.p75} · P90: {tokenStatsResult.chosen_wise?.p90}</div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>分布</div>
                        {tokenStatsResult.chosen_wise?.histogram?.counts?.length ? (
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, marginTop: 8 }}>
                            {tokenStatsResult.chosen_wise.histogram.counts.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  background: "var(--accent, #8af)",
                                  height: `${(c / Math.max(...tokenStatsResult.chosen_wise!.histogram!.counts)) * 100}%`,
                                  minHeight: c ? 4 : 0,
                                }}
                                title={`${tokenStatsResult.chosen_wise?.histogram?.bucket_edges?.[i] ?? ""} - ${c}`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                    {tokenStatsScope === "both" && "rejected_wise" in tokenStatsResult && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>rejected_wise</div>
                        <div style={{ marginBottom: 4 }}>n: {tokenStatsResult.rejected_wise?.n} · 均值: {tokenStatsResult.rejected_wise?.mean} · 标准差: {tokenStatsResult.rejected_wise?.std} · 最小: {tokenStatsResult.rejected_wise?.min} · 最大: {tokenStatsResult.rejected_wise?.max}</div>
                        <div style={{ color: "var(--muted, #888)", marginBottom: 6 }}>中位数: {tokenStatsResult.rejected_wise?.median} · P25: {tokenStatsResult.rejected_wise?.p25} · P75: {tokenStatsResult.rejected_wise?.p75} · P90: {tokenStatsResult.rejected_wise?.p90}</div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>分布</div>
                        {tokenStatsResult.rejected_wise?.histogram?.counts?.length ? (
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, marginTop: 8 }}>
                            {tokenStatsResult.rejected_wise.histogram.counts.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  background: "#8a8",
                                  height: `${(c / Math.max(...tokenStatsResult.rejected_wise!.histogram!.counts)) * 100}%`,
                                  minHeight: c ? 4 : 0,
                                }}
                                title={`${tokenStatsResult.rejected_wise?.histogram?.bucket_edges?.[i] ?? ""} - ${c}`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                    {tokenStatsScope !== "both" && (
                      <>
                        <div style={{ marginBottom: 4 }}>n: {tokenStatsResult.n} · 均值: {tokenStatsResult.mean} · 标准差: {tokenStatsResult.std} · 最小: {tokenStatsResult.min} · 最大: {tokenStatsResult.max}</div>
                        <div style={{ color: "var(--muted, #888)", marginBottom: 6 }}>中位数: {tokenStatsResult.median} · P25: {tokenStatsResult.p25} · P75: {tokenStatsResult.p75} · P90: {tokenStatsResult.p90}</div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>分布</div>
                        {histCounts.length > 0 && (
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, marginTop: 8 }}>
                            {histCounts.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  background: "var(--accent, #8af)",
                                  height: `${(c / maxCount) * 100}%`,
                                  minHeight: c ? 4 : 0,
                                }}
                                title={`${histEdges[i] ?? ""} - ${c}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {!tokenStatsResult && !tokenStatsLoading && <div style={{ color: "#888" }}>选择 scope 后点击「统计全文件」</div>}
                {tokenStatsLoading && <div>加载中...</div>}
              </>
            )}
            {rightTab === "ngram" && (
              <>
                {ngramResult && (
                  <div style={{ maxHeight: 400, overflow: "auto" }}>
                    {ngramResult.slice(0, 200).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                        <span style={{ fontFamily: "monospace" }}>{item.gram}</span>
                        <span>{item.count}</span>
                      </div>
                    ))}
                    {ngramResult.length > 200 && <div style={{ color: "#888" }}>仅显示前 200 条</div>}
                  </div>
                )}
                {!ngramResult && !ngramLoading && <div style={{ color: "#888" }}>设置 n、min_count、scope 后点击「N-gram」</div>}
                {ngramLoading && <div>加载中...</div>}
              </>
            )}
            {rightTab === "search" && (
              <>
                {searchResult && (
                  <div style={{ fontSize: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>汇总</div>
                    <div>总出现次数: {searchResult.total_occurrences}</div>
                    <div>命中条数: {searchResult.records_with_match}</div>
                    {currentRecordMatch && <div>当前条命中: {currentRecordMatch.count} 次</div>}
                    {searchResult.records_with_match > 0 && (
                      <>
                        <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 6 }}>命中条内统计（每条出现次数）</div>
                        <div>均值: {searchResult.mean_per_record ?? "-"} · 最小: {searchResult.min_per_record ?? "-"} · 最大: {searchResult.max_per_record ?? "-"} · 标准差: {searchResult.std_per_record ?? "-"}</div>
                      </>
                    )}
                  </div>
                )}
                {!searchResult && !searchLoading && <div style={{ color: "#888" }}>输入查询字符串、选择 scope 后点击「查找」</div>}
                {searchLoading && <div>加载中...</div>}
              </>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border-color, #333)", paddingTop: 12, flexShrink: 0, maxHeight: 220, overflow: "auto" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                模型：
                <select
                  value={modelSelect}
                  onChange={(e) => setModelSelect(e.target.value)}
                  style={{ padding: "4px 8px", minWidth: 180 }}
                >
                  {PRESET_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {modelSelect === "custom" && (
                  <input
                    value={modelCustom}
                    onChange={(e) => setModelCustom(e.target.value)}
                    placeholder="如 mistralai/Mistral-Nemo-Instruct-2407"
                    style={{ padding: "4px 8px", width: 240 }}
                  />
                )}
              </label>
              <button type="button" onClick={doTokenCount} disabled={tokenCountLoading || !modelName.trim()}>
                {tokenCountLoading ? "统计中…" : "统计当前条"}
              </button>
              <label>
                scope：
                <select value={tokenStatsScope} onChange={(e) => setTokenStatsScope(e.target.value)} style={{ marginLeft: 8, padding: "4px 8px" }}>
                  <option value="chosen_wise">chosen_wise</option>
                  <option value="rejected_wise">rejected_wise</option>
                  <option value="both">both</option>
                </select>
              </label>
              <button type="button" onClick={doTokenStats} disabled={tokenStatsLoading || !modelName.trim()}>
                {tokenStatsLoading ? "统计中…" : "统计全文件"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 8 }}>
              <label>
                n：
                <input type="number" min={1} value={ngramN} onChange={(e) => setNgramN(parseInt(e.target.value, 10) || 1)} style={{ width: 48, marginLeft: 8, padding: "4px 8px" }} />
              </label>
              <label>
                min_count：
                <input type="number" min={0} value={ngramMinCount} onChange={(e) => setNgramMinCount(parseInt(e.target.value, 10) || 0)} style={{ width: 56, marginLeft: 8, padding: "4px 8px" }} />
              </label>
              <label>
                scope：
                <select value={ngramScope} onChange={(e) => setNgramScope(e.target.value)} style={{ marginLeft: 8, padding: "4px 8px" }}>
                  <option value="messages">messages</option>
                  <option value="chosen">chosen</option>
                  <option value="rejected">rejected</option>
                  <option value="all">all</option>
                </select>
              </label>
              <label>
                单位：
                <select value={ngramUnit} onChange={(e) => setNgramUnit(e.target.value as "char" | "word")} style={{ marginLeft: 8, padding: "4px 8px" }}>
                  <option value="char">字符</option>
                  <option value="word">单词</option>
                </select>
              </label>
              <button type="button" onClick={doNgram} disabled={ngramLoading}>
                {ngramLoading ? "执行中…" : "N-gram"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 8 }}>
              <label>
                查找：
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="字符串"
                  style={{ marginLeft: 8, padding: "4px 8px", width: 180 }}
                />
              </label>
              <label>
                scope：
                <select value={searchScope} onChange={(e) => setSearchScope(e.target.value)} style={{ marginLeft: 8, padding: "4px 8px" }}>
                  <option value="chosen_wise">chosen_wise</option>
                  <option value="rejected_wise">rejected_wise</option>
                  <option value="whole">whole</option>
                </select>
              </label>
              <button type="button" onClick={doSearch} disabled={searchLoading || !searchQuery.trim()}>
                {searchLoading ? "查找中…" : "查找"}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={highlightEnabled} onChange={(e) => setHighlightEnabled(e.target.checked)} />
                高亮
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
