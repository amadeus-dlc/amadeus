# Integration Test Instructions — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan（Step 5/7 の対象集合）、code-summary（t144 更新内容と hook 側不変確認の出典）

## 境界横断テスト

### t144 — CLI 段順 pin（shipped layout / subprocess）

```bash
bun run build   # t144 は dist/claude/.claude/tools を読む — build 前提
bun test tests/integration/t144-harness-seam.cli.test.ts
```

- 新段順（explicit → env → cwd-marker → script-path → cwd-harness）を pin
- **test 5b（新規）が逐語形ケース B を pin**: marker 保有 worktree cwd × 本線 shipped layout（`<harness>/tools/`）絶対パス起動 × env UNSET → worktree root（E-PWF-CGDEV 裁定の留保対応 — in-process では到達不能な rung 3 の実発火面）
- 実測: 11 pass / 0 fail、exit 0

### hook 側不変（AC-1e）

```bash
bun test tests/unit/t202-hook-project-dir-worktree-marker.test.ts tests/integration/t296-hook-launch-and-worktree-resolution.test.ts tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts
```

- `resolveProjectDirFromHook` の挙動・段順が無改変で green — 実測: 19 pass / 0 fail、exit 0

### 汚染ベクタ消滅の閉包実証（cid:code-generation:c3-pollution-closure-invariants）

段順確定後、汚染クラスの state 系テストを1本再実行し、実 record の不変量を前後実測:

```bash
wc -l <record>/audit/*.jsonl && md5 amadeus/spaces/default/memory/team.md amadeus/spaces/default/memory/project.md <record>/amadeus-state.md
bun test tests/integration/t408-practices-promote-latch-gate.test.ts
wc -l <record>/audit/*.jsonl && md5 ...(同上)
```

- 実測: t408 4 pass / 0 fail・audit シャード 295 行不変・md5 3点不変（テスト書込先が temp fixture へ戻ったことも出力で確認）

## フルスイート統合証跡

PR #2413 の CI が正（cid:code-generation:local-lcov-pre-push 系）: Tests / Typecheck / Lint and complexity / Reproducible build / Source-only and graph invariants / Plugin conformance E2E / Coverage Report (head・base) / CI Success — **全 green を実測**（2026-08-07、`gh pr checks` 転記）。ローカル `coverage:ci` は cid:code-generation:c1-coverage-single-owner（単独所有直列化）により重複実行せず、PR CI を統合証跡とする。
