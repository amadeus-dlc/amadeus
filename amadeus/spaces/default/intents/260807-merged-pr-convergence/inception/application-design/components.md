# Components — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(FR-1〜FR-5 の変更面を成分分解の入力として消費)、`architecture`(codekb — plugin/core 境界と投影経路)、`component-inventory`(codekb — 現況コンポーネントの実在確認)。設計判断は `decisions.md` ADR-1〜4 を正とする。

## 変更対象コンポーネント(4 + 文書面)

| コンポーネント | 所在(canonical) | 責務(本 intent での変更) | ADR |
|---|---|---|---|
| gh-runner | `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts` | PR_STATE_QUERY へ state/mergedAt/mergeCommit 追加、RawPrState 拡張(観測のみ — 判定は持たない) | ADR-2 |
| predicate | `plugins/pr-convergence/tools/pr-convergence-predicate.ts` | PrLifecycleState 閉集合 parse 新設、verdict 判別フィールド追加。evaluateConvergence 本体は無変更 | ADR-2/3 |
| cli | `plugins/pr-convergence/tools/pr-convergence-cli.ts` | status/report の landed 分岐(resolveMergeable 前)、ConvergenceReport 第3 variant、renderReport landed 節 | ADR-1/2/3 |
| report-format sensor | `packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts` | kind 閉集合へ landed 追加、landed 整合規則(converged=false 必須・mergedAt/SHA 実在必須) | ADR-4 |
| stage 文書 | `plugins/pr-convergence/stages/pr-convergence.md` | landed 経路の追記(### (5) と Guardrail の整合文言、frontmatter outputs) | FR-5.1 |

## 不変コンポーネント(明示)

- ledger(`pr-convergence-ledger.ts`): review threads 集計は landed 経路で不使用(マージ時点スナップショット不能 — Out of scope)。
- engine 本体(orchestrate / state / artifact guard): 無変更(Constraint)。
- override 経路: 無変更(GitHub 到達不能時の人間裁定として保存)。

## 構造的保証(層別)

- gh-runner: 観測層 — raw 文字列を返すのみで判定を持たない(既存契約 :201-205 の保存)。
- predicate: 判定層 — 閉集合 parse(未知値 throw)で fail-closed を保証。landed 判定は lifecycle parse の結果のみに依存し、checks 情報を成立条件にしない(ADR-4)。
- cli: I/O 層 — seams(ghSpawn/sleep/now/emitDecision)経由でのみ外界に触れ、テストは全て in-process 注入。
- sensor: 独立検証層 — plugin 非 import(ドリフトは t450 fixture が防ぐ)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T11:01:32Z
- **Iteration:** 1
- **Scope decision:** none

ADR 4件は必須要素完備、AC 全10件がテスト対応表へトレース済み、型名・ADR 番号は5成果物間で一貫、後方互換シムなし。AC-1a のテスト手法記載不整合と RA→FD 委譲事項の先取り確定(無申告)が Minor、供給元 call-site 未 specify 等が FOLLOW-UP でブロッカーなし。

### Findings

- NIT | component-methods.md:34: AC-1a(gh-runner クエリ検証)が t481 純関数行に同居し scripted fixture 面が不可視 — t482 側へ張り替え
- NIT | decisions.md ADR-3: RA が FD へ委譲した verdict フィールド形状を AD が先取り確定 — 申告注記を追加
- FOLLOW-UP | resolveMergeable の現行呼び出し行が未 specify — FD で cli.ts 実測のうえ specify
- FOLLOW-UP | landed 節の pull request / generated at が既存汎用検査に乗るか landed 専用規則かを FD で明示
- FOLLOW-UP | predicate.ts:176-178 コメント逐語は codekb 非収載 — conductor 直接裏取り(RA で実測済みの再確認)
