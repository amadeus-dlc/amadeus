上流入力(consumes 全数): unit-of-work, requirements

# Code Generation Plan — kimi-harness-definition(Walking Skeleton / Bolt 1)

unit-of-work.md の U1 と requirements.md の FR-1/FR-7b/FR-10、および本 unit の FD/NFR 成果物(business-logic-model.md §生成フロー、business-rules.md BR-1〜BR-7、domain-entities.md §HarnessManifest・§Managed Block)に基づく。story 相当は FR-1/FR-7b/FR-10(unit-of-work-story-map.md)。

- [x] **Step 1: harness/kimi 構造と manifest.ts**(FR-1a)
  - `packages/framework/harness/kimi/manifest.ts`: `name: "kimi"`・`harnessDir: ".kimi-code"`・`rulesRename: null`・`emit: null`・coreDirs(claude 相当 8 + session skills 6)・harnessFiles(orchestrator SKILL.md・question-rendering.md・dot-gitignore(projectRoot)・snippet.toml)・`authoredExempt: [/^hooks\/amadeus-kimi-[^/]+\.ts$/]`(B2 の adapter/lib 用に予約)・`onboarding: { dst: "AGENTS.md", projectRoot: true, fills }`
  - 参照: domain-entities.md §Entity: HarnessManifest(manifest-types.ts の行引用どおり)
- [x] **Step 2: orchestrator SKILL.md + question-rendering.md**(FR-1c)
  - `skills/amadeus/SKILL.md`: codex/claude 版をモデルに、kimi 適応 — 呼出は `/skill:amadeus`、ゲートは AskUserQuestion 構造化(claude 型 annex。番号プローズも fallback 許容)、presence mint は PostToolUse(AskUserQuestion)と UserPromptSubmit の両経路、swarm 行は `resolve --harness kimi`、statusline 機構なし(TodoList 運用)、SessionEnd あり(codex の reconcile ハック不要と明記)
  - `skills/amadeus/question-rendering.md`: claude 型 annex(AskUserQuestion + numbered prose fallback)
- [x] **Step 3: onboarding.fills.ts + dot-gitignore**(FR-1)
  - onboarding.fills.ts: 既存 harness(kiro 等)と同型の slot 記述(INVOKE は `/skill:amadeus`)
  - dot-gitignore: codex/opencode と同型(workspace レイアウトは harness 中立)
- [x] **Step 4: hooks/amadeus-hooks.snippet.toml**(FR-1・骨格)
  - マーカー(`# >>> amadeus-kimi-hooks >>>` / `# <<< amadeus-kimi-hooks <<<`)囲みの TOML 断片: `[[hooks]]` 群(SessionStart・SessionEnd・UserPromptSubmit・PostToolUse×4・PreCompact・SubagentStop・Stop)と `[[permission.rules]]` 群(allow: `Bash(bun .kimi-code/tools/*)`・`Bash(bun .kimi-code/hooks/*)`・git worktree/commit/add)。matcher の最終確定は B2 の capture(domain-entities.md §Managed Block どおり骨格)
- [x] **Step 5: dist 生成 + parity**(FR-1b)
  - `bun scripts/package.ts kimi` で `dist/kimi/` 生成、`bun scripts/package.ts kimi --check` で exit 0。session skills 6本と runner-gen 生成物の同梱を確認(FR-1c/FR-10)
- [x] **Step 6: dist 構造 smoke テスト**(FR-7b・Standard 戦略)
  - `tests/smoke/t-kimi-dist-structure.test.ts`: module-scope リテラルの期待ファイル表(t149 様式。manifest 非導出)で必須ファイルの実在を検査
- [x] **Step 7: 検証**(DoD)
  - `bun run typecheck`・`bun run lint`・`bun run dist:check` が green

## トレーサビリティ

- FR-1a → Step 1 / FR-1c・FR-10 → Step 2, 5 / FR-1b → Step 5 / FR-7b → Step 6 / DoD 全件 → Step 7
- テスト戦略: Standard(feature)。本 unit のテスト成果物は Step 6 の smoke(unit test 相当の構造検査)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T23:29:33Z
- **Iteration:** 1
- **Scope decision:** approved — FR-1 — scripts/package.ts — reason: runTool の harnessDir 解決(従来の閉集合)の実在と、.kimi-code 分岐が慣用句どおりの最小追加であることを確認する — owner: amadeus/spaces/default/intents/260725-kimi-harness/inception/requirements-analysis/requirements.md#FR-1b: `bun scripts/package.ts kimi` が `dist/kimi/` を生成し、`bun scripts/package.ts kimi --check` が exit 0 でパスする(byte-parity)。t145 packaging parity が manifest 検出により自動カバーすること

plan は U1 を FR トレーサビリティ付きで全件カバーし、summary は worker 報告と BR-1〜7 と一致。runTool 逸脱は FR-1b 上必須かつ慣用句どおりの最小追加で、check-read(approved)で実体を確認済み。

### Findings

- (minor / plan Step 6) Standard 戦略の字面ギャップは BR-3 上の妥当な解釈として記録(対応不要)
- (minor / summary) runner プローズの /amadeus 呼称は U7 docs で吸収確認
- (minor / 逸脱 #1) 閉集合の実体は check-read(approved)で検証済み
