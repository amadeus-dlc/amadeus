---
slug: pr-convergence
phase: construction
---

# Sensor fire (fixture fragment)

This fixture reproduces the shape of a plugin stage body that hardcodes a
Claude-specific harness directory instead of the `{{HARNESS_DIR}}` projection
token (Issue #2790) — the exact class of harness-neutrality violation t531's
sweep must flag. A shipped plugin runs on every harness's own tree, where a
literal `.claude/` path resolves to nothing on `.codex/`, `.cursor/`,
`.kimi-code/`, `.kiro/`, `.opencode/`, or `.pi/`.

```bash
bun .claude/tools/amadeus-sensor.ts fire pr-convergence-report-format \
  --stage pr-convergence \
  --output-path <record-root>/construction/<unit>/code-generation/pr-convergence-report.md
```
