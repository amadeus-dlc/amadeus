# RAID Log — 260706-journal-logger（Issue #557）

## 上流入力

[intent-statement.md](../intent-capture/intent-statement.md)。

## Risks

| ID | リスク | 影響 | 対応 |
|---|---|---|---|
| R-1 | 常設 spawn の運用前例がなく、logger が停止していると記録が落ちる | 中 | 初回は手動起動 + 運用検証（C-1）。手順書に「不達時は送信者が leader へ直接記録依頼」の fallback を明記 |
| R-2 | 受け入れ条件 2〜3 の実績が本 Intent の PR 時点で示せない | 中 | intent-capture 承認済みの境界解釈どおり、PR 納品物と初回起動後の運用検証を分離（scope-definition で確定） |
| R-3 | 軽量モデルの logger が仕分け分類を誤る | 低 | 仕分けは「提案」であり定着は human gate（C-2）が防波堤。ack 定型で判断範囲を絞る |
| R-4 | 日次 PR と他 Intent の merge が交差 | 低 | journal/ は logger 単独所有 + 追記専用で conflict は構造的に起きにくい。intents.json 等の共有台帳には触れない |

## Assumptions

| ID | 前提 | 検証 |
|---|---|---|
| A-1 | agmsg の spawn / join 機構が journal-logger ロールに使える | 手順書作成時に spawn.sh の引数を実測確認 |
| A-2 | #556 のエントリ数は有限（本文 + コメント 3 件） | gh api で実測済み |

## Issues

- なし

## Dependencies

| ID | 依存 | 状態 |
|---|---|---|
| D-1 | ピア協議 4 問の回答 | 協議中 |
| D-2 | 初回起動の人間 / leader 操作 | 手順書納品後（本 Intent 完了後の運用） |
