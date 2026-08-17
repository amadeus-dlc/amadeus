# Performance Test Instructions — intent 260816-priority-bug-batch-3

**判定: 適用可能な性能 NFR が存在しない**(cid:build-and-test:c2-no-test-theatre-for-absent-nfr の様式に従う明示判定)。

- 根拠: requirements.md の NFR-1〜NFR-3 は TDD / 回帰防止 / 台帳同期であり、合否を決める数値性能目標を宣言する要件は本 intent に存在しない。5 FR はいずれも正しさ(fail-closed 判定・監査計数・並行安全)の修正で、レイテンシ・スループット目標を伴わない
- 生成しなかった検査: ベンチマーク・負荷試験(目標なきベンチマークは検証劇場)
- 将来この判定を覆す条件: 選挙 store の並行 voter 実運用化(#3046 の申し送り)や presence 判定のホットパス化で数値目標付き NFR が要件化された場合
