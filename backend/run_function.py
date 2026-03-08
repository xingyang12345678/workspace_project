"""Standalone runner for workspace render functions. Called as:
  python run_function.py <workspace_root> <rel_path>
  stdin: JSON record
  stdout: JSON result
"""
import importlib.util
import json
import sys
from pathlib import Path

def main():
    if len(sys.argv) < 3:
        sys.exit(2)
    workspace = Path(sys.argv[1]).resolve()
    rel_path = sys.argv[2]
    full_path = (workspace / rel_path).resolve()
    if not str(full_path).startswith(str(workspace)) or not full_path.is_file():
        sys.exit(3)
    spec = importlib.util.spec_from_file_location("render_fn", full_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["render_fn"] = mod
    spec.loader.exec_module(mod)
    render = getattr(mod, "render", None)
    if not callable(render):
        sys.exit(4)
    try:
        record = json.load(sys.stdin)
        out = render(record)
        print(json.dumps(out, ensure_ascii=False))
    except Exception as e:
        json.dump({"error": str(e)}, sys.stderr)
        sys.exit(5)

if __name__ == "__main__":
    main()
