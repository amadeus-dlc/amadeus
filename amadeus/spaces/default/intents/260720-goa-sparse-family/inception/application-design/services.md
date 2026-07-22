# Services — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

UI/サービス層なし(CLI 内部ライブラリの受理域拡大)。ui-less-mockups-as-output-contract の対応物として、出力契約は次の3点で固定する:

1. parseGoaLine のスパース受理成功形(segments 付き GoaBreakdown)と拒否4クラスの error 文言 — FD で verbatim 確定しテスト文言の導出元とする
2. handleOpen のエラーメッセージ新表記 — t236 系の期待に影響しないこと(既存 open テストの grep で確認)
3. count 不変対照(ECODE_RE)— corpus 実測値の一致 assert
4. **corpus 全数 sweep テスト**(FR-1 AC(i) の実施 artifact)— extractGoaRecords→parseGoaLine の2段で memory 層全域 21 occurrence の両側実証(読める/拒否の対照)
