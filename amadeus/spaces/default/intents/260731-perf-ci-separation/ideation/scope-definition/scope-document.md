# Scope Document — 260731-perf-ci-separation

上流入力(consumes 全数): intent-statement.md

## スコープ境界(In / Out)

intent-statement.md の Problem Statement と確定裁定4件(Q1=A / Q2=A / Q3=B / Q4=C)から導出する。

### In(本 intent で実施)

1. **perf tier の新設**: `tests/run-tests.ts` に perf テストの層(または除外機構)を追加し、`--ci` プロファイル(smoke+unit+integration)と `coverage:ci` から perf テストを除外する。対象テストの分類方法(命名規約 vs 明示リスト)は design ステージで確定
2. **perf.yml の新設**: 毎日1回の schedule + workflow_dispatch。PR 非 blocking。main 上の失敗は loud 可視化のみ(自動起票なし)。対象: bun test 系 perf テスト(t258-lifecycle、t259-guard-corpus、t292、t269 等 — 全数は design で棚卸し)+ distribution-benchmark 群
3. **distribution-benchmark 群の移設**: ci.yml の `distribution-benchmark`(3 replicas)+ `distribution-benchmark-aggregate` を perf.yml へ移し、`distribution-required` ゲートから PERFORMANCE_RESULT 検査を外す(contract 検査は ci.yml に残す)
4. **#1830 経路A の是正**: t258 のテスト全体 120s timeout をランナー差に頑健な形へ是正(予算引き上げ・サンプル数削減・タイミングシーム化のいずれか — design で確定。cid:build-and-test:bt-timeout-verification-shape 適用)
5. **coverage 母集団の同期**: perf テスト除外後の coverage registry 再生成と patch/project gate の期待値整合
6. **ドキュメント同期**: CI 構成の説明を持つ docs の更新(対象語彙の repo 全域 grep で棚卸し — cid:requirements-analysis:enumeration-completeness-review 追補)

### Out(本 intent で実施しない)

1. **#1830 経路B**: 絶対 median 予算(500ms)の基準そのものの変更 — 別 intent(Q4=C 裁定)
2. **schedule 失敗時の自動 Issue 起票** — Q3=B 裁定(loud 可視化のみ)
3. **perf テストの中身の性能改善**(t258 のサンプル設計変更等、timeout 是正に必要な範囲を超えるもの)
4. **release.yml / metrics-maintenance.yml への変更**
5. **新しい性能監視基盤・ダッシュボード類の導入**

## 価値ストリーム

PR 作成 → ci.yml(高速・決定的検証のみ)→ レビュー・マージ(偽赤による再実行なし)/ 並行して perf.yml が daily で性能退行を監視 → 退行検知時は workflow 失敗の可視化 → 人間判断で対応 intent 起動。

## 制約

- 既存の blocking gate(coverage ratchet、patch coverage、complexity、dist/self-install drift)は維持(cid:code-generation:tdd-default-with-narrow-exceptions)
- TDD 既定(実行可能な振る舞いの変更は Red→Green の vertical slice)
- perf テスト除外により CI から消える検証は perf.yml で全数引き継ぐ(検証の無音喪失禁止 — P2)
