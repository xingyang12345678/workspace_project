#!/usr/bin/env python3
"""Sample tool: echo args. Used by workspace to verify tool execution."""
import sys
print(" ".join(sys.argv[1:]) or "(no args)")
sys.exit(0)
