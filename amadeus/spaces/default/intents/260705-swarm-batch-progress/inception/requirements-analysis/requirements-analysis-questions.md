# Requirements Analysis 質問（260705-swarm-batch-progress）

対象 Issue: [#486](https://github.com/amadeus-dlc/amadeus/issues/486)

Maintainer の包括委任（sub 割り当て、agmsg 2026-07-05T09:13:58Z）に基づき、推奨案で自己回答する。

---

## Q1. batch の完了判定は何を正にしますか？

A. per-unit ループと同じ coverage ledger（当該ステージの produces が construction/<unit>/<stage>/ に実在すること = 既存 unitCovered）を正にする
B. audit の BOLT_COMPLETED を bolt 名と unit 名の対応表で突き合わせる
X. Other (please specify)

[Answer]: A（推奨採用。エンジンの per-unit for_each ループ（#368）と同一の判定基準になり、二重の真実を作らない。B は bolt 名と unit 名の対応（B001- vs u001- 形式差）という #478 で観察した相関問題を再導入する）
