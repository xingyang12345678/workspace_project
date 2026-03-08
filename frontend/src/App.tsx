import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { DatasetViewer } from "./features/DatasetViewer/DatasetViewer";
import { FileEditor } from "./features/FileEditor/FileEditor";
import { ToolRunner } from "./features/ToolRunner/ToolRunner";
import { PipelineEditor } from "./features/PipelineEditor/PipelineEditor";
import { KnowledgeManager } from "./features/KnowledgeManager/KnowledgeManager";
import { DocsCenter } from "./features/DocsCenter/DocsCenter";
import { ModuleHub } from "./features/ModuleHub/ModuleHub";
import { TaskCenter } from "./features/TaskCenter/TaskCenter";
import { PluginsPage } from "./features/Plugins/PluginsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ModuleHub />} />
          <Route path="/editor" element={<FileEditor />} />
          <Route path="/datasets" element={<DatasetViewer />} />
          <Route path="/tools" element={<ToolRunner />} />
          <Route path="/pipelines" element={<PipelineEditor />} />
          <Route path="/knowledge" element={<KnowledgeManager />} />
          <Route path="/docs" element={<DocsCenter />} />
          <Route path="/tasks" element={<TaskCenter />} />
          <Route path="/plugins" element={<PluginsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
