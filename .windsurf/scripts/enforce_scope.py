#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BLOCKED_COMMAND_PATTERNS = [
    "git reset --hard",
    "git checkout --",
    "rm -rf /",
    "rm -rf *",
    "del /f /q",
    "rmdir /s /q",
    "format "
]


def within_root(raw_path: str):
    path = Path(raw_path)
    resolved = (ROOT / path).resolve() if not path.is_absolute() else path.resolve()
    try:
        resolved.relative_to(ROOT)
        return True, resolved
    except ValueError:
        return False, resolved


def extract_paths(tool_info):
    candidates = []
    for key in ("file_path", "target_file_path", "path", "new_path", "old_path", "directory", "workdir"):
        value = tool_info.get(key)
        if isinstance(value, str) and value.strip():
            candidates.append(value.strip())
    list_value = tool_info.get("paths")
    if isinstance(list_value, list):
        for item in list_value:
            if isinstance(item, str) and item.strip():
                candidates.append(item.strip())
    return candidates


def main():
    raw = sys.stdin.read().strip()
    if not raw:
        return

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"[scope] invalid JSON: {exc}", file=sys.stderr)
        sys.exit(1)

    action = payload.get("agent_action_name", "")
    tool_info = payload.get("tool_info", {}) or {}

    if action in {"pre_read_code", "pre_write_code"}:
        for candidate in extract_paths(tool_info):
            allowed, resolved = within_root(candidate)
            if not allowed:
                print(f"[scope] blocked path outside workspace: {resolved}", file=sys.stderr)
                sys.exit(2)

    if action == "pre_run_command":
        command = str(tool_info.get("command") or tool_info.get("command_line") or "").lower()
        for pattern in BLOCKED_COMMAND_PATTERNS:
            if pattern in command:
                print(f"[scope] blocked command pattern: {pattern}", file=sys.stderr)
                sys.exit(2)


if __name__ == "__main__":
    main()