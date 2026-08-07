# Code Generation Plan — fix-2303-dispatch-tool

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` FR-B/AC-B 系 + FR-C1 が本 unit の正本。unit-of-work.md 不在は scope 設計どおり consumes_absent expected:true）

- Unit: fix-2303-dispatch-tool（#2303 — dispatch tool 語彙の両受理）
- トレーサビリティ: 全ステップは #2303 と requirements FR-B1〜B4 / AC-B1〜B5 / FR-C1 へ遡る

## 実装ステップ（TDD 順序）

- [x] Step 1: `tests/unit/t-subagent-purpose.test.ts` へ **AC-B1 の新規 pin を追加し Red を実測** — `subagentStartFields({ tool_name: "Agent", tool_input: {...} })` がフィールドを返すこと（現行は null → FAIL = Red）。既存15ピン（"Task" 6箇所等）は無改変
- [x] Step 2: Red 実測記録（assertion 実文・exit code）
- [x] Step 3: `packages/framework/core/tools/amadeus-lib.ts:4128` の `SUBAGENT_DISPATCH_TOOL = "Task"` を集合定数 `SUBAGENT_DISPATCH_TOOLS = ["Task", "Agent"] as const` へ型変更し、ガード（:4161）を includes 判定へ（FR-B1）。**`tool_name !== undefined` の短絡は無改変**（kimi 経路 AC-B4）。doc-comment（:4160-4172 / :4149）を新語彙へ書き直し、matcher `^Task$` が内部名 `Agent` payload に発火する非直観を1行明記（FR-B2）
- [x] Step 4: Step 1 Green 実測 + 既存 pin 群 green（AC-B2/B3/B4）: `bun test tests/unit/t-subagent-purpose.test.ts`
- [x] Step 5: FR-C1 — `tests/integration/t-log-subagent-start.integration.test.ts` へ `tool_name: "Agent"` の dispatch ケースを追加し SUBAGENT_STARTED 監査行 1行 emit を実証（フック spawn 経路）。既存 "Task" ケース（:106）維持。`bun run build` 後に実行（AMADEUS_SRC = dist 面）
- [x] Step 6: `bun test tests/integration/t454-subagent-model-attribution.integration.test.ts` green（既存8ピン不変）
- [x] Step 7: doc 同期（FR-B3）— `PreToolUse{Task}` 旧語彙と tool_name 記述の全数更新: `.claude/knowledge/amadeus-shared/audit-format.md:176`（+:181 散文）と正本 `packages/framework/core/knowledge/amadeus-shared/audit-format.md:176`（+:181）、`docs/reference/12-state-machine.md:400`、`docs/reference/06-hooks-and-tools.md` :26/:46/:205/:215/:219 の **payload tool_name 記述のみ**（matcher 記述は不変）+ `.ja.md` 対訳、`packages/framework/core/hooks/amadeus-log-subagent-start.ts:10-12`。**23-telemetry-schema.md:194（stale cite :4430/:4456-4457）と :198（stale cite :4456-4467）+ .ja.md 対訳を実装後の実行番号へ訂正**
- [x] Step 8: AC-B5 grep — `grep -rn 'PreToolUse{Task}' packages docs .claude/knowledge` = 0 件（codekb/record は対象外）
- [x] Step 9: `tests/.coverage-registry.json:4250` の unitId を集合定数名へ同期（FR-B4）
- [x] Step 10: `bun run build` → tracked 差分確認 / `bun run typecheck` / `bun run lint`

## 制約・逸脱規律

- 触ってよいファイル: `packages/framework/core/tools/amadeus-lib.ts`（SUBAGENT 領域のみ — resolveProjectDir 領域禁止）/ `packages/framework/core/hooks/amadeus-log-subagent-start.ts` / doc 群（上記列挙）/ `tests/unit/t-subagent-purpose.test.ts` / `tests/integration/t-log-subagent-start.integration.test.ts` / `tests/integration/t454-*`（必要時のみ）/ `tests/.coverage-registry.json`。**Unit A の患部（.claude/settings.json / amadeus-dispatch.ts / t483）は禁止** — 並行 builder が作業中
- FR-C1 の Green は Unit A の live 配線と無関係（フック直 spawn）なので単独で閉包可能
- 逸脱は実装前停止。検証は同期完遂。git commit・state 変更コマンド禁止。t481/t482 の採番禁止

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:14:46Z
- **Iteration:** 1
- **Scope decision:** none

FR-B1〜B4 / AC-B1〜B5 / FR-C1 の全項目を file:line 実測照合し実コードと完全一致。tool_name !== undefined 短絡（AC-B4 kimi 経路）の無改変を実読確認、AC-B5 grep 0 件を独立再実行で確認、doc 群の stale cite 訂正は新実行番号と一致。Unit A 患部への接触なし。無申告逸脱・互換レイヤー混入・slop 残存なし。

### Findings

- None
