# Code Generation Plan — unit-failure-autoelectio (Issue #2976)

> スコープ: self-fix(units-generation SKIP の degrade スコープ)。要件は `<record>/inception/requirements-analysis/requirements.md` の FR-1〜FR-9 から直接スコープした。User stories は SKIP のため、各ステップは FR へ遡る。functional-design も SKIP のため、未解決事項(directive kind / config 呼出形)を本 plan で固定する。

## 本 plan で固定する設計

- **directive kind**: `execute-failure-election`(既存 `execute-advisory-handoff` と同型の「質問ではなく作業」指令。`ask` ではない)。
- **carry**: `unit` / `stage` / `attempt` / `batch` / `siblings` / `choices: [Retry, Skip, Abort]`。conductor が definition JSON を書いて `amadeus-election.ts open --trigger auto --file` を実行する。
- **config 解決**: election CLI と同じ `resolveAmadeusConfig` の active-cursor 1引数経路(3層は cursor 経由で解決)。invalid は既存 `errorDirective` 作法で fail-closed。
- **fallback 判別子**: CLI envelope `{"opened":null,"reason":"solo-election-manual-trigger-required"}` のみ。team/solo の機械判定は置かない。
- **ruling commit**: 既存 `report --user-input retry|skip|abort` → `handleFailureRuling`。新遷移を足さない。
- **非収束**: 割れ / hold / 中断 / CLI エラーは従来の人間向け ask へフォールバック。

## Steps

- [x] Step 1: 失敗テスト(→ FR-7a) — auto seed 下で `emitConstructionFailureIfPresent` が `kind !== "ask"` の新 directive を返すことを、現行コードで赤になるテストとして追加する。
- [x] Step 2: 回帰固定(→ FR-7b / NFR-1) — config 未 seed と `manual` seed で `kind === "ask"` が不変であることを同じスイートで固定する。既存 `t211-swarm-batch-progress.test.ts` の manual 側期待は維持する。
- [x] Step 3: engine 分岐(→ FR-2 / FR-3 / NFR-2) — `await-unit-ruling` で config を解決し、`auto` なら `execute-failure-election` を emit、`manual`/不在は現行 ask、invalid は errorDirective。
- [x] Step 4: 配送面(→ FR-8) — `stage-protocol.md` の halt-and-ask 節と各ハーネス SKILL の「failure always halts and asks」を新 directive 契約に合わせ、`bun run build` で投影を再生成する。
- [x] Step 5: ruling / 非収束(→ FR-1 / FR-4 / FR-5 / FR-6 / FR-9) — Retry/Skip/Abort の既存 report 経路を統合テストで固定し、CLI decline と非収束は ask フォールバック、audit は既存語彙のみ。
- [x] Step 6: 検証(→ NFR-1) — 対象テスト単独 green、`bun run typecheck`、`bun run lint`。フルスイートは conductor が build-and-test で1回通す。

## Traceability (step → FR)

Step 1 → FR-7a / Step 2 → FR-7b, NFR-1 / Step 3 → FR-2, FR-3, NFR-2 / Step 4 → FR-8 / Step 5 → FR-1, FR-4, FR-5, FR-6, FR-9 / Step 6 → NFR-1

## Plan approval

[Answer]: Approve Plan — AUTO_DECIDED `auto-decision-767397186aed9adf87e6e6a231debb8d`（decider=agent-recommendation、loud degradation `native-solo-election-result-unavailable`）。承認: 2026-08-14T08:07:00Z

## Test configuration

既存の `tests/run-tests.sh` / bun test 構成は変更しない。新テストは integration 層に追加する。Test Strategy は Comprehensive だが、適用 NFR は回帰と fail-closed のみなので E2E / 性能 / セキュリティ検査は作らない。
