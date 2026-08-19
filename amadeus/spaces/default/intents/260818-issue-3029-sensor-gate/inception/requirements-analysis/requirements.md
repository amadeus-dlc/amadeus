# 要件定義

## Intent analysis

GitHub Issue #3029 の目的は、blocking sensor の per-sensor script が exit 127（tool unavailable）を返した場合に、`SENSOR_PASSED` として監査されても blocking gate を素通りできないようにすることである。Bun 自体を起動できない `script-error: spawn-failed` は別分岐であり、本要件の実害例には含めない。

本要件は、既存の [business-overview.md](../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../codekb/amadeus/code-structure.md)、および [re-scans/260818-issue-3029-sensor-gate.md](../../../codekb/amadeus/re-scans/260818-issue-3029-sensor-gate.md) を上流入力とする。現行引用は `amadeus-sensor.ts:772-778`、`amadeus-state.ts:2008-2014`、`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5` である。

## Functional requirements

### FR-1: exit 127 の blocking gate 拒否

per-sensor script が exit 127 を返し、dispatcher が `SENSOR_PASSED` と `Note: tool-unavailable` を記録した場合、blocking sensor の stage completion を拒否すること。受け入れ確認は、t511 の blocking approve path が state を変更せず拒否することである。

### FR-2: audit event schema の維持

exit 127 の監査行は、既存の `SENSOR_PASSED`、`Fire id`、`Sensor ID`、`Stage slug`、`Output path`、`Duration ms`、`Note` の契約を維持すること。受け入れ確認は、t92 の exit 127 fixture が `Note: tool-unavailable` を検証でき、既存の監査読取が壊れないことである。

### FR-3: blocking guard の意味付け

`evaluateBlockingSensors` は `tool-unavailable` を正常な pass と判定せず、blocking refusal に必要な finding を返すこと。receipt、output digest、stage scope、複数 output の既存 fail-closed 判定は維持すること。受け入れ確認は t511 unit が `null` ではない結果を検証することである。

### FR-4: spawn-failed 分岐の分離

`error && status === null && signal === null` の `script-error: spawn-failed` は exit 127 の tool-unavailable 分岐と独立して扱うこと。受け入れ確認は両分岐の note と gate 判定が混同されないことを unit または integration test で固定することである。

### FR-5: blocking severity の既存搬送を維持

sensor manifest の `default_severity: blocking`、compiled graph の `sensors_applicable`、completion guard の blocking sensor ID 解決を変更せず、既存の severity carriage を利用すること。受け入れ確認は t511 の manifest-to-graph assertions が通ることである。

### FR-6: 回帰テストの三層同期

unit evaluator（`tests/unit/t511-blocking-sensor-severity.test.ts`）、filesystem-backed approve（`tests/integration/t511-blocking-sensor-gate.integration.test.ts`）、dispatcher truth table（`tests/integration/t92.test.ts`）の exit 127 期待値を同じ fail-closed 契約へ同期すること。受け入れ確認は三層の対象テストが通ることである。

### FR-7: 文書契約の同期

sensor schema／plugin sensor manifest／`packages/framework/core/knowledge/amadeus-shared/audit-format.md` に、`tool-unavailable` が blocking gate では失敗扱いとなる意味を明記すること。Bun 不在の `script-error: spawn-failed` とは別分岐であることも明記すること。受け入れ確認は三文書の記述が現行コードと一致することである。

### FR-8: 変更面の限定

実装変更は `amadeus-sensor.ts`、`amadeus-state.ts` の gate 述語、t511/t92 系テスト、sensor schema／audit-format 文書、intent record に限定すること。`amadeus-orchestrate.ts`、`amadeus-bolt.ts`、swarm 系 SKILL.md、`scripts/metrics-publication*` は変更しないこと。受け入れ確認は変更ファイル一覧をレビューすることである。

## Non-functional requirements

- **NFR-1 監査互換性**: 既存 SENSOR_* event の required fields と Fire id pairing を変更せず、既存 record の読み取りを壊さない。
- **NFR-2 fail-closed 安全性**: tool unavailable、script error、未発火、未解決 terminal、stale digest のいずれも blocking completion の成功条件にしない。
- **NFR-3 決定性**: 同じ audit rows、stage、digest に対して `evaluateBlockingSensors` が同じ verdict を返し、環境依存の PATH 状態を別の意味へ暗黙変換しない。
- **NFR-4 最小変更**: 新しい runtime dependency、外部 API、sensor event 種別、severity vocabulary を追加しない。
- **NFR-5 検証可能性**: unit と integration の両方で exit 127 の拒否を再現でき、dispatcher の t92 契約を個別に検証できる。

## Constraints

- scope は `self-fix`、1 issue = 1 unit、Codex harness、Intent Autonomy は full である。
- 変更許可面は質問 Q5 の AUTO_DECIDED=A により確定済みである。
- fail-closed は質問 Q1、audit schema 維持は Q2、三層回帰は Q3、三文書同期は Q4、完了条件は Q6 の AUTO_DECIDED=A により確定済みである。
- PR の merge、他ブランチへの push/rebase、GitHub Issue/PR へのコメント、指定禁止ファイルの変更は行わない。

## Assumptions

- `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5` の blocking 宣言は現行のまま有効であり、severity carriage の再設計は不要である。
- `SENSOR_PASSED` + `Note: tool-unavailable` を監査互換性のため残し、blocking guard がその note を failure として消費する。
- 既存の t511/t92 fixture と build/test runner が実装検証の正本であり、新しい test harness は作らない。

## Out of scope

- Bun や per-sensor script のインストール・PATH 自動修復
- `SENSOR_PASSED`／`SENSOR_FAILED` のイベント schema 全体の再設計
- `amadeus-orchestrate.ts`、`amadeus-bolt.ts`、swarm 系 SKILL.md、metrics publication の変更
- GitHub PR の作成・レビュー・merge・CI の外部操作
- blocking sensor の新しい manifest 作成、severity vocabulary の拡張

## Open questions

- exit 127 を guard 内で既存 `script-error` finding に統合するか、`tool-unavailable` 専用 finding を追加するかは code-generation の実装設計で確定する。ただし外部 audit event schema は維持する。
- `audit-format.md` と plugin sensor manifest の文言は、実装後の最終コード行と照合して表現を微調整する。

## Traceability

| 要件 | 実装面 | 検証面 |
|---|---|---|
| FR-1, FR-3 | `amadeus-state.ts` gate predicate | t511 unit / integration |
| FR-2, FR-4 | `amadeus-sensor.ts` truth table | t92 dispatcher tests |
| FR-5 | sensor schema / graph carriage | t511 severity carriage |
| FR-6 | t511/t92 tests | 対象テスト実行 |
| FR-7 | sensor schema / plugin manifest / audit-format | 文書契約レビュー |
| FR-8 | 許可変更面 | `git diff --name-only` review |
