const LINKS = [
  { name: "ChatGPT", url: "https://chat.openai.com" },
  { name: "Claude", url: "https://claude.ai" },
  { name: "DeepSeek", url: "https://chat.deepseek.com" },
  { name: "千问", url: "https://tongyi.aliyun.com/" },
  { name: "元宝", url: "https://yuanbao.tencent.com/" },
  { name: "豆包", url: "https://www.doubao.com/" },
];

export function AIHub() {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 24,
        background: "#252525",
        border: "1px solid #444",
        borderRadius: 8,
        padding: "8px 12px",
        display: "flex",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "#888" }}>AI Hub</span>
      {LINKS.map((l) => (
        <a
          key={l.name}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#8af", fontSize: 13 }}
        >
          {l.name}
        </a>
      ))}
    </div>
  );
}
