# Business Rules — U4 docs-sync

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

前提: 本 BR 群は unit-of-work.md U4 の充足 FR(requirements.md FR-6/AC-6、NFR-1 非退行層)と unit-of-work-story-map.md ジャーニー1 から導出。

## ルール一覧

- BR-U4-1: 更新対象は components.md C-7 棚卸し表の ✅ 集合+Bolt 冒頭再 grep の差分のみ。❌(記録面 — upstream-sync 履歴)は更新しない
- BR-U4-2: en/ja 対訳ペア(5組 — testing / publishing-setup / architecture / contributing / README)は同一 PR で同期(docs 言語規約)
- BR-U4-3: 件数語は隣接列挙がある場合のみ硬数値、なければ count-free(cid:functional-design:c3-adjacent-enum-numerals)
- BR-U4-4: 記述の正は services.md 実行面表と着地済み U1〜U3 の実体(実装を読んで書く — 記憶起草禁止)
- BR-U4-5: NFR-1 非退行層の実測(移設前後の tests job wall-clock、run ID 付き)を記録してから Unit 完了(component-methods.md C-7 の dual-key 再 grep 結果も併記)
- BR-U4-6: doc-consuming テスト(doc-count/doc-inventory ガード類)が更新対象 docs を読んでいないか grep 確認し、該当があれば同一 PR でガード整合(ci-paths-ignore-doc-guard-blindspot の予防)

## 落ちる実証

- 参照整合はリンク検査(相対パスの実在 ls)で機械確認。対訳ペアの同期は en/ja の節構造 diff(H2 見出し数一致)で機械確認
