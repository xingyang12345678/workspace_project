"""FastAPI entry: mount routes and CORS."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import files, backup, datasets, tools, pipelines, knowledge, plugins, docs, functions, tasks, system

app = FastAPI(title="AI Data Workspace", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router)
app.include_router(backup.router)
app.include_router(datasets.router)
app.include_router(tools.router)
app.include_router(pipelines.router)
app.include_router(knowledge.router)
app.include_router(plugins.router)
app.include_router(docs.router)
app.include_router(functions.router)
app.include_router(tasks.router)
app.include_router(system.router)


@app.get("/")
def root():
    return {"app": "AI Data Workspace", "docs": "/docs"}
