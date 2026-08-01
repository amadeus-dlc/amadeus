# Security Test Instructions — 260801-open-bug-batch-5

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- NFR-1/NFR-2(requirements)の監査整合性・fail-closed 境界の保存を、各 unit の code-summary.md の該当 AC で検証した(比例選定 — 承認済み NFR と実在境界へ trace できる範囲のみ、cid:build-and-test:bt-proportional-selection)。

## 検証面

1. **監査整合性(NFR-1)**: FR-2 の receipt 遷移は audit append-only を破らない(t279/t275 で遷移の正当性 pin)。FR-4r の record 修復は audit 無改変・前進修正のみ(実施記録あり)。Bolt 3 の mutation ガードは「監査に書けないとき state を変更しない」を強化する方向(t125 9/9)。
2. **fail-closed 保存(NFR-2)**: FR-5 は latch 中の canonical 書込を遮断(fail-closed 強化)。FR-9 は所有権証拠異常の terminal 性を pin(AC-9b — fail-open 化なし)。probe 修正は「真に壊れた台帳への latch 維持」を3ケースの落ちる実証で固定。
3. **認可境界**: 変更なし(#1871 レビュー r1 の指摘どおり、422 の effect 分類変更は見送り — 認可境界へ不要な変更を入れない)。
4. 依存追加なし(Bun-only 前提不変)。secrets 取り扱いの変更なし。

## 判定

対象変更に起因する新規セキュリティ検査の追加は **N/A**(根拠: 攻撃面・依存・承認 NFR のいずれにも新規面がない — 上記1〜4の実測)。
