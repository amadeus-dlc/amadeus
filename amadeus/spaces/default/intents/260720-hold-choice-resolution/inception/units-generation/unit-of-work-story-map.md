# Story Map — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md — ジャーニーは services.md の利用者影響(hold 裁定者の体験変化)から、対応 FR は requirements.md から導出。

## ジャーニー: 多肢 tie の人間裁定

| ステップ | 現状(欠陥) | U1 後 | 対応 FR |
| --- | --- | --- | --- |
| tie hold 発生 | adopted/rejected の二値しか投入できず勝者を表現不能(#1267) | `--resolution choice:<n>` で勝者 choice を直接指定 | FR-1 |
| 誤入力(二値・不正 choice) | adopted/rejected が無音で「採用/不採用」裁定になる(誤裁定リスク) | valid ヒント付き loud 拒否(exit 1) | FR-1 |
| 裁定の永続化 | resolution 文字列は保存されるが勝者不明 | `choice:<n>` が tally.json に保存・carry-forward | FR-2 |
| record.md 閲覧 | 「裁定: 採用」— どの choice か読めない | 「裁定: <label>(choice <n> — tie 裁定)」 | FR-3 |
| 他 reason の hold(block 等) | 二値裁定 | 無変更(E-TCRCG=A) | FR-1/FR-5 |

## Unit 対応

全ステップが U1 単体で閉包する(部分着地で価値が出ない凝集ジャーニーのため単一 unit — unit-of-work.md の分割判断と整合)。
