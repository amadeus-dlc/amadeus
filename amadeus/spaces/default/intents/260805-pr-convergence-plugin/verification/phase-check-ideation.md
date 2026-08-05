# Phase Boundary Verification — IDEATION → INCEPTION

対象 Intent: `260805-pr-convergence-plugin`
方法論: `.claude/knowledge/amadeus-shared/verification.md`、`.claude/amadeus-common/protocols/stage-protocol-governance.md`

## 1. 検証対象

| 成果物 | 状態 | 用途 |
|---|---|---|
| `ideation/intent-capture/intent-statement.md` | 存在・承認済み(auto-approve、grant intent-grant-fd0ed2b79c48204d342920ce3b4b67f0) | 問題、対象者、成功指標、初期 scope |
| `ideation/intent-capture/stakeholder-map.md` | 存在・承認済み | 利害関係者、意思決定者、通信要求 |
| `ideation/intent-capture/intent-capture-questions.md` | 存在・センサー green(answer-evidence PASSED) | 0問様式の根拠、承認証跡 |
| `ideation/scope-definition/scope-document.md` | 存在・センサー green | In/Out 境界、requirements 送付事項、シーケンシング |
| `ideation/scope-definition/intent-backlog.md` | 存在・センサー green | P1〜P5 プロト Unit、依存グラフ |
| `ideation/scope-definition/scope-definition-questions.md` | 存在・センサー green | 対話モード、追加質問不要の根拠 |

センサー実測: intent-capture 7発火・scope-definition 7発火、SENSOR_FAILED 0件(audit シャード grep 実測)。

## 2. Intent → Scope → Backlog トレーサビリティ

| Intent 成功指標 | Scope(In 項目) | Backlog | 判定 |
|---|---|---|---|
| 1. install 済みで produces に report が載り batch 前進拒否(落ちる実証)/ 未 install で不変 | In-1, In-2, In-7 | P1, P5 | PASS |
| 2. 収束述語の単一定義(4区分+UNKNOWN-retry+mergeStateStatus)+ fixture 赤実証 | In-4, In-7 | P2, P5 | PASS |
| 3. thread 台帳の GraphQL 機械導出(ページング・bot 判定・severity・終端処理) | In-3 | P2, P3 | PASS |

順方向カバレッジ 3/3(100%)。逆方向: In-5(工程断片)→P3、In-6(センサー)→P4 は成功指標1-3 の実現手段としてプラグイン公開契約を完結させる構成要素であり、孤立した In 項目・プロト Unit はない(P1〜P5 すべてが成功指標へ到達)。

## 3. スコープ境界の整合性

| 検査 | 結果 | 根拠 |
|---|---|---|
| 問題と解決範囲 | PASS | 散文ノルムの再強化でなく指令ループへの構造接続(fail-closed ガードのデータ点火)を対象化 |
| opt-in 境界 | PASS | ユーザー裁定(2026-08-02、自動付与不可)を In-1 として固定。未 install 無影響を対実証(In-7)で保証 |
| ガード所有権 | PASS | 新規ガードコード禁止 — core 既存 `unitCovered` 述語の1定義所有(検証劇場 Forbidden と整合) |
| 責務分担境界 | PASS | #1902(発行保証)・#1887(台帳計測)・既存負債トリアージを Out として明示 |
| 未決事項の委譲 | PASS | Issue 明示残置の3決定点を requirements 送付事項として scope-document に固定(無音の先送りでない) |
| 優先順位 | PASS | dependency + risk-first。engine 側唯一の要拡張点(P1)を walking-skeleton Bolt として先行 |
| 検証戦略 | PASS | `self-feature`、Standard depth、Comprehensive test strategy と整合 |

矛盾検出 0件。成果物は [Issue #1971](https://github.com/amadeus-dlc/amadeus/issues/1971)(クロスレビュー2名成立・全訂正反映済み)と整合する。

## 4. スキップステージの N/A 判定

| ステージ | N/A 根拠 | 代用証拠・後続確認 |
|---|---|---|
| market-research | Amadeus 自身のワークフロー構造欠落を修復する `self-feature` で市場探索を要しない | Issue #1971 の実測(19件残置事故)とクロスレビュー |
| feasibility | ガード機構(unitCovered 述語)・plugin 3層 trust・GraphQL 述語は Issue クロスレビューが file:line 実測済み。残る未知点は compose overlay の実装方式であり成立可否ではない | Reverse Engineering で compose 実装 seam を棚卸しし、設計段で確定 |
| team-formation | 単一リポジトリの self-feature。実装所有権は Units Generation / Delivery Planning で定義 | プロト Unit 依存グラフ |
| rough-mockups | CLI/ワークフロー契約の変更で視覚 UI を伴わない。UI-less の出力契約(verdict 文言+exit code)は requirements で固定 | ui-less-mockups-as-output-contract 既習形 |
| approval-handoff | 実行計画で SKIP。intent-capture / scope-definition に個別ゲート(autonomy full の auto-approve 記録)がある | 本 phase-check を Ideation 出口証拠とする |

## 5. 警告と後続確認事項

- **WARNING(追跡済み)**: compose overlay 拡張の実装方式(manifest 語彙・trust 検証点)は未設計 — Reverse Engineering と設計段で確定する。
- **WARNING(追跡済み)**: requirements 送付事項3件(適用 scope 絞り込み / GitHub 不達時の park vs override / #1902 R3 所有権)は Requirements Analysis で裁定する。ユーザー裁定を要する事項は autonomy full 下でも prohibitedEffects(scope-out 等)に該当すれば人間へエスカレーションする。
- **WARNING(追跡済み)**: 収束述語の GraphQL フィールド語彙(mergeStateStatus 等)は外部 seam — external-seam-vocab-measurement に従い実装前に実測で確定する。
