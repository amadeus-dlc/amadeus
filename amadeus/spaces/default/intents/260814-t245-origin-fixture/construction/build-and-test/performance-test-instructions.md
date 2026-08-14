# Performance Test Instructions — 260814-t245-origin-fixture

## 判定: 適用可能な performance NFR は存在しない

- 本 intent の requirements.md に合否数値目標を宣言する performance NFR はない(NFR-1 は timeout「契約の維持」であり性能目標ではない)。承認済み NFR へ trace できない性能検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 目標なきベンチマークは検証劇場)
- 実施した関連実測(NFR-1 の充足確認のみ): 対象テスト単独 5.93s < scaleTestTime(120_000)。corpus 比例コストの申し送りは code-summary.md 参照

## 将来この判定を覆す条件

- t245 の実行時間に合否閾値を課す NFR が要件へ宣言された場合、または corpus 増大で timeout budget を脅かす実測が出た場合
