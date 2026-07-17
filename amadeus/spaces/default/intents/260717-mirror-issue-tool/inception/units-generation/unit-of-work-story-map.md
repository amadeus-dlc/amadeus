# Unit of Work Story Map — amadeus-mirror ツール

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## ストーリー写像(user-stories ステージは本スコープ SKIP — intent-statement の成功指標を直接写像)

| 成功指標 / FR | Unit | 受け入れ確認 |
|---|---|---|
| 指標1: 1コマンド起票(FR-2) | amadeus-mirror-cli | create 実行1回で Issue 起票+Mirror Issue フィールド記録 |
| 指標2: 定型3要素のみ(FR-5) | amadeus-mirror-cli | renderBody の出力が3セクション以外を含まない(テストで固定) |
| 指標3: close 着地検査(FR-4) | amadeus-mirror-cli | 未完了 intent への close が exit 1(AND 検査の falling proof) |
| sync 冪等(FR-3.2) | amadeus-mirror-cli | 連続2回目の本文 diff ゼロ |
| 重複ガード(FR-2.2) | amadeus-mirror-cli | 既存フィールドありで create → exit 1 |

## カバレッジ確認

- intent-statement の成功指標3点は全数が amadeus-mirror-cli へ写像済み(指標1→FR-2、指標2→FR-5、指標3→FR-4)
- 追加 AC(FR-3.2 冪等、FR-2.2 重複ガード)も同 unit へ写像済み
- 未割当ストーリーなし / ストーリーを持たない unit なし(単一 unit 構成、requirements.md FR 一覧との突合で取りこぼしゼロ)

