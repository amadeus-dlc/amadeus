# Reliability Requirements — U2 u2-install-verb

上流入力(consumes 全数): business-logic-model.md(冪等収束表)、business-rules.md(BR-U2-2/BR-U2-5)、requirements.md(FR-1d)、technology-stack.md

## RL-U2-1: クラッシュ耐性(FR-1d の中核)

任意の失敗点(α〜δ・compose)からの再実行が重複副作用なしに収束する(business-logic-model.md の冪等収束表が状態空間を全数列挙)。dst の可視状態は常に3値(absent/完全旧/完全新)— 中間状態は dot-tmp 名前空間に閉じる(business-rules.md BR-U2-2)。

## RL-U2-2: 失敗の可視性

全失敗は failure variant(stage:"install")+exit 1 の loud 経路(business-rules.md BR-U2-5、requirements.md FR-1d の様式)。サイレント失敗・自動リトライループを作らない(technology-stack.md の CLI ツール群という位置づけからの敷衍 — 単発実行・リトライは利用者の再実行、は本書の設計判断)。

## RL-U2-3: 検証

BR-U2-6 の6ケース(5+tmp 残渣収束)で収束表の各行をピンする。
