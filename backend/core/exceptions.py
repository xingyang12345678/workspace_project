"""Unified exceptions."""


class WorkspaceError(Exception):
    """Base for workspace-related errors."""

    def __init__(self, message: str, detail: str | None = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class PathOutsideWorkspaceError(WorkspaceError):
    """Path escapes workspace root."""


class NotFoundError(WorkspaceError):
    """Resource not found."""
