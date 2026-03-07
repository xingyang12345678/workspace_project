"""Shared types and aliases."""
from pathlib import Path
from typing import Any

# Normalized path relative to workspace (no leading slash, no ..)
RelPath = str

# Generic JSON-serializable value
JSONValue = Any
