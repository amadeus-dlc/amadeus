# Phase Check — CONSTRUCTION(intent 260814-failopen-error-paths)

## 判定

- 結果: **PASS — Construction 完了可**
- 対象: `self-fix` / depth `Minimal` / Unit `failopen-error-paths`
- 要件から実装への追跡: `7/7`(`100%`)
- 要件からテストへの追跡: `7/7`(`100%`)
- 非機能要件の検証: `3/3`(`100%`)
- Missing traceability: なし
- Orphaned artifacts: なし
- Contradictions: なし
- [x] Intent grant `intent-grant-a9a18a2c2d5422a202114e6ff536c188` による phase boundary 自動承認の前提を満たす。

## フェーズ境界と設計入力

本 scope は `self-fix` のため、専用の functional-design、NFR-design、infrastructure-design、CI-pipeline は計画上非適用である。Inception の reverse-engineering と requirements-analysis が既存コンポーネント境界を確定し、要件は `code-generation-plan.md` を介して既存の blocking sensor gate 実装へ直接トレースする。インフラ変更や新規 runtime dependency はなく、既存 GitHub Actions の品質ゲートを最終 head で検証した。

## トレーサビリティ

| 要件 | 実装 | 検証 | 状態 |
|---|---|---|---|
| FR-1 blocking gate の `script-error` 不通過化 | `packages/framework/core/tools/amadeus-state.ts` の `evaluateBlockingSensors` | `t511-blocking-sensor-severity.test.ts`、`t511-blocking-sensor-gate.integration.test.ts` の exit 2 / bad JSON | Fully traced |
| FR-2 拒否診断の可観測性 | `BlockingSensorFinding.kind = script-error` と Note 保持 | unit / integration の sensor id・`script-error:*` 拒否メッセージ検証 | Fully traced |
| FR-3 正当な PASSED 経路の不変 | note なしと `tool-unavailable` を従来どおり通過 | t511、`t-sensor-fire-seam`、`t92` の正常系・exit 127 回帰 | Fully traced |
| FR-4 advisory sensor の挙動不変 | dispatcher・監査語彙・otel registry は未変更 | source diff と dispatcher 回帰、最終 CI | Fully traced |
| FR-5 コメントと stale 言及の同期 | `amadeus-state.ts` の政策分界コメント、`amadeus-sensor-schema.ts` の現行シンボル名 | lint、typecheck、source diff | Fully traced |
| FR-6 TDD 回帰 | unit / integration の既存 fixture 再利用 | Red 2 fail → Green 64 pass、関連回帰成功 | Fully traced |
| FR-7 配送同一性 | framework 正本と `model-map.json` の impl hash 同期 | 8 harness build、reproducible build、source-only、Intent Mirror contract | Fully traced |

## 非機能要件

- NFR-1: 非文字列 Note は `script-error: note-unreadable` として fail-closed になることを unit test で確認した。
- NFR-2: 最終 head `f6312e0779f6a6d1c76bcb224333d3a1a781b15f` の GitHub Actions run `31798958923` で Tests、Typecheck、Lint and complexity、Coverage、Reproducible build、Source-only and graph invariants、Plugin conformance、Intent Mirror distribution contract、CI Success がすべて成功した。
- NFR-3: 実装前 Red、最小実装後 Green、正当な既存データの正常系を `code-summary.md` と build/test 成果物で確認した。

## 形式検証

承認済み TLA+ applicability outcome は `impl-only` である。状態変数、遷移、構成、到達可能性、不変量を変更しないため、本線の formal-model-check はステージ規約どおり `NOT_APPLICABLE` とし、TLC を再実行していない。先行 advisory では登録4モデルがすべて `NOT_DETECTED` で完了している。

## 配送と収束

- [PR #3045](https://github.com/amadeus-dlc/amadeus/pull/3045) は head `f6312e0779f6a6d1c76bcb224333d3a1a781b15f` で `MERGEABLE` / `CLEAN`。
- `pr-convergence-report.md` は `converged: true`、replied-unresolved `0`、ignored `0`、human-only `0` を head 三者一致の attestation とともに記録している。
- merge は本 phase check の範囲外であり、別途人間判断を要する。

## 警告・孤立・矛盾

- rebase 後のローカル full suite では、今回差分のない既存性能閾値テストが制約環境の子プロセス起動時間により 300ms を超過した。対象の blocking sensor 回帰はすべて成功し、最終 head のリモート Tests と全 blocking CI は成功しているため、変更起因の阻害事項ではない。
- coverage base job の `lizard` 未導入注記は verdict-independent の base 測定注記であり、head coverage と最終 Coverage Report は成功している。
- 未解決の traceability gap、孤立成果物、phase 間矛盾はない。

`PHASE_VERIFIED` の監査イベントと state 更新は、この成果物の存在を検証する engine の phase-boundary approval 遷移に委ねる。
