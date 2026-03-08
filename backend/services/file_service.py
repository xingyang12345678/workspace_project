"""Directory tree, file read, backup."""
import shutil
from pathlib import Path

from core.exceptions import PathOutsideWorkspaceError
from models.file import TreeNode

ROOT_DIRS = ("datas", "tools", "pipelines", "backup", "knowledge", "plugins", "functions")


def get_workspace_root() -> Path:
    from config import get_workspace_root as _get
    return _get()


def resolve_path(rel_path: str) -> Path:
    """Resolve relative path to absolute; forbid escaping workspace."""
    root = get_workspace_root()
    if ".." in rel_path or rel_path.startswith("/"):
        raise PathOutsideWorkspaceError("Invalid path")
    resolved = (root / rel_path).resolve()
    if not str(resolved).startswith(str(root)):
        raise PathOutsideWorkspaceError("Path escapes workspace")
    return resolved


def get_tree() -> TreeNode:
    """Return workspace tree: root with ROOT_DIRS as children (one level)."""
    root_path = get_workspace_root()
    children: list[TreeNode] = []
    for name in ROOT_DIRS:
        p = root_path / name
        p.mkdir(parents=True, exist_ok=True)
        children.append(TreeNode(name=name, path=name, is_dir=True, children=None))
    return TreeNode(name="", path="", is_dir=True, children=children)


def list_dir(rel_path: str) -> list[TreeNode]:
    """List directory at rel_path; returns nodes (no recursive children)."""
    abs_path = resolve_path(rel_path)
    if not abs_path.is_dir():
        return []
    nodes: list[TreeNode] = []
    for child in sorted(abs_path.iterdir()):
        name = child.name
        sub_rel = f"{rel_path}/{name}" if rel_path else name
        nodes.append(TreeNode(
            name=name,
            path=sub_rel,
            is_dir=child.is_dir(),
            children=None,
        ))
    return nodes


def read_file(rel_path: str) -> bytes:
    """Read file content as bytes."""
    abs_path = resolve_path(rel_path)
    if not abs_path.is_file():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Not a file: {rel_path}")
    return abs_path.read_bytes()


# Paths under these prefixes are not writable via write_file (e.g. backup)
WRITE_FORBIDDEN_PREFIXES = ("backup/", "backup")


def write_file(rel_path: str, content: bytes) -> None:
    """Write file at rel_path; parent dirs created if needed. Forbids backup/ and similar."""
    root = get_workspace_root()
    norm = rel_path.strip().strip("/").replace("\\", "/")
    for prefix in WRITE_FORBIDDEN_PREFIXES:
        if norm == prefix or norm.startswith(prefix + "/"):
            raise PathOutsideWorkspaceError("Writing to this path is not allowed")
    abs_path = resolve_path(norm)
    if abs_path.is_dir():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Path is a directory: {rel_path}")
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(content)


def _norm_path(rel_path: str) -> str:
    return rel_path.strip().strip("/").replace("\\", "/")


def create_file(rel_path: str, content: bytes = b"") -> None:
    """Create or overwrite file; parent dirs created if needed. Forbids backup/."""
    norm = _norm_path(rel_path)
    for prefix in WRITE_FORBIDDEN_PREFIXES:
        if norm == prefix or norm.startswith(prefix + "/"):
            raise PathOutsideWorkspaceError("Writing to this path is not allowed")
    abs_path = resolve_path(norm)
    if abs_path.is_dir():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Path is a directory: {rel_path}")
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(content)


def create_dir(rel_path: str) -> None:
    """Create directory; parents created if needed."""
    norm = _norm_path(rel_path)
    abs_path = resolve_path(norm)
    abs_path.mkdir(parents=True, exist_ok=True)


# Top-level dirs that cannot be deleted (only their contents can)
DELETE_FORBIDDEN_NAMES = set(ROOT_DIRS)


def delete_path(rel_path: str) -> None:
    """Delete file or directory. Forbids deleting root-level dirs (e.g. datas, backup)."""
    norm = _norm_path(rel_path)
    if not norm:
        raise PathOutsideWorkspaceError("Invalid path")
    first_part = norm.split("/")[0]
    if first_part in DELETE_FORBIDDEN_NAMES and first_part == norm:
        raise PathOutsideWorkspaceError("Cannot delete root workspace directory")
    abs_path = resolve_path(norm)
    if not abs_path.exists():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Not found: {rel_path}")
    if abs_path.is_file():
        abs_path.unlink()
    else:
        shutil.rmtree(abs_path)


def rename_path(old_rel: str, new_rel: str) -> None:
    """Rename or move file/dir. Both paths must be inside workspace."""
    old_norm = _norm_path(old_rel)
    new_norm = _norm_path(new_rel)
    old_abs = resolve_path(old_norm)
    new_abs = resolve_path(new_norm)
    if not old_abs.exists():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Not found: {old_rel}")
    if new_abs.exists():
        from core.exceptions import NotFoundError
        raise NotFoundError(f"Target already exists: {new_rel}")
    new_abs.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(old_abs), str(new_abs))


def backup_datas() -> dict:
    """Backup datas/ to backup/ with hash dedup. Returns stats."""
    root = get_workspace_root()
    datas_dir = root / "datas"
    backup_dir = root / "backup"
    backup_dir.mkdir(parents=True, exist_ok=True)
    import hashlib
    manifest: dict[str, list[str]] = {}
    stored_hashes: set[str] = set()
    count_new = 0
    for f in datas_dir.rglob("*"):
        if not f.is_file():
            continue
        raw = f.read_bytes()
        h = hashlib.sha256(raw).hexdigest()
        rel = str(f.relative_to(datas_dir))
        if rel not in manifest:
            manifest[rel] = []
        manifest[rel].append(h)
        if h not in stored_hashes:
            stored_hashes.add(h)
            sub = backup_dir / h[:2] / h
            sub.parent.mkdir(parents=True, exist_ok=True)
            sub.write_bytes(raw)
            count_new += 1
    manifest_path = backup_dir / "manifest.json"
    import json
    existing: dict = {}
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text(encoding="utf-8"))
    for k, v in manifest.items():
        existing[k] = existing.get(k, []) + v
    manifest_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"files_backed_up": count_new, "manifest_updated": True}
