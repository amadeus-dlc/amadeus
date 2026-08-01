# Code Generation Plan — u6-impl-only-path

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(FD P1〜P6 準拠)

1. **P1**: `--impl-only` 受理条件 = model/cfg identity 不変 AND impl drift 存在。drift 判定は check 経路の evaluateEntries+diffModelMap を再利用(第3実装禁止)。model/cfg 変化・drift なしは loud 拒否。
2. **P2**: 監査2層 — stdout 構造化結果(IMPL_ONLY_UPDATED、実 publish 由来)+git コミット面。
3. **P5**: 成功 union の第3メンバー新設、無フラグ経路はバイト不変。
4. **P6**: deadline は check 経路と同一算出を plumb。
5. **P4**: MODEL_UNCHANGED detail+sensor manifest 文書+SOURCE_DRIFT detail へ正規手順追記(移設後パス)。
6. TDD(t380)+落ちる実証。plugin 正本変更は dist 複製同期で 8 変種へ。
