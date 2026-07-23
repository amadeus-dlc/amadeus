# Performance Test Instructions — 260722-teamup-prompt-race

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1384-watcher-arming/code-generation/)。

## 選定判断: 専用性能テストは追加しない(N/A)

cid:build-and-test:c1(performance は承認済み NFR と実在境界へ trace して選定し、戦略名だけで機械追加しない)に従う。本 intent の requirements に性能 NFR は存在しない(NFR-1〜4 はテスト・CI green・依存・ポータビリティ)。

## 性能に触れる唯一の面(検証で代替)

起動レイテンシ(インライン検証の同期待ち)は E-TPRRA1 裁定 [e4] 留保で「将来問題化した場合のみ C 案再検討」と明示済み — 上限は設計上有界(90秒/wait × 再送2回、全メンバー一括ループ)。全員 armed の正常系では検証は数秒で完了し(統合テストのフル起動ケースが実測数秒で pass)、恒常的な性能計測は導入しない。
