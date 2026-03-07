"""File and tree models."""
from pydantic import BaseModel


class TreeNode(BaseModel):
    """Single node in workspace tree."""
    name: str
    path: str  # relative to workspace
    is_dir: bool
    children: list["TreeNode"] | None = None


TreeNode.model_rebuild()
