# Requirements Analysis 質問（260705-space-inventory）

Maintainer の直接指示（棚卸し + 修正 PR）のため、方式判断 1 件だけを記録する。

---

## Q1. D5（phases 3 ファイル欠落）の修正方向は？

A. 実データ側を埋める: 欠落 3 ファイルを construction.md と同型の phase 防護規定として新設する
B. 参照側（.agents/rules/amadeus.md）の @include 3 行を削除する
X. Other (please specify)

[Answer]: A（B を先に試したところ parity の rules-file hash 検査が fail した。同ファイルは上流適応で変換同一性が契約のため編集できない。上流は phase method ファイルの存在を前提にしており、ローカル実データ側の欠落がズレの実体。経緯は memory.md の Deviations）
