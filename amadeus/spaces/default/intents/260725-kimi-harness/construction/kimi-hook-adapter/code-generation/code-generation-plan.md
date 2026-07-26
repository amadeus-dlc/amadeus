上流入力(consumes 全数): unit-of-work, requirements

# Code Generation Plan — kimi-hook-adapter(Bolt 2)

unit-of-work.md の U2 と requirements.md の FR-2/FR-7a、および本 unit の FD/NFR 成果物(business-logic-model.md §dispatch フロー・§live capture 手順、business-rules.md BR-1〜BR-7、domain-entities.md §AdapterTarget・§Capture Fixture、nfr-design の security/reliability 設計)に基づく。story 相当は FR-2/FR-7a。

- [x] **Step 1: 実機 payload capture**(FR-2b・R1 解消)
  - Q1 手順(バックアップ → probe managed block 挿入 → `kimi -p` 短いセッションで全イベント種を誘発 → capture 収集 → probe 除去・復元突合)
  - 対象: SessionStart/SessionEnd/UserPromptSubmit/PostToolUse(Bash・Write|Edit・TodoList・AskUserQuestion)/PreCompact/SubagentStop/Stop(+可能なら SubagentStart)
  - 収集物を `tests/fixtures/kimi-hooks/<event>.json` として保存(実機 capture のみ・手書き合成しない)
- [x] **Step 2: 変換表の確定**(FR-2b)
  - capture からイベント × 実在フィールドの表を作り、`amadeus-kimi-lib.ts` の `normalizePayload` 写像と Stop block 契約(exit 2 + stderr か `hookSpecificOutput` か)・SessionStart の context 注入形式を確定
- [x] **Step 3: amadeus-kimi-lib.ts 実装**(FR-2a・NFR-D 設計)
  - `routeTarget`・`normalizePayload`・`translateStopOutput`・`translateSessionStartOutput`(domain-entities.md §CoreHookCall どおり)。eval なし・未知フィールド破棄・無状態
- [x] **Step 4: amadeus-kimi-adapter.ts 実装**(FR-2a)
  - 薄い shim: stdin 読取 → routeTarget → subprocess で core hook 呼出 → translate で中継。全経路 fail-open(try/catch・core hook 不在でも exit 0)
  - `packages/framework/harness/kimi/manifest.ts` の harnessFiles に adapter/lib を追加(B1 の open issue)
- [x] **Step 5: 契約テスト**(FR-7a・Standard 戦略)
  - capture fixture を lib に in-process で流し、core hook 効果(audit 行・block 中継・fail-open)を断言(t-cursor-adapter 様式の spawn spy 注入)。`tests/integration/t-kimi-adapter.test.ts`
- [x] **Step 6: dist 再生成 + 検証**
  - `bun scripts/package.ts kimi` + `--check` + `bun run typecheck` + `bun run lint` + `bun run dist:check` + 関連テスト

## トレーサビリティ

- FR-2b → Step 1-2 / FR-2a → Step 3-4 / FR-2c → Step 4(fail-open 構造) / FR-7a → Step 5 / DoD → Step 6
- Q1 承認(実 config への配線)は Step 1 のみで使用し、完了後は元どおりにする

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T01:33:29Z
- **Iteration:** 1
- **Scope decision:** none

plan は U2 を Standard 戦略どおり完全にカバーし、summary は BR-1〜7 と矛盾なく実機 findings を隠さず開示して B3/B4 へ正しく振り分けている。中核不変条件(fail-open・parse-only・verbatim 中継)は conductor が lib を直接確認して検証済み。

### Findings

- (minor / plan) チェックボックス未マーク → 修正済み(conductor が6件を [x] に更新)
- (minor / spot-check 要求) integrationId「BR-2」が成果物に不在のため機械的に棄却 → conductor が lib を直接確認(JSON.parse+catch・fail-open 全経路・Stop verbatim・eval なし)して解決
