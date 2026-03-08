export type WorkspaceModule = {
  id: string;
  title: string;
  description: string;
  path: string;
  enabled?: boolean;
};

// 扩展方式（MVP）：在此处新增模块配置即可。
// 后续：可由插件系统在运行时注入更多模块。
export const MODULES: WorkspaceModule[] = [
  {
    id: "datasets",
    title: "数据阅读",
    description: "浏览 datas 下 JSONL（聊天结构 messages/chosen/rejected）",
    path: "/datasets",
    enabled: true,
  },
  {
    id: "tools",
    title: "工具执行",
    description: "扫描 tools/*.py，支持参数执行并在终端查看输出",
    path: "/tools",
    enabled: true,
  },
  {
    id: "pipelines",
    title: "Pipeline",
    description: "多步顺序执行；每步执行后需确认；支持参数宏表格",
    path: "/pipelines",
    enabled: true,
  },
  {
    id: "knowledge",
    title: "知识库",
    description: "可标签化、可归档（按天/今天）、可查看与编辑",
    path: "/knowledge",
    enabled: true,
  },
  {
    id: "docs",
    title: "项目文档",
    description: "架构、接口、原理（人读版 / AI 读版）",
    path: "/docs",
    enabled: true,
  },
  {
    id: "tasks",
    title: "任务中心",
    description: "后台任务列表与日志（工具/Pipeline 并行执行）",
    path: "/tasks",
    enabled: true,
  },
  {
    id: "plugins",
    title: "插件（预留）",
    description: "预留插件扩展入口（MVP 占位）",
    path: "/plugins",
    enabled: true,
  },
];

